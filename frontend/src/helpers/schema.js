// Build schemas for object types.
//
// TODO:
// * Any use for the 'filter' property? E.g. eliminating some fields prior to saving
//     (e.g. modified, created, or password_confirm)...
// * Seems to be bug in simplschema -- 'required' property doesn't accept function.  But 'optional' works.
// * For functions as properties (e.g. 'optional' or 'required'), can't seem to access 'this', e.g. this.value
//     (only this.key).  Thus can't get the desired depenendencies
// * Possible to build automatic validators for ID fields based on schema? 
// * Unify use of schemas in 'view', 'edit', 'search', etc...?  Each view has a unique purpose and parameters,
//     but maybe can share some aspects, e.g. schema.addViewField('name'), schema.addSearchField('name')
// * Add username to 'User'?  This will give a unique identifier without disclosing users email addresses
// * Instead of allowing editing of id, owner_id, modified, created... have special functions to overwrite these?
// * Add a profile picture for the image...?
// * This about Image type a bit and preferences. Default exposure time and temp doesn't make sense for all image
//     types (e.g. flat or bright)....  Maybe rename them to "radiation_image defaults"?
//
// RESOURCES:
// https://github.com/longshotlabs/simpl-schema (simple schema docs, and good descriptions of
//   special validation (e.g. password match) and customized error message)


import SimpleSchema from 'simpl-schema';
import { callAPI } from '../helpers/api';
import { id_exists, name_lookup } from '../helpers/validation_utils';


// TODO: update with more complex rules, e.g. modified and create and owner_id (and id) should
// all be set once it has been saved
const metaSchema = new SimpleSchema ({
    created: {
        label: 'Created',
        type: Date,
        defaultValue: undefined,
        required: false,    // set by backend
        uniforms: {
            type: 'date'
        }
    },
    modified: {
        label: 'Last Modified',
        type: Date,
        defaultValue: undefined,
        required: false,    // set by backend
        uniforms: {
            type: 'date'
        }
    },
    owner_id: {
        label: 'Owner',
        type: Number, // TODO: change to ID type?
        defaultValue: undefined,
        required: false,    // set by backend
    },
    is_deleted: {
        label: 'Deleted?',
        type: Boolean,
        defaultValue: false,
        required: false, // TODO: set to true later once implemented
    }
});

const nameSchema = new SimpleSchema ({
    name: {
        label: 'Name',
        type: String,
        required: true,
        defaultValue: '',
    },
});

const descriptionSchema = new SimpleSchema ({
    description: {
        label: 'Description',
        type: String,
        required: false,
//        defaultValue: '',
    },
});



const imageSchema = (config=null, session=null) => {

const schema = new SimpleSchema ({
    image_id: {
        label: 'ID',
        type: String,  // TODO: should it be a SimpleSchema.Integer??
        required: false,    // set by backend
     },
    image_type: {
        label: 'Type',
        type: String,
        required: true,
        allowedValues: ['radio', 'dark', 'flat', 'bright', 'uv'],
    },
    captured: {
        label: 'Image captured',
        type: Date,
        required: false,
        defaultValue: null,
        uniforms: {
            type: 'datetime-local',
        },
    },
    equip_id: {
        label: 'Equipment',
        type: String, // should be integer? should use selector if empty
        required: true, 
        defaultValue: session ? session.prefs['analysis']['default_equip'] : null,
    },
    exp_time: {
        label: 'Exposure time',
        type: Number,
        required: false,
        defaultValue: session ? session.prefs['analysis']['default_exposure_time'] : null,
    },
    exp_temp: {
        label: 'Exposure temp',
        type: Number,
        required: false,
        defaultValue: session ? session.prefs['analysis']['default_exposure_temp'] : null,
    },
    image_path: {
        label: 'Server path', // set by server
        type: String,
        required: false,
    },
    file: {
        label: 'File data',
        type: Blob,
        required: false,
        custom() {
            if (!this.value && !this.field('image_path').value) {
                return SimpleSchema.ErrorTypes.REQUIRED;
            }
        },
    },
});
schema.extend(metaSchema);
schema.extend(nameSchema);
schema.extend(descriptionSchema);
return schema;
}

const orgSchema = (config, session) => {
const schema = new SimpleSchema ({
    org_id: {
        label: 'ID',
        type: String, 
        required: false,    // set by backend
    },
    location: {
        label: 'Location',
        type: String,
        required: false,
    },
});
schema.extend(metaSchema);
schema.extend(nameSchema);
schema.extend(descriptionSchema);
return schema;
}

