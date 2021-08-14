# File storage

from flask import current_app as app 
import os
import shutil

# File system configuration

app.config['IMAGE_UPLOAD_PATH'] = './UPLOADS' # REMOVE LATER
app.config['USER_PHOTO_UPLOAD_PATH'] = './UPLOADS/USER/PHOTO' 
app.config['USER_THUMBNAIL_PATH'] = './CACHE/USER/THUMBNAIL'
app.config['USER_AVATAR_PATH'] = './CACHE/USER/AVATAR'
app.config['IMAGE_FILE_UPLOAD_PATH'] = './UPLOADS/IMAGE/FILE'
app.config['IMAGE_THUMBNAIL_PATH'] = './CACHE/IMAGE/THUMBNAIL'
app.config['ANALYSIS_DISPLAY_PATH'] = './CACHE/ANALYSIS/DISPLAY'
app.config['ANALYSIS_COMPUTE_PATH'] = './CACHE/ANALYSIS/COMPUTE'

# Create image storage
# CAREFUL!!! Deletes existing folders and creates new empty folders

def create_file_storage():
    print ("Initializing image storage...")
    print ("Removing UPLOAD and CACHE paths...")
    try:
        shutil.rmtree('./UPLOADS')
    except FileNotFoundError:
        pass
    try:
        shutil.rmtree('./CACHE')
    except FileNotFoundError:
        pass
    print ("Creating UPLOAD and CACHE hierarchies...")
    path_list = [
        'USER_PHOTO_UPLOAD_PATH',
        'USER_THUMBNAIL_PATH',
        'USER_AVATAR_PATH',
        'IMAGE_FILE_UPLOAD_PATH',
        'IMAGE_THUMBNAIL_PATH',
        'ANALYSIS_DISPLAY_PATH',
        'ANALYSIS_COMPUTE_PATH',
    ]
    for path in path_list:
        try:
            os.makedirs(app.config[path], exist_ok=False)
        except OSError as e:
            print (f"Error creating: {e.filename} - {e.strerror}")

# Helper functions to find pathnames
# For uploads, we try to preserve the original filename from the user.
# For cached images, we use some variation on object_id as the filename.

def user_photo_upload_path(user_id, source_filename=None):
    if (source_filename is None):
        # When source_filename is blank, retrieve from the database object
        from database import db_object_load
        user = db_object_load('user', user_id)
        source_filename = user.photo_filename
    return os.path.join(app.config['USER_PHOTO_UPLOAD_PATH'], str(user_id), source_filename)
    # path/<user_id>/<source_filename>

def user_thumbnail_path(user_id):
    return os.path.join(app.config['USER_THUMBNAIL_PATH'], f"{str(user_id)}.png")
    # path/<user_id>.png

def user_avatar_path(user_id):
    return os.path.join(app.config['USER_AVATAR_PATH'], f"{str(user_id)}.png")
    # path/<user_id>.png

def image_file_upload_path(image_id, source_filename=None):
    if (source_filename is None):
        # When source_filename is blank, retrieve it from the database object
        from database import db_object_load
        image = db_object_load('image', image_id)
        source_filename = image.filename
    return os.path.join(app.config['IMAGE_FILE_UPLOAD_PATH'], str(image_id), source_filename)
    # path/<image_id>/<source_filename>

def image_thumbnail_path(image_id):
    return os.path.join(app.config['IMAGE_THUMBNAIL_PATH'], f"{str(image_id)}.png")
    # path/<image_id>.png

def analysis_display_path(analysis_id):
    return os.path.join(app.config['ANALYSIS_DISPLAY_PATH'], f"{str(analysis_id)}.png")
    # path/<analysis_id>.png

def analysis_display_path(analysis_id):
    return os.path.join(app.config['ANALYSIS_COMPUTE_PATH'], f"{str(analysis_id)}.png") # TODO: another filetype?
    # path/<analysis_id>.png

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
    elif (object_type == 'analysis' and file_type == 'compute'):
        pathname = analysis_compute_path(object_id)
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
