# RESOURCES and CREDITS:
#
# * https://flask.palletsprojects.com/en/2.0.x/api/ (main Flask api documentation)
# * https://flask.palletsprojects.com/en/2.0.x/config/ (how to handle app configuration)
# * https://pythonise.com/series/learning-flask/python-before-after-request (how to use before/after request handlers)
# * https://flask-login.readthedocs.io/en/latest/#flask_login (flask_login documentation)
# * https://pythonhosted.org/Flask-Security/quickstart.html (use of flask_security module) -- not currently used
# * https://yasoob.me/posts/how-to-setup-and-deploy-jwt-auth-using-react-and-flask/ (handling login with react/flask combination)
# * https://www.digitalocean.com/community/tutorials/how-to-add-authentication-to-your-app-with-flask-login (another approach)
#
# TODO:
# * Simplify error handling wth @errorhandler (can capture certain types of exceptions for global response)
# * Be careful when doing multiple DB calls in response to a single request...
#      If any objects are mutated, then can end up with a 'transaction already started' error...
#      There is a way to disconnect from database (make_transient)
# * Incorporate Flask Mail to do email verification. Maybe also subscriptions? https://pythonhosted.org/Flask-Mail/
# * Re-insert the @flask_login.login_required now that permissions are somewhat sorted out
# * A lot of flask_session files get created per request (for Mike). Does this happen for others too?
# * Need to look up how to split initialization activities between (if __name__ == '__main__':) section and @app.before_first_request and global
# * Need to prevent saving of empty password to user profile (e.g. when create account from google login, or when update account
#   after Google login).  Backend should be careful of which fields are sent to database.
# * Need to look at difference between DB session versus connection... maybe not using correctly
# * Need to test remember-me feature
# * Make API more consistent. Some failed calls return status 500. Some return { error: message }
# * Add caching to session (e.g. analysis images?)

import time
import json
from flask import Flask, request,Response,send_file,send_from_directory,make_response,Response,session
from flask_session import Session
import PIL
import sys, os
from flask_cors import CORS,cross_origin
import flask_login
from flask_login import LoginManager
import urllib

import ast
import datetime
from dateutil import parser

# Include database layer
from database import object_type_valid

# Include permission handling
from permissions import check_permission, has_permission, list_permissions


# Import server configuration info
from dotenv import load_dotenv
load_dotenv()

# App and session setup and configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_APP_SECRET_KEY') # TODO: rename to FLASK_SESSION_SECRET_KEY
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
#app.config['SESSION_COOKIE_HTTPONLY'] = True
#app.config['REMEMBER_COOKIE_HTTPONLY'] = True
#app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'
app.config.from_object(__name__)  # still need this?
Session(app)

CORS(app,
    headers=['Content-Type'],
    expose_headers=['Access-Control-Allow-Origin', 'X-suggested-filename', 'X-filename'],
    support_credentials=True
)

HTTPStatus = {
    'OK': 200,
    'CREATED': 201,
    'UNAUTHORIZED': 401,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'INTERNAL_SERVER_ERROR': 500,
}

# Image configuration:
app.config['USER_THUMBNAIL_MAX_SIZE'] = (200, 200)
app.config['USER_AVATAR_MAX_SIZE'] = (100, 100)
app.config['IMAGE_THUMBNAIL_MAX_SIZE'] = (200, 200)



def api_error_response(code, details=''):
    return Response({'error': details}, code, mimetype='application/json')

def login_view():
    return api_error_response(HTTPStatus['UNAUTHORIZED'])

login_manager = LoginManager(app)
#login_manager.session_protection = 'strong'
login_manager.login_view = 'login_view'
login_manager.login_message = 'You need to be logged in to perform this request.'
#login_manager.unauthorized = .....   ## HOW TO USE THIS?

@login_manager.unauthorized_handler
def unauthorized():
    return api_error_response(HTTPStatus['UNAUTHORIZED'])

@login_manager.user_loader
def session_load_user(user_id):
    from database import db_object_load
    user = db_object_load('user', user_id)
    # Only send basic fields to LoginManager
    #del user.password_hash
    #del user.prefs
    #del user.favorites
    return user

