
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
# NOTES:
# * Need to import session from Flask, and Session from flask_session


# TODO:
# * Simplify error handling wth @errorhandler (can capture certain types of exceptions for global response)
# * Be careful when doing multiple DB calls in response to a single request...
#      If any objects are mutated, then can end up with a 'transaction already started' error...
#      There is a way to disconnect from database (make_transient)
# * We should move all the analysis-specific stuff out of here and into separate files that are just loaded in particular
#   API calls when needed
# * Incorporate Flask Mail to do email verification. Maybe also subscriptions? https://pythonhosted.org/Flask-Mail/
# * Re-insert the @flask_login.login_required now that permissions are somewhat sorted out
# * A few sites have recommended using '/api' at the beginning of all backend to help better separate frontend and backend
# * A lot of flask_session files get created per request (for Mike). Does this happen for others too?
# * Need to look up how to split initialization activities between (if __name__ == '__main__':) section and @app.before_first_request
# * Need to prevent saving of empty password to user profile (e.g. when create account from google login, or when update account
#   after Google login).  Backend should be careful of which fields are sent to database.
# * Need to look at difference between DB session versus connection... maybe not using correctly
# * Need to test whether session timeout is working properly, and remember-me feature
# * Make API more consistent. Some failed calls return status 500. Some return { error: message }

import time
import json
from scipy.cluster.vq import vq, kmeans,whiten
from flask import Flask, request,Response,send_file,send_from_directory,make_response,Response,session
from skimage import io, morphology, filters,transform, segmentation,exposure
from skimage.util import invert
import scipy
from kneed import KneeLocator
from matplotlib import pyplot as plt
from matplotlib import use,gridspec
from skimage.measure import label
from matplotlib.patches import Rectangle
from matplotlib.widgets import RectangleSelector, Button, EllipseSelector
import matplotlib.patches as pat
from matplotlib import interactive
from flask_session import Session
import matplotlib
import numpy as np
from PIL import Image
import PIL
from sklearn.cluster import MeanShift,estimate_bandwidth,AffinityPropagation,KMeans
from skimage.color import rgba2rgb
import os
import shutil
from skimage import measure
from flask_cors import CORS,cross_origin
import flask_login
from flask_login import LoginManager
import urllib

import ast
import datetime
from dateutil import parser
import sqlalchemy
from analysis import Analysis



# Include database layer
from database import (
    db_create_tables, db_add_test_data,db_cleanup,
    db_user_load_by_email,
    retrieve_image_path,retrieve_initial_analysis,db_analysis_save,db_analysis_save_initial,db_analysis_edit,
    object_type_valid
)

from permissions import check_permission, has_permission, list_permissions

def np64toint(arr):
    for i in range(len(arr)):
        for j in range(len(arr[i])):
            arr[i][j]=int(arr[i][j])
    return arr

def finalize(Dark,Dark2,Flat,Flat2,Cerenkov,Cerenkov2,UV,UV2,UVFlat,UVFlat2,Bright,Bright2,BrightFlat,BrightFlat2):
    ####print('dark')
    Dark = makeFileArray(Dark,Dark2)
    ####print('flat')
    Flat = makeFileArray(Flat,Flat2)
    ####print('cerenkov')
    Cerenkov = makeFileArray(Cerenkov,Cerenkov2)
    ####print('UV')
    UV = makeFileArray(UV,UV2)
    ###print('UVFLAt')
    UVFlat = makeFileArray(UVFlat,UVFlat2)
    ###print('b')
    Bright = makeFileArray(Bright,Bright2)
    ###print('bf')
    BrightFlat = makeFileArray(BrightFlat,BrightFlat2)
    if isStorage(Cerenkov):
        Cerenkov = np.loadtxt('./SampleData/DMSO140-160')
    if isStorage(Dark):
        Dark= Image.open('./SampleData/masterdark.tiff')
        Dark = np.asarray(Dark)
        
    if isStorage(Flat):
        Flat= Image.open('./SampleData/masterflat.tiff')
        Flat = np.asarray(Flat)
    return startUp(Dark,Flat,Cerenkov,UV,UVFlat,Bright,BrightFlat)

