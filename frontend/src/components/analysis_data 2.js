// TODO:
/*
* Figure out how to auto-show/hide or disable e.g. dark_image_ID if correct_dark is false...
* Consistency -- Should we use 'id' or 'analysis_id' internally in the database and code?
* How do we cleanup images that were uploaded if an analysis wasn't created?  Or if someone
  accidentlally re-uploads the same image a couple of times?
* Can we automatically get the equip_id from uploaded images, and/or check if it matches what
  is selected for images?
* Add plate type and cover type when selectors are ready...
*/

import React from "react"; 
import { withRouter } from "react-router";
import { callAPI } from '../helpers/api';
import { useAuthState, defaultUserPrefs, authRefreshSession } from '../contexts/auth';

// Imports for form display components
import Button from "@material-ui/core/Button";
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';

// Imports for automatic form generation
import { useForm } from 'uniforms';
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField, LongTextField } from 'uniforms-material';
import FileInputField from './filefield';
import IDInputField from './idfield';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';

import Busy from '../components/busy';

const AnalysisData = (props) => {

    const { prefs } = useAuthState(); 

    const initialAnalysisState = {
        id: '',
        name: '',
        description: '',
        expt_date: '',
        owner_id: null,
        created: null,
        modified: null,
        equip_id: prefs.default_equip,
        plate_id: prefs.default_plate,
        cover_id: prefs.default_cover,
        radio_image_id: null,
        bright_image_id: null,
        correct_dark: prefs.default_use_dark_correction,
        darK_image_id: prefs.default_dark_image,
        correct_flat: prefs.default_use_flat_correction,
        flat_image_id: prefs.default_flat_image,
        correct_bkgrd: prefs.default_use_bkgrd_correction,
        bkgrd_algorithm: prefs.default_bkgrd_algorithm,
        correct_filter: prefs.default_use_filter_correction,
        filter_algorithm: prefs.default_filter_algorithm,
        // Fields describing cosmetic aspects (image display)
        brightness: 0, 
        contrast: 0, 
    };

    const [currentAnalysis, setCurrentAnalysis] = React.useState(initialAnalysisState);
    const [busy, setBusy] = React.useState(false);

    let formRef;

    // TODO: all ID types should become integers....
    const schema = new SimpleSchema ({
      id: {
        label: 'ID',
        type: String,
        required: false,
      },
      name: {
        label: 'Analysis Name',
        type: String,
        required: true,
      },
      description: {
        label: 'Description',
        type: String,
        required: false,
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
        type: String, 
        required: false, // true
      },
      plate_id: {
        label: 'Plate ID',
        type: String, 
        required: false, // true
      },
      cover_id: {
        label: 'Cover ID',
        type: String, 
        required: false, // true
      },
      expt_date: {
        label: 'Experiment Date',
        type: Date,
        required: false,
        // TODO: how to get only date selector (not time) to show up?  The "type='date'" doesn't work.
        uniforms: {
          type: 'date',
        }
      },
      radio_image_id: {
        label: 'Radiation Image ID',
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
        label: 'Dark Image ID',
        type: String,
        required: false,
      },
      flat_image_id: {
        label: 'Flat Image ID',
        type: String,
        required: false,
      },
      bright_image_id: {
        label: 'Brightfield Image ID',
        type: String,
        required: false,
      },
      uv_image_id: {
        label: 'LEGACY: UV Image ID',
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

    const bridge = new SimpleSchema2Bridge(schema);

    async function onCancel() {
      formRef.reset();
    }

    // Handle form submit
    async function onSubmit(data) {

        // TODO: keep fields:
        //   name, description, use_dark_correction, use_flat_correction, use_bkgrd_correction, use_filter_correction,
        //   bkgrd_corr_algorithm, filter
        // TODO: ignore fields: owner_id, created, modified
        
        setBusy(true);

        return callAPI('POST', 'analysis_save', data)
        .then((response) => {
            // If don't currently have an id, set it and redirect to fix the URL
            if (!currentAnalysis.id) {
                let id = response.data.id;
                setCurrentAnalysis(prev => ({...prev, id: id}));
                setBusy(false);
                props.history.replace('/analysis/edit/' + id);
            };
        })
        .catch((err) => {
            setBusy(false);
        });
    }


    return (

      <div> 

        <Busy busy={busy} />

        <AutoForm
          schema={bridge}
          onSubmit={onSubmit}
          model={currentAnalysis}
          ref={ref => (formRef = ref)}
        >

        <Grid container direction="row" >

            <Grid container direction='column' xs={5}>

              <p>Analysis Information</p>

              <AutoField name="name" />
              <ErrorField name="name" />

              <AutoField name="description" component={LongTextField} />
              <ErrorField name="description" />

              <AutoField name="equip_id" component={IDInputField} objectType='equip' />
              <ErrorField name="equip_id" />

              <AutoField name="plate_id" component={IDInputField} objectType='plate' />
              <ErrorField name="plate_id" />

              <AutoField name="cover_id" component={IDInputField} objectType='cover' />
              <ErrorField name="cover_id" />

              <AutoField name="expt_date" type="date" />
              <ErrorField name="expt_date" />

              <AutoField name="radio_image_id"
                  component={IDInputField} objectType='image'
                  filter={[{field:'image_type', value:'radio'}, {field:'equip_id', value:'equip_id', operator:'field'}]}
              />
              <ErrorField name="radio_image_id" />

              <AutoField name="bright_image_id"
                  component={IDInputField} objectType='image'
                  filter={[{field:'image_type', value:'bright'}, {field:'equip_id', value:'equip_id', operator:'field'}]}
              />
              <ErrorField name="bright_image_id" />

              <Grid item>
              </Grid>

              <Accordion /*defaultExpanded*/ elevation={10}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <span>Additional fields</span>
                </AccordionSummary>
                <AccordionDetails>

{/*              <Box border={1} p={2} style={{background:"#222225"}}> */}
              <Box display='flex' flexDirection='column'>
                <AutoField name="id" readOnly={true} />
                <ErrorField name="id" />              
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
              <AutoField name="owner_id" component={IDInputField} objectType='user' disabled={true} />
              <ErrorField name="owner_id" />
              </Box>

            </AccordionDetails>
            </Accordion>

            </Grid>
            <Grid container xs={2}>
            </Grid>
            <Grid container direction='column' xs={5}>

              <p>Corrections</p>

              <AutoField name="uv_image_id"
                  component={IDInputField} objectType='image'
                  filter={[{field:'image_type', value:'uv'}, {field:'equip_id', value:'equip_id', operator:'field'}]}
              />
              <ErrorField name="uv_image_id" />

              <AutoField name="correct_dark" />
              <ErrorField name="correct_dark" />

              <AutoField name="dark_image_id"
                  component={IDInputField} objectType='image'
                  filter={[{field:'image_type', value:'dark'}, {field:'equip_id', value:'equip_id', operator:'field'}]}
              />
              <ErrorField name="dark_image_id" />

              <AutoField name="correct_flat" />
              <ErrorField name="correct_flat" />

              <AutoField name="flat_image_id"
                  component={IDInputField} objectType='image'
                  filter={[{field:'image_type', value:'flat'}, {field:'equip_id', value:'equip_id', operator:'field'}]}
              />
              <ErrorField name="flat_image_id" />

              <AutoField name="correct_bkgrd" />
              <ErrorField name="correct_bkgrd" />


              <AutoField name="bkgrd_algorithm" />
              <ErrorField name="bkgrd_algorithm" />

              <AutoField name="correct_filter" />
              <ErrorField name="correct_filter" />

              <AutoField name="filter_algorithm" />
              <ErrorField name="filter_algorithm" />

          </Grid>
        </Grid>

        <p>For now... if you submit without choosing files, it will use sample data</p>

        <SubmitField variant='contained' fullWidth>Save info and upload files</SubmitField>
        <Button variant='contained' fullWidth onClick={onCancel}>Cancel</Button>

      </AutoForm>

      </div>
    );
}

export default withRouter(AnalysisData);