app.config['session_timeout'] = 10 # minutes
app.permanent_session_lifetime = datetime.timedelta(minutes=app.config['session_timeout'])
app.config['anonymous_user_name'] = 'Anonymous'


# ---------------
# Global handlers
# ---------------

# Modify JSON encoder to use ISO format for datetimes. Otherwise outputs long format
# datetimes which cannot be parsed in the frontend.
from flask.json import JSONEncoder, JSONDecoder
from contextlib import suppress
class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        # Convert datetime objects to ISO format
        with suppress(AttributeError):
            return obj.isoformat()
        return dict(obj)
app.json_encoder = CustomJSONEncoder

class CustomJSONDecoder(JSONDecoder):
    def __init__(self, *args, **kwargs):
        json.JSONDecoder.__init__(self, object_hook=self.object_hook, *args, **kwargs)

    def object_hook(self, source):
        print ('here')
        for k, v in source.items():
            if isinstance(v, str):
                try:
                    source[k] = parser.isoparser.isoparse(v)
                except:
                    pass
        return source
app.json_decode=CustomJSONDecoder


# TODO: this is only for testing purposes.  We won't clear the file storage
# and database when the app is more mature
@app.before_first_request
def initialize():
    print ("Starting backend application...")
    # This option comes from command line (whether to create new database)
    reset = False
    if app.config.get('CREATE_DATABASE'):
        db_name = app.config.get('CREATE_DATABASE')
        reset = True
    else:
        db_name = os.getenv('DB_NAME')

    # Prepare file storage system
    from filestorage import initialize_file_storage
    initialize_file_storage(db_name, reset)

    # Prepare database
    from database import db_initialize
    db_initialize(db_name, reset)

#@app.before_request
#def initialize_request():
#    # Do nothing

@app.teardown_request
def teardown(exception):
    from database import db_cleanup
    db_cleanup()

# -------------------------
# Permission related routes
# -------------------------

# API call to check permission
# TODO: check for invalid object types or permissions?
@app.route('/api/check_permission/<object_type>/<permission>', methods = ['GET'])
@app.route('/api/check_permission/<object_type>/<permission>/<object_id>', methods = ['GET'])
@cross_origin(supports_credentials=True)
def api_check_permission(object_type, permission, object_id=None):
    print(permission, ' ', has_permission(object_type, permission, object_id))
    return { 'authorized': has_permission(object_type, permission, object_id) }

# API call to list permissions
# TODO: check for invalid object types?
@app.route('/api/list_permissions/<object_type>', methods = ['GET'])
@app.route('/api/list_permissions/<object_type>/<object_id>', methods = ['GET'])
@cross_origin(supports_credentials=True)
def api_list_permissions(object_type, object_id=None):
    return { 'authorized': list_permissions(object_type, object_id) }

# -------------------
# User-related routes
# -------------------

# Helper function for session responses
def prepare_session_response(user, error=False, message=''):
    if (user is None):
        user_dict = None
        prefs = {}
        favorites = {}
    else:
        user_dict = user.as_dict()
        user_dict.pop('password_hash') # Remove password_hash
        prefs = user_dict.pop('prefs') # Remove prefs (append separately)
        favorites = user_dict.pop('favorites') # Remove favorites (append separately)
    return {
        'error': error,
        'message': message,
        'current_user': user_dict,
        'prefs': prefs,
        'favorites': favorites,
    }

# Load the current session (user data, preferences, favorites).
# We rely on flask_login to provide just the user_id, then we look up the most recent data in the
# database (in case profile, prefs, or favorites have been updated).
@app.route('/api/session/load', methods = ['GET'])
@cross_origin(supports_credentials=True)
def session_load():
    if (flask_login.current_user.is_authenticated):
        from database import db_object_load
        user = db_object_load('user', flask_login.current_user.get_id())
        return prepare_session_response(user)
    else:
        return prepare_session_response(None, True, 'Not logged in')

# Save the submitted user preferences
# TODO: Need to trigger update prefs in the session!!!
@app.route('/api/prefs/save', methods = ['POST'])
@cross_origin(supports_credentials=True)
def prefs_save():
    prefs = json.loads(request.form.get('prefs'))
    print(prefs)
    user_id = flask_login.current_user.get_id()
    from database import db_prefs_save
    return { 'error': not db_prefs_save(user_id, prefs) }