def startUp(Dark,Flat,Cerenkov,UV,UVFlat,Bright,BrightFlat):
    
    doUV = True
    
    if int(isStorage(UV))  +int(isStorage(Bright)) ==1:
        if isStorage(UV):
            UV = Bright
            UVFlat = BrightFlat
        else:
            Bright = UV
            BrightFlat = UVFlat
    if (isStorage(UV)) and (isStorage(Bright)):
        doUV = False
        
        
    if doUV:
        if isStorage(UVFlat) and isStorage(BrightFlat):
            UVFlat = np.zeros_like(UV)+1
    
         
    Cerenkov = Cerenkov-Dark
    Cerenkov = Cerenkov/Flat
    Cerenkov = filters.median(Cerenkov)
    Cerenkov = transform.rotate(Cerenkov,270)
     
    C2 = Cerenkov.copy()
    tim = time.time()
    
    
    
    t = time.time()

     
    disk = morphology.disk(25)
    background = morphology.opening(Cerenkov,selem=disk)
    mean = np.mean(background)
    
    C2 = Cerenkov.copy()
    Cerenkov -= background.copy()   
    C2-=np.median(C2)
    ROIs=[]
    
    Cerenkov-=np.median(Cerenkov)
    if doUV:
        Cerenkov_show= Cerenkov.copy()
        Cerenkov_show = Cerenkov_show-np.min(Cerenkov_show)
        Cerenkov_show = Cerenkov_show *1/np.max(Cerenkov_show)
        Cerenkov_show = Image.fromarray((np.uint8(plt.get_cmap('viridis')(Cerenkov_show)*255)))
    if doUV:
        UV/=UVFlat
        UV = transform.rotate(UV,270)
        UV = filters.median(UV)
        UV = (np.max(UV)-UV)
        UV-=np.min(UV)
        UV *= ((np.max(Cerenkov)-np.min(Cerenkov))/(np.max(UV)-np.min(UV)))
        timee = time.time()
        UV -=morphology.opening(UV,morphology.disk(30))
        UV = UV**.65
        UV*=(np.max(Cerenkov))/(np.max(UV))
        UV_show = UV.copy()
    if doUV:
        UV_show= UV.copy()
        UV_show = UV_show-np.min(UV_show)
        UV_show = UV_show *1/np.max(UV_show)
        UV_show = Image.fromarray((np.uint8(plt.get_cmap('viridis')(UV_show)*255)))

    if  not doUV:
        display_img = C2.copy()
    if doUV:
        display_img=UV.copy()+C2.copy()
        display_img_calc = Cerenkov.copy()
    if not doUV:
        return display_img,Cerenkov,doUV,C2,ROIs
    else:
        return display_img,display_img_calc,doUV,Cerenkov_show,UV_show,C2,Cerenkov,ROIs

def isStorage(item):
    return("FileStorage" in str(type(item)))

def is_unique_key(num):
    directory = os.listdir(os.path.join(app.config['IMAGE_UPLOAD_PATH'], ''))
    for i in directory:
        if str(num) in i:
            return False
    return True

def generate_key():
    num=1
    while True:
        num = int((10**11)*np.random.rand())
        #print(num)
        num=np.base_repr(num,base=16)
        #print(num)
        if is_unique_key(num):
            break
    return num
    
    
    
    
# TODO: update to recognize different types of images files
# (also maybe extract EXIF information if exists for certain types of image files)    
def makeFileArray(fileN,fileN1):
    tim = time.time()
    try:
        fileN1 = np.loadtxt(fileN1)
        fileN = fileN1
        
    except:
        try:
            fileN = Image.open(fileN.stream)
            fileN = np.asarray(fileN)
        except:
            pass
    ####print(time.time()-tim)
    return fileN

