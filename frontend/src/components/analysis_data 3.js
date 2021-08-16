// TODO:
/*
* Figure out how to auto-show/hide or disable e.g. dark_image_ID if correct_dark is false...
* How do we cleanup images that were uploaded if an analysis wasn't created?  Or if someone
  accidentlally re-uploads the same image a couple of times?
* Can we automatically get the equip_id from uploaded images, and/or check if it matches what
  is selected for images?
* Add plate type and cover type when selectors are ready...
*/

import React from "react"; 
import { withRouter } from "react-router";

// Imports for form display components
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';

// Imports for automatic form generation
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField, LongTextField } from 'uniforms-material';
import IDInputField from './idfield';

import { analysisSchema, analysisValidator } from '../helpers/schema';
import { connectEdit } from '../components/object_edit';


//const WrappedAnalysisData = ({model, ...props}) => {
const AnalysisData = ({model, ...props}) => {

  return (

      <div> 

        <Grid container direction="row" >

            <Grid item xs={5}>

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

            </Grid>
            <Grid item xs={2}>
            </Grid>
            <Grid item xs={5}>

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

      </div>
    );
}

//const AnalysisData = withRouter(connectEdit(WrappedAnalysisData, 'analysis', analysisSchema, analysisValidator));

//export { AnalysisData };
export default AnalysisData;
