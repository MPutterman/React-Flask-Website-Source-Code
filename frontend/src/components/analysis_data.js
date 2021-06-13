/* TODO:

* TODO: add a display of analysis ID on screen for debugging purposes...

* Really nice tutorial on modal elements (including form fields):
https://blog.bitsrc.io/build-a-full-featured-modal-dialog-form-with-react-651dcef6c571

* Need some kind of file-uploader component (popup?)... also for equipment and organizations...
--- choose file
--- type (radiation, bright, dark, etc...) -- default set by parent component
--- equipment_id -- pre-fill with pref, but also include popup to select existing or add new
--- name (from filename but allow change)
--- exposure time -- pre-fill with prefs
--- exposure temperature - pre-fill with prefs
--- upload/save (and get image_id value to feed to parent)...
--- QUESTION: save immediately, or track all this info until submission?
------ Since we need to save the data to do an analysis, maybe it makes sense to save
------ everything as we go. It would be easy to clean up analyses (and all associated images)
------ that were not saved... or even store them in different tables and move
------ over when saved...


* Need to revamp the interface a bit to gather all the needed fields...
* [To divide sections can use Accordion/Tabs or Stepper (wizard of forms)...]
* [How to make certain things, e.g. flat image, dependent on 'use flat correction' option?]

   SECTION 1 (analysis metadata)
   - name (short description)
   - description
   - date(?)
   - equipment_id (hidden field)
   ---- Take this from the first image uploaded
   ---- Error if any images have different equipment ID
   - plate_type (pref if defined, or use picker, include option to add new)
   - cover_type (pref if defined, or use picker, include option to add new)

   SECTION 2 (primary files -- include equip_id from above)
   [Assume these are new images, but also provide a way to pick existing ones(?)]
   - radiation image 
   --- name (default to filename, but allow change)
   --- datetime (get from file?)
   --- exp time
   --- exp temp
   - brightfield image
   --- name (default to filename, but allow change)
   --- datetime (get from file?)
   --- exp time
   --- exp temp

   SECTION 3 (corrections)
   - use dark correction?
   - dark image (pref if defined, or use picker, include option to add new)
   --- name
   --- datetime (get from file?)
   --- exp time
   --- exp temp
   
   - use flat correction?
   - flat image (pref if defined, or use picker, include option to add new)
   --- name
   --- datetime (get from file?)
   --- exp time
   --- exp temp
   - artifact elimination(?) - e.g. edge of chip etc..
   - background correction method [none, uniform, gradient, ...] (pref by default)
   - filtering method [none, 3x3 median filtering, ...] (pref by default)
   
*/

import React from "react"; 
import axios from "axios";
import { withRouter } from "react-router";
import { backend_url } from './config';

import LinearProgress from "@material-ui/core/LinearProgress";

import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Grid from '@material-ui/core/Grid';

// Imports for automatic form generation
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField, LongTextField} from 'uniforms-material';
import FileInputField from './filefield';
import IDInputField from './idfield';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';

import Busy from '../components/busy';

// TODO: Find these web pages again:
//  --- tutorial on adding a progress bar for uploads...
//  --- video on using it with React-hook-form