const equipSchema = (config, session) => {
const schema = new SimpleSchema ({
    equip_id: {
        label: 'ID',
        type: String, 
        required: false,    // set by backend
    },
    manufacturer: {
        label: 'Manufacturer',
        type: String,
        required: false,
    },
    catalog: {
        label: 'Catalog #',
        type: String,
        required: false,
    },
    camera : {
        label: 'Camera',
        type: String,
        required: false,
    },
    has_temp_control : {
        label: 'Has temp control?',
        type: Boolean,
        required: true,
    },
    pixels_x : {
        label: 'Image size X',
        type: Number, //TODO: integer
        required: true,
    },
    pixels_y : {
        label: 'Image size Y',
        type: Number, //TODO: integer,
        required: true,
    },
    fov_x : {
        label: 'Field of view X',
        type: Number,
        required: false,
    },
    fov_y : {
        label: 'Field of view Y',
        type: Number,
        required: false,
    },
    bpp : {
        label: 'Bits per pixel',
        type: Number, //TODO: integer
        required: true,
    },
    file_format : {
        label: 'File format',
        type: String,
        required: true,
    },
});
schema.extend(metaSchema);
schema.extend(nameSchema);
schema.extend(descriptionSchema);
return schema;
}

const plateSchema = (config, session) => {
const schema = new SimpleSchema ({
    plate_id: {
        label: 'ID',
        type: String, 
        required: false,    // set by backend
    },
    manufacturer: {
        label: 'Manufacturer',
        type: String,
        required: false,
    },
    catalog: {
        label: 'Catalog #',
        type: String,
        required: false,
    },
});
schema.extend(metaSchema);
schema.extend(nameSchema);
schema.extend(descriptionSchema);
return schema;
}

const coverSchema = (config, session) => {
const schema = new SimpleSchema ({
    cover_id: {
        label: 'ID',
        type: String, 
        required: false,    // set by backend
    },
    manufacturer: {
        label: 'Manufacturer',
        type: String,
        required: false,
    },
    catalog: {
        label: 'Catalog #',
        type: String,
        required: false,
    },
});
schema.extend(metaSchema);
schema.extend(nameSchema);
schema.extend(descriptionSchema);
return schema;
}


const analysisSchema = new SimpleSchema ({
    id: {
        label: 'ID',
        type: String, 
        required: false,    // set by backend
    },
    manufacturer: {
        label: 'Manufacturer',
        type: String,
        required: false,
    },
    catalog: {
        label: 'Catalog #',
        type: String,
        required: false,
    },
    expt_datetime: {
        label: 'Experiment date',
        type: Date,
        required: false,
        uniforms: {
            type: 'date',
        }
    },
    equip_id: {
        label: 'Equipment',
        type: Number, // TODO: ID
        required: true,
    },
    plate_id: {
        label: 'TLC plate',
        type: Number, // TODO: ID
        required: true,
    },
    cover_id: {
        label: 'TLC cover',
        type: Number, // TODO: ID
        required: true,
    },
    radio_image_id: {
        label: 'Radiation Image',
        type: String, 
        required: true,
    },
    correct_dark: {
        label: 'Use dark correction?',
        type: Boolean,
        required: false,
    },
    correct_flat: {
        label: 'Use flat correction?',
        type: Boolean,
        required: false,
    },
    correct_filter: {
        label: 'Use filter correction?',
        type: Boolean,
        required: false,
    },
    filter_algorithm: {
        label: 'Filter algorithm',
        type: String,
        allowedValues: ['median 3x3',],
        required: false,
    },
    dark_image_id: {
        label: 'Dark Image',
        type: String,
        required: false,
    },
    flat_image_id: {
        label: 'Flat Image',
        type: String,
        required: false,
    },
    bright_image_id: {
        label: 'Brightfield Image',
        type: String,
        required: false,
    },
    uv_image_id: {
        label: 'LEGACY: UV Image',
        type: String,
        required: false,
    },
    correct_bkgrd : {
        label: 'Use background correction?',
        type: Boolean,
        required: false,
    },
    bkgrd_algorithm: {
        label: 'Background correction method',
        type: String,
        allowedValues: ['1st order', '2nd order', '3rd order'],
        required: false,
    },
});
analysisSchema.extend(metaSchema);
analysisSchema.extend(nameSchema);
analysisSchema.extend(descriptionSchema);


