# TODO:
# * Change format of ROIs and origins (see discussions)
#      - Store ROIs as flat list of { id, x, y, rx, ry, signal } -- signal must be recomputed whenever image cache is regenerated
#      - Store lanes as flat list (id, name?, roi_list(ids), origin_id (or origin_x, origin_y), solvent_front (x,y, or a function y(x))
#      - Store origins as flat list (id, x, y), or just absorb into lane?
#      - RF and 'results' can be computed from this info by frontend... (or cached in a file, or stored in ROI...
#      ------- BUT, there are lots of things that can 'dirty' the 'result' value... any change in 
#              analysis parameters that changes 'compute' image. Any change in other ROIs in the lane including self...)
#      - NOTE: probably don't need 'Lane' etc classes since none of these would be shared across other analyses etc...
# * Currently images (radio, dark, bright) are in different formats... this should be reconsidered in the future
# * Enforce adding of extension to upload files
# * Auto-create a thumbnail of uploaded Image files...
# * Perhaps can use a mixin to share code of common fields (owner_id, modified, created, deleted)
# * Check saving methods to make sure immune to SQL injection. (SQLAlchemy handles a lot automatically with the ORM)
# * Add some convenience methods, e.g. get_id(), get_name()?
# * An alternative design strategy would be to put owner_id, modified, created, deleted into a separate table
#     to basically track ownership/permissions, deletion status, and edit history
# * Be careful of string versus number IDs!!!
# * Store image_type as string instead of enum?
# * SQLAlchemy PickleType does NOT detect changes to a portion of the object (e.g. dict) and will not properly
#     commit to database when a partial change is made. For now we rewrite the
#     whole thing whenever we make a change. Need to look into how to use 'MutableDict' or other approaches
#     to make this more efficient or intutive
# * If an Image is updated (e.g. replace image)... then should dependent analyses be recomputed??... Problably
#     Should prevent updating the image after saving to prevent issues...

# Package dependencies:
# mysql-connector-python, SQLAlchemy, flask-login

# REFERENCES and CREDITS:
# * https://variable-scope.com/posts/storing-and-verifying-passwords-with-sqlalchemy (more sophisticated handling of password hashes)
# * http://docs.sqlalchemy.org/en/14/orm/basic_relationships.html#many-to-many (how to set up data relationships with SQLAlchemy)
#
# * This page was useful to figure how to set up constructor for multiple inheritance with Mixin
#   https://stackoverflow.com/questions/9575409/calling-parent-class-init-with-multiple-inheritance-whats-the-right-way


from flask import current_app as app
import sqlalchemy
import sqlalchemy_utils # pip3 install sqlalchemy-utils
from sqlalchemy import create_engine, MetaData
from sqlalchemy import Table, Column, ForeignKey
from sqlalchemy import Integer, String, Float, Text, DateTime, LargeBinary, Enum, Boolean, PickleType, BigInteger
from sqlalchemy import TypeDecorator
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.orm import Session, sessionmaker, scoped_session
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.orm import class_mapper, make_transient
from sqlalchemy import select
from dotenv import load_dotenv
import os
import json
from urllib.parse import quote
import enum
from flask_login import UserMixin
import time
import flask_login
from datetime import datetime, timezone # TODO: probably should move time handling to API (e.g. 'modified' etc.)
from dateutil.parser.isoparser import isoparse
import werkzeug

# TODO: how to do this setup and instantiation once and register with FLASK globals?

# Main database setup

# Load environment variables (DB setup parameters)
load_dotenv()

# Initialize database connection
#db_uri = "mysql+mysqlconnector://{}:{}@{}:{}/{}".format(
#       os.getenv('DB_USER'),
#        quote(os.getenv('DB_PASS')),
#        os.getenv('DB_HOST'),
#        os.getenv('DB_PORT'),
#        os.getenv('DB_NAME')     
#)
db_uri = "sqlite:///sqlite/{}".format(os.getenv('DB_NAME'))
db_engine = create_engine(db_uri, future=True)

# Create Session class
# Other docs used the following (is there a difference?)
#    Session = sessionmaker(bind=engine)
#    session = Session(future=True)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=db_engine))

# Create ORM Base class
Base = declarative_base()
Base.query = db_session.query_property()

# Cleanup
def db_cleanup():
    db_session.close()
    #db_engine.dispose()