'''
def add_dir(email):
    #print('here')
    # TODO: change file structure to
    # /image/<equip_ip>/dark, flat, bright, radiation ??

    os.mkdir(f"./users/{email}")
    os.mkdir(f"./users/{email}/files")
    file = open(f"./users/{email}/files/desc.txt", "w")
    file.close()
    os.mkdir(f"./users/{email}/files/Cerenkov")
    os.mkdir(f"./users/{email}/files/Darkfield")
    os.mkdir(f"./users/{email}/files/Flatfield")
    os.mkdir(f"./users/{email}/files/UV")
    os.mkdir(f"./users/{email}/files/UVFlat")
    os.mkdir(f"./users/{email}/files/Brightfield")
    os.mkdir(f"./users/{email}/files/BrightfieldFlat")
'''

'''
def findName(name,start,end):
    return name[name.index(start)+len(start):name.index(end)]
def findCerenkov(name):
    return findName(name,"c@~","cd@~")
def findDark(name):
    return findName(name,"cd@~","cf@~")
def findFlat(name):
    return findName(name,"cf@~","u@~")
def findUV(name):
    return findName(name,"u@~","uf@~")
def findUVFlat(name):
    return findName(name,"uf@~","l@~")
def findL(name):
    return findName(name,"l@~",".npy")
def findFiles(lanes,cerenkName,darkName,flatName,UVName,UVFlatName):
    list_dir = os.listdir('./database')
    names = []
    
    #print(lanes)
    for i in list_dir:
        arr =[]
        if (cerenkName in findCerenkov(i)) and (darkName in findDark(i)) and (flatName in findFlat(i)) and (UVName in findUV(i)) and (UVFlatName in findUVFlat(i)) and (str(lanes) in findL(i)):
            arr.append(findCerenkov(i))
            arr.append(findDark(i))
            arr.append(findFlat(i))
            arr.append(findUV(i))
            arr.append(findUVFlat(i))
            arr.append(findL(i))
            names.append(arr)
    return names
'''

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
    # Prepare and clear folders for images
    from filestorage import create_file_storage
    create_file_storage()
    # Prepare and clear database tables
    db_create_tables() 
    # Add initial testing data
    db_add_test_data() 


#@app.before_request
#def initialize_request():
#    # Do nothing

@app.teardown_request
def teardown(exception):
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
        return prepare_user_response(None, True, 'Not logged in')

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
@app.route('/<object_type>/load/<object_id>', methods = ['GET'])
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
        # TODO: fix this exception
        if (object_type == 'image'):
            from database import convert_image_type_to_string
            record.image_type = convert_image_type_to_string(record.image_type)
        return record.as_dict()

# Generic handler to save object not caught by earlier routes
# Return { id:<ID> }
# TODO: for now front-end only has 'save' option, not 'create' and 'update'
@app.route('/<object_type>/save', methods = ['POST'])
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
@app.route('/<object_type>/search', methods = ['GET'])
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
    # TODO: TEMP: remove the need for this hack for 'image' type
    if (object_type == 'image'):
        from database import convert_image_type_to_string
        for index, value in enumerate(record_list):
            record_list[index].image_type = convert_image_type_to_string(value.image_type)
    return { 'results': [record.as_dict() for record in record_list] }

@app.route('/<object_type>/search/favorites', methods = ['GET'])
@cross_origin(supports_credentials=True)
def object_search_favorites(object_type):
    return object_search(object_type, {'favorites': {'user_id': flask_login.current_user.get_id()}})

#
# TODO: LEGACY METHODS -- NEED TO INTEGRATE WITH GENERIC HANDLERS
#

@app.route('/image/save', methods = ['POST'])
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





@app.route('/get_data',methods = ['POST'])
@cross_origin(supports_credentials=True)
def findData():
    np.load.__defaults__=(None, True, True, 'ASCII')
    np_load_old = np.load
    #print(request.form["files"])

