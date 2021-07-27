# TODO: define login_view for flask_login_required
# that returns { error: <message> }, with status 401 not authorized to frontend


# Utility functions for handling permissions

import flask_login
import functools

from database import db_user_load, db_image_load
# from database import db_analysis_load, db_plate_load, db_cover_load

# Define decorator for checking permissions for API calls
def check_permission (object_type, object_id, permission):
    def decorator_check_permission(func):
        @functools.wraps(func)
        def wrapper_check_permission(*args, **kwargs):
            if (has_permission(object_type, object_id, permission, flask_login.current_user)):
                return func(*args, **kwargs)
            else:
                return { 'error': 'Not authorized' }, 403
        return wrapper_check_permission
    return decorator_check_permission


# Determine if user has role
def has_role (role, user=flask_login.current_user):
    roles = user.roles
    return role in roles


# Determine if user is owner of object
def is_owner (object_type, object_id, user=flask_login.current_user):
    record = object_load(object_type, object_id)
    if (record):
        if (object_type == 'user'):
            owner_id = record.user_id
        else:
            owner_id = record.owner_id
        return owner_id == user.user_id
    else:
        return False
        # TODO: any other error handling?

# Check permission
def has_permission (object_type, object_id, permission, user=flask_login.current_user):

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
    elif (permission == 'create'): # TODO: this doesn't make sense as there won't be an ID yet
        return True
    else:
        return False
        # TODO: error handling?


# Wrapper to load generic object
def object_load(object_type, object_id):
    if (object_type == 'user'):
        return db_user_load(object_id)
    elif (object_type == 'image'):
        return db_image_load(object_id)
    elif (object_type == 'analysis'):
        return db_analysis_load(object_id)
    elif (object_type == 'plate'):
        return db_plate_load(object_id)
    elif (object_type == 'cover'):
        return db_cover_load(object_id)
    else:
        return {}
        # TODO: error handling?

# TODO: wrapper for deleting and saving