const userRegistrationSchema = (config=null, session=null) => {
const schema = new SimpleSchema ({
    email_confirm: {        // TODO: only for new user creation (registration).  Maybe put these in a separate schema and extend...
        label: 'Confirm Email',
        type: String,
        //defaultValue: '',
        required: true,
        regEx: SimpleSchema.RegEx.EmailWithTLD,
        custom() {
            if (this.value !== this.field("email").value) {
            return "Emails must match";
            }
        },
    },
    password: { 
        label: 'Password',
        type: String,
        required: true, // TODO: add some other validation for password strength
        uniforms: {
            type: 'password',
        }
    },
    password_confirm: {
        label: 'Confirm Password',
        type: String,
        required: true,
        uniforms: {
            type: 'password',
        },
        custom() {
            if (this.value !== this.field("password").value) {
            return "Passwords must match";
            }
        },
    },
});
schema.extend(userSchema(config,session));
return schema;
}

const userSchema = (config=null, session=null) => {
const schema = new SimpleSchema ({
    user_id: {
        label: 'ID',
        type: Number, // TODO: change to integer type
        required: false,
    },
    email: {
        label: 'Email',
        type: String,
        //defaultValue: '',
        required: true,
        regEx: SimpleSchema.RegEx.EmailWithTLD,
    },
    first_name: {
        label: 'First Name',
        type: String,
        required: true,
    },
    last_name: {
        label: 'Last Name',
        type: String,
        required: true,
    },
    org_id: {
        label: 'Organization',
        type: Number, // TODO: make an ID?
        required: false,
    },
    org_list: { // TODO: this won't be a simple selector -- users will have to 'apply' to join an
                // organization and become an organization admin.
                // To create a new organization, must contact admin...
        label: 'Organization List',
        type: Array,
        // TODO: Need to figure out how to have 'allowedValues' here, but 
        // since it is async retrieved the validator is created with outdated version
        //allowedValues: availableOrganizations ? availableOrganizations.map(x => (x.org_id)) : [], // make an array of org_ids
        required: false,
        // TODO: how to add a label like "Select your organization(s)"?
        // Tried adding an extra entry with label and null value(key) but didn't work...
        uniforms: {
            checkboxes: false,
            options: [1,2,3], //availableOrganizations ? availableOrganizations.map((x) => ({label:x.name, value:x.org_id})) : [],
        }
    },
    // NOTE: org_id is an array of integers, but with the request/responses, easiest to keep as strings
    'org_list.$': {
        type: SimpleSchema.Integer,
    }
});
schema.extend(metaSchema);
return schema;
}

// Asynchronous validation for user registration
// Check if email is unique (only if user_id is not defined, i.e. new user registration)
async function userValidator(model, error) {

    // Do backend validation, but only if user_id is not defined (i.e. new user), and
    // email address is provided
    console.log ('userValidator: model =>', model);
    if (error) console.log ('error.details =>', error.details);
    if (!model.user_id && model.email) { 
        return callAPI('GET', `api/user/email_exists/${encodeURIComponent(model.email)}`)
        .then((response) => {
            // TODO: error checking?
            if (response.data.exists) {
                if (!error) error = {errorType: 'ClientError', name: 'ClientError', error: 'validation-error', details: [], };
                error.details.push({name: 'email', value: model.email, type: 'custom', message: 'An account with this email address already exists'});
                return error;
            } else {
                return error;
            }
        })
        .catch((e) => {
            if (!error) error = {errorType: 'ClientError', name: 'ClientError', error: 'validation-error', details: [], };
            error.details.push({name: 'email', value: model.email, type: 'custom', message: 'Server error. Could not check for duplicate email'});
            return error;
        });

    } else {
        return error;
    }
}


// Emtpy validator
async function defaultValidator(model, error) {
    return error;
}

// Asynchronous validator for image
// Check for valid equip_id
async function imageValidator(model, error) {

    console.log ('imageValidator: model =>', model);
    if (error) console.log ('error.details =>', error.details);

    var new_errors = [];

    if (model.equip_id) {
        if (!await id_exists('equip', model.equip_id)) {
            new_errors.push({name: 'equip_id', value: model.equip_id, type: 'custom', message: 'Invalid ID'});
        }
    }

    if (new_errors.length > 0) {
        if (!error) error = {errorType: 'ClientError', name: 'ClientError', error: 'validation-error', details: [], };
        error.details.push(new_errors);
        return error;
    } else {
        return error;
    }
}


export {
    userSchema,
    userRegistrationSchema,
    userValidator,
    orgSchema,
    equipSchema,
    plateSchema,
    coverSchema,
    imageSchema,
    defaultValidator,
    imageValidator,
    analysisSchema,
}