'''
@app.route("/database_retrieve",methods=["POST"])
@cross_origin(supports_credentials=True)
def ret_data():
    return({"files":findFiles(request.form["Lanes"],request.form["Cerenkov"],request.form["Darkfield"],request.form["Flatfield"],request.form["UV"],request.form["UVFlat"])})
'''

@app.route('/fix_background/<num>')
@cross_origin(supports_credentials=True)
def fix_background(num):
    #print('f')
    img = session.get('cerenkovradii')
    tim = time.time()
    val = img.copy()
    img-=np.min(img)
    img+=.001
    ideal_r = 25
    #print(ideal_r)
    b4=morphology.opening(img,morphology.disk(ideal_r-10))
    b0 = morphology.closing(img,morphology.disk(ideal_r))
    b1 = morphology.opening(img,morphology.disk(ideal_r+5))
    b2 = morphology.opening(img,morphology.disk(ideal_r))
    b3 = morphology.opening(img,morphology.disk(ideal_r-5))
    b = b1.copy()
    c = ideal_r*2
    arr = np.array([[-1*ideal_r,1],[ideal_r-10,1],[0,1],[ideal_r-5,1],[ideal_r,1],[ideal_r+5,1]])
    arr = np.linalg.pinv(arr)
    for i in range(len(b)):
        
        for j in range(len(b[i])):
            if abs(b3[i][j]-b1[i][j])>20:
                arr2=arr @ np.log(np.array([b0[i][j],b4[i][j],img[i][j],b3[i][j], b2[i][j], b1[i][j]]))
                x = arr2[0]
                y=arr2[1]
                b[i][j] = np.exp(y)*np.exp(x*c)
    b=filters.median(b,selem=morphology.rectangle(40,2))
    b=filters.median(b,selem=morphology.rectangle(2,40))
    img-=b
    img-=np.median(img)
    path = retrieve_image_path('cerenkovcalc',num)
    os.remove(path)
    np.save(path,img)
    img-=np.min(img)
    img/=np.max(img)   
    #print(time.time()-tim)
    ## TODO: these images should be 16-bit... this might be truncating
    ## them...
    img = Image.fromarray((np.uint8(plt.get_cmap('viridis')(img)*255)))
    filepath = retrieve_image_path('cerenkovdisplay',num)
    os.remove(filepath)
    img.save(filepath)
    return {'r':2}


@app.route('/user/login/<login_method>', methods=['POST'])
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
        try:
            id_info = id_token.verify_oauth2_token(token, requests.Request(),client_id)
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

@app.route('/user/logout', methods=['POST'])
#@flask_login.login_required
@cross_origin(supports_credentials=True)
def user_logout():
    if flask_login.current_user.is_authenticated: 
        flask_login.logout_user() # Part of flask_login
        return prepare_session_response(None, False, 'Successful logout')
    else:
        return prepare_session_response(None, True, 'Not logged in')

'''    
# Google-signin
# TODO: needs to be linked to our user table (and create a new user upon first login, if email not already exist)

@app.route('/sign_in',methods=['POST'])
@cross_origin(supports_credentials=True)
def sign_in():
    email = request.form["email"]
    session['email']=email
    arr= np.zeros((1000,1000))
    for i in range(len(arr)):
        for j in range(len(arr[i])):
            arr[i][j]=i+j
        
    session['based_arr'] = arr
    print(session.get('email'))
    return 'kk'
'''

@app.route('/autoselect/<filename>',methods=['POST','GET'])
@cross_origin(supports_credentials=True)
def autoselect(filename):
    analysis_data = retrieve_initial_analysis(filename)
    analysis_retrieve = analysis(analysis_data['ROIs'],None,analysis_data['origins'],filename,'UVName' in analysis_data, analysis_data['doRF'],False)
    img = session['cerenkovcalc']
    imgR=session['cerenkovradii']
    analysis_retrieve.predict_ROIs(img,imgR)

    return {'selected_ROIs':[analysis_retrieve.ROIs]}