# Load all favorites or a set of favorites of one object type
# Return a dict of lists (all favorites), a list (a specific type of favorites)
# Note: sets are a better data type but don't work well with pickler and/or response encoding/decoding.
#   Thus using lists instead
@app.route('/api/favorites/load/<object_type>', methods = ['GET'])
@app.route('/api/favorites/load', methods = ['GET'])
@cross_origin(supports_credentials=True)
def favorites_load(object_type=None):
    user = flask_login.current_user
    from database import db_favorites_load
    favorites = db_favorites_load(user.get_id(), object_type)
    return { 'favorites': favorites }

# Clear all favorites or a set of favorites of one object type
@app.route('/api/favorites/clear/<object_type>', methods = ['POST'])
@app.route('/api/favorites/clear', methods = ['POST'])
@cross_origin(supports_credentials=True)
def favorites_clear(object_type=None):
    user = flask_login.current_user
    from database import db_favorites_clear
    if (db_favorites_clear(user.get_id(),object_type)):
        return { 'error': False }
    else:
        return { 'error': 'Favorites could not be cleared' }

# Add a favorite
@app.route('/api/favorite/add/<object_type>/<object_id>', methods = ['POST'])
@cross_origin(supports_credentials=True)
def favorite_add(object_type, object_id):
    user = flask_login.current_user
    from database import db_favorite_add
    if (db_favorite_add(user.get_id(), object_type, object_id)):
        return { 'error': False }
    else:
        return { 'error': 'Favorite could not be added' }

# Remove a favorite
@app.route('/api/favorite/remove/<object_type>/<object_id>', methods = ['POST'])
@cross_origin(supports_credentials=True)
def favorite_remove(object_type, object_id):
    user = flask_login.current_user
    from database import db_favorite_remove
    if (db_favorite_remove(user.get_id(), object_type, object_id)):
        return { 'error': False }
    else:
        return { 'error': 'Favorite could not be removed' }


# Check if user email address exists
@app.route('/api/user/email_exists/<email>', methods = ['GET'])
@cross_origin(supports_credentials=True)
def user_exists(email):
    email = urllib.parse.unquote(email) 
    from database import db_user_load_by_email
    user = db_user_load_by_email(email)
    return { 'exists': (user is not None) }

# Change password for current user
@app.route('/api/user/password_change', methods = ['POST'])
@flask_login.login_required
@cross_origin(supports_credentials=True)
def user_password_change():
    password = request.form.get('password')
    new_password = request.form.get('new_password')
    # Check current password
    user_id = flask_login.current_user.user_id
    from database import db_object_load
    user = db_object_load('user', user_id)
    import bcrypt
    if (not bcrypt.checkpw(password.encode('utf8'), user.password_hash.encode('utf8'))):
        return { 'error': 'Password incorrect' }
    # Successful match
    from database import db_user_password_change
    if db_user_password_change(user.get_id(),new_password):
        return { 'error': False }
    return { 'error': 'Password could not be updated' }


# Change profile image for specified user
# TODO: add error checking
@app.route('/api/user/photo_upload/<user_id>', methods=['POST'])
@app.route('/api/user/photo_upload', methods=['POST'])
@flask_login.login_required
@cross_origin(supports_credentials=True)
def user_photo_upload(user_id = None):
    if (user_id is None):
        user_id = flask_login.current_user.get_id()
    if (not has_permission('user', 'edit', user_id)):
        return api_error_response(HTTPStatus['FORBIDDEN'], 'Not Authorized')
    file = request.files.get('file')
    if (file is not None):

        # Prepare and save original file, thumbnail and avatar
        thumbnail = PIL.Image.open(file)
        avatar = thumbnail.copy()
        thumbnail.thumbnail(app.config['USER_THUMBNAIL_MAX_SIZE'])
        avatar.thumbnail(app.config['USER_AVATAR_MAX_SIZE'])

        from database import db_user_photo_upload
        if (db_user_photo_upload(user_id, file, thumbnail, avatar)):
            return { 'error': False }, HTTPStatus['OK']

    return { 'error': 'Could not update profile photo' } # TODO: add appropriate error code