# Timezone-aware DateTime datatype for SQLAlchemy. Basically it
# converts to UTC timezone before storage to database (which doesn't
# store TZ info), and then adds on a UTC timezone description when
# retrieving values from database.
# Also will accept incoming ISO strings (not just datetime objects)
# in case of using ISO string rather than JSON encoded datetime to
# receive data from the frontend.
# CREDIT:
# https://docs.sqlalchemy.org/en/14/core/custom_types.html#store-timezone-aware-timestamps-as-timezone-naive-utc

class TZDateTime(TypeDecorator):
    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value,str):
                if (value == ''):  # empty string
                    return None
                value = isoparse(value)
            if not value.tzinfo:
                raise TypeError("tzinfo is required")
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            value = value.replace(tzinfo=timezone.utc)
        return value

# Define association tables

user_org_map = Table('user_org_map', Base.metadata,
    Column('user_id', Integer, ForeignKey('user.user_id'), primary_key=True),
    Column('org_id', Integer, ForeignKey('organization.org_id'), primary_key=True),
)

user_analysis_map = Table('user_analysis_map', Base.metadata,
    Column('user_id', Integer, ForeignKey('user.user_id'), primary_key=True),
    Column('analysis_id', Integer, ForeignKey('analysis.analysis_id'), primary_key=True),
)

analysis_image_map = Table('analysis_image_map', Base.metadata,
    Column('analysis_id', Integer, ForeignKey('analysis.analysis_id'), primary_key=True),
    Column('image_id', Integer, ForeignKey('image.image_id'), primary_key=True),
)

org_equip_map = Table('org_equip_map', Base.metadata,
    Column('org_id', Integer, ForeignKey('organization.org_id'), primary_key=True),
    Column('equip_id', Integer, ForeignKey('equipment.equip_id'), primary_key=True),
)

org_plate_map = Table('org_plate_map', Base.metadata,
    Column('org_id', Integer, ForeignKey('organization.org_id'), primary_key=True),
    Column('plate_id', Integer, ForeignKey('plate.plate_id'), primary_key=True),
)

org_cover_map = Table('org_cover_map', Base.metadata,
    Column('org_id', Integer, ForeignKey('organization.org_id'), primary_key=True),
    Column('cover_id', Integer, ForeignKey('cover.cover_id'), primary_key=True),
)

# Define data classes

class User(UserMixin, Base):
    __tablename__ = 'user'
    user_id = Column(Integer, primary_key=True)
    first_name = Column(String(64))
    last_name = Column(String(64))
    email = Column(String(254), nullable=False) # max lenth of an email address 
    password_hash = Column(Text) # TODO: can be limited to length 60, but need correct type (String doesn't work)
    is_active = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created = Column(TZDateTime) 
    modified = Column(TZDateTime)
    prefs = Column(PickleType, default={}, nullable=False) # was PickleType
    favorites = Column(PickleType, default={}, nullable=False) # was PickleType
    photo_filename = Column(String(254))
    photo_url = Column(String(2048))
    thumbnail_url = Column(String(2048))
    avatar_url = Column(String(2048))
    org_id = Column(Integer, ForeignKey('organization.org_id'))
    #analysis_list=relationship("Analysis",secondary=user_analysis_map)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Needed to work with flask_login.login_manager
        self.is_active = True
        self.is_authenticated = True
        self.is_anonymous = False

    @classmethod
    def hash (cls, password):
        import bcrypt
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Used by login_manager
    def is_active(self):
        return True # self.is_active
    def is_authenticated(self):
        return True # self.is_authenticated
    def is_anonymous(self):
        return False # self.is_anonymous
    def get_id(self):
        if self.user_id:
            return str(self.user_id).encode('utf-8').decode('utf-8')
        else:
            return None

    def as_dict(self):
        # Returns full represenation of model.
        columns = class_mapper(self.__class__).mapped_table.c
        return {
            col.name: getattr(self, col.name)
                for col in columns
        }

class Organization(Base):
    __tablename__ = 'organization'
    org_id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    equip_list = relationship("Equipment", secondary=org_equip_map)
    plate_list = relationship("Plate", secondary=org_plate_map)
    cover_list = relationship("Cover", secondary=org_cover_map)
    owner_id = Column(Integer, ForeignKey('user.user_id'))
    created = Column(TZDateTime) 
    modified = Column(TZDateTime)
    is_deleted = Column(Boolean, default=False, nullable=False)

    ## TODO: can this be defined as a mixin??
    def as_dict(self):
        # Returns full represenation of model.
        columns = class_mapper(self.__class__).mapped_table.c
        return {
            col.name: getattr(self, col.name)
                for col in columns
        }