@app.route('/analysis_edit/<filename>',methods = ['POST'])
@cross_origin(supports_credentials=True)
def analysis_edit(filename):
    doRF = request.form['doRF']=='true'
    doUV = request.form['doUV']=='true'
    autoLane=request.form['autoLane']=='true' and not (doRF or doUV)
    if autoLane:
        num_lanes=int(request.form['n_l'])
    else:
        num_lanes=1
    
    
    ##print(request.form['autoLane'])
    ##print(request.form['autoLane']=='true' and (not doRF and not doUV))
    ##print(autoLane)

    try:
        newOrigins = ast.literal_eval(request.form.getlist('origins')[0])
        
    except:
        newOrigins = []
    newOrigins = [newOrigins]

    newROIs = (request.form.getlist('ROIs'))
    #print(newROIs)
    #print(newROIs[0])
    #print(newROIs[0][0])
    newROIs = ast.literal_eval(newROIs[0])
    #print(newROIs)
    newROIs = Analysis.flatten(newROIs)
    #print('n',newROIs)
    analysis = Analysis(newROIs, num_lanes,newOrigins,filename,doUV,doRF,autoLane)
    analysis.sort2(analysis.origins,index = 0)
    analysis.origins=analysis.origins[0]
    analysis.origins = analysis.origins[::-1]
    analysis.organize_into_lanes()
    data = {}
    data['ROIs'] = analysis.ROIs
    data['origins'] =analysis.origins
    data['doRF'] =  doRF

    db_analysis_edit(data,filename)
    return{"ROIs":analysis.ROIs}
    
    
    
@app.route('/retrieve_analysis/<filename>',methods=['GET'])
@cross_origin(supports_credentials=True)
def retrieve_analysis(filename):
    # TODO: if store data in session, should also store the analysis ID
    # to make sure
    session['cerenkovcalc'] = np.load(retrieve_image_path('cerenkovcalc',filename))
    session['cerenkovradii']=np.load(retrieve_image_path('cerenkovradii',filename))
    analysis_retrieved = retrieve_initial_analysis(filename)
    return{
        'analysis_id':filename,
        'ROIs':analysis_retrieved['ROIs'],
        'origins':analysis_retrieved['origins'],
        'doRF':analysis_retrieved['doRF'],
        'filenumber':filename,
        'name':analysis_retrieved['name'],
        'description': analysis_retrieved['description'],
        'owner_id': analysis_retrieved['owner_id'],
    }