# -----------------------------
# Generic object route handlers
# -----------------------------

# Determine whether a record of specified type with specified id exists in database.
# Returns {exists: <Boolean>}
# Note this bypasses permission checking deliberately
# TODO: make sure 'user' works properly since there is also a lookup by email...
@app.route('/api/<object_type>/exists/<object_id>', methods=['GET'])
@cross_origin(supports_credentials=True)
def object_exists(object_type, object_id):
    if not object_type_valid(object_type):
        return api_error_response(HTTPStatus['NOT_FOUND'], 'Unsupported object type')
    from database import db_object_load
    record = db_object_load(object_type, object_id)
    return { 'exists': record is not None }

# Lookup the name of the record of specified object type with specified ie
# Returns {name: <String>}
# Note this bypasses permission checking deliberately
# TODO: a 'getName' helper would be mildly useful on the objects from DB
@app.route('/api/<object_type>/name/<object_id>', methods=['GET'])
@cross_origin(supports_credentials=True)
def object_name_lookup(object_type, object_id):
    if not object_type_valid(object_type):
        return api_error_response(HTTPStatus['NOT_FOUND'], 'Unsupported object type')
    from database import db_object_load
    record = db_object_load(object_type, object_id)
    if (object_type == 'user'):
        return { 'name': record.first_name + ' ' + record.last_name }
    else:
        return { 'name': record.name }

# Generic handler to load object not caught by ealier routes
# Return dict of fields
@app.route('/api/<object_type>/load/<object_id>', methods = ['GET'])
@cross_origin(supports_credentials=True)
def object_load(object_type, object_id):
    if not object_type_valid(object_type):
        return api_error_response(HTTPStatus['NOT_FOUND'], 'Unsupported object type')
    if (not has_permission(object_type, 'view', object_id)):
        return api_error_response(HTTPStatus['FORBIDDEN'], 'Not Authorized')
    from database import db_object_load
    record = db_object_load(object_type, object_id)
    if (record is None):
        return api_error_response(HTTPStatus['NOT_FOUND'], f"No {object_type} with this id")
    else:
        return record.as_dict()

# Generic handler to save object not caught by earlier routes
# Return { id:<ID> }
# TODO: for now front-end only has 'save' option, not 'create' and 'update'
@app.route('/api/<object_type>/save', methods = ['POST'])
@cross_origin(supports_credentials=True)
def object_save(object_type):
    if not object_type_valid(object_type):
        return api_error_response(HTTPStatus['NOT_FOUND'], 'Unsupported object type')
    # Create a dict from form fields
    # NOTE: to get around limitations of formData, we JSON encode all non-file fields 
    # into a single form key
    data = json.loads(request.form.get('JSON_data'))
    #data = request.form.items()
    #data = {}
    #for key, value in request.form.items():
    #    data[key] = value
    from database import object_idfield
    id_field = object_idfield(object_type)
    object_id = data.get(id_field)
    if (object_id is None):
        if not has_permission(object_type, 'create'):
            return api_error_response(HTTPStatus['FORBIDDEN'], 'Not Authorized')
    else:
        if not has_permission(object_type, 'edit', object_id):
            return api_error_response(HTTPStatus['FORBIDDEN'], 'Not Authorized')
    from database import db_object_save
    record = db_object_save(object_type, data)
    if (record is None):
        return api_error_response(HTTPStatus['INTERNAL_SERVER_ERROR'], 'Save failed')
    else:
        return { 'id': getattr(record,id_field) } 


# Generic handler to delete object not caught by earlier routes
# TODO: add 'DELETE' method?
@app.route('/api/<object_type>/delete/<object_id>', methods = ['POST'])
@cross_origin(supports_credentials=True)
def object_delete(object_type, object_id):
    if not object_type_valid(object_type):
        return api_error_response(HTTPStatus['NOT_FOUND'], 'Unsupported object type')
    if (not has_permission(object_type, 'delete', object_id)):
        return api_error_response(HTTPStatus['FORBIDDEN'], 'Not Authorized')
    from database import db_object_delete
    if (db_object_delete(object_type, object_id)):
        return { 'error': None }
    else:
        return { 'error': 'Delete failed' }