class Equipment(Base):
    __tablename__ = 'equipment'
    equip_id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    manufacturer = Column(String(256))
    catalog = Column(String(128))
    camera = Column(String(128)) # Remove this field?
    has_temp_control = Column(Boolean, nullable=False)
    has_metadata = Column(Boolean)  # Do the files/images have metadata we can read? (Date, temp, etc..)?  If so we can skip things on the image_edit form
    pixels_x = Column(Integer, nullable=False)
    pixels_y = Column(Integer, nullable=False)
    fov_x = Column(Float) # size in mm
    fov_y = Column(Float) # size in mm
    bpp = Column(Integer, nullable=False) # Assumes images are monochrome
    file_format = Column(String(128), nullable=False) # Each type will map to an 'importer' function
    owner_id = Column(Integer, ForeignKey('user.user_id')) 
    created = Column(TZDateTime) 
    modified = Column(TZDateTime)
    is_deleted = Column(Boolean, default=False, nullable=False)

    def as_dict(self):
        # Returns full represenation of model.
        columns = class_mapper(self.__class__).mapped_table.c
        return {
            col.name: getattr(self, col.name)
                for col in columns
        }

class Analysis(Base):
    # TODO: Add created, modified fields (handled internally)
    __tablename__ = 'analysis'
    analysis_id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    expt_date = Column(TZDateTime)
    equip_id = Column(Integer, ForeignKey('equipment.equip_id')) # TODO: maybe redundant, but convenient for now
    plate_id = Column(Integer, ForeignKey('plate.plate_id'))
    cover_id = Column(Integer, ForeignKey('cover.cover_id'))
    radio_image_id = Column(Integer, ForeignKey('image.image_id'))
    dark_image_id = Column(Integer, ForeignKey('image.image_id'))
    flat_image_id = Column(Integer, ForeignKey('image.image_id'))
    bright_image_id = Column(Integer, ForeignKey('image.image_id'))
    uv_image_id = Column(Integer, ForeignKey('image.image_id'))
    bkgrd_algorithm = Column(String(128))
    filter_algorithm = Column(String(128))
    correct_dark = Column(Boolean)
    correct_flat = Column(Boolean)
    correct_bkgrd = Column(Boolean)
    correct_filter = Column(Boolean)
    # Internally-generated
    display_radio_url = Column(String(2048))
    display_bright_url = Column(String(2048))
    image_cache_modified = Column(TZDateTime)
    lanes_modified = Column(TZDateTime) # TODO: implement
    # user adjustable
    radio_contrast = Column(Integer)
    radio_brightness = Column(Integer)
    radio_opacity = Column(Integer)
    bright_contrast = Column(Integer)
    bright_brightness = Column(Integer)
    bright_opacity = Column(Integer)
    # Fields related to lane state
    # TODO: do we need number of lanes stored?  Do we need some kind of
    #   flag to indicate whether we should re-generate ROIs if any image is updated?
    doRF = Column(Boolean)
    ROIs = Column(PickleType, default=[], nullable=False)
    origins = Column(PickleType, default=[], nullable=False)
    results = Column(PickleType, default=[], nullable=False)
    # Standard fields
    owner_id = Column(Integer, ForeignKey('user.user_id'))
    created = Column(TZDateTime) 
    modified = Column(TZDateTime)
    is_deleted = Column(Boolean, default=False, nullable=False)

    def as_dict(self):
        # Returns full represenation of model.
        columns = class_mapper(self.__class__).mapped_table.c
        return {
            col.name: getattr(self, col.name)
                for col in columns
        }


class ImageType(enum.Enum):
    flat = 1
    dark = 2
    radio = 10
    bright = 11
    uv = 12
    cerenkovdisplay=101
    cerenkovcalc=102
    cerenkovradii=103
    

class Image(Base):
    __tablename__ = 'image'
    #analysis_list = relationship('Analysis',secondary=analysis_image_map)
    image_id = Column(Integer, primary_key=True)
    equip_id = Column(Integer, ForeignKey('equipment.equip_id'))
    image_type = Column(Enum(ImageType), nullable=False)
    # TODO: switch to Column(Enum('radio', 'dark', 'flat', 'bright', 'uv'))
    captured = Column(TZDateTime) # Image creation date
    exp_time = Column(Float) # Exposure time (seconds)
    exp_temp = Column(Float) # Exposure temp (deg C)
    name = Column(String(128), nullable=False)
    description = Column(Text) # Maybe can get rid of this...?
    image_path = Column(String(256)) #, nullable=False) # Full path of file on server (for file system DB)
    owner_id = Column(Integer, ForeignKey('user.user_id')) # User-ID of user that uploaded the file
    created = Column(TZDateTime) 
    modified = Column(TZDateTime)
    is_deleted = Column(Boolean, default=False, nullable=False)
    filename = Column(String(128))
    download_url = Column(String(2048))
    # TODO add methods to return images and paths?

    def as_dict(self):
        # Returns full represenation of model.
        columns = class_mapper(self.__class__).mapped_table.c
        return {
            col.name: getattr(self, col.name)
                for col in columns
        }


