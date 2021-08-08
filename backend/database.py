# TODO:
# * Currently images (radio, dark, bright) are in different formats... this should be reconsidered in the future
# * Perhaps can use a mixin to share code of common fields (owner_id, modified, created, deleted)
# * Check saving methods to make sure immune to SQL injection. (SQLAlchemy handles a lot automatically with the ORM)
# * Changing naming of main 'id' field to 'id' for all objects?
# * Add some convenience methods, e.g. get_id(), get_name()?
# * An alternative design strategy would be to put owner_id, modified, created, deleted into a separate table
#     to basically track ownership/permissions, deletion status, and edit history
# * Be careful of string versus number IDs!!!
# * Convert all DateTime database types to 'TZDateTime'
# * I am getting rid of 'org_list' from User (instead using org_id).  But haven't yet finished removing the old code.
# * Store image_type as string instead of enum?
# * SQLAlchemy PickleType does NOT detect changes to a portion of the object (e.g. dict). For now we rewrite the
#     whole thing whenever we make a change. Need to look into how to use 'MutableDict' or other approaches
#     to make this more efficient or intutive

# Package dependencies:
# mysql-connector-python, SQLAlchemy, flask-login

# REFERENCES and CREDITS:
# * https://variable-scope.com/posts/storing-and-verifying-passwords-with-sqlalchemy (more sophisticated handling of password hashes)
# * http://docs.sqlalchemy.org/en/14/orm/basic_relationships.html#many-to-many (how to set up data relationships with SQLAlchemy)
#
# * This page was useful to figure how to set up constructor for multiple inheritance with Mixin
#   https://stackoverflow.com/questions/9575409/calling-parent-class-init-with-multiple-inheritance-whats-the-right-way


from flask import current_app as app 
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
import copy
from urllib.parse import quote
from sqlalchemy.dialects.postgresql import ARRAY
import enum
from flask_login import UserMixin
from json import dumps
import PIL
import time
import numpy as np
from io import BytesIO
import flask_login
from datetime import datetime, timezone # TODO: probably should move time handling to API
from dateutil.parser.isoparser import isoparse

# TODO: how to do this setup and instantiation once and register with FLASK globals?

# Main database setup

# Load environment variables (DB setup parameters)
load_dotenv()

# Initialize database connection
db_uri = "mysql+mysqlconnector://{}:{}@{}:{}/{}".format(
       os.getenv('DB_USER'),
        quote(os.getenv('DB_PASS')),
        os.getenv('DB_HOST'),
        os.getenv('DB_PORT'),
        os.getenv('DB_NAME')     
)
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
    Column('analysis_id', String(12), ForeignKey('analysis.analysis_id'), primary_key=True),
)