# Generic handler to restore object not caught by earlier routes
@app.route('/api/<object_type>/restore/<object_id>', methods = ['POST'])
@cross_origin(supports_credentials=True)
def object_restore(object_type, object_id):
    if not object_type_valid(object_type):
        return api_error_response(HTTPStatus['NOT_FOUND'], 'Unsupported object type')
    if (not has_permission(object_type, 'restore', object_id)):
        return api_error_response(HTTPStatus['FORBIDDEN'], 'Not Authorized')
    from database import db_object_restore
    if (db_object_restore(object_type, object_id)):
        return { 'error': None }
    else:
        return { 'error': 'Restore failed' }

# Generic handler to purge object not caught by earlier routes
@app.route('/api/<object_type>/purge/<object_id>', methods = ['POST'])
@cross_origin(supports_credentials=True)
def object_purge(object_type, object_id):
    if not object_type_valid(object_type):
        return api_error_response(HTTPStatus['NOT_FOUND'], 'Unsupported object type')
    if (not has_permission(object_type, 'purge', object_id)):
        return api_error_response(HTTPStatus['FORBIDDEN'], 'Not Authorized')
    from database import db_object_purge
    if (db_object_purge(object_type, object_id)):
        return {'error': None }
    else:
        return { 'error': 'Purge failed' }

# Generic handler to clone object not caught by earlier routes
@app.route('/api/<object_type>/clone/<object_id>', methods = ['POST'])
@cross_origin(supports_credentials=True)
def object_clone(object_type, object_id):
    if not object_type_valid(object_type):
        return api_error_response(HTTPStatus['NOT_FOUND'], 'Unsupported object type')
    if (not has_permission(object_type, 'clone', object_id)):
        return api_error_response(HTTPStatus['FORBIDDEN'], 'Not Authorized')
    from database import db_object_clone
    record = db_object_clone(object_type, object_id)
    if (record is None):
        return api_error_response(HTTPStatus['INTERNAL_SERVER_ERROR'], 'Clone failed')
    else:
        from database import object_idfield
        id_field = object_idfield(object_type)
        return { 'id': getattr(record,id_field) } 


# Generic handler to search objects not caught by earlier routes
# Filters and pagination passed as URL arguments    TODO: implement this
# Return { results: [Array of dict] }
@app.route('/api/<object_type>/search', methods = ['GET'])
@cross_origin(supports_credentials=True)
def object_search(object_type, object_filter={}):
    if not object_type_valid(object_type):
        return api_error_response(HTTPStatus['NOT_FOUND'], 'Unsupported object type')
    if (not has_permission(object_type, 'search')):
        return api_error_response(HTTPStatus['FORBIDDEN'], 'Not Authorized')
    from database import db_object_search
    record_list = db_object_search(object_type, object_filter)
    if (record_list is None):
        return api_error_response(HTTPStatus['INTERNAL_SERVER_ERROR'], 'Database error')
    return { 'results': [record.as_dict() for record in record_list] }

@app.route('/api/<object_type>/search/favorites', methods = ['GET'])
@cross_origin(supports_credentials=True)
def object_search_favorites(object_type):
    return object_search(object_type, {'favorites': {'user_id': flask_login.current_user.get_id()}})

#
# TODO: LEGACY METHODS -- NEED TO INTEGRATE WITH GENERIC HANDLERS
#

@app.route('/api/image/save', methods = ['POST'])
@cross_origin(supports_credentials=True)
def image_save():
    data = {
        'image_id': request.form.get('image_id') or None,
        'name': request.form.get('name'),
        'description': request.form.get('description'),
        'image_type': request.form.get('image_type'),
        'equip_id': request.form.get('equip_id'),
        'captured': request.form.get('captured'), # TODO: try to get from image / file?
        'exp_time': request.form.get('exp_time'),
        'exp_temp': request.form.get('exp_temp'),
        # Ignore owner_id
        # Ignore created
        # Ignore modified
        # Ignore image_path
        # Ignore filename
        # Ignore download_url
    }

    if (request.files):
            data['file'] = request.files['file']
        
    from database import db_image_save
    record = db_image_save(data)
    if (record is None):
        return api_error_response(HTTPStatus['INTERNAL_SERVER_ERROR'], 'Save failed')
    else:
        return { 'id': record.image_id }