class Plate(Base):
    __tablename__ = 'plate'
    plate_id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    manufacturer = Column(String(256))
    catalog = Column(String(128))
    owner_id = Column(Integer, ForeignKey('user.user_id'))
    created = Column(TZDateTime) 
    modified = Column(TZDateTime)
    is_deleted = Column(Boolean, default=False, nullable=False)

    def as_dict(self):
        # Returns full represenation of model.
        columns = class_mapper(self.__class__).mapped_table.c
        return {
            col.name: getattr(self, col.name)
                for col in columns
        }

class Cover(Base):
    __tablename__ = 'cover'
    cover_id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    manufacturer = Column(String(256))
    catalog = Column(String(128))
    owner_id = Column(Integer, ForeignKey('user.user_id'))
    created = Column(TZDateTime) 
    modified = Column(TZDateTime)
    is_deleted = Column(Boolean, default=False, nullable=False)

    def as_dict(self):
        # Returns full represenation of model.
        columns = class_mapper(self.__class__).mapped_table.c
        return {
            col.name: getattr(self, col.name)
                for col in columns
        }


def db_create_tables():
    # Careful, this deletes ALL data in database
    print ('Initializing database...')
    print ('Dropping existing database')
    sqlalchemy_utils.functions.drop_database(db_uri)
    print ('Creating database')
    sqlalchemy_utils.functions.create_database(db_uri)
    print ('Creating all tables')
    Base.metadata.create_all(db_engine)
    db_session.commit()


def db_add_test_data():
    print ('Populating database with test data')
    # Some simple tests to show usage of creating a few objects (and automatically setting up the links between different types)
    tim = time.time()
    db_session.begin()
    plate1 = Plate(name = 'JT Baker 12345: silica, 250 um, aluminum back, F254 60',plate_id = 1)
    plate2 = Plate(name = 'JT Baker 23456: silica, 250 um, glass back, F254 60, concentration zone',plate_id=2)
    cover = Cover(cover_id = 1, name = 'Dont know what to call this')
   
    db_session.add(plate1)
    db_session.add(plate2)
    equip1 = Equipment(name = 'Crump Cerenkov #1', description = 'some text', equip_id = 2938,camera = 'QSI 540 (KAI-04022 CCD sensor)', has_temp_control = True, pixels_x = 682, pixels_y = 682, bpp = 16, file_format = 'tiff')
    equip2 = Equipment(name = 'Crump Cerenkov #2', description = '', equip_id = 4000,camera = 'Something else', has_temp_control = True, pixels_x = 682, pixels_y = 682, bpp = 16, file_format = 'tiff')
    db_session.add(equip1)
    db_session.add(equip2)
    org1 = Organization(name = 'UCLA Crump Institute for Molecular Imaging', org_id =1153078, plate_list=[plate1,plate2],cover_list = [cover], equip_list=[equip1])
    org2 = Organization(name = 'UCLA Ahmanson Translational Theranosticis Division', org_id = 21857,plate_list=[plate1],cover_list = [cover])
    org3 = Organization(name = 'Imaginary University Deparment of Radiochemistry',org_id = 25987)
    db_session.add_all([org1, org2, org3])
    db_session.commit()
    prefs1 = { 'general': {'redirect_after_login': '/',}, }
    prefs2 = { 'general': {'redirect_after_login': '/user/search',}, 'analysis': {'default_plate': 2, 'default_cover': 1, 'default_equip': 4000} }
    favs1 = { 'equip': [4000, 2938],}
    db_session.add(User(first_name = 'Alice', last_name = 'Armstrong', email = 'alice@armstrong.com', password_hash='$2b$12$jojM5EuDHREVES2S0OpLbuV.oDjqXWJ/wq9x07HwSQRfdpEUHLqNG', org_id=1153078, prefs=prefs2, favorites=favs1)) # PASSWORD 123
    db_session.add(User(first_name = 'Bob', last_name = 'Brown', email = 'bob@brown.com',password_hash='$2b$12$kA7FRa6qA./40Pmtmi6mRelW2cnkhcOHtsKelIMVezDlF33YF62C2',org_id=21857, prefs=prefs1)) # PASSWORD 123
    db_session.add(User(first_name = 'Cathy', last_name = 'Chen', email = 'cathy@chen.com'))
    db_session.add(User(first_name = 'David', last_name = 'Delgado', email = 'david@delgado.com'))
    db_session.add(User(first_name = 'Elaine', last_name = 'Eastman', email = 'elaine@eastman.com'))
    db_session.add(User(first_name = 'Fred', last_name = 'Fan', email = 'fred@fan.com'))
    db_session.add(User(first_name = 'Grace', last_name = 'Gibson', email = 'grace@gibson.com'))
    db_session.add(User(first_name = 'Hector', last_name = 'Hoops', email = 'hector@hoops.com'))
    db_session.add(User(first_name = 'Irene', last_name = 'Im', email = 'irene@im.com'))
    db_session.add(User(first_name = 'Jing', last_name = 'Jackson', email = 'jing@jackson.com'))
    db_session.add(User(first_name = 'Kevin', last_name = 'Kim', email = 'kevin@kim.com'))
    db_session.add(User(first_name = 'Ling', last_name = 'Lin', email = 'ling@lin.com'))
    
    db_session.add(User(first_name = 'NA', last_name = 'NA', email = 'NA',user_id='1433625970'))
    db_session.commit()
    #print('Finished')


