# File storage

from flask import current_app as app 
import os
import shutil

# File system configuration (global variable for convenience)
file_path_config = {}

# Create file storage. Uses the db_name as root folder to allow co-existing databases.

def initialize_file_storage(db_name, reset=False):

    print (f"Initializing file storage (db_name={db_name})...")

    # Define pathnames
    global file_path_config
    file_path_config = {
        'USER_PHOTO_UPLOAD_PATH': f"./FILES/{db_name}/UPLOADS/USER/PHOTO",
        'USER_THUMBNAIL_PATH': f"./FILES/{db_name}/CACHE/USER/THUMBNAIL",
        'USER_AVATAR_PATH': f"./FILES/{db_name}/CACHE/USER/AVATAR",
        'IMAGE_FILE_UPLOAD_PATH': f"./FILES/{db_name}/UPLOADS/IMAGE/FILE",
        'IMAGE_THUMBNAIL_PATH': f"./FILES/{db_name}/CACHE/IMAGE/THUMBNAIL",
        'ANALYSIS_WORKING_PATH': f"./FILES/{db_name}/CACHE/ANALYSIS/",
    }

    # If 'reset' is True, delete the currently stored paths/files
    if (reset):

        print ("  Reset option selected")
        print ("  Removing UPLOAD and CACHE paths...")
        try:
            shutil.rmtree(f"./FILES/{db_name}/UPLOADS")
        except FileNotFoundError:
            pass
        try:
            shutil.rmtree(f"./FILES/{db_name}/CACHE")
        except FileNotFoundError:
            pass

        print ("  Creating UPLOAD and CACHE hierarchies...")
        path_list = [
            'USER_PHOTO_UPLOAD_PATH',
            'USER_THUMBNAIL_PATH',
            'USER_AVATAR_PATH',
            'IMAGE_FILE_UPLOAD_PATH',
            'IMAGE_THUMBNAIL_PATH',
            'ANALYSIS_WORKING_PATH',
        ]
        for path in path_list:
            try:
                os.makedirs(file_path_config[path], exist_ok=False)
            except OSError as e:
                print (f"Error creating: {e.filename} - {e.strerror}")

# Helper functions to find pathnames
# For uploads, we try to preserve the original filename from the user.
# For cached images, we use some variation on object_id as the filename.

def user_photo_upload_path(user_id, source_filename=None):
    check_if_initialized()
    if (source_filename is None):
        # When source_filename is blank, retrieve from the database object
        from database import db_object_load
        user = db_object_load('user', user_id)
        source_filename = user.photo_filename
    return os.path.join(file_path_config['USER_PHOTO_UPLOAD_PATH'], str(user_id), source_filename)
    # path/<user_id>/<source_filename>

def user_thumbnail_path(user_id):
    check_if_initialized()
    return os.path.join(file_path_config['USER_THUMBNAIL_PATH'], f"{str(user_id)}.png")
    # path/<user_id>.png

def user_avatar_path(user_id):
    check_if_initialized()
    return os.path.join(file_path_config['USER_AVATAR_PATH'], f"{str(user_id)}.png")
    # path/<user_id>.png

def image_file_upload_path(image_id, source_filename=None):
    check_if_initialized()
    if (source_filename is None):
        # When source_filename is blank, retrieve it from the database object
        from database import db_object_load
        image = db_object_load('image', image_id)
        source_filename = image.filename
    return os.path.join(file_path_config['IMAGE_FILE_UPLOAD_PATH'], str(image_id), source_filename)
    # path/<image_id>/<source_filename>

def image_thumbnail_path(image_id):
    check_if_initialized()
    return os.path.join(file_path_config['IMAGE_THUMBNAIL_PATH'], f"{str(image_id)}.png")
    # path/<image_id>.png

def analysis_display_path(analysis_id):
    check_if_initialized()
    return os.path.join(file_path_config['ANALYSIS_WORKING_PATH'], str(analysis_id), 'display.png')
    # path/<analysis_id>/display.png

def analysis_display_radio_path(analysis_id):
    check_if_initialized()
    return os.path.join(file_path_config['ANALYSIS_WORKING_PATH'], str(analysis_id), 'display-radio.png')
    # path/<analysis_id>/display.png

def analysis_display_bright_path(analysis_id):
    check_if_initialized()
    return os.path.join(file_path_config['ANALYSIS_WORKING_PATH'], str(analysis_id), 'display-bright.png')
    # path/<analysis_id>/display-bright.png

def analysis_display_uv_path(analysis_id):
    check_if_initialized()
    return os.path.join(file_path_config['ANALYSIS_WORKING_PATH'], str(analysis_id), 'display-uv.png')
    # path/<analysis_id>/display-uv.png

def analysis_compute_path(analysis_id):
    check_if_initialized()
    return os.path.join(file_path_config['ANALYSIS_WORKING_PATH'], str(analysis_id), 'compute.npy')
    # path/<analysis_id>/compute.npy

def analysis_roi_path(analysis_id):
    check_if_initialized()
    return os.path.join(file_path_config['ANALYSIS_WORKING_PATH'], str(analysis_id), 'radii.npy')
    # path/<analysis_id>/radii.npy

# Check if file storage is initialized
def check_if_initialized():
    global file_path_config
    if not file_path_config:
        print ("Error: File storage not initialized")
        # TODO: raise exception?
    return None

# Retrieve a pathname
def get_pathname(object_type, file_type, object_id):
    if (object_type == 'user' and file_type == 'photo'):
        pathname = user_photo_upload_path(object_id)
    elif (object_type == 'user' and file_type == 'thumbnail'):
        pathname = user_thumbnail_path(object_id)
    elif (object_type == 'user' and file_type == 'avatar'):
        pathname = user_avatar_path(object_id)
    elif (object_type == 'image' and file_type == 'file'):
        pathname = image_file_upload_path(object_id)
    elif (object_type == 'image' and file_type == 'thumbnail'):
        pathname = image_thumbnail_path(object_id)
    elif (object_type == 'analysis' and file_type == 'display'):
        pathname = analysis_display_path(object_id)
    elif (object_type == 'analysis' and file_type == 'display-radio'): # TODO: need this?
        pathname = analysis_display_radio_path(object_id)
    elif (object_type == 'analysis' and file_type == 'display-bright'): # TODO: need this?
        pathname = analysis_display_bright_path(object_id)
    elif (object_type == 'analysis' and file_type == 'display-uv'): # TODO: need this?
        pathname = analysis_display_uv_path(object_id)
    elif (object_type == 'analysis' and file_type == 'compute'):
        pathname = analysis_compute_path(object_id)
    elif (object_type == 'analysis' and file_type == 'radii'): # TODO: rename this? what is it for exactly?
        pathname = analysis_roi_path(object_id)
    else:
        pathname = None
    return pathname

# Save a file
def save_file(file, pathname):
    try:
        os.remove(pathname)
    except:
        pass
    os.makedirs(os.path.dirname(pathname), exist_ok=True)
    file.save(pathname)
    file.close()

def save_array(array, pathname):
    try:
        os.remove(pathname)
    except:
        pass
    os.makedirs(os.path.dirname(pathname), exist_ok=True)
    import numpy
    numpy.save(pathname, array)
