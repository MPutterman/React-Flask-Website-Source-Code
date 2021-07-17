# TODO:
# * Currently images are in different formats... this should be reconsidered in the future

# NOTE: need to run: pip3 install mysql-connector-python
# NOTE: need to run: pip3 install SQLAlchemy
# NOTE: need to run: pip3 install flask-login

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
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.orm import Session, sessionmaker, scoped_session
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.orm import class_mapper
from sqlalchemy import select
from dotenv import load_dotenv
import os
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
from dateutil.parser import parse

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
    prefs = Column(PickleType)
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
    camera = Column(String(128), nullable=False)
    has_temp_control = Column(Boolean, nullable=False)
    has_metadata = Column(Boolean)  # Do the files/images have metadata we can read? (Date, temp, etc..)?  If so we can skip things on the image_edit form
    pixels_x = Column(Integer, nullable=False)
    pixels_y = Column(Integer, nullable=False)
    fov_x = Column(Float) # size in mm
    fov_y = Column(Float) # size in mm
    bpp = Column(Integer, nullable=False) # Assumes images are monochrome
    file_format = Column(String(128), nullable=False) # Each type will map to an 'importer' function

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
    owner_id = Column(Integer, ForeignKey('user.user_id')) # User who performed the analysis
    plate_id = Column(Integer, ForeignKey('plate.plate_id'))
    cover_id = Column(Integer, ForeignKey('cover.cover_id'))
    #user=relationship("User",secondary=user_analysis_map)
    doRF = Column(Boolean)
    cachedimages=relationship('CachedImage',back_populates='analysis')
    origin_list = relationship('Origin',back_populates='analysis')
    lane_list = relationship("Lane", back_populates="analysis")
    images= relationship('Image',secondary=analysis_image_map)

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
    captured = Column(DateTime(timezone=True)) # Image creation date (support timezone?)
    exp_time = Column(Float) # Exposure time (seconds)
    exp_temp = Column(Float) # Exposure temp (deg C)
    name = Column(String(128), nullable=False)
    description = Column(Text) # Maybe can get rid of this...?
    image_path = Column(String(256)) #, nullable=False) # Full path of file on server (for file system DB)
    owner_id = Column(Integer, ForeignKey('user.user_id')) # User-ID of user that uploaded the file
    created = Column(DateTime(timezone=True)) 
    modified = Column(DateTime(timezone=True))

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
    
class Cover(Base):
    __tablename__ = 'cover'
    cover_id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)


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
    db_session.add(User(first_name = 'Alice', last_name = 'Armstrong', email = 'alice@armstrong.com', password_hash='$2b$12$jojM5EuDHREVES2S0OpLbuV.oDjqXWJ/wq9x07HwSQRfdpEUHLqNG', org_list=[org1], prefs=prefs1)) # PASSWORD 123
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

# Load a user from id. Also load the list of associated organization ids.
# Return as a user object.
# NOTE: 'scalar' method returns 'None' if no entry is found, or one object. Raises exception of more than 1 result found.
# TODO: Figure out handling of ID-not found
def db_user_load(id):
    #db_session.begin()
    user = User.query.options(selectinload(User.org_list)).filter_by(user_id=id).scalar() # scalar returns a single record or 'None'; raises exception if >1 found
    db_session.commit()
    #db_session.close()
    return user

def db_user_load_by_email(email):
    db_session.begin()
    #users = (User.query.all())
    #print(users)
    #for user in users:

    user = User.query.options(selectinload(User.org_list)).filter_by(email=email).scalar() # scalar returns a single record or 'None'; raises exception if >1 found
    db_session.commit()
    #db_session.close()
    return user

def db_prefs_save(user_id, data):
    #db_session.begin()
    user = User.query.filter_by(user_id=user_id).one()
    user.prefs = data
    db_session.commit()
    return ''

def db_prefs_load(user_id):
    user = User.query.filter_by(user_id=user_id).one()
    db_session.commit()
    return user.prefs

# Save a user to the database.  Expects a dict, ant the org_list to be a list of org_ids.
# Blank user_id means it hasn't yet been inserted to database
# TODO: when save preferences, should we merge with existing ones, or overwrite?
def db_user_save(data):
    #print("incoming data:")
    #print(data)
    db_session.begin()

    # If user_id exists, load user, replace data, then update
    # If user_id is empty, add a new user
    if (data['user_id'] is not None):
        user = User.query.filter_by(user_id=data['user_id']).one()
        user.first_name = data['first_name']
        user.last_name = data['last_name']
        user.email = data['email']
        user.password_hash = User.hash(data['password'])
        # Following is not yet supported in this version of python
        #if data.has_key('preferences'):
        #    user.preferences = user.preferences | data['preferences']
        orgs = Organization.query.filter(Organization.org_id.in_(data['org_list'])).all() 
        user.org_list = orgs
    else:
        user = User(first_name = data['first_name'], last_name = data['last_name'], email = data['email'], password_hash = User.hash(data['password']))
        orgs = Organization.query.filter(Organization.org_id.in_(data['org_list'])).all() 
        user.org_list = orgs
        db_session.add(user)
    db_session.commit()
    newdata = user.as_dict()
    newdata['org_list'] = [org.org_id for org in user.org_list]
    #db_session.close()
    #print ("data_after:")
    #print(newdata)
    return newdata