# -----------------------
# Generic object handlers
# -----------------------

# Check if object type is valid
def object_type_valid(object_type):
    allowed_types = ['user', 'org', 'equip', 'plate', 'cover', 'image', 'analysis']
    return object_type in allowed_types

# Build function name
def object_action_function(object_type, action):
    return f"db_{object_type}_{action}"

# Load classname from object_type
def object_class(object_type):
    if (object_type=='user'): return 'User'
    if (object_type=='org'): return 'Organization'
    if (object_type=='equip'): return 'Equipment'
    if (object_type=='plate'): return 'Plate'
    if (object_type=='cover'): return 'Cover'
    if (object_type=='image'): return 'Image'
    if (object_type=='analysis'): return 'Analysis'
    # TODO: else raise invalid object type error

def object_idfield(object_type):
    return f"{object_type}_id"

# Load an object by id. Will call object-specific function if it exists.
# Returns the object or None if any error
def db_object_load(object_type, object_id):

    # If object-specific function exists, call it
    function_name = object_action_function(object_type, 'load')
    try:
        eval(function_name)
    except NameError:
        pass
    else:
        return eval(function_name + f"({object_id})")

    # Otherwise load the object
    class_name = object_class(object_type)
    id_field = object_idfield(object_type)
    # 'scalar' returns one object or 'None' if not found
    record = getattr(eval(class_name), 'query').filter(getattr(eval(class_name),id_field)==object_id).scalar()
    db_session.commit()
    return record

# Save an object. Will call object-specific save (or create or update) functions if they exist.
# Returns the object or None if any error
def db_object_save(object_type, data):

    # If object-specific function exists, call it
    function_name = object_action_function(object_type, 'save')
    try:
        eval(function_name)
    except NameError:
        pass
    else:
        # TODO: hack to deal with ImageType (doesn't work well with eval)
        # TODO: remove when we change db field to string instead ImageType
        image_type = data.get('image_type')
        if (image_type and not type(image_type) is str):
            data['image_type'] = convert_image_type_to_string(image_type)

        return eval(function_name + f"({data})")

    # Otherwise, find the id value and determine if this is a 'insert' or 'update' operation    
    id_field = object_idfield(object_type)
    object_id = data.get(id_field)
    if (object_id is None):
        # Create mode (insert operation)
        return db_object_create(object_type, data)
    else:
        # Edit mode (update operation)
        return db_object_update(object_type, object_id, data)

# Create an object in database. Will call object-specific function if it exists.
# Returns the full object or None if any error
def db_object_create(object_type, data):
    # If object-specific function exists, call it
    function_name = object_action_function(object_type, 'create')
    try:
        eval(function_name)
    except NameError:
        pass
    else:
        # TODO: hack to deal with ImageType (doesn't work well with eval)
        # TODO: remove when we change db field to string instead ImageType
        image_type = data.get('image_type')
        if (image_type and not type(image_type) is str):
            data['image_type'] = convert_image_type_to_string(image_type)
        return eval(function_name + f"({data})")

    # Otherwise create the object
    class_name = object_class(object_type)
    now = datetime.now(timezone.utc) # Current timestamp
    data['owner_id'] = flask_login.current_user.get_id()
    data['created'] = now
    data['modified'] = now
    data['is_deleted'] = False
    record = eval(class_name)(**data) # Need to unpack dictionary
    db_session.add(record)
    db_session.commit()
    # TODO: add error checking
    return record

