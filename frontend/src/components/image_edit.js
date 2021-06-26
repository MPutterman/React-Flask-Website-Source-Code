// TODO:
// * All these 'edit' functions are pretty similar other than
//   the schema and which API calls to make.  Maybe merge into a generic handler?
// * Currently using this page for creating (uploading and create record)
//   as well as editing previously added image.
// * Delete 'description' from images? (backend too?)
// * KNOWN BUG: the client side (react) creates Date objects with local time but sets TZ = UTC.
//     Similarly when displaying backend-generated times (which are correct) it convers them to UTC
//     for display in the window.
// * EQUIPMENT-ID is required
// * Can the date sanitizing (and fix to above problem) be built into axios interceptors?
// * Default exposure time and temp doesn't make sense for all image types (e.g. flat)....
// * KNOWN BUG: It doesn't pick up prefs when navigate to /image/new... but it works if reach page
//     via other means, e.g. analysis/new, then create a new image. Does it have to do with when session
//     gets populated?
// * How to get '*' to display on file input field when it is required (i.e. when path is empty)?
// * Some validation issues, maybe due to the 'custom()' validator.  Once it throws an error
//     (e.g. submit without choosing file)... it persists even if a file is chosen.  When ANOTHER
//     error on the form is fixed (e.g. adding equip_id), then the file field error also gets resolved...
//     Obviously, the file error should update independently of other field status the errors.

import React from "react";
import { callAPI } from './api.js';
import { withRouter } from "react-router";
import { useAuthState, useAuthDispatch, defaultUserPrefs, authRefreshSession } from '../contexts/auth';

import Button from "@material-ui/core/Button";
import { id_exists } from '../helpers/validation_utils';
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField, LongTextField} from 'uniforms-material';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import FileInputField from './filefield';
import IDInputField from './idfield';
import Busy from '../components/busy';
import AlertList from '../components/alerts';