class AnalysisData extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      uploading: false,
      model: {
        id: this.props.dataState.id,
        name: this.props.dataState.name,
        description: this.props.dataState.description,
      }
    }
    axios.defaults.withCredentials = true

    this.formRef = null;

    this.schema = new SimpleSchema ({
      id: {
        label: 'Analysis ID',
        type: String,
        required: false,
      },
      name: {
        label: 'Analysis Name',
        type: String,
        required: true,
        uniforms: {
          extra: 'TODO: testing if this works to show tool tips',
        }
      },
      description: {
        label: 'Analysis Description',
        type: String,
        required: false,
      },
      equip_id: {
        label: 'Equipment ID',
        type: String, // TODO: change to integer?
        required: false,
      },
      // TODO: how to prevent time from showing up?
      // Can set type to String, but then validators etc won't work properly I assume
      experiment_datetime: {
        label: 'Experiment Date',
        type: Date,
        required: false,
        uniforms: {
          type: 'date',
        }
      },
      image_radiation: {
        label: 'Radiation Image',
        type: Blob,
        required: false, // TODO: should be true
      },
      image_radiation_dark: {
        label: 'Radiation Dark Image',
        type: Blob,
        required: false,
      },
      image_flat: {
        label: 'Flat Image',
        type: Blob,
        required: false,
      },
      image_brightfield: {
        label: 'Brightfield Image',
        type: Blob,
        required: false,
      },
      // TODO: REMOVE THE FIELDS BELOW... LEGACY
      image_brightfield_flat: {
        label: 'LEGACY: Brightfield Flat Image',
        type: Blob,
        required: false,
      },
      image_uv: {
        label: 'LEGACY: UV Image',
        type: Blob,
        required: false,
      },
      image_uv_flat: {
        label: 'LEGACY: UV Flat Image',
        type: Blob,
        required: false,
      },
      use_background_correct : {
        label: 'Use background correction?',
        type: Boolean,
        required: false,
      },
      background_correct_method: {
        label: 'Background correction method',
        type: Array,
        required: false,
        maxCount: 1,
      },
      'background_correct_method.$': {
        type: String,
      },
      

    });

    this.bridge = new SimpleSchema2Bridge(this.schema);

  }

  componentDidUpdate(prevProps) {
    // Typical usage (don't forget to compare props):
    if (this.props.dataState !== prevProps.dataState) {
      this.setState({
        model: {
          id: this.props.dataState.id,
          name: this.props.dataState.name,
          description: this.props.dataState.description,
        }
      });
    }
  }

  onFileUpload = (data) => {
    this.setState({uploading: true});
    let formData = new FormData();

    // Add meta informatoin
    formData.append('name', data.name);
    formData.append('description', data.description);
    //formData.append('experiment_datetime', data.experiment.datetime);
    
    // Transform empty files
    // TODO: fix backend so it only works with files sent...
    // TODO: also fix backend so it doesn't need filenames...
    if (!data.image_radiation) {
      data.image_radiation = new Blob([null], { type: "image/png" });
    }
    if (!data.image_radiation_dark) {
      data.image_radiation_dark = new Blob([null], { type: "image/png" });
    }
    if (!data.image_flat) {
      data.image_flat = new Blob([null], { type: "image/png" });
    }
    if (!data.image_brightfield) {
      data.image_brightfield = new Blob([null], { type: "image/png" });
    }
    if (!data.image_brightfield_flat) {
      data.image_brightfield_flat = new Blob([null], { type: "image/png" });
    }
    if (!data.image_uv) {
      data.image_uv = new Blob([null], { type: "image/png" });
    }
    if (!data.image_uv_flat) {
      data.image_uv_flat = new Blob([null], { type: "image/png" });
    }

    // Add files to formData
    formData.append('Cerenkov', data.image_radiation);
    formData.append('Dark', data.image_radiation_dark);
    formData.append('Flat', data.image_flat);
    formData.append('Bright', data.image_brightfield);
    formData.append('BrightFlat', data.image_brightfield_flat);
    formData.append('UV', data.image_uv);
    formData.append('UVFlat', data.image_uv_flat);

    // Add filenames to formData
    // TODO: fix backend so we don't need to send these
    formData.append('BrightName','');
    formData.append('FlatName', 'SampleFlatField');
    formData.append('CerenkovName', 'SampleCerenkov');
    formData.append('DarkName', 'SampleDarkField');
    formData.append('UVName','');
    formData.append('UVFlatName','');
    formData.append('BrightFlatName','');

    let config = {
      headers: {
          "Content-Type": "multipart/form-data",
      },
    };

    return axios.post(backend_url('/time'), formData, config)
    .then((res) => {
      let id = res.data.res;
      this.props.setDataState(prev => ({...prev, id: id}));
      this.setState({uploading: false});
      return id;
    })
    .then((id) => {
      // TODO: in future this should not be needed (should directly write to database each request)
      // TODO: ACTUALLY, I don't see any way to save ROIs in the api...
      return {id: id, response: axios.post(backend_url('upload_data/'+ id))}; // write the data to the database
    })
    .then((response,id) => {
      console.log(response.data.Status);
      this.props.history.replace('/analysis/edit/' + id);
      return response; // Need this?
    })
  };


  render() {
    return (

      <div> {/*style={{width: '500px'}}>*/}

        <Busy busy={this.state.uploading} />


        <AutoForm
          schema={this.bridge}
          onSubmit={this.onFileUpload}
          model={this.state.model}
          ref={ref => (this.formRef = ref)}
        >

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} >
            Analysis information and files
          </AccordionSummary>
          <AccordionDetails>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} >
                Metadata
              </AccordionSummary>
              <AccordionDetails>          

                <Grid container direction='column'>
                <Grid item>
                <AutoField name="id" disabled={true} />
                <ErrorField name="id" />
                </Grid>
                <Grid item>    
                <AutoField name="name" />
                <ErrorField name="name" />
                </Grid>
                <Grid item>
                <AutoField name="description" component={LongTextField} />
                <ErrorField name="description" />
                </Grid>
                <Grid item>
      {/* Replace with type='equip' when ready */}
                <AutoField name="equip_id" component={IDInputField} objectType='image' />
                <ErrorField name="equip_id" />
                </Grid>
                <Grid Item>
                <AutoField name="experiment_datetime" type="date" />
                <ErrorField name="experiment_datetime" />
                </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} >
                Data images
              </AccordionSummary>
              <AccordionDetails>              

                <Grid container direction="column">
                  <Grid item>
                    <AutoField name="image_radiation" component={FileInputField} />
                    <ErrorField name="image_radiation" />
                  </Grid>
                  <Grid item>
                    <AutoField name="image_brightfield" component={FileInputField} />
                    <ErrorField name="image_brightfield" />
                  </Grid>
                </Grid>
                
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} >
                Image correction details
              </AccordionSummary>
              <AccordionDetails>              
              
                <Grid container direction='column'>
                <Grid item>
                <AutoField name="image_radiation_dark" component={FileInputField} />
                <ErrorField name="image_radiation_dark" />
                <AutoField name="image_flat" component={FileInputField} />
                <ErrorField name="image_flat" />
                </Grid>
                <p> Below are not really supported any more </p>
                <Grid item>
                <AutoField name="image_brightfield_flat" component={FileInputField} />
                <ErrorField name="image_brightfield_flat" />
                </Grid>
                <Grid item>
                <AutoField name="image_uv" component={FileInputField} />
                <ErrorField name="image_uv" />
                <AutoField name="image_uv_flat" component={FileInputField} />
                <ErrorField name="image_uv_flat" />
                </Grid>
                </Grid>

              </AccordionDetails>
            </Accordion>

          </AccordionDetails>
        </Accordion>

        <p>If you submit without choosing files, it will use sample data</p>
        <SubmitField>Submit updates and files</SubmitField>

      </AutoForm>
      </div>
    );
  }
}

export default withRouter(AnalysisData);
