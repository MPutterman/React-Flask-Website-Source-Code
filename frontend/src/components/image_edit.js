// TODO:
// * All these 'edit' functions are pretty similar other than
//   the schema and which API calls to make.  Maybe merge into a generic handler?
// * Currently using this page for creating (uploading and create record)
//   as well as editing previously added image.
// * Want to use this as a popup as well, with return val of image-id
//    i.e. existing or newly uploaded image...
// * Figure out if still need all the reset-related form hooks, etc...

import React from "react";
import { callAPI } from './api.js';
import { withRouter } from "react-router";
import { useParams } from 'react-router-dom';
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField, LongTextField} from 'uniforms-material';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import FileInputField from './filefield';
import IDInputField from './idfield';
import Busy from '../components/busy';
import { AlertList, Alert } from '../components/alerts';
import jwt_decode from "jwt-decode";

// Image edit form
// Special props:
// - id - image_id (if empty, create a new image)
const ImageEdit = (props) => {

    let formRef;

    const initialImageState = {
        image_id: '', // NOTE: if set null here, the edit form ID value overlaps the help text
        image_type: '',
        name: '',
        description: 'Maybe eliminate this field? TODO: capture the filename into the name field, how? Also if image data already exists (path?), then show a message in File data about overwritting the file if choose a new one, e.g. Replace File instead of Choose File. Also need to implement backend methods to retrieve and save individual images.',
        owner_id: null,
        created: null,
        modified: null,
        captured: null,
        image_path: '',
        equip_id: null,
        file: null,
    };

    const [loading, setLoading] = React.useState('false');
    const [filename, setFilename] = React.useState('');
    const [currentImage, setCurrentImage] = React.useState(initialImageState);
    const [message, setMessage] = React.useState('');
    const [availableEquipment, setAvailableEquipment] = React.useState([]);

    // Form hooks
    // mode is the render mode (both onChange and onBlur)
    // defaultValues defines how the form will be 'reset'. Fill back in with retrieved user info
    const {handleSubmit, reset, control} = useForm({mode: 'all', defaultValues: currentImage}); 

    // Actions when form is submitted
    // TODO: need to handle other types of submit, e.g. delete?
    const onSubmit = (data, e) => {
      //console.log("onSubmit: data => ", data);
      // TODO: upload image if appropriate...
      updateImage(data);
      // Temporary... after saving, re-retrieve the user to change currentUser and trigger useEffect
      // so cancel will now revert to the last saved value
      getImage(data.image_id);
    };
    
    // Retrieve record with specified id from the database
    // TODO: Error handling if id not found... need to redirect to not found page
    async function getImage(id) {
        setLoading(true);
        if (id) {
          callAPI('GET', 'image/load/' + id)
          .then((response) => {
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

    // Retrieve list of available equipment (for now, complete list)
    async function getEquipment() {
        callAPI('GET', 'equipment/search')
        .then((response) => {
            setAvailableEquipment(response.data);
            console.log("in getEquipment: response data => ", response.data);
        })
        .catch((e) => {
            console.error("GET /equipment/search: " + e);
        });
    }

    // Call this upon first value of props.match.params.id (should only run once)
    React.useEffect(() => {
        console.log("In useEffect, change of [props.match.params.id]"); 
        getImage(props.match.params.id);
        getEquipment();
    }, [props.match.params.id]);

    // This second useEffect is triggered whenever 'currentImage' changes
    // e.g. after loading from the database. When triggered it sets the
    // defaultValues of the form to the newly loaded data, so that the form
    // reset (cancel) works correctly. 
    // TODO: OLD COMMENT: for some reason if I try to put reset(currentUser) in the getUser function it doesn'td
    // properly reset the form...
    React.useEffect(() => {
        console.log("In useEffect, change of [currentImage]");
        reset(currentImage);
    }, [currentImage]);

    // This useEffect is triggered if the filename is changed by the
    // FileInputField component.
    // Behavior now is to replace the 'name' field, though the use
    // can edit this after selecting the file.
    React.useEffect(() => {
        console.log("In useEffect, change of [filename]");
        setCurrentImage(prev => ({...prev, name: filename}));
    }, [filename])

    // Form reset
    const onReset = () => {
        //console.log("In onReset");
        reset(currentImage);
    }

    // Save the record back to the database
    async function updateImage(data) {
        // TODO: need to filter anything out of 'data'?
        setLoading(true);
        callAPI('POST', 'image/save', data)
        .then((response) => {
            console.log(response.data);
            setMessage("success");
            setCurrentImage(response.data);
            reset(currentImage); // does this work?
            setLoading(false);
        })
        .catch((e) => {
            console.log("POST /image/save: " + e);
            setLoading(false);
        });
    }

    // Delete the user matching the user-id
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
    // NOTE: Good docs here: https://github.com/longshotlabs/simpl-schema 
    // that describe special validation (e.g. passwordMistmatch) and customized error messages

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
          type: 'date',
        }
      },
      created: {
        label: 'Record created',
        type: Date,
        required: false,
        uniforms: {
          type: 'date',
        }
      },
      modified: {     
        label: 'Record modified',  // set by server (allow admin override)
        type: Date,
        required: false,
        uniforms: {
          type: 'date',
        }
      },
      owner_id: {
        label: 'Owner user_id',   // set by server (allow admin override)
        type: String, // should be integer?  Should use selector  if empty?
        required: false,
      },
      equip_id: {
        label: 'Equipment ID',
        type: String, // should be integer? should use selector if empty
        required: false, 
      },
      exp_time: {
        label: 'Exposure time (s)',
        type: Number,
        required: false,
      },
      expt_temp: {
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
        required: false, // TODO: should be true
      },
   });

    var bridge = new SimpleSchema2Bridge(schema);


    return (

          <div className="ImageEditForm" style={{ maxWidth: '350px',}}>

            <Busy busy={loading} />

            {props.new ? (<p>New image creation</p>) : (<></>)}

            <AutoForm
              schema={bridge}
              onSubmit={onSubmit}
              ref={ref => (formRef = ref)}
              model={currentImage}
            >
              <AutoField name="image_id" disabled={true} />
              <ErrorField name="image_id" />
              <AutoField name="image_type" />
              <ErrorField name="image_type" />
              <AutoField name="file" component={FileInputField}
                buttonLabel={currentImage.image_path ? 'Replace Image' : 'Select Image'}
                setFilename={setFilename}
              />
              <ErrorField name="file" />
              <AutoField name="name" />
              <ErrorField name="name" />
              <AutoField name="description" component={LongTextField} />
              <ErrorField name="description" />
              <AutoField name="captured" />
              <ErrorField name="captured" />
              <AutoField name="created" />
              <ErrorField name="created" />
              <AutoField name="modified" />
              <ErrorField name="modified" />
              <AutoField name="owner_id" />
              <ErrorField name="owner_id" />
      {/* Replace with type='equip' when ready */}
              <AutoField name="equip_id" component={IDInputField} objectType='image'/>
              <ErrorField name="equip_id" />
              <AutoField name="image_path" />
              <ErrorField name="image_path" />

              <SubmitField>Save Changes (backend API not yet functional)</SubmitField>

              <Button fullWidth variant='outlined' type="link">Add New Equipment (not yet working)</Button>
              <Button fullWidth variant='outlined' type='reset' onClick={() => formRef.reset()}>Cancel</Button>
              <Button fullWidth variant='outlined' type="delete" >Delete (not yet working)</Button>

            </AutoForm>

            {message ? ( 

              <>
              <p>{message}</p>

              <AlertList />
              {message === 'success' ? (
                <Alert severity="success">Image successfully updated</Alert>
              ) : (
                <Alert severity="error">Something went wrong</Alert>
              )}
              </>
            ) : ( <></> )}

          </div>
        );
    
}

export default withRouter(ImageEdit);