# Return a list of users.  Currently gets a list of all users.
# In future will accept filters (e.g. match part of name, filter by organization, etc...) and sort options.
def db_user_search():
    user_list = User.query.all()
    db_session.commit()
    data = []
    for user in user_list:
        current_user = user.as_dict()
        current_user['org_list'] = [org.org_id for org in user.org_list]
        data.append(current_user)
    #db_session.close()
    return dumps(data)

# Return a list of organizations
# TODO: in future add filtering, ordering, pagination, etc...
def db_organization_search():
    results = Organization.query.all()
    db_session.commit()
    data = [org.as_dict() for org in results]
    return dumps(data) # Can directly return a list...  This returns just the list.  Use jsonify(keyname=data) if want to return with a key

# Return a list of analyses.  Currently gets a list of all of them.
# In future will accept filters (e.g. match part of name or description, filter by date,
# filter by user, filter by organization, filter by equip_id, plate_id, cover_id, etc...
# and sort options.
def db_analysis_search():
    analysis_list = Analysis.query.all()
    db_session.commit()
    data = []
    for analysis in analysis_list:
        current_analysis = analysis.as_dict()
        data.append(current_analysis)
    #db_session.close()
    return dumps(data)

# Return an equipment
def db_equip_load(id):
    #db_session.begin()
    record = Equipment.query.filter_by(equip_id=id).scalar() # scalar returns a single record or 'None'; raises exception if >1 found
    db_session.commit()
    #db_session.close()
    return record

def db_equip_search():
    equip_list = Equipment.query.all()
    db_session.commit()
    data = []
    for equip in equip_list:
        data.append(equip.as_dict())
    return dumps(data)

# TODO: also add the following: options(selectinload(Image.equip_id))
# Return an image
def db_image_load(id):
    db_session.begin()
    image = Image.query.filter_by(image_id=id).scalar() # scalar returns a single record or 'None'; raises exception if >1 found
    db_session.commit()
    #db_session.close()
    if (image):
        image.image_type = convert_image_type_to_string(image.image_type)
    return image

# TODO: also add the following: options(selectinload(Image.equip_id))
# TODO: add owner_id handling
# Save an image
def db_image_save(data):
    print("incoming data:")
    print(data)
    # Find equipment id record
    ####equip = None
    ####if (data['equip_id'] != 'undefined' and data['equip_id'] is not None):
    ####    equip = db_equip_load(data['equip_id'])
    # If id exists, load record, replace data, then update
    # If id is empty, add a new record
    if (data['image_id'] is not None):
        # Currently can't update owner_id, modified, created
        image = Image.query.filter_by(image_id=data['image_id']).one()
        image.name = data['name']
        image.description = data['description']
        ####image.equip_id = equip
        image.equip_id = data['equip_id']
        image.modified = datetime.now(timezone.utc)
        image.image_type = find_image_type(data['image_type'])
        image.captured = data['captured'] # Provided in ISO format by frontend
        image.exp_time = data['exp_time'] # Provided in ISO format by frontend
        image.exp_temp = data['exp_temp'] # Provided in ISO format by frontend
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
        ####image.equip = equip
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
    # TODO: in future just return image_id?
    # For now, reconvert image_type to string
    image.image_type = convert_image_type_to_string(image.image_type)
    # Also convert all datetime to string
    # TODO: this is a hack... TZ info is being lost by SQLAlchemy, so we add it back.
    #    (With current settings it is saving the UTC time.)
    if (image.modified):
        image.modified = image.modified.isoformat() + '+00:00'
    if (image.created):
        image.created = image.created.isoformat() + '+00:00'
    if (image.captured):
        image.captured = image.captured.isoformat() + '+00:00'
    return image.as_dict()


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


# Return a list of images.
# In future will accept filters (e.g. match part of name, search type,
# filter by owner / organization / date... filter by equip_id, exposure time, exposure temp
def db_image_search():
    image_list = Image.query.all()
    db_session.commit()
    data = []
    for image in image_list:
        current_image = image.as_dict()
        print (current_image)
        current_image['image_type'] = convert_image_type_to_string(current_image['image_type'])

        # TODO: the folowing is a hack... TZ info is being lost by SQLAlchemy, so we add it back.
        #    (With current settings it is saving the UTC time.)
        if (current_image['created']):
            current_image['created'] = current_image['created'].isoformat() + '+00:00'
        if (current_image['modified']):
            current_image['modified'] = current_image['modified'].isoformat() + '+00:00'
        if (current_image['captured']):
            current_image['captured'] = current_image['captured'].isoformat() + '+00:00'
        print(current_image)
        data.append(current_image)
    return dumps(data)


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

