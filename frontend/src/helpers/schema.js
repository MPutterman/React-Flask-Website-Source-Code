// Build schemas for object types.
//
// TODO:
// * Seems to be bug in simplschema -- 'required' property doesn't accept function.  But 'optional' works.
// * For functions as properties (e.g. 'optional' or 'required'), can't seem to access 'this', e.g. this.value
//     (only this.key).  Thus can't get the desired depenendencies
// * Unify use of schemas in 'view', 'edit', 'search', etc...?  Each view has a unique purpose and parameters,
//     but maybe can share some aspects, e.g. schema.addViewField('name'), schema.addSearchField('name')
// * Add username to 'User'?  This will give a unique identifier without disclosing users email addresses
// * Instead of allowing editing of id, owner_id, modified, created... have special functions to overwrite these?
// * Add a profile picture for the image...?
// * This about Image type a bit and preferences. Default exposure time and temp doesn't make sense for all image
//     types (e.g. flat or bright)....  Maybe rename them to "radiation_image defaults"?
// * Tried to define a type alias (type IDType = SimpleSchema.Integer) but doesn't to work
// RESOURCES:
// https://github.com/longshotlabs/simpl-schema (simple schema docs, and good descriptions of
//   special validation (e.g. password match) and customized error message)


import SimpleSchema from 'simpl-schema';
import { callAPI } from '../helpers/api';
import { id_exists } from '../helpers/validation_utils';


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
        type: SimpleSchema.Integer,
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



const imageSchema = (config=null, prefs=null) => {

const schema = new SimpleSchema ({
    image_id: {
        label: 'ID',
        type: SimpleSchema.Integer,
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
        type: SimpleSchema.Integer,
        required: true, 
        defaultValue: prefs ? prefs.analysis.default_equip : null,
    },
    exp_time: {
        label: 'Exposure time',
        type: Number,
        required: false,
        defaultValue: prefs ? prefs.analysis.default_exposure_time : null,
    },
    exp_temp: {
        label: 'Exposure temp',
        type: Number,
        required: false,
        defaultValue: prefs ? prefs.analysis.default_exposure_temp : null,
    },
    image_path: {
        label: 'Server path', // set by server
        type: String,
        required: false,
    },
    file: {
        label: 'File',
        type: File, 
        required: false,
        custom() {
            if (!this.value && !this.field('image_path').value) {
                return SimpleSchema.ErrorTypes.REQUIRED;
            }
        }, 
    },
    filename: {
        label: 'Filename',
        type: String,
        required: false,
    },
    download_url: {
        label: 'Download URL',
        type: String,
        required: false,
    },
});
schema.extend(metaSchema);
schema.extend(nameSchema);
schema.extend(descriptionSchema);
return schema;
}

