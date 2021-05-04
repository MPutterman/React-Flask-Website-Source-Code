# NOTE: need to run: pip3 install mysql-connector-python
# NOTE: need to run: pip3 install SQLAlchemy
# NOTE: need to run: pip3 install flask-login

from sqlalchemy import create_engine, MetaData
from sqlalchemy import Table, Column, ForeignKey
from sqlalchemy import Integer, String, Float, Text, DateTime, LargeBinary, Enum, Boolean,BigInteger
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

# Define association tables

user_org_map = Table('user_org_map', Base.metadata,
    Column('user_id', BigInteger, ForeignKey('user.user_id'), primary_key=True),
    Column('org_id', BigInteger, ForeignKey('organization.org_id'), primary_key=True),
)

user_analysis_map = Table('user_analysis_map', Base.metadata,
    Column('user_id', BigInteger, ForeignKey('user.user_id'), primary_key=True),
    Column('analysis_id', BigInteger, ForeignKey('analysis.analysis_id'), primary_key=True),
)

analysis_image_map = Table('analysis_image_map', Base.metadata,
    Column('analysis_id', BigInteger, ForeignKey('analysis.analysis_id'), primary_key=True),
    Column('image_id', BigInteger, ForeignKey('image.image_id'), primary_key=True),
)

org_equip_map = Table('org_equip_map', Base.metadata,
    Column('org_id', BigInteger, ForeignKey('organization.org_id'), primary_key=True),
    Column('equip_id', BigInteger, ForeignKey('equipment.equip_id'), primary_key=True),
)

org_plate_map = Table('org_plate_map', Base.metadata,
    Column('org_id', BigInteger, ForeignKey('organization.org_id'), primary_key=True),
    Column('plate_id', BigInteger, ForeignKey('plate.plate_id'), primary_key=True),
)

org_cover_map = Table('org_cover_map', Base.metadata,
    Column('org_id', BigInteger, ForeignKey('organization.org_id'), primary_key=True),
    Column('cover_id', BigInteger, ForeignKey('cover.cover_id'), primary_key=True),
)
# analysis_lane_map=Table('analysis_lane_map', Base.metadata,
#     Column('analysis_id', BigInteger, ForeignKey('analysis.analysis_id'), primary_key=True),
#     Column('lane_id', BigInteger, ForeignKey('lane.lane_id'), primary_key=True),
# )
# lane_ROI_map = Table('lane_ROI_map', Base.metadata,
#     Column('lane_id', BigInteger, ForeignKey('lane.lane_id'), primary_key=True),
#     Column('ROI_id', BigInteger, ForeignKey('ROI.ROI_id'), primary_key=True),
# )



# Define data classes

# See here for info on how to use 'relationship':
# http://docs.sqlalchemy.org/en/14/orm/basic_relationships.html#many-to-many