@app.route('/time', methods = ['POST','GET'])
@cross_origin(supports_credentials=True)
def createFile():
    if request.method == 'POST':
        
        Dark = request.files['Dark']
        Dark2 = request.files['Dark']
        Flat = request.files['Flat']
        Cerenkov = request.files['Cerenkov']
        UV = request.files['UV']
        UVFlat = request.files['UVFlat']
        Bright = request.files['Bright']
        BrightFlat = request.files['BrightFlat']
        Flat2 = request.files['Flat']
        Cerenkov2 = request.files['Cerenkov']
        UV2 = request.files['UV']
        UVFlat2 = request.files['UVFlat']
        Bright2 = request.files['Bright']
        BrightFlat2 = request.files['BrightFlat']
        CerenkovName=request.form['CerenkovName']
        UVName=request.form['UVName']
        BrightName=request.form['BrightName']
        DarkName=request.form['DarkName']
        UVName=request.form['UVName']
        UVFlatName=request.form['UVFlatName']
        BrightFlatName=request.form['BrightFlatName']
        FlatName=request.form['FlatName']

        ##print('r',request.form)
        
        names = [CerenkovName,DarkName,FlatName,UVName,UVFlatName,BrightName,BrightFlatName]

        
        tim = generate_key()
        img_cerenk = finalize(Dark,Dark2,Flat,Flat2,Cerenkov,Cerenkov2,UV,UV2,UVFlat,UVFlat2,Bright,Bright2,BrightFlat,BrightFlat)
        Cerenkov = img_cerenk[1]
        os.mkdir(os.path.join(app.config['IMAGE_UPLOAD_PATH'], tim))
        np.save(os.path.join(app.config['IMAGE_UPLOAD_PATH'], tim, 'cerenkovradii.npy'), Cerenkov)
        ### np.save("./UPLOADS/"+tim+'/cerenkovradii.npy',Cerenkov)
        img = img_cerenk[0]
        doUV = img_cerenk[2]
        current_analysis = Analysis([],0,[],tim,doUV,doUV,doUV,names)
        if doUV:
            calc = img_cerenk[-3]
        else:
            calc = img_cerenk[-2]

        np.save(os.path.join(app.config['IMAGE_UPLOAD_PATH'], tim, 'cerenkovcalc.npy'), calc) ### "./UPLOADS/"+tim+'/cerenkovradii.npy',Cerenkov)
        ### np.save('./UPLOADS/'+tim+'/cerenkovcalc.npy',calc)
        
        img = img-np.min(img)
        img = img *1/np.max(img)
        img = Image.fromarray((np.uint8(plt.get_cmap('viridis')(img)*255)))
        filepath = os.path.join(app.config['IMAGE_UPLOAD_PATH'], tim, 'cerenkovdisplay.png')
        img.save(filepath)
        if doUV:
            Cerenkov_show = img_cerenk[3]
            UV_show = img_cerenk[4]
            Cerenkov_show.save(os.path.join(app.config['IMAGE_UPLOAD_PATH'], tim, 'Cerenkov.png'))
            UV_show.save(os.path.join(app.config['IMAGE_UPLOAD_PATH'], tim, 'UV.png'))
            calc = img_cerenk[-2]
            np.save(os.path.join(app.config['IMAGE_UPLOAD_PATH'], tim, 'cerenkovcalc.npy'),calc)
        current_analysis.predict_ROIs(calc,Cerenkov)
        data = {}
        data['radio_name'] = CerenkovName
        data['dark_name']=DarkName
        data['flat_name']=FlatName
        data['uv_name'] = UVName
        data['bright_name'] = BrightName
        data['dark'] = request.files['Dark']
        data['flat']=request.files['Flat']
        data['radio'] = request.files['Cerenkov']
        data['uv'] = request.files['UV']
        data['bright'] = request.files['Bright']
        data['ROIs'] = [current_analysis.ROIs]
        data['origins'] = []
        data['doRF'] = False
        data['name'] = request.form['name']
        data['description'] = request.form['description']

        data['user_id'] = flask_login.current_user.get_id()
        
        db_analysis_save_initial(data, tim)
        #print('success')
        
        #print(analysis.build_analysis(np.load(f'./UPLOADS/analysis{tim}.npy')))
        
        ###print(points)
        
        res = tim
        return {"res":res}

# Retrieve a file
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
    
# TODO: add something similar for thumbnails of the image objects
@app.route('/img/<filename>',methods = ['GET'])
@cross_origin(supports_credentials=True)
def give(filename):
    filen = retrieve_image_path('cerenkovdisplay',filename)
    print(filen)
    return send_file(filen)