# Process user login
@app.route('/api/user/login/<login_method>', methods=['POST'])
@cross_origin(supports_credentials=True)
def user_login(login_method):

    if login_method=='basic':

        form_fields = json.loads(request.form['JSON_data']) # All form data in a JSON encoded field
        email = form_fields['email']
        remember = form_fields['remember']

        # Look up user by email
        from database import db_user_load_by_email
        user = db_user_load_by_email(email)

        # If not found
        if (user == None):
            return prepare_session_response(None, True, 'No account with that email')

        # If found, check password            
        import bcrypt
        if (bcrypt.checkpw(request.form['password'].encode('utf8'), user.password_hash.encode('utf8'))):
            flask_login.login_user(user, remember)
            return prepare_session_response(user, False, 'Successful login')
        else:
            return prepare_session_response(None, True, 'Incorrect email or password')

    elif login_method=='google':
        from google.oauth2 import id_token
        from google.auth.transport import requests
        token = request.form['tokenId']
        form_fields = json.loads(request.form['JSON_data']) # All form data in a JSON encoded field
        remember = form_fields['remember']

        client_id = os.getenv('REACT_APP_GOOGLE_OAUTH_CLIENT')
        print(client_id)

        try:
            id_info = id_token.verify_oauth2_token(token, requests.Request(),client_id)
            print (id_info)
        except:
            return prepare_session_response(None, True, 'Invalid token')

        if id_info['iss'] != 'https://accounts.google.com' and id_info['iss']!='accounts.google.com':
            return prepare_session_response(None, True, 'Wrong auth provider')
        if id_info['aud'] not in [client_id]:
            return prepare_session_response(None, True, 'Faulty or faked token')
        if id_info['exp']<time.time():
            return prepare_session_response(None, True, 'Past expiry time')

        # Look up user by email
        email = id_info['email']
        from database import db_user_load_by_email
        user = db_user_load_by_email(email)

        # If not found
        if (user == None):
            return prepare_session_response(None, True, 'No account with that email')

        flask_login.login_user(user, remember)
        return prepare_session_response(user, False, 'Successful login')
        
    else:
        return prepare_session_response(None, False, 'Invalid login type')

# Process user logout
@app.route('/api/user/logout', methods=['POST'])
#@flask_login.login_required
@cross_origin(supports_credentials=True)
def user_logout():
    if flask_login.current_user.is_authenticated: 
        flask_login.logout_user() # Part of flask_login
        return prepare_session_response(None, False, 'Successful logout')
    else:
        return prepare_session_response(None, True, 'Not logged in')

# Automatically select ROIs based on the image (geometry aspects of ROIs only)
# NOTE: Analysis in database is not updated. User must separately save the ROIs.
@app.route('/api/analysis/rois_autoselect/<analysis_id>', methods=['GET'])
@cross_origin(supports_credentials=True)
def analysis_rois_autoselect(analysis_id):
    from analysis import analysis_rois_find
    return {'roi_list': analysis_rois_find(analysis_id), }