# Create an object in database. Will call object-specific function if it exists.
# Returns the full object or None if any error
def db_object_update(object_type, object_id, data):
    # If object-specific function exists, call it
    function_name = object_action_function(object_type, 'update')
    try:
        eval(function_name)
    except NameError:
        pass
    else:
        return eval(function_name + f"({object_id},{data})")

    # Otherwise update the object
    class_name = object_class(object_type)
    id_field = object_idfield(object_type)
    now = datetime.now(timezone.utc) # Current timestamp
    data['modified'] = now
    record = getattr(eval(class_name), 'query').filter(getattr(eval(class_name),id_field)==object_id).scalar()
    if (record is None): return None
    # Update attributes contained in 'data'
    for key, value in data.items():
        setattr(record, key, value)
    db_session.commit()
    # TODO: add error checking
    return record

# Delete an object with specified id from database. Call object-specific function it it exists
# Return true if succesful, false if any error
# TODO: add error checking
def db_object_delete(object_type, object_id):
    # If object-specific function exists, call it
    function_name = object_action_function(object_type, 'delete')
    try:
        eval(function_name)
    except NameError:
        pass
    else:
        return eval(function_name + f"({object_id})")

    # Otherwise delete the record
    record = db_object_load(object_type, object_id)
    if (record is None):
        return False
    else:
        record.is_deleted = True
        db_session.commit()
        return True

# Restore an object with specified id from database. Call object-specific function it it exists
# Return true if successful, false if any error
# TODO: add error checking
def db_object_restore(object_type, object_id):
    # If object-specific function exists, call it
    function_name = object_action_function(object_type, 'restore')
    try:
        eval(function_name)
    except NameError:
        pass
    else:
        return eval(function_name + f"({object_id})")

    # Otherwise delete the record
    record = db_object_load(object_type, object_id)
    if (record is None):
        return False
    else:
        record.is_deleted = False
        db_session.commit()
        return True

# Purge an object with specified id from database. Call object-specific function it it exists
# Return true if successful, false if any error
# TODO: add error checking
# TODO: implement this. What to do with all dependencies if delete?  Maybe keep object but delete all the non-ID fields?
def db_object_purge(object_type, object_id):
    # If object-specific function exists, call it
    function_name = object_action_function(object_type, 'purge')
    try:
        eval(function_name)
    except NameError:
        pass
    else:
        return eval(function_name + f"({object_id})")

    # TODO: implement

# Clone an object with specified id from database. Call object-specific function it it exists
# Return new object if successful, None if any error
# TODO: add error checking
def db_object_clone(object_type, object_id):

    # Don't allow cloning of users
    if (object_type == 'user'):
        return None
    # TODO: reminder that image cloning not fully figured out
    #  i.e. also need to copy the underlying file etc...
    if (object_type == 'image'):
        print ('============= IMAGE CLONE IMPLEMENTATION INCOMPLETE - doesnt copy file')

    # If object-specific function exists, call it
    function_name = object_action_function(object_type, 'clone')
    try:
        eval(function_name)
    except NameError:
        pass
    else:
        return eval(function_name + f"({object_id})")

    # Otherwise clone the record
    id_field = object_idfield(object_type)
    record = db_object_load(object_type, object_id)
    if (record is None):
        return None
    else:
        data = record.as_dict() # Should this be done in api.py? No, shouldn't be aware of modified,created,etc...
        del data[id_field]
        del data['modified']
        del data['created']
        del data['is_deleted']
        del data['owner_id']
        return db_object_save(object_type, data) # Note use of 'save' instead of 'create' is deliberate


# Search objects meeting the filter criteria. Call object-specific function if it exists
# Return a list of object, or empty list if not found. Return None if any error encountered.
# TODO: add error checking
def db_object_search(object_type, object_filter={}):
    # If object-specific function exists, call it
    function_name = object_action_function(object_type, 'search')
    try:
        eval(function_name)
    except NameError:
        pass
    else:
        return eval(function_name + f"({object_filter})")

    # Otherwise search and return the results
    class_name = object_class(object_type)
    id_field = object_idfield(object_type)
    favorites_filter = object_filter.get('favorites')
    if (favorites_filter is not None):
        favorites = db_favorites_load(favorites_filter['user_id'], object_type)
        record_list = getattr(eval(class_name),'query').filter(getattr(getattr(eval(class_name),id_field),'in_')(favorites)).all()
    else:
        record_list = getattr(eval(class_name),'query').all() # TODO: add filtering and pagination/sorting here
    db_session.commit()
    return record_list

