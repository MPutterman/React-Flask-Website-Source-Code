# Utility functions for handling permissions 

import flask_login
import functools

# Define decorator for checking permissions for API calls
# TODO: IMPORTANT: decorator not yet working since the 'id' has to be captured somehow from @app.route
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
    # TODO: temp
    return True
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
    elif (permission == 'search'):
        return True
    elif (permission == 'clone'):
        return has_permission(object_type, 'view', object_id, user) and has_permission(object_type, 'create', None, user)
    else:
        # Return False for any unsupported permission type
        return False

# List the allowed permissions for the current user for a particular resource or object_type
# TODO: implement caching to avoid so many calls to is_owner
def list_permissions (object_type, object_id=None, user=flask_login.current_user):
    all_actions = ['view', 'edit', 'delete', 'restore', 'purge', 'create', 'search', 'clone']
    allowed_actions = []
    for action in all_actions:
        if has_permission (object_type, action, object_id, user):
            allowed_actions.append(action)
    # TODO: temp
    # return allowed_actions
    return all_actions