analysis_image_map = Table('analysis_image_map', Base.metadata,
    Column('analysis_id', String(12), ForeignKey('analysis.analysis_id'), primary_key=True),
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
# analysis_lane_map=Table('analysis_lane_map', Base.metadata,
#     Column('analysis_id', Integer, ForeignKey('analysis.analysis_id'), primary_key=True),
#     Column('lane_id', Integer, ForeignKey('lane.lane_id'), primary_key=True),
# )
# lane_ROI_map = Table('lane_ROI_map', Base.metadata,
#     Column('lane_id', Integer, ForeignKey('lane.lane_id'), primary_key=True),
#     Column('ROI_id', Integer, ForeignKey('ROI.ROI_id'), primary_key=True),
# )


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
    org_list = relationship("Organization", secondary=user_org_map) 
    analysis_list=relationship("Analysis",secondary=user_analysis_map)

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


# TODO: since each analysis requires always the same set of cached
# images, should we combine them into a single table?
class CachedImage(Base):
    __tablename__='cachedimage'
    analysis = relationship('Analysis',back_populates='cachedimages')
    analysis_id = Column(String(12),ForeignKey('analysis.analysis_id'))
    # Track when the record was last modified. If any changes to the Image record
    # (using Image.modified field) after the modified date here (for the one or multiple
    # files on which it depends, then regenerate the cached image. This will use methods of api.py.
    modified = Column(DateTime(timezone=True))
    image_id = Column(Integer, primary_key=True)
    image_type = Column(String(64), nullable=False)
    image_path=Column(String(128))
   
    #def isCached (analysis_id) // classMethod
    #def load (image?_id) // classMethod
    #  --- -check modified dates. If cache newer, return cached image. If image_recrod newer
    #  ------ then regenerate cached image (and updated modified field). Then load
    #  ------ the new image
    # def save (image data/object)
    

class ROI(Base):
    __tablename__='ROI'
    ROI_id = Column(Integer,primary_key=True) 
    ROI_number = Column(Integer)  # TODO: I think we can delete this
    x=Column(Integer)
    y=Column(Integer)
    rx=Column(Integer)#radius in x direction (in pixels)
    ry=Column(Integer)#radius in y direction (in pixels)
    lane_id = Column(Integer,ForeignKey('lane.lane_id'))
    lane = relationship("Lane",back_populates='ROI_list')

class Analysis(Base):
    # TODO: Add created, modified fields (handled internally)
    __tablename__ = 'analysis'
    analysis_id = Column(String(12), primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    experiment_datetime = Column(DateTime(timezone=True)) # Date of experiment
    analysis_datetime = Column(DateTime(timezone=True)) # Date of analysis (last change)
    plate_id = Column(Integer, ForeignKey('plate.plate_id'))
    cover_id = Column(Integer, ForeignKey('cover.cover_id'))
    #user=relationship("User",secondary=user_analysis_map)
    doRF = Column(Boolean)
    cachedimages=relationship('CachedImage',back_populates='analysis')
    origin_list = relationship('Origin',back_populates='analysis')
    lane_list = relationship("Lane", back_populates="analysis")
    images= relationship('Image',secondary=analysis_image_map)
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
    
class Origin(Base):
    __tablename__='origin'
    origin_id =Column(Integer,primary_key=True)

    x=Column(Integer)
    y=Column(Integer)
    
    analysis = relationship("Analysis", back_populates="origin_list")
    analysis_id = Column(String(12),ForeignKey('analysis.analysis_id'))
    @staticmethod
    def build_origins(origins):
        origin_list = []
        for i in range(len(origins)):
            origin_to_add = Origin(y=origins[i][0],x = origins[i][1])
            origin_list.append(origin_to_add)
        return origin_list
    @staticmethod
    def build_arr(origin_list):
        origins = []
        for orig in origin_list:
            origin_to_add = [orig.y,orig.x]
            origins.append(origin_to_add)
        return origins

class Lane(Base):
    __tablename__ = 'lane'
    lane_id = Column(Integer, primary_key=True)
    analysis_id = Column(String(12), ForeignKey('analysis.analysis_id'))
    analysis = relationship("Analysis", back_populates="lane_list")
    lane_number=Column(Integer)
    lane_label=Column(String(128)) # Future feature
    origin_x=Column(Integer) # x-coordinate of origin (pixels)
    origin_y=Column(Integer) # y-coordinate of origin (pixels)
    ROI_list = relationship('ROI',back_populates='lane')

    @staticmethod
    def build_lanes(data):
        lane_list = []
        for i in range(len(data)):
            ROI_list = []
            for j in range(len(data[i])):
                ROI_to_add=ROI(ROI_number = j, x=data[i][j][1],y=data[i][j][0],ry=data[i][j][2],rx=data[i][j][3])
                ROI_list.append(ROI_to_add)
            lane_to_add=Lane(ROI_list = ROI_list, lane_number = j)
            lane_list.append(lane_to_add)
        return lane_list
    @staticmethod
    def build_arr(lane_list):
        ROIs = []
        for i in range(len(lane_list)):
            lane= []
            for j in range(len(lane_list[i].ROI_list)):
                roi = [lane_list[i].ROI_list[j].y,lane_list[i].ROI_list[j].x,lane_list[i].ROI_list[j].ry,lane_list[i].ROI_list[j].rx]
                lane.append(roi)
            ROIs.append(lane)
        return ROIs


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
    analysis_list = relationship('Analysis',secondary=analysis_image_map)
    image_id = Column(Integer, primary_key=True)
    equip_id = Column(Integer, ForeignKey('equipment.equip_id'))
    image_type = Column(Enum(ImageType), nullable=False)
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
    Base.metadata.drop_all(db_engine)
    Base.metadata.create_all(db_engine)


def db_add_test_data():
    # Some simple tests to show usage of creating a few objects (and automatically setting up the links between different types)
    tim = time.time()
    db_session.begin()
    plate1 = Plate(name = 'JT Baker 12345: silica, 250 um, aluminum back, F254 60',plate_id = 193587)
    plate2 = Plate(name = 'JT Baker 23456: silica, 250 um, glass back, F254 60, concentration zone',plate_id=851)
    cover = Cover(cover_id = 1935792, name = 'Dont know what to call this')
   
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
    prefs1 = { 'general': {'redirect_after_login': '/',}, }
    prefs2 = { 'general': {'redirect_after_login': '/user/search',}, }
    favs1 = { 'equip': [4000, 2938],}
    db_session.add(User(first_name = 'Alice', last_name = 'Armstrong', email = 'alice@armstrong.com', password_hash='$2b$12$jojM5EuDHREVES2S0OpLbuV.oDjqXWJ/wq9x07HwSQRfdpEUHLqNG', org_list=[org1], prefs=prefs1, favorites=favs1)) # PASSWORD 123
    db_session.add(User(first_name = 'Bob', last_name = 'Brown', email = 'bob@brown.com',password_hash='$2b$12$kA7FRa6qA./40Pmtmi6mRelW2cnkhcOHtsKelIMVezDlF33YF62C2', org_list=[org1,org2], prefs=prefs2)) # PASSWORD 123
    db_session.add(User(first_name = 'Cathy', last_name = 'Chen', email = 'cathy@chen.com',org_list=[org1,org2]))
    db_session.add(User(first_name = 'David', last_name = 'Delgado', email = 'david@delgado.com',org_list=[org1,org2]))
    db_session.add(User(first_name = 'Elaine', last_name = 'Eastman', email = 'elaine@eastman.com',org_list=[org1,org2]))
    db_session.add(User(first_name = 'Fred', last_name = 'Fan', email = 'fred@fan.com',org_list=[org1,org2]))
    db_session.add(User(first_name = 'Grace', last_name = 'Gibson', email = 'grace@gibson.com',org_list=[org1,org2]))
    db_session.add(User(first_name = 'Hector', last_name = 'Hoops', email = 'hector@hoops.com',org_list=[org1,org2]))
    db_session.add(User(first_name = 'Irene', last_name = 'Im', email = 'irene@im.com',org_list=[org1,org2]))
    db_session.add(User(first_name = 'Jing', last_name = 'Jackson', email = 'jing@jackson.com',org_list=[org1,org2]))
    db_session.add(User(first_name = 'Kevin', last_name = 'Kim', email = 'kevin@kim.com',org_list=[org1,org2]))
    db_session.add(User(first_name = 'Ling', last_name = 'Lin', email = 'ling@lin.com',org_list=[org1,org2]))
    
    db_session.add(User(first_name = 'NA', last_name = 'NA', email = 'NA',org_list=[org1,org2],user_id='1433625970'))
    db_session.commit()
    #print('Finished')


# TODO: We can also try adding new data types:
# analysis_image_map (or store it wholly in analysis) -- having a map would let you load any analysis that had used the same image... or the same flat field image....
# analysis: analysis_id, <various> image_id, background_method, filter_method
# STORE AS PICKLED WITHIN ANALYSIS (NO NEED FOR OWN ID)
# --- lane: name/sample, analysis_id, origin_x, origin_y, end_x, end_y  [This is not perfect, because the end is defined as a line in image, not per lane.  But it COULD be.]
# --- roi: lane_id, <geometry description>
# --- QUESTION... would we store the results inside the ROIs?, e.g. fields 'result_radio, 'result_rf'


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
        if (object_type is not 'user'):
            del data['owner_id'] # TODO: remove the need for this exception here
        return db_object_save(object_type, data) # Note use of 'save' instead of 'create' is deliberate


# Search objects meeting the filter criteria. Call object-specific function if it exists
# Return a list of object, or empty list if not found. Return None if any error encountered.
# TODO: add error checking
def db_object_search(object_type, object_filter=None):
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
    user = User.query.filter_by(user_id=user_id).one()
    user.password_hash = User.hash(new_password)
    db_session.commit()
    return True

def db_prefs_save(user_id, data):
    #db_session.begin()
    user = User.query.filter_by(user_id=user_id).one()
    user.prefs = data
    db_session.commit()
    return True

def db_prefs_load(user_id):
    user = User.query.filter_by(user_id=user_id).one()
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
# Return boolean
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
    

# Save a user to the database.  Expects a dict, ant the org_list to be a list of org_ids.
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
        #user.password_hash = User.hash(data['password'])
        # Following is not yet supported in this version of python
        #if data.has_key('preferences'):
        #    user.preferences = user.preferences | data['preferences']
        if data.get('org_list'):
            orgs = Organization.query.filter(Organization.org_id.in_(data['org_list'])).all() 
            user.org_list = orgs
    else:
        user = User(
                first_name = data['first_name'],
                last_name = data['last_name'],
                email = data['email'],
                password_hash = User.hash(data['password']),
                modified = datetime.now(timezone.utc),
                created = datetime.now(timezone.utc),)
        ####orgs = Organization.query.filter(Organization.org_id.in_(data['org_list'])).all() 
        ####user.org_list = orgs
        db_session.add(user)
    db_session.commit()
    return user

# Save an image
# TODO: create a thumbnail image and store in database...
def db_image_save(data):
    print("incoming data:")
    print(data)
    if (data['image_id'] is not None):
        image = Image.query.filter_by(image_id=data['image_id']).one()
        image.name = data['name']
        image.description = data['description']
        image.equip_id = data['equip_id']
        image.modified = datetime.now(timezone.utc)
        image.image_type = find_image_type(data['image_type'])
        image.captured = data['captured'] 
        image.exp_time = data['exp_time'] 
        image.exp_temp = data['exp_temp'] 
    else:
        print ('image_captured before convert')
        print (data['captured'])
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
    db_session.commit()  # or flush?
    # If received a new file:
    if ('file' in data and data['file']):
        # Delete old file
        if (image.image_path):
            os.remove(image.image_path) 
        image.image_path = os.path.join(app.config['IMAGE_UPLOAD_PATH'], str(image.image_id))
        # Create new file
        newfile = data['file']
        makeFileArray(newfile, data['file'])  # TODO: fix so we don't need to pass twice
        newfile.save(image.image_path)
        db_session.commit()
    return image


# TODO: later remove duplicate code. COPIED FROM api.py
def makeFileArray(fileN,fileN1):
    import time
    import numpy as np
    from PIL import Image
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

def find_images(data):
    images = []
    for image_type in ['dark','flat','radio','uv','bright']:
        if data[f'{image_type}_name']:
            data = data[image_type]
            id=data[f'{image_type}_id']
            captured=data[f'{image_type}_captured']
            owner_id=data[f'{image_type}_owner_id']
            created=data[f'{image_type}_created']
            modified=data[f'{image_type}_modified']
            exp_time = data[f'{image_type}_exp_time']
            exp_temp=data[f'{image_type}_exp_temp']
            name = data[f'{image_type}_name']
            description=data[f'{image_type}_description']
            path = find_path(image_type,data['analysis_id'])
            image = Image(
                image_id = id, image_type = find_image_type(image_type),captured = captured, owner_id = owner_id, created = created, modified = modified, exp_time = exp_time, exp_temp=exp_temp, name=name,image_path=path, description=description
                )                                
            images.append(image)
    return images


def retrieve_initial_analysis(analysis_id):
    #db_session.begin()   # TODO: why does this cause "transaction is already begun" error?
    tim = time.time()
    analysis = Analysis.query.filter(Analysis.analysis_id==analysis_id).one()
    analysis_dict = {}
    analysis_dict['ROIs']=Lane.build_arr(analysis.lane_list)
    ##print('rois',analysis_dict['ROIs'])
    analysis_dict['doRF']=analysis.doRF
    analysis_dict['origins']=Origin.build_arr(analysis.origin_list)
    analysis_dict['CerenkovName']=Image.query.filter(Image.image_type==ImageType.radio, Image.analysis_list.any(analysis_id=analysis_id)).one().name

    analysis_dict['DarkName']=Image.query.filter(Image.image_type==ImageType.dark , Image.analysis_list.any(analysis_id=analysis_id)).one().name
    ##print(analysis_dict['DarkName'])
    analysis_dict['FlatName']=Image.query.filter(Image.image_type==ImageType.flat , Image.analysis_list.any(analysis_id=analysis_id)).one().name
    if Image.query.filter(Image.image_type==ImageType.uv , Image.analysis_list.any(analysis_id=analysis_id)).all():
        analysis_dict['UVName']=Image.query.filter(Image.image_type==ImageType.uv , Image.analysis_list.any(analysis_id=analysis_id)).one().name
    if Image.query.filter(Image.image_type==ImageType.bright , Image.analysis_list.any(analysis_id=analysis_id)).all():
        analysis_dict['BrightName']=Image.query.filter(Image.image_type==ImageType.bright , Image.analysis_list.any(analysis_id=analysis_id)).one().name
    analysis_dict['name'] = analysis.name
    analysis_dict['description'] = analysis.description
    analysis_dict['owner_id'] = analysis.owner_id
    db_session.commit()
    return analysis_dict

def analysis_info(analysis_id):
    db_session.begin()
    analysis = Analysis.query.filter(Analysis.analysis_id == analysis_id).one()
    db_session.commit()
    return analysis.as_dict()

def retrieve_image_path(image_type,analysis_id):
    if 'cerenkov' in  image_type:
        image = CachedImage.query.filter(CachedImage.image_type ==find_image_type(image_type), CachedImage.analysis_id==analysis_id).one()
    else:
        image = Image.query.filter(Image.image_type==find_image_type(image_type), Image.analysis_id==analysis_id).one()
    return image.image_path

def db_analysis_save(data,analysis_id):
    #db_session.begin()
    if data['user_id']:
        user_id = data['user_id']
    else:
        user_id = '1433625970'
    data['analysis_id']=analysis_id
    images= find_images(data)
    analysis = Analysis.query.filter(Analysis.analysis_id==analysis_id).one()
    
    analysis.images = images
    user = User.query.filter(User.user_id==user_id).one()
    user.analysis_list.append(analysis)
    db_session.add(user)
    db_session.commit()
#    db_session.close()

def db_analysis_edit(data,analysis_id):
    
    analysis = Analysis.query.filter(Analysis.analysis_id==analysis_id).one()
    analysis.doRF = data['doRF']
    analysis.lane_list = Lane.build_lanes(data['ROIs'])
    analysis.origin_list = Origin.build_origins(data['origins'])
    db_session.add(analysis)
    db_session.commit()
#    db_session.close()

# TODO: this handling should be used at time of file generation
# ... and should be split for uploads and cached...
def find_path(image_type,analysis_id):
    if image_type =='cerenkovdisplay':
        ending = '.png'
    elif image_type =='dark' or image_type=='flat':
        ending = '.tiff'
    elif image_type=='radio':
        ending='.txt'
    else:
        ending='.npy'
    return f'./UPLOADS/{analysis_id}/{image_type}{ending}'

def db_analysis_save_initial(data,analysis_id):
    #db_session.begin()  # TODO: why does this cause "transaction is already begun" error?
    images = []
    for image_type in ['dark','flat','radio','uv','bright']:
        if data[f'{image_type}_name']:
            img = Image(name = data[f'{image_type}_name'], image_type = find_image_type(image_type),image_path = find_path(image_type,analysis_id))
            images.append(img) 
    lane_list = Lane.build_lanes(data['ROIs'])
    origin_list = Origin.build_origins(data['origins'])
    doRF = data['doRF']
    cachedimages=[]
    for image_type in ['cerenkovdisplay','cerenkovcalc','cerenkovradii']:
        img = CachedImage(image_type = image_type,image_path=find_path(image_type,analysis_id))
        cachedimages.append(img)
    analysis = Analysis(images=images,lane_list=lane_list,cachedimages = cachedimages,analysis_id = analysis_id, origin_list = origin_list,doRF=doRF, name=data['name'], description=data['description'], owner_id=data['user_id'])
    db_session.add(analysis)
    db_session.flush()
    if data['user_id'] is not None:
        user_id = data['user_id']
    else:
        user_id='1433625970'
    user = User.query.filter(User.user_id==user_id).one()
    user.analysis_list.append(analysis)
    db_session.add(user)
    #db_session.flush()
    db_session.commit()