# Automatically define TLC lanes based on ROIs (geometric aspects only)
# NOTE: Analysis in database is not updated. User must separately save the lanes.
# NOTE: ROIs are not automatically assigned to lanes. That happens when the lanes are saved.
# TODO: check various combinations of num_lanes and num_ROIs and check error handling
@app.route('/api/analysis/lanes_autoselect/<analysis_id>', methods=['POST'])
@cross_origin(supports_credentials=True)
def analysis_lanes_autoselect(analysis_id):

    data = json.loads(request.form.get('JSON_data'))
    #ROIs = json.loads(data.get('ROIs')) if data.get('ROIs') is not None else []
    roi_list = json.loads(data.get('roi_list')) if data.get('roi_list') is not None else []
    origins = json.loads(data.get('origins')) if data.get('origins') is not None else []

    if (len(origins) > 0):
        from analysis import analysis_lanes_from_origins
        return {'lane_list': analysis_lanes_from_origins(roi_list, origins),'origins': origins}

    num_lanes = int(data.get('num_lanes'))
    # If num_lanes is missing, try to estimate number of lanes
    if num_lanes == 0 or num_lanes is None:
        from analysis import analysis_lanes_autocount
        auto_num_lanes = analysis_lanes_autocount(roi_list)
        if auto_num_lanes is None:
            return api_error_response(HTTPStatus['INTERNAL_SERVER_ERROR'],'Number of lanes must be specified. Attempt to guess failed.')

    from analysis import analysis_lanes_find
    lanes = analysis_lanes_find(roi_list, num_lanes)
    if lanes is None:
        return api_error_response(HTTPStatus['INTERNAL_SERVER_ERROR'], 'Unable to find the number of lanes specified.')
    return {'lane_list': lanes, 'origins': origins}

# Save the ROI and lane information (plus GUI options selected by user) to
# the analysis. It also groups all ROIs into lanes. (All previous assignments are discared.)
# It also computes all the data for ROIs and lanes for all ROIs and lanes.
@app.route('/api/analysis/rois_lanes_save/<analysis_id>',methods = ['POST'])
@cross_origin(supports_credentials=True)
def analysis_rois_lanes_save(analysis_id):

    # Retrieve JSON data from request (preserves proper types)
    data = json.loads(request.form.get('JSON_data'))
    roi_list = json.loads(data.get('roi_list')) if data.get('roi_list') is not None else {}
    lane_list = json.loads(data.get('lane_list')) if data.get('lane_list') is not None else []

    # Automatically assign ROIs to lanes
    from analysis import analysis_assign_rois_to_lanes
    analysis_assign_rois_to_lanes(roi_list, lane_list)

    # Compute data for ROIs and lanes
    # TODO: in future we can be more selective and maybe use a 'dirty' flag to only update what is needed
    from analysis import analysis_compute
    analysis_compute(analysis_id, roi_list, lane_list)

    show_Rf = data.get('show_Rf') if data.get('show_Rf') is not None else False
    image_scale_x = data.get('image_scale_x') if data.get('image_scale_x') is not None else 1.0
    image_scale_y = data.get('image_scale_y') if data.get('image_scale_y') is not None else 1.0
    # TODO: should we use these origins?  Currently we expect user to hit "generate lanes" before saving
    origins = json.loads(data.get('origins')) if data.get('origins') is not None else []

    newdata = {}
    newdata['show_Rf'] = show_Rf
    newdata['image_scale_x'] = image_scale_x
    newdata['image_scale_y'] = image_scale_y
    newdata['origins'] = origins
    newdata['roi_list'] = roi_list
    newdata['lane_list'] = lane_list
    newdata['radio_brightness'] = data.get('radio_brightness')
    newdata['radio_contrast'] = data.get('radio_contrast')
    newdata['radio_opacity'] = data.get('radio_opacity')
    newdata['bright_brightness'] = data.get('bright_brightness')
    newdata['bright_contrast'] = data.get('bright_contrast')
    newdata['bright_opacity'] = data.get('bright_opacity')

    # Save all info to the database (including results)
    from database import db_analysis_rois_lanes_save
    db_analysis_rois_lanes_save(analysis_id, newdata)

    return{
        'origins': origins, # TODO: is there any reason to send this back to frontend?
        'roi_list': roi_list,
        'lane_list': lane_list,
    }
    
