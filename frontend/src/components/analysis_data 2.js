// TODO:
/*
* Figure out how to auto-show/hide or disable e.g. dark_image_ID if correct_dark is false...
* Add features to select e.g. only dark images, or to force type 'dark' when create a new image?
* Consistency -- Should we use 'id' or 'analysis_id' internally in the database and code?
* How do we cleanup images that were uploaded if an analysis wasn't created?  Or if someone
  accidentlally re-uploads the same image a couple of times?
* Can we automatically get the equip_id from uploaded images, and/or check if it matches what
  is selected for images?
* Add plate type and cover type when selectors are ready...
*/

import React from "react"; 
import { withRouter } from "react-router";
import { callAPI } from '../components/api';
import { useAuthState, useAuthDispatch, defaultUserPrefs, authRefreshSession } from '../contexts/auth';

// Imports for form display components
import Button from "@material-ui/core/Button";
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

const AnalysisData = (props) => {

    // TODO: when use preferences... it doesn't pull up the 'name'
    //   part for the ID values.  Maybe that should be linked to an API call,
    //   /util/namelookup/<type>/id ???, and update whenever ID changes?

    const session = useAuthState();
    const dispatch = useAuthDispatch();

    const initialAnalysisState = {
        id: null,
        name: '',
        description: '',
        expt_date: '',
        owner_id: null,
        created: '',
        modified: '',
        equip_id: session.prefs['analysis']['default_equip'],
        radio_image_id: null,
        bright_image_id: null,
        correct_dark: session.prefs['analysis']['default_use_dark_correction'],
        darK_image_id: session.prefs['analysis']['default_dark_image'],
        correct_flat: session.prefs['analysis']['default_use_flat_correction'],
        flat_image_id: session.prefs['analysis']['default_flat_image'],
        correct_bkgrd: session.prefs['analysis']['default_use_bkgrd_correction'],
        bkgrd_algorithm: session.prefs['analysis']['default_bkgrd_algorithm'],
        correct_filter: session.prefs['analysis']['default_use_filter_correction'],
        filter_algorithm: session.prefs['analysis']['default_filter_algorithm'],
    };

    const [currentAnalysis, setCurrentAnalysis] = React.useState(initialAnalysisState);
    const [busy, setBusy] = React.useState(false);

    let formRef = null;

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
      equip_id: {
        label: 'Equipment ID',
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

        <Grid container direction="row">

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} >
            Analysis information
          </AccordionSummary>
          <AccordionDetails>

              <Grid container direction='column'>

              <AutoField name="id" disabled={true} />
              <ErrorField name="id" />

              <AutoField name="name" />
              <ErrorField name="name" />

              <AutoField name="description" component={LongTextField} />
              <ErrorField name="description" />

              <AutoField name="equip_id" component={IDInputField} objectType='equip' />
              <ErrorField name="equip_id" />

              <AutoField name="expt_date" type="date" />
              <ErrorField name="expt_date" />

<p> TODO: also should show owner_id, created, modified? </p>

              </Grid>

          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} >
            Images and corrections
          </AccordionSummary>
          <AccordionDetails>              

              <Grid container direction="column">

              <AutoField name="radio_image_id" component={IDInputField} objectType="image"/>
              <ErrorField name="radio_image_id" />

              <AutoField name="bright_image_id" component={IDInputField} objectType="image"/>
              <ErrorField name="bright_image_id" />

<p>This field is obsolete:</p>
              <AutoField name="uv_image_id" component={IDInputField} objectType="image"/>
              <ErrorField name="uv_image_id" />

              <AutoField name="correct_dark" />
              <ErrorField name="correct_dark" />

{/* Disable the following based on value above */}

              <AutoField name="dark_image_id" component={IDInputField} objectType="image"/>
              <ErrorField name="dark_image_id" />

              <AutoField name="correct_flat" />
              <ErrorField name="correct_flat" />

{/* Disable the following based on value above */}

              <AutoField name="flat_image_id" component={IDInputField} objectType="image"/>
              <ErrorField name="flat_image_id" />

              <AutoField name="correct_bkgrd" />
              <ErrorField name="correct_bkgrd" />

{/* Disable the following based on value above */}

              <AutoField name="bkgrd_algorithm" />
              <ErrorField name="bkgrd_algorithm" />

              <AutoField name="correct_filter" />
              <ErrorField name="correct_filter" />

{/* Disable the following based on value above */}

              <AutoField name="filter_algorithm" />
              <ErrorField name="filter_algorithm" />

              </Grid>
          </AccordionDetails>
        </Accordion>
        </Grid>

        <p>For now... if you submit without choosing files, it will use sample data</p>

        <SubmitField>Save info and upload files</SubmitField>
        <Button onClick={onCancel}>Cancel</Button>

      </AutoForm>

      </div>
    );
}


export default withRouter(AnalysisData);
