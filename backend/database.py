# NOTE: need to run: pip3 install mysql-connector-python
# NOTE: due to potential bug with mysql.connector, needs to be imported before certain libraries
import mysql.connector
from mysql.connector import errorcode

# NOTE: need to run: pip3 install SQLAlchemy
import sqlalchemy

# Load environment variables (for DB setup)
from dotenv import load_dotenv
load_dotenv()
import os

# For errors
import sys

# Create unique IDs
import shortuuid
def generate_id():
    return shortuuid.uuid()

# TODO: wrap this in SQLAlchemy to add some more intelligent / automated handling of CRUD operations

# Connect to database

try:
    db = mysql.connector.connect (
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        database=os.getenv('DB_NAME')
    )
except:
    print ("connect error:")
    print (sys.exc_info()[0])
    print (sys.exc_info()[1])

def create_database(db):
    SQL = "CREATE DATABASE test;"
    try:
        cursor = db.cursor()
        cursor.execute(SQL)
    except:
        print ("create_database error:")
        print (sys.exc_info()[0])
        print (sys.exc_info()[1])
    
def create_tables(db):
    SQL = (
        "CREATE TABLE `user` ("
        "   `user_id` char(22) NOT NULL, "
        "   `first_name` varchar(32), "
        "   `last_name` varchar(32), "
        "   `email` varchar(64) NOT NULL, "
        "   PRIMARY KEY (`user_id`)"
        ") ENGINE=InnoDB;"
    )
    try:
        cursor = db.cursor()
        cursor.execute(SQL)
    except:
        print ("create_tables error:")
        print (sys.exc_info()[0])
        print (sys.exc_info()[1])

# Initital database
# TODO: check if already exist first
# TODO: move to external file to avoid cluttering backend server code?
create_database(db)
create_tables(db)



# Each class of object will have its own methods for interacting with the database
# Create - insert data as a new entry, return the id
# Read - retrieve data for particular id value
# Update - update fields for existing entry with id value
# Delete - delete the entry for the id value
# Search - return a list of entries (or empty) matching a particular criteria (this may differ for objects)

def user_load(id):
    SQL = (
        "SELECT * "
        "FROM `user` "
        f"WHERE `user_id`={format(str(id))};"
    )
    cursor = db.cursor()
    cursor.execute(SQL)
    return cursor.fetchone

def user_save(data):
    if (empty(data['user_id'])):
        # TODO: do we really want to use this for user-ids, or have the user generate one?
        data['user_id'] = shortuuid.uuid() 
        # TODO: verify unique
        SQL = (
            "INSERT INTO `user` VALUES ("
            f"{format(data['user_id'])}, "
            f"{format(data['first_name'])}, "
            f"{format(data['last_name'])}, "
            f"{format(data['email_name'])}, "
            ");"
        )
        cursor = db.cursor()
        cursor.execute(SQL)
    else:
        SQL = (
            "UPDATE `user` "
            "SET "
            f"   `first_name` = {format(data['first_name'])}, "
            f"   `last_name` = {format(data['last_name'])}, "
            f"   `email` = {format(data['email'])}, "
            "WHERE "
            f"   `user_id` = {format(data['user_id'])};"
        )
        cursor = db.cursor()
        cursor.execute(SQL)
    return data # with updated user_id if appropriate