# ------------------------
# Object-specific handlers
# TODO: likely to be merged into generic ones
# ------------------------

def db_user_load_by_email(email):
    user = User.query.filter_by(email=email).scalar() 
    db_session.commit()
    return user

def db_user_password_change(user_id, new_password):
    user = User.query.filter_by(user_id=user_id).scalar()
    if user is None: return False
    user.password_hash = User.hash(new_password)
    db_session.commit()
    return True

def db_prefs_save(user_id, data):
    user = User.query.filter_by(user_id=user_id).scalar()
    if user is None: return False
    user.prefs = data
    db_session.commit()
    return True

def db_prefs_load(user_id):
    user = User.query.filter_by(user_id=user_id).scalar()
    if user is None: return False
    db_session.commit()
    return user.prefs 

# Load all favorites or a set of favorites of one object type
# Return a dict (all favorites), an array (a specific type of favorites), or None
# Internal storage format is sets to avoid duplicates: converts to array for convenience of other code
def db_favorites_load(user_id, object_type=None):
    user = db_object_load('user', user_id)
    if (user is None): return None
    if (object_type is not None):
        return user.favorites.get(object_type) if user.favorites.get(object_type) else []
    else:
        return user.favorites

# Delete all favorites or a set of favorites of one object type
# Return boolean (True if success; False if error)
def db_favorites_clear(user_id, object_type=None):
    user = db_object_load('user', user_id)
    if (user is None): return False
    favorites = user.favorites.copy()
    if (object_type is not None):
        del favorites[object_type]
    else:
        del favorites
    user.favorites = favorites # Write whole dict (needed to trigger update)
    db_session.commit()
    return True

# Add a favorite
# Return boolean
def db_favorite_add(user_id, object_type, object_id):
    user = db_object_load('user', user_id)
    if (user is None): return False
    favorites = user.favorites.copy()
    old_branch = favorites.get(object_type) if favorites.get(object_type) else []
    new_branch = set(old_branch) # Convert to set to make it convenient to ensure uniqueness
    new_branch.add(int(object_id))
    favorites[object_type] = list(new_branch) # Convert back to list
    user.favorites = favorites # Write whole dict (needed to trigger update)
    db_session.commit()
    return True

# Remove a favorite
# Return boolean
def db_favorite_remove(user_id, object_type, object_id):
    user = db_object_load('user', user_id)
    if (user is None): return False
    favorites = user.favorites.copy()
    branch = favorites.get(object_type) if favorites.get(object_type) else []
    # Other methods of updating favorites didn't seem to get recognized as changed. This works.
    favorites[object_type] = [x for x in branch if x != int(object_id) ]
    user.favorites = favorites # Write whole dict (needed to trigger update)
    db_session.commit()
    return True
    

# Save a user to the database.  Expects a data to be a dict
# Blank user_id means it hasn't yet been inserted to database
# TODO: when save preferences, should we merge with existing ones, or overwrite?
def db_user_save(data):
    #print("incoming data:")
    #print(data)
    #db_session.begin()

    # If user_id exists, load user, replace data, then update
    # If user_id is empty, add a new user
    if (data.get('user_id') is not None):
        user = User.query.filter_by(user_id=data['user_id']).one()
        user.first_name = data['first_name']
        user.last_name = data['last_name']
        user.email = data['email'] # not changeable via
        user.modified = datetime.now(timezone.utc)
        user.org_id = data.get('org_id')
        #user.password_hash = User.hash(data['password'])
        # Following is not yet supported in this version of python
        #if data.has_key('preferences'):
        #    user.preferences = user.preferences | data['preferences']
    else:
        user = User(
                first_name = data['first_name'],
                last_name = data['last_name'],
                email = data['email'],
                org_id = data.get('org_id'),
                password_hash = User.hash(data['password']) if data.get('password') else None,
                modified = datetime.now(timezone.utc),
                created = datetime.now(timezone.utc),
                )
        db_session.add(user)
    db_session.commit()
    return user

# Upload user profile photo
# NOTE: thumbnail and avatar created in frontend
# TODO: add error checking
def db_user_photo_upload(user_id, photo, thumbnail, avatar):
    if (user_id is None):
        return False
    filename = werkzeug.utils.secure_filename(photo.filename)

    # Save files
    from filestorage import user_photo_upload_path
    from filestorage import user_thumbnail_path
    from filestorage import user_avatar_path
    photo_path = user_photo_upload_path(user_id, filename)
    thumbnail_path = user_thumbnail_path(user_id)
    avatar_path = user_avatar_path(user_id)

    from filestorage import save_file
    save_file(photo, photo_path)
    save_file(thumbnail, thumbnail_path)
    save_file(avatar, avatar_path)

    # Update filename and paths in database
    user = db_object_load('user', user_id)
    user.photo_filename = filename
    user.thumbnail_url = f"api/file/user/thumbnail/{str(user_id)}"
    user.avatar_url = f"api/file/user/avatar/{str(user_id)}"
    db_session.commit()
    print (user)
    return True


