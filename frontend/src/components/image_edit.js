// TODO:
// * All these 'edit' functions are pretty similar other than
//   the schema and which API calls to make.  Maybe merge into a generic handler?
// * Relies on some utilities to fix datetime issues
// * Occasionally when click on 'search equipment', no results are returned
// * Do we want to save the front-end filename to the database
// * Currently using this page for creating (uploading and create record)
//   as well as editing previously added image.
// * Delete 'description' from images? (backend too?)
// * EQUIPMENT-ID is required
// * Add a feature to prompt to update preferences (default dark and default flat) if create a new image?
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
import { useErrorResponse } from '../contexts/error';

import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Box from '@material-ui/core/Box';
import { spacing } from '@material-ui/system'
import IconButton from "@material-ui/core/IconButton";
import ClearIcon from "@material-ui/icons/Clear";
import { KeyboardDateTimePicker } from '@material-ui/pickers'
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { id_exists } from '../helpers/validation_utils';
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField, LongTextField} from 'uniforms-material';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import FileInputField from './filefield';
import IDInputField from './idfield';
import { fixDateFromFrontend, fixDateFromBackend } from '../helpers/datetime_utils';
import Busy from '../components/busy';
import { useAlerts } from '../contexts/alerts';


// Image edit form
// Special props:
// - id - image_id (if empty, create a new image)
const ImageEdit = (props) => {

    let formRef;
    
    const session = useAuthState();
    const dispatch = useAuthDispatch();
    const setErrorResponse = useErrorResponse();
    const setAlert = useAlerts();

    const initialModel = {
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
    const [model, setModel] = React.useState(initialModel);

    // Rendering as modal component?
    const isModal = () => {
        return !!props.onSave;      
    }

    async function onSubmit(data, e) {
//      console.log("onSubmit: data => ", data);
      save(data);

    };
    
    // Retrieve record with specified id from the database
    async function load(id) {
        if (id) {
          setLoading(true);
          callAPI('GET', `image/load/${id}`)
          .then((response) => {

              if (response.error) {

                // TODO: handle some specific errors (e.g. unauthorized) or add error details?
                setErrorResponse({code: response.status, details: response.data.error ? response.data.error : '' });
                setLoading(false);
                return false;

              } else {

//                console.log('load, got response =>', response.data);
                // Sanitize datetime fields
                response.data.created = fixDateFromBackend(response.data.created);
                response.data.modified = fixDateFromBackend(response.data.modified);
                response.data.captured = fixDateFromBackend(response.data.captured);
//                console.log('load, after change date format =>', response.data);
 
                setModel(response.data);
                console.log(response);
                setLoading(false);
                return true;
              }

          });
        }
        return true;
    }

    React.useEffect(() => {
        console.log("In useEffect, change of [props.new, props.object_id, or props.match.params.id]"); 
        if (props.new) {
            load(null);
        } else if (props.object_id) {
            load(props.object_id);
        } else if (props.match.params.id) {
            load(props.match.params.id);
        }
    }, [props.new, props.object_id, props.match.params.id]);

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
            setModel(prev => ({...prev, ...override}));
        }
    }, [props.filter]);


    // Save the record back to the database
    async function save(data) {
        // TODO: need to filter anything out of 'data'?
        setLoading(true);

        // Sanitize datetime fields.  Note it seems necessary to make a copy
        // of and add the date-related fields as strings, rather than overwrite the
        // Date objects. Overwriting led to a 'toISOString' is not a function error...
        // maybe the type information was retained even when set to a string value?

        let dataCopy = {captured: null, modified: null, created: null, ...data};
        if (data['captured']) {
            let dateString = fixDateFromFrontend(data['captured']).toISOString();
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

            if (response.error) {

                // TODO: handle some kinds of errors (e.g. unauthorized?)
                setAlert({severity: 'error', message: `Error: Received status ${response.status} from backend (${response.data.error})`});
                setLoading(false);
                return false;

            } else {

                setAlert({severity: 'success', message: "Save successful"});
//            console.log('data received after image/save:', response.data);

                // Convert from date strings to objects
                // Hack: timezone conversion not working properly natively. Maually correct backend (UTC)
                // to display in local timezone
                response.data.created = fixDateFromBackend(response.data.created);
                response.data.modified = fixDateFromBackend(response.data.modified);
                response.data.captured = fixDateFromBackend(response.data.captured);

//            console.log('data converted after image/save:', response.data);

                setModel(response.data);
                setLoading(false);

                // Call callback 'onSave' if successfully saved image?
                // NOTE: doesn't work if put 'model' instead of response.data...
                if (props.onSave) {
                    props.onSave({...response.data,
                        id: response.data.image_id,
                        name: response.data.name,
                    });
                } else {
                    props.history.replace('/image/edit/' + response.data.image_id);
                }

            }

        });

    }

    // NOT YET FUNCTIONAL AND BACKEND NOT IMPLEMENTED (add a status message when implement this)
    const deleteImage = () => {
        callAPI('POST', 'image/delete/' + model.id)
        .then((response) => {
            console.log(response.data);
            props.history.push('/image/search');  // Does this make sense to go here after? Or go to previous page?
        })
        .catch((e) => {
            console.log("POST /image/delete/" + model.id + ": " + e);
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
        label: 'Image captured',
        type: Date,
        required: false,
        uniforms: {
          type: 'datetime-local',
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
        label: 'Owner ID',   // set by server (allow admin override), show readonly
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

          <div className="ImageEditForm" style={{ maxWidth: '600px', align:'middle'}}>

            <Busy busy={loading} />

            {props.new ? (<p>New image creation</p>) : (<></>)}

            <AutoForm
              schema={bridge}
              onSubmit={onSubmit}
              ref={ref => (formRef = ref)}
              model={model}
              onValidate={onValidate}
            >

              <Box display="flex" flexDirection="row">
              <Box width='20%' pr={2}>
                <AutoField name="image_type" />
                <ErrorField name="image_type" />
              </Box>
              <Box width='80%' pl={2} /* TODO: width not working? */>
                <AutoField name="file" component={FileInputField}
                  wibuttonLabel={model.image_path ? 'Replace Image' : 'Select Image'}
                  filenameField='name'
                />
                <ErrorField name="file" />
              </Box>
              </Box>
              <AutoField name="name" />
              <ErrorField name="name" />
{/*
              <AutoField name="description" component={LongTextField} />
              <ErrorField name="description" />
*/}
              <AutoField name="equip_id" component={IDInputField} objectType='equip'/>
              <ErrorField name="equip_id" />
              <Box display="flex" flexDirection="row">
                <Box width='33%' pr={2}>
                <AutoField name="exp_time" />
                <ErrorField name="exp_time" />
                </Box>
                <Box width='33%' px={2}>
                <AutoField name="exp_temp" />
                <ErrorField name="exp_temp" />
                </Box>
                <Box width='33%' pl={2}>
                <AutoField name="captured" format="yyyy-mm-ddThh:mm:ss"/>
                <ErrorField name="captured" />
                </Box>
              </Box>
{/*
                    component={KeyboardDateTimePicker} variant="inline" format="yyyy-mm-ddThh:mm:ss"
                    InputProps={{
                        endAdornment: (
                            <IconButton onClick={(e) => formRef.onChange('captured', null)}>
                                <ClearIcon />
                            </IconButton>
                        )
                    }}
*/}
              <Box py={1}>
              </Box>

              <Accordion /*defaultExpanded*/ elevation={10}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <span>Additional fields</span>
                </AccordionSummary>
                <AccordionDetails>

{/*              <Box border={1} p={2} style={{background:"#222225"}}> */}
              <Box display='flex' flexDirection='column'>
              <Box display="flex" flexDirection="row">
                <Box width='50%' pr={2}>
                <AutoField name="image_id" readOnly={true} />
                <ErrorField name="image_id" />              
                </Box>
                <Box width='50%' pl={2}>
                <AutoField name="image_path" disabled={true}/>
                <ErrorField name="image_path" />
                </Box>
              </Box>
              <Box display="flex" flexDirection="row">
                <Box width='50%' pr={2}>
                <AutoField name="created" disabled={true}/>
                <ErrorField name="created" />
                </Box>
                <Box width='50%' pl={2}>
                <AutoField name="modified" disabled={true}/>
                <ErrorField name="modified" />
                </Box>
              </Box>
              <AutoField name="owner_id" component={IDInputField} objectType='user' /*disabled={true}*/ />
              <ErrorField name="owner_id" />
              </Box>

            </AccordionDetails>
            </Accordion>

              <Box py={2}>
              <ButtonGroup variant='contained' >
                  <SubmitField>Save/Upload</SubmitField>
                  <Button type="reset" onClick={() => formRef.reset()}>Cancel</Button>
                  <Button type="delete" >Delete (not working)</Button>
              </ButtonGroup>
              </Box>

            </AutoForm>

          </div>
        );
    
}

export default withRouter(ImageEdit);