// Image edit form
// Special props:
// - id - image_id (if empty, create a new image)
const ImageEdit = (props) => {

    let formRef;
    
    const session = useAuthState();
    const dispatch = useAuthDispatch();

    const initialImageState = {
        image_id: '', // NOTE: if set null here, the edit form ID value overlaps the help text
        image_type: '',
        name: '',
        description: '',
        owner_id: null,
        created: null, 
        modified: null, 
        captured: null, 
        image_path: '', // do anything different if path exists (i.e. file on server), e.g. different label on 'choose' button?
        equip_id: session.prefs['analysis']['default_equip'],
        exp_temp: session.prefs['analysis']['default_exposure_temp'],
        exp_time: session.prefs['analysis']['default_exposure_time'],
        file: null,
    };

    const [loading, setLoading] = React.useState(false);
    const [filename, setFilename] = React.useState('');
    const [currentImage, setCurrentImage] = React.useState(initialImageState);
    const [alert, setAlert] = React.useState({});


    async function onSubmit(data, e) {
//      console.log("onSubmit: data => ", data);
      saveImage(data);

    };
    
    // Retrieve record with specified id from the database
    // TODO: Error handling if id not found... need to redirect to not found page
    async function loadImage(id) {
        setLoading(true);
        if (id) {
          callAPI('GET', 'image/load/' + id)
          .then((response) => {

//                console.log('loadImage, got response =>', response.data);
                // Sanitize datetime fields
                if (response.data.created != null) response.data.created = new Date(response.data.created);
                if (response.data.modified != null) response.data.modified = new Date(response.data.modified);
                if (response.data.captured != null) response.data.captured = new Date(response.data.captured);
//                console.log('loadImage, after change date format =>', response.data);
 
                setCurrentImage(response.data);
                setLoading(false);

            })
            .catch((e) => {
                console.error("GET /image/load/" + id + ": " + e);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }

    // Call this upon first value of props.match.params.id (should only run once)
    React.useEffect(() => {
        console.log("In useEffect, change of [props.match.params.id]"); 
        loadImage(props.match.params.id);
    }, [props.match.params.id]);

    // If props.filter is provided, try to pre-fill fields (i.e. when used as popup)
    React.useEffect(() => {
        if (props.filter) {
            console.log('in image_edit, received props.filter: ', props.filter);
            let override = {};
            props.filter.forEach( element => {
                if (!element.operator || element.operator == 'eq') {
                    override[element.field] = element.value;
                }
            });
            console.log('overriding values from props.filter', override);
            setCurrentImage(prev => ({...prev, ...override}));
        }
    }, [props.filter]);


    // Save the record back to the database
    async function saveImage(data) {
        // TODO: need to filter anything out of 'data'?
        setLoading(true);

        // Sanitize datetime fields.  Note it seems necessary to make a copy
        // of and add the date-related fields as strings, rather than overwrite the
        // Date objects. Overwriting led to a 'toISOString' is not a function error...
        // maybe the type information was retained even when set to a string value?

        let dataCopy = {captured: null, modified: null, created: null, ...data};
        if (data['captured']) {
            let dateString = data['captured'].toISOString();
            dataCopy['captured'] = dateString;
        }
        if (data['modified']) {
            let dateString = data['modified'].toISOString();
            dataCopy['modified'] = dateString;
        }
        if (data['created']) {
            let dateString = data['created'].toISOString();
            dataCopy['created'] = dateString;
        }

        return callAPI('POST', 'image/save', dataCopy)
        .then((response) => {
            setAlert({severity: 'success', message: "yay, success"});
//            console.log('data received after image/save:', response.data);

            // Convert from date strings to objects
            if (response.data.created != null) response.data.created = new Date(response.data.created);
            if (response.data.modified != null) response.data.modified = new Date(response.data.modified);
            if (response.data.captured != null) response.data.captured = new Date(response.data.captured);
//            console.log('data converted after image/save:', response.data);

            setCurrentImage(response.data);
//            reset(currentImage); // does this work?
            setLoading(false);

            // Call callback 'onSave' if successfully saved image?
            // NOTE: doesn't work if put 'currentImage' instead of response.data...
            if (props.onSave) {
                props.onSave({...response.data,
                    id: response.data.image_id,
                    name: response.data.name,
                });
            } else {
                props.history.replace('/image/edit/' + response.data.image_id);
            }


        })
        .catch((e) => {
            console.log("POST /image/save: " + e);
            setLoading(false);
        });
    }

    // NOT YET FUNCTIONAL AND BACKEND NOT IMPLEMENTED (add a status message when implement this)
    const deleteImage = () => {
        callAPI('POST', 'image/delete/' + currentImage.id)
        .then((response) => {
            console.log(response.data);
            props.history.push('/image/search');  // Does this make sense to go here after? Or go to previous page?
        })
        .catch((e) => {
            console.log("POST /image/delete/" + currentImage.id + ": " + e);
        });
    }    

    // Schema for form

    const schema = new SimpleSchema ({
      image_id: {
        label: 'ID',
        type: String,  // TODO: should it be a SimpleSchema.Integer??
        required: false,
      },
      image_type: {
        label: 'Type',
        type: String,
        required: true,
        allowedValues: ['radio', 'dark', 'flat', 'bright', 'uv'],
      },
      name: {
        label: 'Name',
        type: String,
        required: true,
      },
      description: {
          label: 'Description',
          type: String,
          required: false,
      },
      captured: {
        label: 'Image captured datetime',
        type: Date,
        required: false,
        uniforms: {
          type: 'datetime',
        }
      },
      created: {
        label: 'Record created', // set by server (allow admin override?), show readonly
        type: Date,
        required: false,
        uniforms: {
          type: 'date',
        }
      },
      modified: {     
        label: 'Record modified',  // set by server (allow admin override), show readonly
        type: Date,
        required: false,
        uniforms: {
          type: 'date',
        }
      },
      owner_id: {
        label: 'Owner user_id',   // set by server (allow admin override), show readonly
        type: String, // should be integer?  Should use selector  if empty?
        required: false,
      },
      equip_id: {
        label: 'Equipment ID',
        type: String, // should be integer? should use selector if empty
        required: true, 
      },
      exp_time: {
        label: 'Exposure time (s)',
        type: Number,
        required: false,
      },
      exp_temp: {
        label: 'Exposure temp (C)',
        type: Number,
        required: false,
      },
      image_path: {
        label: 'Path (on server)', // set by server (allow admin override)
        type: String,
        required: false,
      },
      file: {
        label: 'File data',
        type: Blob,
        required: false,
        custom() {
          if (!this.value && !this.field('image_path').value) {
            return "File is required";
          }
        },
      },
    });

    var bridge = new SimpleSchema2Bridge(schema);


    // Async validation to check the equip_id 
    async function onValidate(model, error) {

        console.log ('In onValidate. model =>', model);
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


    return (

          <div className="ImageEditForm" style={{ maxWidth: '400px',}}>

            <Busy busy={loading} />

            {props.new ? (<p>New image creation</p>) : (<></>)}

            <AutoForm
              schema={bridge}
              onSubmit={onSubmit}
              ref={ref => (formRef = ref)}
              model={currentImage}
              onValidate={onValidate}
            >
              <AutoField name="image_id" readOnly={true} />
              <ErrorField name="image_id" />
              <AutoField name="image_type" />
              <ErrorField name="image_type" />
              <AutoField name="file" component={FileInputField}
                buttonLabel={currentImage.image_path ? 'Replace Image' : 'Select Image'}
                filenameField='name'
              />
              <ErrorField name="file" />
              <AutoField name="name" />
              <ErrorField name="name" />
{/*
              <AutoField name="description" component={LongTextField} />
              <ErrorField name="description" />
*/}
              <AutoField name="equip_id" component={IDInputField} objectType='equip'/>
              <ErrorField name="equip_id" />
              <AutoField name="exp_time" />
              <ErrorField name="exp_time" />
              <AutoField name="exp_temp" />
              <ErrorField name="exp_temp" />

              <SubmitField>Save / Upload</SubmitField>

              <Button fullWidth variant='outlined' type='reset' onClick={() => formRef.reset()}>Cancel</Button>
              <Button fullWidth variant='outlined' type="delete" >Delete (not yet working)</Button>

              <p>Additional fields:</p>
              <AutoField name="captured" />
              <ErrorField name="captured" />
              <AutoField name="created" readOnly={true}/>
              <ErrorField name="created" />
              <AutoField name="modified" readOnly={true}/>
              <ErrorField name="modified" />
              <AutoField name="owner_id" component={IDInputField} objectType='user'/>
              <ErrorField name="owner_id" />
              <AutoField name="image_path" readOnly={true}/>
              <ErrorField name="image_path" />


            </AutoForm>

            <AlertList alert={alert} />

          </div>
        );
    
}

export default withRouter(ImageEdit);