const orgSchema = (config, prefs) => {
const schema = new SimpleSchema ({
    org_id: {
        label: 'ID',
        type: SimpleSchema.Integer,
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

const equipSchema = (config, prefs) => {
const schema = new SimpleSchema ({
    equip_id: {
        label: 'ID',
        type: SimpleSchema.Integer,
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

const plateSchema = (config, prefs) => {
const schema = new SimpleSchema ({
    plate_id: {
        label: 'ID',
        type: SimpleSchema.Integer,
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

const coverSchema = (config, prefs) => {
const schema = new SimpleSchema ({
    cover_id: {
        label: 'ID',
        type: SimpleSchema.Integer,
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


const analysisSchema = (config, prefs) => {
const schema = new SimpleSchema ({
    analysis_id: {
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
    expt_date: {
        label: 'Experiment date',
        type: Date,
        required: false,
        defaultValue: null,
        uniforms: {
            type: 'date',
        }
    },
    equip_id: {
        label: 'Equipment',
        type: Number, // TODO: ID
        required: true,
        defaultValue: prefs ? prefs.analysis.default_equip : null,
    },
    plate_id: {
        label: 'TLC plate',
        type: Number, // TODO: ID
        required: true,
        defaultValue: prefs ? prefs.analysis.default_plate : null,
    },
    cover_id: {
        label: 'TLC cover',
        type: Number, // TODO: ID
        required: true,
        defaultValue: prefs ? prefs.analysis.default_cover : null,
    },
    radio_image_id: {
        label: 'Radiation Image',
        type: SimpleSchema.Integer,
        required: true,
    },
    dark_image_id: {
        label: 'Dark Image',
        type: SimpleSchema.Integer,
        required: false,
        defaultValue: prefs ? prefs.analysis.default_dark_image : null,
    },
    flat_image_id: {
        label: 'Flat Image',
        type: SimpleSchema.Integer,
        required: false,
        defaultValue: prefs ? prefs.analysis.default_flat_image : null,
    },
    bkgrd_algorithm: {
        label: 'Background correction method',
        type: String,
        allowedValues: config.analysis.bkgrd_algorithm_options,
        required: false,
        defaultValue: prefs ? prefs.analysis.default_bkgrd_algorithm : null,
    },
    filter_algorithm: {
        label: 'Filter algorithm',
        type: String,
        allowedValues: config.analysis.filter_algorithm_options,
        required: false,
        defaultValue: prefs ? prefs.analysis.default_filter_algorithm : null,
    },
    bright_image_id: {
        label: 'Brightfield Image',
        type: SimpleSchema.Integer,
        required: false,
    },
    uv_image_id: {
        label: 'LEGACY: UV Image',
        type: SimpleSchema.Integer,
        required: false,
    },
    radio_brightness: {
        label: 'Brightness (radio)',
        type: SimpleSchema.Integer,
        min: config.analysis.brightness_min,
        max: config.analysis.brightness_max,
        required: false,
    },
    radio_contrast: {
        label: 'Contrast (radio)',
        type: SimpleSchema.Integer,
        min: config.analysis.contrast_min,
        max: config.analysis.contrast_max,
        required: false,
    },
    radio_opacity: {
        label: 'Opacity (radio)',
        type: SimpleSchema.Integer,
        min: config.analysis.opacity_min,
        max: config.analysis.opacity_max,
        required: false,
    },
    bright_brightness: {
        label: 'Brightness (brightfield)',
        type: SimpleSchema.Integer,
        min: config.analysis.brightness_min,
        max: config.analysis.brightness_max,
        required: false,
    },
    bright_contrast: {
        label: 'Contrast (brightfield)',
        type: SimpleSchema.Integer,
        min: config.analysis.contrast_min,
        max: config.analysis.contrast_max,
        required: false,
    },
    bright_opacity: {
        label: 'Opacity (brightfield)',
        type: SimpleSchema.Integer,
        min: config.analysis.opacity_min,
        max: config.analysis.opacity_max,
        required: false,
    },
    display_radio_url: {
        label: 'Display image URL (radio)',
        type: String,
        required: false,
    },
    display_bright_url: {
        label: 'Display image URL (brightfield)',
        type: String,
        required: false,
    },
    ROIs: {
        label: 'ROIs',
        type: Array,
        required: false,
    },
    'ROIs.$': {
        type: Array,
    },
    'ROIs.$.$': {
        type: Array,
    },
    'ROIs.$.$.$': {
        type: Number, // Coordinate or radius (integers), or ______
    },
    origins: {
        label: 'Origins',
        type: Array,
        required: false,
    },
    'origins.$': {
        type: Array,
    },
    'origins.$.$': {
        type: SimpleSchema.Integer, // Coordinates
    },
    results: {
        label: 'Results',
        type: Array,
        required: false,
    },
    'results.$': {
        type: Array,
    },
    'results.$.$': {
        type: Array,
    },
    'results.$.$.$': {
        type: Number,
    },

});
schema.extend(metaSchema);
schema.extend(nameSchema);
schema.extend(descriptionSchema);
return schema;
}

const userRegistrationSchema = (config=null, prefs=null) => {
const schema = new SimpleSchema ({
    email_confirm: {        // TODO: only for new user creation (registration).  Maybe put these in a separate schema and extend...
        label: 'Confirm Email',
        type: String,
        //defaultValue: '',
        required: true,
        regEx: SimpleSchema.RegEx.EmailWithTLD,
        custom() {
            if (this.value !== this.field("email").value) {
                return "emailMismatch";
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
                return "passwordMismatch";
            }
        },
    },
});
schema.extend(userSchema(config,prefs));
schema.messageBox.messages({
  en: {
    emailMismatch: "Emails must match",
    passwordMismatch: "Passwords must match",
  },
});
return schema;
}

const userSchema = (config=null, prefs=null) => {
const schema = new SimpleSchema ({
    user_id: {
        label: 'ID',
        type: SimpleSchema.Integer,
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
        type: SimpleSchema.Integer,
        required: false,
    },
    file: {
        label: 'Profile photo',
        type: File,
        required: false,
    },
    photo_filename: {
        label: 'Profile photo filename',
        type: String,
        required: false,
    },
    photo_url: {
        label: 'Profile photo URL',
        type: String,
        required: false,
    },
    thumbnail_url: {
        label: 'Thumbnail url',
        type: String,
        required: false,
    },
    avatar_url: {
        label: 'Avatar url',
        type: String,
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


// Validate a list of ID fields [{name:<fieldname>, type:<object_type>},] by checking if they exist.
// Assumes that none of the fields have a null value in the model.
async function validateIDFields(model, error, fieldinfo) {
    var results = [];
    fieldinfo.forEach(function(field, index, array) {
        results.push (id_exists(field.type, model[field.name]));
    });
    var new_errors = [];
    return Promise.all(results)
    .then((exists_results) => {
        exists_results.forEach(function(exists, index, array) {
            if (!exists) {
                new_errors.push({
                    name: fieldinfo[index].name,
                    value: model[fieldinfo[index].name],
                    type: 'custom',
                    message: 'Invalid ID',
                });
            }
        });
        if (new_errors.length > 0) {
            if (error === null) {
                error = {errorType: 'ClientError', name: 'ClientError', error: 'validation-error', details: [], };
            }
        }
        return error;
    })
    .catch((e) => {
        // TODO: handle this
        return error;
    });

}


// TODO: maybe an generalize this by adding 'id_exists' and other async calls
// into an array along with fieldnames and error messages...?
// Asynchronous validator for image. Check for existence of all ID fields.
async function imageValidator(model, error) {
    const fieldinfo = [];
    if ((model.equip_id) !== null) fieldinfo.push({name: 'equip_id', type: 'equip'});
    return validateIDFields(model, error, fieldinfo);
}


// Asynchronous validator for analysis.  Check for existence of all ID fields.
async function analysisValidator(model, error) {
    const fieldinfo = [];
    if (model.equip_id !== null) fieldinfo.push({name: 'equip_id', type: 'equip'});
    if (model.plate_id !== null) fieldinfo.push({name: 'plate_id', type: 'plate'});
    if (model.cover_id !== null) fieldinfo.push({name: 'cover_id', type: 'cover'});
    if (model.radio_id !== null) fieldinfo.push({name: 'radio_id', type: 'image'});
    if (model.dark_id !== null) fieldinfo.push({name: 'dark_id', type: 'image'});
    if (model.flat_id !== null) fieldinfo.push({name: 'flat_id', type: 'image'});
    if (model.bright_id !== null) fieldinfo.push({name: 'bright_id', type: 'image'});
    if (model.uv_id !== null) fieldinfo.push({name: 'uv_id', type: 'image'});
    return validateIDFields(model, error, fieldinfo);
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
    analysisValidator,
}