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
import {AutoField, ErrorField, SubmitField, LongTextField } from 'uniforms-material';
import IDInputField from './idfield';

//const WrappedAnalysisData = ({model, ...props}) => {
const AnalysisData = ({model, ...props}) => {

    return (

        <div> 

            <p>Analysis Information</p>

            <Box display="flex" flexDirection="row">
                <Box width='50%' pr={1}>
                    <AutoField name="name" />
                    <ErrorField name="name" />            
                </Box>
                <Box width='50%' pl={1}>
                    <AutoField name="expt_date" type="date" />
                    <ErrorField name="expt_date" />
                </Box>
            </Box>

            <AutoField name="description" component={LongTextField} />
            <ErrorField name="description" />

            <Box display="flex" flexDirection="row">
                <Box width='50%' pr={1}>
                    <AutoField name="equip_id" component={IDInputField} objectType='equip' />
                    <ErrorField name="equip_id" />
                </Box>
                <Box width='50%' pl={1}>
                    <AutoField name="radio_image_id"
                        component={IDInputField} objectType='image'
                        filter={[{field:'image_type', value:'radio'}, {field:'equip_id', value:'equip_id', operator:'field'}]}
                    />
                    <ErrorField name="radio_image_id" />
                </Box>
            </Box>

            <Box display="flex" flexDirection="row">
                <Box width='50%' pr={1}>
                    <AutoField name="plate_id" component={IDInputField} objectType='plate' />
                    <ErrorField name="plate_id" />
                </Box>
                <Box width='50%' pl={1}>
                    <AutoField name="bright_image_id"
                        component={IDInputField} objectType='image'
                        filter={[{field:'image_type', value:'bright'}, {field:'equip_id', value:'equip_id', operator:'field'}]}
                    />
                    <ErrorField name="bright_image_id" />
                </Box>
            </Box>

            <Box display="flex" flexDirection="row">
                <Box width='50%' pr={1}>
                    <AutoField name="cover_id" component={IDInputField} objectType='cover' />
                    <ErrorField name="cover_id" />
                </Box>
                <Box width='50%' pl={1}>
                    <AutoField name="uv_image_id"
                        component={IDInputField} objectType='image'
                        filter={[{field:'image_type', value:'uv'}, {field:'equip_id', value:'equip_id', operator:'field'}]}
                    />
                    <ErrorField name="uv_image_id" />
                </Box>
            </Box>


            <p>Corrections</p>

            <Box display="flex" flexDirection="row">
                <Box width='50%' pr={1}>
                    <AutoField name="dark_image_id"
                        component={IDInputField} objectType='image'
                        filter={[{field:'image_type', value:'dark'}, {field:'equip_id', value:'equip_id', operator:'field'}]}
                    />
                    <ErrorField name="dark_image_id" />
                </Box>
                <Box width='50%' pl={1}>
                    <AutoField name="flat_image_id"
                        component={IDInputField} objectType='image'
                        filter={[{field:'image_type', value:'flat'}, {field:'equip_id', value:'equip_id', operator:'field'}]}
                    />
                    <ErrorField name="flat_image_id" />
                </Box>
            </Box>

            <Box display="flex" flexDirection="row">
                <Box width='50%' pr={1}>
                    <AutoField name="bkgrd_algorithm" />
                    <ErrorField name="bkgrd_algorithm" />
                </Box>
                <Box width='50%' pl={1}>
                    <AutoField name="filter_algorithm" />
                    <ErrorField name="filter_algorithm" />
                </Box>
            </Box>

        </div>
    );
}

export default AnalysisData;
