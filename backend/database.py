# NOTE: need to run: pip3 install mysql-connector-python
# NOTE: need to run: pip3 install SQLAlchemy

from sqlalchemy import create_engine, MetaData
from sqlalchemy import Table, Column, ForeignKey
from sqlalchemy import Integer, String, Float, Text, DateTime, LargeBinary, Enum, Boolean
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.orm import Session, sessionmaker
from dotenv import load_dotenv
import os
from urllib.parse import quote
import enum

# TODO: fix this. I want to avoid running this code if DB has already been initialized but this won't work as is
db_initialized = False;
if (not db_initialized):

    # Load environment variables (DB setup)
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
    Session = sessionmaker(bind=engine)

    # Create ORM Base class
    Base = declarative_base()

    # Define association tables
    
    user_org_map = Table('user_org_map', Base.metadata,
        Column('user_id', Integer, ForeignKey('user.user_id'), primary_key=True),
        Column('org_id', Integer, ForeignKey('organization.org_id'), primary_key=True),
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

    # See here for info on how to use 'relationship':
    # http://docs.sqlalchemy.org/en/14/orm/basic_relationships.html#many-to-many

    class User(Base):
        __tablename__ = 'user'
        user_id = Column(Integer, primary_key=True)
        first_name = Column(String(64))
        last_name = Column(String(64))
        email = Column(String(254), nullable=False) # max lenth of an email address 
        org_list = relationship("Organization", secondary=user_org_map) 

    class Organization(Base):
        __tablename__ = 'organization'
        org_id = Column(Integer, primary_key=True)
        name = Column(String(128), nullable=False)
        description = Column(Text)
        equip_list = relationship("Equipment", secondary=org_equip_map)
        plate_list = relationship("Plate", secondary=org_plate_map)
        cover_list = relationship("Cover", secondary=org_cover_map)
        
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
        bpp = Column(Integer, nullable=False)
        # QUESTION: is it safe to force all data to be monochrome with fixed bpp?

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

    # Careful, this deletes ALL data in database
    # TODO: make this a separate function in the future (only run during initial install)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    db_initialized = True;


if (not db_initialized):
    db_init()

def db_session():
    return Session(future=True)



# Some simple tests to show usage of creating a few objects (and automatically setting up the links between different types)
session = db_session()
session.begin()
plate1 = Plate(name = 'JT Baker 12345: silica, 250 um, aluminum back, F254 60')
plate2 = Plate(name = 'JT Baker 23456: silica, 250 um, glass back, F254 60, concentration zone')
session.add(plate1)
session.add(plate2)
org1 = Organization(name = 'UCLA Crump Institute for Molecular Imaging', plate_list=[plate1,plate2])
org2 = Organization(name = 'UCLA Ahmanson Translational Theranosticis Division', plate_list=[])
session.add(org1)
session.add(org2)
session.add(User(first_name = 'Alice', last_name = 'Armstrong', email = 'alice@armstrong.com', org_list=[org1]))
session.add(User(first_name = 'Bob', last_name = 'Brown', email = 'bob@brown.com',org_list=[org1,org2]))

session.commit()

# TODO: for each type of objects there are standard ops
# TODO: best practices would be to define methods for each class (User, Organization, etc..)
# to help implement the following functionality (and keep api.py calls short):
# load (by id)
# new (get empty object)
# save (insert or add)
# search (filter, pagination, sort-order)
# delete (by id)

# TODO: We can also try adding new data types:
# analysis: analysis_id, <various> image_id, background_method, filter_method
# lane: analysis_id, origin_x, origin_y, end_x, end_y  [This is not perfect, because the end is defined as a line in image, not per lane.  But it COULD be.]
# roi: lane_id, <geometry description>
# QUESTION... would we store the results inside the ROIs?, e.g. fields 'result_radio, 'result_rf'