@app.route('/radius/<filename>/<x>/<y>/<shift>',methods = ['POST', 'GET'])
@cross_origin(supports_credentials=True)
def findRadius(filename,x,y,shift):
    ROIs = request.form.getlist('ROIs')
    ROIs = ast.literal_eval(ROIs[0])
    print(ROIs)
    
    tim = time.time()
    img = session.get('cerenkovradii')
    rowRadius = 0
    colRadius = 0
    num_zeros = 0

    row = int(y)
    col = int(x)
    #print(shift)
    if (shift=='0'):
        for i in range(3):
            center  = Analysis.find_RL_UD(img,[(row,col)])
            row = center[0][0]
            col=center[0][1]
    val =1.35*(np.mean(img[:,150:len(img[0])-150]))
    max_zeros = 25
    thickness = 8
    while num_zeros<max_zeros and row+rowRadius<len(img) and row-rowRadius>0:
        for i in range(round(-thickness/2),round(thickness/2)):
            if img[(row+rowRadius)][(col+i)] <=val:
                    num_zeros +=1
            if img[row-rowRadius][col+i]<=val:
                num_zeros+=1
        rowRadius+=1
    num_zeros = 0
    while num_zeros<max_zeros and col+colRadius<len(img) and col-colRadius>0:
        for i in range(round(-thickness/2),round(thickness/2)):
            if img[row+i][col+colRadius] <= val:
                num_zeros +=1
            if img[row+i][col-colRadius] <=val:
                num_zeros+=1
        colRadius+=1
    if shift ==('1'):
        rowRadius,colRadius = 0,0
    rowRadius,colRadius = min(max(rowRadius+3,14),55),min(max(colRadius+3,14),55)
    
    
    ROIs[0].append([int(y),int(x),int(rowRadius),int(colRadius)])
    ROIs = Analysis.flatten(ROIs)
    print('2',ROIs)
    num_lanes = Analysis.numLanes_finder(ROIs)
    return{"col":col,"row":row,"colRadius":colRadius,"rowRadius":rowRadius,"n_l":num_lanes}
    
@app.route('/UV/<filename>',methods = ['GET'])
@cross_origin(supports_credentials=True)
def giveUV(filename):
    filen = os.path.join(app.config['IMAGE_UPLOAD_PATH'], filename, 'UV.png') 
    return send_file(filen)

@app.route('/Cerenkov/<filename>',methods = ['GET'])
@cross_origin(supports_credentials=True)
def giveCerenkov(filename):
    filen = retrieve_image_path('cerenkovdisplay',filename) 
    return send_file(filen)

    
@app.route('/data/',methods=['POST'])
@cross_origin(supports_credentials=True)
def data():
    np.load.__defaults__=(None, True, True, 'ASCII')
    np_load_old = np.load
    CerenkovName=request.form['CerenkovName']
    UVName=request.form['UVFlatName']
    DarkName=request.form['DarkName']
    UVName=request.form['UVName']
    UVFlatName=request.form['UVFlatName']
    FlatName=request.form['FlatName']
    Lanes = request.form['Lanes']
    name = f'c@~{CerenkovName}cd@~{DarkName}cf@~{FlatName}u@~{UVName}uf@~{UVFlatName}l@~{Lanes}'
    filename = str(np.load(f'./database/{name}.npy'))
    #print('fname:',filename)
    return {'Key':filename}

@app.route('/results/<filename>',methods = ['GET'])
@cross_origin(supports_credentials=True)
def results(filename):
        analysis_data = retrieve_initial_analysis(filename)
        analysis_retrieve = Analysis(analysis_data['ROIs'],None,analysis_data['origins'],filename,'UVName' in analysis_data, analysis_data['doRF'],False)
        analysis_results = analysis_retrieve.results()

        #print(analysis_results)
        return{"arr":analysis_results}

@app.route('/upload_data/<filename>',methods=['POST'])
@cross_origin(supports_credentials=True)
def upload_data(filename):
    analysis = retrieve_initial_analysis(filename)
    data = request.form.to_dict()
    data['user_id'] = flask_login.current_user.get_id()
    db_analysis_save(data,filename)
    return 'yes'

    
if __name__ == '__main__':
    # TODO: consider what should go here, in 'before_app_first_request' or at the top of this file
    # (This is only run when it is the main app, not included in another file)
    ##print("Running!")
    app.run(host='0.0.0.0',debug=False,port=5000)