# TODO: add error checking
@app.route('/api/analysis/save', methods=['POST'])
@cross_origin(supports_credentials=True)
def analysis_save():

    # Data to be saved
    data = json.loads(request.form.get('JSON_data'))
    # Set a few flags based on responses
    if data.get('filter_algorithm') and data.get('filter_algorithm') != 'none':
        data['correct_filter'] = True
    if data.get('bkgrd_algorithm') and data.get('bkgrd_algorithm') != 'none':
        data['correct_bkgrd'] = True
    if data.get('dark_image_id') and data.get('dark_image_id') is not None:
        data['correct_dark'] = True
    if data.get('flat_image_id') and data.get('flat_image_id') is not None:
        data['correct_flat'] = True

    # Load current version of analysis (if it exists) and look for changes that affect image_cache
    cache_dirty = False
    from database import db_object_load
    prev_analysis = None
    prev_analysis_id = data.get('analysis_id')
    if (prev_analysis_id is not None):
        prev_analysis = db_object_load('analysis', prev_analysis_id)
    else:
        cache_dirty = True
    if (prev_analysis is not None):
        # Compare previous and newly saved analysis to see if any fields changed that affect
        # display images or computation images ('compute'/'calc' and 'radii')
        # TODO: this could be a bit streamlined. E.g. dirty bright_image_id or uv_image_id doesn't affect much
        # TODO: have multiple different dirty flags, bright, uv, and radio?
        if (data.get('radio_image_id') != prev_analysis.radio_image_id): cache_dirty = True
        if (data.get('dark_image_id') != prev_analysis.dark_image_id): cache_dirty = True
        if (data.get('flat_image_id') != prev_analysis.flat_image_id): cache_dirty = True
        if (data.get('bright_image_id') != prev_analysis.bright_image_id): cache_dirty = True
        if (data.get('uv_image_id') != prev_analysis.uv_image_id): cache_dirty = True
        if (data.get('correct_dark') != prev_analysis.correct_dark): cache_dirty = True
        if (data.get('correct_flat') != prev_analysis.correct_flat): cache_dirty = True
        if (data.get('correct_bkgrd') != prev_analysis.correct_bkgrd): cache_dirty = True
        if (data.get('correct_filter') != prev_analysis.correct_filter): cache_dirty = True
        if (data.get('bkgrd_algorithm') != prev_analysis.bkgrd_algorithm): cache_dirty = True
        if (data.get('filter_algorithm') != prev_analysis.filter_algorithm): cache_dirty = True

    # Save analysis in database
    from database import db_object_save
    analysis = db_object_save('analysis', data)

    if (cache_dirty):
        print ("/api/analysis/save: Change in parameters detected; image cache is dirty")
        # TODO: implement error checking for the following
        from analysis import analysis_generate_working_images
        analysis_generate_working_images(analysis.analysis_id, )
    
    return { 'id': analysis.analysis_id }

# Build an ROI from a clicked point
# TODO: what does 'shift' do exactly?
# NOTE: ROI is not added to the database (user must do so explicitly)
@app.route('/api/analysis/roi_build/<analysis_id>/<x>/<y>/<shift>/<shape>',methods = ['GET'])
@cross_origin(supports_credentials=True)
def analysis_roi_build(analysis_id,x,y,shift, shape):
    from analysis import analysis_roi_create_from_point
    return { 'roi': analysis_roi_create_from_point(analysis_id, x, y, shift, shape), }
    
# Retrieve a file
# TODO: add permission checks
@app.route('/api/file/<object_type>/<file_type>/<object_id>', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_file(object_type, file_type, object_id):
    from filestorage import get_pathname
    filename = get_pathname(object_type, file_type, object_id)
    if (filename is None):
        return { 'error': 'Invalid file request' }, HTTPStatus['NOT_FOUND']
    # Return file
    # TODO: temp prevent cache for now... later set appropriate caching parameters for each type
    response = make_response(send_file(filename, cache_timeout=0))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    return response

    
if __name__ == '__main__':
    # TODO: consider what should go here, in 'before_app_first_request' or at the top of this file
    # (This is only run when it is the main app, not included in another file)

    # Process command line arguments
    args = {}
    for arg in sys.argv[1:]:
        if '=' in arg:
            sep = arg.find('=')
            key, value = arg[:sep], arg[sep + 1:]
            args[key] = value
    if args:
        print("Received command line arguments:")
        print(args)
    # create_db=<DB_NAME>: trigger creation of new database (and filestorage) with specified name
    #   (ignores DB_NAME setting in .env)
    app.config['CREATE_DATABASE'] = args.get('create_db') 

    # Launch application
    app.run(host='0.0.0.0',debug=False,port=5000)