class User(UserMixin, Base):
    __tablename__ = 'user'
    user_id = Column(BigInteger, primary_key=True)
    first_name = Column(String(64))
    last_name = Column(String(64))
    email = Column(String(254), nullable=False) # max lenth of an email address 
    is_deleted = Column(Boolean, default=False, nullable=False)
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
    org_id = Column(BigInteger, primary_key=True)
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
    equip_id = Column(BigInteger, primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    camera = Column(String(128), nullable=False)
    has_temp_control = Column(Boolean, nullable=False)
    pixels_x = Column(BigInteger, nullable=False)
    pixels_y = Column(BigInteger, nullable=False)
    fov_x = Column(Float) # size in mm
    bpp = Column(BigInteger, nullable=False) # QUESTION: is it same to assume all images will be monochrome?
    image_format = Column(String(128), nullable=False) # This will help identify how to read the file before loading it (maybe should be enum type)

class CachedImage(Base):
    __tablename__='cachedimage'
    analysis = relationship('Analysis',back_populates='cachedimages')
    analysis_id = Column(BigInteger,ForeignKey('analysis.analysis_id'))
    image_id = Column(BigInteger, primary_key=True)
    image_type = Column(String(64), nullable=False)
    image_path=Column(String(128))
   
    

class ROI(Base):
    __tablename__='ROI'
    ROI_id = Column(BigInteger,primary_key=True) 
    ROI_number = Column(BigInteger)
    x=Column(BigInteger)
    y=Column(BigInteger)
    rx=Column(BigInteger)#radius in x direction (in pixels)
    ry=Column(BigInteger)#radius in y direction (in pixels)
    lane_id = Column(BigInteger,ForeignKey('lane.lane_id'))
    lane = relationship("Lane",back_populates='ROI_list')


class Analysis(Base):
    __tablename__ = 'analysis'
    analysis_id = Column(BigInteger, primary_key=True)
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
    origin_id =Column(BigInteger,primary_key=True)

    x=Column(BigInteger)
    y=Column(BigInteger)
    
    analysis = relationship("Analysis", back_populates="origin_list")
    analysis_id = Column(BigInteger,ForeignKey('analysis.analysis_id'))
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
    lane_id = Column(BigInteger, primary_key=True)
    analysis_id = Column(BigInteger, ForeignKey('analysis.analysis_id'))
    analysis = relationship("Analysis", back_populates="lane_list")
    lane_number=Column(BigInteger)
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
    analysis_id = Column(BigInteger,ForeignKey('analysis.analysis_id'))
    image_id = Column(BigInteger, primary_key=True)
    equip_id = Column(BigInteger, ForeignKey('equipment.equip_id'))
    image_type = Column(Enum(ImageType), nullable=False)
    datetime = Column(DateTime) # Image creation date (support timezone?)
    exp_time = Column(Float) # Exposure time (seconds)
    exp_temp = Column(Float) # Exposure temp (deg C)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    plate_id = Column(BigInteger, ForeignKey('plate.plate_id'))
    cover_id = Column(BigInteger, ForeignKey('cover.cover_id'))
    image_path = Column(String(128), nullable=False)
    # TODO: maybe point to Moe's file system DB for now?

class Plate(Base):
    __tablename__ = 'plate'
    plate_id = Column(BigInteger, primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    
class Cover(Base):
    __tablename__ = 'cover'
    cover_id = Column(BigInteger, primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)


def db_create_tables():
    # Careful, this deletes ALL data in database
   Base.metadata.drop_all(db_engine)
   Base.metadata.create_all(db_engine)


def db_add_test_data():
    # Some simple tests to show usage of creating a few objects (and automatically setting up the links between different types)
    db_session.begin()
    plate1 = Plate(name = 'JT Baker 12345: silica, 250 um, aluminum back, F254 60',plate_id = 193587)
    plate2 = Plate(name = 'JT Baker 23456: silica, 250 um, glass back, F254 60, concentration zone',plate_id=851)
    cover = Cover(cover_id = 1935792, name = 'Dont know what to call this')
    tim = time.time()
    db_session.add(plate1)
    print(time.time()-tim)
    db_session.add(plate2)
    equip1 = Equipment(name = 'Crump Cerenkov #1', description = 'some text', equip_id = 2938,camera = 'QSI 540 (KAI-04022 CCD sensor)', has_temp_control = True, pixels_x = 682, pixels_y = 682, bpp = 16, image_format = 'tiff')
    db_session.add(equip1)
    org1 = Organization(name = 'UCLA Crump Institute for Molecular Imaging', org_id =1153078, plate_list=[plate1,plate2],cover_list = [cover], equip_list=[equip1])
    org2 = Organization(name = 'UCLA Ahmanson Translational Theranosticis Division', org_id = 21857,plate_list=[plate1],cover_list = [cover])
    org3 = Organization(name = 'Imaginary University Deparment of Radiochemistry',org_id = 25987)
    db_session.add_all([org1, org2, org3])
    db_session.add(User(first_name = 'Alice', last_name = 'Armstrong', email = 'alice@armstrong.com', org_list=[org1]))
    db_session.add(User(first_name = 'Bob', last_name = 'Brown', email = 'bob@brown.com',org_list=[org1,org2]))
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
    #print("incoming data:")
    #print(data)
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
    #print ("data_after:")
    #print(newdata)
    return newdata

# Return a list of organizations
# TODO: in future add filtering, ordering, pagination, etc...
def db_organization_search():
    results = Organization.query.all()
    db_session.commit()
    data = [org.as_dict() for org in results]
    return dumps(data) # Can directly return a list...  This returns just the list.  Use jsonify(keyname=data) if want to return with a key


        
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
    
def find_images(data):
    images = []
    for image_type in ['dark','flat','radio','uv','bright']:
        if data[f'{image_type}_name']:
            data = data[image_type]
            id=data[f'{image_type}_id']
            datetime=data[f'{image_type}_datetime']
            exp_time = data[f'{image_type}_exp_time']
            exp_temp=data[f'{image_type}_exp_temp']
            name = data[f'{image_type}_name']
            description=data[f'{image_type}_description']
            path = find_path(image_type,data['analysis_id'])
            image = Image(
                image_id = id, image_type = find_image_type(image_type),datetime = datetime, exp_time = exp_time, exp_temp=exp_temp, name=name,image_path=path, description=description
                )                                
            images.append(image)
    return images


def retrieve_initial_analysis(analysis_id):
    tim = time.time()
    analysis = Analysis.query.filter(Analysis.analysis_id==analysis_id).one()
    print(time.time()-tim)
    analysis_dict = {}
    print('lanes',Lane.build_arr(analysis.lane_list))
    analysis_dict['ROIs']=Lane.build_arr(analysis.lane_list)
    ##print('rois',analysis_dict['ROIs'])
    analysis_dict['doRF']=analysis.doRF
    analysis_dict['origins']=Origin.build_arr(analysis.origin_list)
    analysis_dict['CerenkovName']=Image.query.filter(Image.image_type==ImageType.radio and Image.analysis_id==analysis_id).one().name

    analysis_dict['DarkName']=Image.query.filter(Image.image_type==ImageType.dark and Image.analysis_id==analysis_id).one().name
    ##print(analysis_dict['DarkName'])
    analysis_dict['FlatName']=Image.query.filter(Image.image_type==ImageType.flat and Image.analysis_id==analysis_id).one().name
    if Image.query.filter(Image.image_type==ImageType.uv and Image.analysis_id==analysis_id).all():
        analysis_dict['UVName']=Image.query.filter(Image.image_type==ImageType.uv and Image.analysis_id==analysis_id).one().name
    if Image.query.filter(Image.image_type==ImageType.bright and Image.analysis_id==analysis_id).all():
        analysis_dict['BrightName']=Image.query.filter(Image.image_type==ImageType.bright and Image.analysis_id==analysis_id).one().name
    return analysis_dict
def analysis_info(analysis_id):
    db_session.begin()
    analysis = Analysis.query.filter(Analysis.analysis_id == analysis_id).one()
    return analysis.as_dict()
def retrieve_image_path(image_type,analysis_id):
    tim = time.time()
    print(find_image_type(image_type))
    if 'cerenkov' in  image_type:
        image = CachedImage.query.filter(CachedImage.image_type ==find_image_type(image_type) and CachedImage.analysis_id==analysis_id).one()
    else:
        image = Image.query.filter(Image.image_type==find_image_type(image_type) and Image.analysis_id==analysis_id).one()
    print(time.time()-tim)
    return image.image_path
def db_analysis_save(data,analysis_id):
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
def db_analysis_edit(data,analysis_id):
    
    analysis = Analysis.query.filter(Analysis.analysis_id==analysis_id).one()
    ##print('ROIs',data['ROIs'])
    ##print('orig',data['origins'])
    print('ROIs',data['ROIs'])
    analysis.doRF = data['doRF']
    analysis.lane_list = Lane.build_lanes(data['ROIs'])
    print('lanes',Lane.build_arr(analysis.lane_list))
    analysis.origin_list = Origin.build_origins(data['origins'])
    ##print('l',Lane.build_arr(analysis.lane_list))
    ##print('')

    db_session.add(analysis)
    db_session.commit()
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
    db_session.begin()
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
    print('imgs',cachedimages)
    analysis = Analysis(images=images,lane_list=lane_list,cachedimages = cachedimages,analysis_id = analysis_id, origin_list = origin_list,doRF=doRF)
    if data['user_id'] is not None:
        user_id = data['user_id']
    else:
        user_id='1433625970'
    user = User.query.filter(User.user_id==user_id).one()
    user.analysis_list.append(analysis)
    db_session.add(user)
    db_session.commit()

    





        

        





