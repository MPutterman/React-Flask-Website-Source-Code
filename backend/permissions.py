# Utility functions for handling permissions and object-handling wrappers
#
# TODO:
# * When saving data, add field sanitizing functions (e.g. against SQL injection)
# * Separate out create and save handling
# * Unify handling of 'owner_id', 'modified', 'created', 'deleted'
# * Unify naming and handling of 'id' and 'name' fields
# * Be careful of string versus number IDs!!!

import flask_login
import functools

from database import db_user_load, db_image_load
# from database import db_analysis_load, db_plate_load, db_cover_load, db_org_load

# Define decorator for checking permissions for API calls
# TODO: decorator not yet working since the 'id' has to be captured somehow from @app.route
def check_permission (object_type, object_id, permission):
    def decorator_check_permission(func):
        @functools.wraps(func)
        def wrapper_check_permission(*args, **kwargs):
            if (has_permission(object_type, permission, object_id, flask_login.current_user)):
                return func(*args, **kwargs)
            else:
                return { 'error': 'Not authorized' }, 403
        return wrapper_check_permission
    return decorator_check_permission


# Determine if user has role
# TODO: implement roles
def has_role (role, user=flask_login.current_user):
    #roles = user.roles
    #return role in roles
    return False


# Determine if user is owner of object
def is_owner (object_type, object_id, user=flask_login.current_user):
    record = object_load(object_type, object_id)
    if (record):
        if (object_type == 'user'):
            owner_id = record.user_id
        else:
            owner_id = record.owner_id
        return owner_id == int(user.get_id())
    else:
        return False
        # TODO: any other error handling?

# Check permission
def has_permission (object_type, permission, object_id=None, user=flask_login.current_user):
    print (f"Permission check [Permission: {permission}, Resource: {object_type} {object_id}, Identity: user {user.get_id()}]")
    if (permission == 'view'):
        return True
    elif (permission == 'view-deleted'):
        return has_role('admin', user) or is_owner(object_type, object_id, user)
    elif (permission == 'edit'):
        return has_role('admin', user) or is_owner(object_type, object_id, user)
    elif (permission == 'delete'):
        return has_role('admin', user) or is_owner(object_type, object_id, user)
    elif (permission == 'restore'):
        return has_role('admin', user) or is_owner(object_type, object_id, user)
    elif (permission == 'purge'):
        return has_role('admin', user)
    elif (permission == 'create'): 
        return True
    else:
        # Return False for any unsupported permission type
        return False

# Wrapper to load generic object
def object_load(object_type, object_id):

    if (not has_permission(object_type, 'view', object_id)):
        return api_error_response(HTTPStatus.FORBIDDEN, 'Not Authorized')
    else:
        if (object_type == 'user'):
            return db_user_load(object_id)
        elif (object_type == 'org'):
            return db_org_load(object_id)
        elif (object_type == 'image'):
            return db_image_load(object_id)
        elif (object_type == 'analysis'):
            return db_analysis_load(object_id)
        elif (object_type == 'plate'):
            return db_plate_load(object_id)
        elif (object_type == 'cover'):
            return db_cover_load(object_id)
        else:
            return api_error_response(HTTPStatus.NOT_FOUND, 'Unsupported object type')

# Wrapper to create a generic object
def object_create(object_type, object_id=None):

    if (not has_permission(object_type, 'create', object_id)):
        return api_error_response(HTTPStatus.FORBIDDEN, 'Not Authorized')
    else:
        if (object_type == 'user'):
            return db_user_create(object_id)
        elif (object_type == 'org'):
            return db_org_create(object_id)
        elif (object_type == 'image'):
            return db_image_create(object_id)
        elif (object_type == 'analysis'):
            return db_analysis_create(object_id)
        elif (object_type == 'plate'):
            return db_plate_create(object_id)
        elif (object_type == 'cover'):
            return db_cover_create(object_id)
        else:
            return api_error_response(HTTPStatus.NOT_FOUND, 'Unsupported object type')

# Wrapper to save generic object
def object_save(object_type, object_id=None):

    if (object_id is None):
        return object_create(object_type, object_id)
    
    else:

        if (not has_permission(object_type, 'edit', object_id)):
            return api_error_response(HTTPStatus.FORBIDDEN, 'Not Authorized')
        else:
            if (object_type == 'user'):
                return db_user_save(object_id)
            elif (object_type == 'org'):
                return db_org_save(object_id)
            elif (object_type == 'image'):
                return db_image_save(object_id)
            elif (object_type == 'analysis'):
                return db_analysis_save(object_id)
            elif (object_type == 'plate'):
                return db_plate_save(object_id)
            elif (object_type == 'cover'):
                return db_cover_save(object_id)
            else:
                return api_error_response(HTTPStatus.NOT_FOUND, 'Unsupported object type')

# Wrapper to delete generic object
def object_delete(object_type, object_id):

    if (not has_permission(object_type, 'delete', object_id)):
        return api_error_response(HTTPStatus.FORBIDDEN, 'Not Authorized')
    else:
        if (object_type == 'user'):
            return db_user_delete(object_id)
        elif (object_type == 'org'):
            return db_org_delete(object_id)
        elif (object_type == 'image'):
            return db_image_delete(object_id)
        elif (object_type == 'analysis'):
            return db_analysis_delete(object_id)
        elif (object_type == 'plate'):
            return db_plate_delete(object_id)
        elif (object_type == 'cover'):
            return db_cover_delete(object_id)
        else:
            return api_error_response(HTTPStatus.NOT_FOUND, 'Unsupported object type')

# Wrapper to restore generic object
def object_restore(object_type, object_id):

    if (not has_permission(object_type, 'restore', object_id)):
        return api_error_response(HTTPStatus.FORBIDDEN, 'Not Authorized')
    else:
        if (object_type == 'user'):
            return db_user_restore(object_id)
        elif (object_type == 'org'):
            return db_org_restore(object_id)
        elif (object_type == 'image'):
            return db_image_restore(object_id)
        elif (object_type == 'analysis'):
            return db_analysis_restore(object_id)
        elif (object_type == 'plate'):
            return db_plate_restore(object_id)
        elif (object_type == 'cover'):
            return db_cover_restore(object_id)
        else:
            return api_error_response(HTTPStatus.NOT_FOUND, 'Unsupported object type')

# Wrapper to purge generic object
# TODO: also delete/purge all dependent objects?
def object_delete(object_type, object_id):

    if (not has_permission(object_type, 'purge', object_id)):
        return api_error_response(HTTPStatus.FORBIDDEN, 'Not Authorized')
    else:
        if (object_type == 'user'):
            return db_user_purge(object_id)
        elif (object_type == 'org'):
            return db_org_purge(object_id)
        elif (object_type == 'image'):
            return db_image_purge(object_id)
        elif (object_type == 'analysis'):
            return db_analysis_purge(object_id)
        elif (object_type == 'plate'):
            return db_plate_purge(object_id)
        elif (object_type == 'cover'):
            return db_cover_purge(object_id)
        else:
            return api_error_response(HTTPStatus.NOT_FOUND, 'Unsupported object type')



