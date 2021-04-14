# NOTE: need to run: pip3 install mysql-connector-python
# NOTE: need to run: pip3 install SQLAlchemy
# NOTE: need to run: pip3 install flask-login

from sqlalchemy import create_engine, MetaData
from sqlalchemy import Table, Column, ForeignKey
from sqlalchemy import Integer, String, Float, Text, DateTime, LargeBinary, Enum, Boolean
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
engine = create_engine(db_uri, future=True)

# Create Session class
# Other docs used the following (is there a difference?)
#    Session = sessionmaker(bind=engine)
#    session = Session(future=True)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

# Create ORM Base class
Base = declarative_base()
Base.query = db_session.query_property()

# Define association tables

user_org_map = Table('user_org_map', Base.metadata,
    Column('user_id', Integer, ForeignKey('user.user_id'), primary_key=True),
    Column('org_id', Integer, ForeignKey('organization.org_id'), primary_key=True),
)

user_analysis_map = Table('user_analysis_map', Base.metadata,
    Column('user_id', Integer, ForeignKey('user.user_id'), primary_key=True),
    Column('analysis_id', String(20), ForeignKey('analysis.analysis_id'), primary_key=True),
)

analysis_image_map = Table('analysis_image_map', Base.metadata,
    Column('analysis_id', String(20), ForeignKey('analysis.analysis_id'), primary_key=True),
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

lane_ROI_map = Table('lane_ROI_map', Base.metadata,
    Column('lane_id', Integer, ForeignKey('lane.lane_id'), primary_key=True),
    Column('ROI_id', Integer, ForeignKey('ROI.ROI_id'), primary_key=True),
)

org_cover_map = Table('org_cover_map', Base.metadata,
    Column('org_id', Integer, ForeignKey('organization.org_id'), primary_key=True),
    Column('cover_id', Integer, ForeignKey('cover.cover_id'), primary_key=True),
)

analysis_lane_map=Table('analysis_lane_map', Base.metadata,
    Column('analysis_id', String(20), ForeignKey('analysis.analysis_id'), primary_key=True),
    Column('lane_id', Integer, ForeignKey('lane.lane_id'), primary_key=True),
)


# Define data classes

# See here for info on how to use 'relationship':
# http://docs.sqlalchemy.org/en/14/orm/basic_relationships.html#many-to-many

class User(UserMixin, Base):
    __tablename__ = 'user'
    user_id = Column(Integer, primary_key=True)
    first_name = Column(String(64))
    last_name = Column(String(64))
    email = Column(String(254), nullable=False) # max lenth of an email address 
    org_list = relationship("Organization", secondary=user_org_map) 
    analysis_list=relationship("Analysis",secondary=user_analysis_map)

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
    pixels_x = Column(Integer, nullable=False)
    pixels_y = Column(Integer, nullable=False)
    fov_x = Column(Float) # size in mm
    bpp = Column(Integer, nullable=False) # QUESTION: is it same to assume all images will be monochrome?
    image_format = Column(String(128), nullable=False) # This will help identify how to read the file before loading it (maybe should be enum type)

class Lane(Base):
    __tablename__='lane'
    lane_id = Column(Integer,primary_key=True)
    lane_number=Column(Integer) #Do we need lane number or should we just go off of which index it is in the array
    ROI_list = relationship("ROI",secondary=lane_ROI_map)

class ROI(Base):
    __tablename__='ROI'
    ROI_id = Column(Integer,primary_key=True) 
    ROI_number = Column(Integer)
    x=Column(Integer)
    y=Column(Integer)
    rx=Column(Integer)#radius in x direction
    ry=Column(Integer)#radius in y direction

class Analysis(Base):
    __tablename__='analysis'
    analysis_id = Column(String(20),primary_key=True)
    lane_list = relationship('Lane',secondary=analysis_lane_map)
    images= relationship('Image',secondary=analysis_image_map)

class ImageType(enum.Enum):
    flat = 1
    dark = 2
    radio = 10
    bright = 11
    uv = 12

class Image(Base):
    __tablename__ = 'image'
    image_id = Column(Integer, primary_key=True)
    equip_id = Column(Integer, ForeignKey('equipment.equip_id'))
    image_type = Column(Enum(ImageType), nullable=False)
    datetime = Column(DateTime) # Image creation date (support timezone?)
    exp_time = Column(Float) # Exposure time (seconds)
    exp_temp = Column(Float) # Exposure temp (deg C)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    plate_id = Column(Integer, ForeignKey('plate.plate_id'))
    cover_id = Column(Integer, ForeignKey('cover.cover_id'))
    image_data = Column(LargeBinary, nullable=False)
    # TODO: maybe point to Moe's file system DB for now?

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
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def db_add_test_data():
    # Some simple tests to show usage of creating a few objects (and automatically setting up the links between different types)
    db_session.begin()
    plate1 = Plate(name = 'JT Baker 12345: silica, 250 um, aluminum back, F254 60')
    plate2 = Plate(name = 'JT Baker 23456: silica, 250 um, glass back, F254 60, concentration zone')
    db_session.add(plate1)
    db_session.add(plate2)
    equip1 = Equipment(name = 'Crump Cerenkov #1', description = 'some text', camera = 'QSI 540 (KAI-04022 CCD sensor)', has_temp_control = True, pixels_x = 682, pixels_y = 682, bpp = 16, image_format = 'tiff')
    db_session.add(equip1)
    org1 = Organization(name = 'UCLA Crump Institute for Molecular Imaging', plate_list=[plate1,plate2], equip_list=[equip1])
    org2 = Organization(name = 'UCLA Ahmanson Translational Theranosticis Division', plate_list=[])
    org3 = Organization(name = 'Imaginary University Deparment of Radiochemistry')
    db_session.add_all([org1, org2, org3])
    db_session.add(User(first_name = 'Alice', last_name = 'Armstrong', email = 'alice@armstrong.com', org_list=[org1]))
    db_session.add(User(first_name = 'Bob', last_name = 'Brown', email = 'bob@brown.com',org_list=[org1,org2]))

    ROI1=ROI(ROI_id=1,ROI_number = 1, x=100,y=100,rx=10,ry=10)
    ROI2=ROI(ROI_id=3,ROI_number=2,x=200,y=200,rx=20,ry=20)
    ROI3=ROI(ROI_id=4,ROI_number=1,x=300,y=300,rx=30,ry=30)
    ROI4=ROI(ROI_id=5,ROI_number=2,x=400,y=400,rx=40,ry=40)
    ROI5=ROI(ROI_id=6,ROI_number=3,x=500,y=500,rx=50,ry=50)
    ROI6=ROI(ROI_id=7,ROI_number=4,x=600,y=600,rx=60,ry=60)

    lanes1 = Lane(lane_id =1,lane_number =1,ROI_list=[ROI1,ROI2])
    lanes2 = Lane(lane_id =2,lane_number=2,ROI_list=[ROI3,ROI4,ROI5,ROI6])

    analysis1 = Analysis(analysis_id='q28o23yXY',lane_list=[lanes1,lanes2])

    session.add(User(first_name = 'Bob', last_name = 'Brown', email = 'bob@brown.com',analysis_list=[analysis1],org_list=[org1,org2]))

    session.commit()


# TODO: We can also try adding new data types:
# analysis_image_map (or store it wholly in analysis) -- having a map would let you load any analysis that had used the same image... or the same flat field image....
# analysis: analysis_id, <various> image_id, background_method, filter_method
<<<<<<< HEAD
# lane: analysis_id, origin_x, origin_y, end_x, end_y  [This is not perfect, because the end is defined as a line in image, not per lane.  But it COULD be.]
# roi: lane_id, <geometry description>
# QUESTION... would we store the results inside the ROIs?, e.g. fields 'result_radio, 'result_rf'
=======
# STORE AS PICKLED WITHIN ANALYSIS (NO NEED FOR OWN ID)
# --- lane: name/sample, analysis_id, origin_x, origin_y, end_x, end_y  [This is not perfect, because the end is defined as a line in image, not per lane.  But it COULD be.]
# --- roi: lane_id, <geometry description>
# --- QUESTION... would we store the results inside the ROIs?, e.g. fields 'result_radio, 'result_rf'

###  REALLY GOOD TUTORIAL HERE:
###  https://pythonhosted.org/Flask-Security/quickstart.html#id2


# Load a user from id. Also load the list of associated organization ids.
# Return as a dict.
# NOTE: 'scalar' method returns 'None' if no entry is found, or one object. Raises exception of more than 1 result found.
# TODO: Figure out handling of ID-not found
def db_user_load(id):
    user = User.query.options(selectinload(User.org_list)).filter_by(user_id=id).scalar() # scalar returns a single record or 'None'; raises exception if >1 found
    db_session.commit()
    data = user.as_dict()
    data['org_list'] = [org.org_id for org in user.org_list]
    db_session.close()
    return data

# Save a user to the database.  Expects a dict, ant the org_list to be a list of org_ids.
# Blank user_id means it hasn't yet been inserted to database
def db_user_save(data):
    print("incoming data:")
    print(data)
    db_session.begin()
    # If user_id exists, load user, replace data, then update
    # If user_id is empty, add a new user
    if (data['user_id']):
        user = User.query.filter_by(user_id=data['user_id']).one()
        user.first_name = data['first_name']
        user.last_name = data['last_name']
        user.email = data['email']
        orgs = Organization.query.filter(Organization.org_id.in_(data['org_list'])).all() 
        user.org_list = orgs
    else:
        user = User(first_name = data['first_name'], last_name = data['last_name'], email = data['email'])
        orgs = Organization.query.filter(Organization.org_id.in_(data['org_list'])).all() 
        user.org_list = orgs
        db_session.add(user)
    db_session.commit()
    newdata = user.as_dict()
    newdata['org_list'] = [org.org_id for org in user.org_list]
    db_session.close()
    print ("data_after:")
    print(newdata)
    return newdata

# Return a list of organizations
# TODO: in future add filtering, ordering, pagination, etc...
def db_organization_search():
    results = Organization.query.all()
    db_session.commit()
    data = [org.as_dict() for org in results]
    return dumps(data) # Can directly return a list...  This returns just the list.  Use jsonify(keyname=data) if want to return with a key



>>>>>>> 936f86a9d4a51ebdecc944590857a78e7ca43199