# Save an image
# TODO: create a thumbnail image and store in database...
# TODO: after get rid of enum in database... this function should
#    create the file if appropriate, and then call db_object_save
#    (and then clean up file if any error)
def db_image_save(data):
    print ('db_image_save: data =>')
    print (data)
    if (data.get('image_id') is not None):
        image = Image.query.filter_by(image_id=data['image_id']).one()
        image.name = data['name']
        image.description = data['description']
        image.equip_id = data['equip_id']
        image.modified = datetime.now(timezone.utc)
        image.captured = data['captured'] 
        image.exp_time = data['exp_time'] 
        image.exp_temp = data['exp_temp'] 
        image.image_type = find_image_type(data['image_type'])
    else:
        image = Image(
            name = data['name'],
            description = data['description'],
            owner_id = flask_login.current_user.get_id(),
            equip_id = data['equip_id'],
            created = datetime.now(timezone.utc),
            modified = datetime.now(timezone.utc),
            image_type = find_image_type(data['image_type']),
            captured = data['captured'], 
            exp_time = data['exp_time'],
            exp_temp = data['exp_temp'],
        )
        print (image.captured)
    db_session.add(image)
    db_session.commit() # Populates ID if a new image

    # If received a new file:
    file = data.get('file')
    if (file): 

        from filestorage import image_file_upload_path

        # Delete old file if exists
        if (image.filename is not None):
            pathname = image_file_upload_path(image.image_id, image.filename)
            try:
                os.remove(pathname)
            except:
                pass

        # Prepare and save new file
        image.filename = file.filename
        image.download_url = f"/api/file/image/file/{str(image.image_id)}"
        pathname = image_file_upload_path(image.image_id, image.filename)
        image.image_path = pathname # TODO: remove later -- not needed (just build it)
        from filestorage import save_file
        save_file(file, pathname)
        db_session.commit()
    return image

# Analysis-related utility functions

def find_image_type(image_type):
    if image_type == 'dark':
        return ImageType.dark
    elif image_type == 'uv':
        return ImageType.uv
    elif image_type == 'radio':
        return ImageType.radio
    elif image_type == 'bright':
        return ImageType.bright
    elif image_type =='flat':
        return ImageType.flat
    else:
        return image_type

def convert_image_type_to_string(native_type):
    if native_type == ImageType.dark:
        return 'dark'
    elif native_type == ImageType.uv:
        return 'uv'
    elif native_type == ImageType.radio:
        return 'radio'
    elif native_type == ImageType.bright:
        return 'bright'
    elif native_type == ImageType.flat:
        return 'flat'
    else:
        return 'unknown'


def db_analysis_image_cache(analysis_id, url_radio, url_bright=None):
    analysis = db_object_load('analysis', analysis_id)
    analysis.display_radio_url = url_radio
    analysis.display_bright_url = url_bright
    analysis.image_cache_modified = datetime.now(timezone.utc)
    db_session.commit()


# Save ROI and origin info
# Returns an analysis object
# TODO: add error checking
# TODO: should this affect 'modified' flag?  Probably
def db_analysis_rois_save(analysis_id, data):
    analysis = db_object_load('analysis', analysis_id)
    # Only update fields provided
    if data.get('ROIs') is not None:
        analysis.ROIs = data['ROIs']
    if data.get('origins') is not None:
        analysis.origins = data['origins']
    if data.get('doRF') is not None:
        analysis.doRF = data['doRF']
    if data.get('radio_brightness') is not None:
        analysis.radio_brightness = data['radio_brightness']
    if data.get('radio_contrast') is not None:
        analysis.radio_contrast = data['radio_contrast']
    if data.get('radio_opacity') is not None:
        analysis.radio_opacity = data['radio_opacity']
    if data.get('bright_brightness') is not None:
        analysis.bright_brightness = data['bright_brightness']
    if data.get('bright_contrast') is not None:
        analysis.bright_contrast = data['bright_contrast']
    if data.get('bright_opacity') is not None:
        analysis.bright_opacity = data['bright_opacity']
    if data.get('results') is not None:
        analysis.results = data['results']
    db_session.commit()
    return True

