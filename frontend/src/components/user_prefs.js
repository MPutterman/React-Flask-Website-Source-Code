// TODO:
// * Add preference: list of favorite plate_types
// * Add preference: list of favorite cover_types
// * Add option to reset preferences to site defaults?
// * Should tie into the backend session and be retrieved when load sesion.
// * Make sure caching in session handled properly (i.e. mark dirty when preferences
//   are saved).
// * Add cancel function
// * Add rest of fields

import React from "react";
import { withRouter } from "react-router";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { useAuthState, useAuthDispatch, defaultPrefs } from '../contexts/auth';
import Busy from '../components/busy';
import AlertList from '../components/alerts';
import { callAPI } from '../components/api';
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField,} from 'uniforms-material';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import IDInputField from '../components/idfield';

const UserPrefs = (props) => {

    let formRef;

    const session = useAuthState();
    const dispatch = useAuthDispatch();

    // TODO: Put all default values here, rather than in the schema?
    const initialUserPrefs = {
      "general.redirect_after_login": '/home',
    };

    const [loading, setLoading] = React.useState(false);

    const [currentUserPrefs, setCurrentUserPrefs] = React.useState(initialUserPrefs);
    //const [currentUser, setCurrentUser] = React.useState(initialUserState);
    // TODO: add available images, etc...

    const [alert, setAlert] = React.useState({});
    // Form hooks
    // mode is the render mode (both onChange and onBlur)
    // defaultValues defines how the form will be 'reset'. Fill back in with retrieved user info
//    const {handleSubmit, reset, control} = useForm({mode: 'all', defaultValues: currentUser}); 

    // TODO: how to deal with multi-level schema, and grouped inputs?
    // Schema
    const schema = new SimpleSchema ({
        general: {
            label: 'Category - General preferences',
            type: Object,
        },
        "general.redirect_after_login": {
            label: 'Redirect after login (relative URL)',
            type: String,
        },
        "general.timezone": {
            label: 'Time zone',
            type: String, // TODO: are there some validators for this?
            defaultValue: '',
        },
        analysis: {
            label: 'Category - Analysis preferences',
            type: Object,
        },
        "analysis.default_plate": {
            label: 'Default TLC plate type',
            type: String, // plate_id
            defaultValue: null,
        },
        "analysis.default_cover": {
            label: 'Default TLC cover type',
            type: String, // cover_id
            defaultValue: null,
        },
        "analysis.default_equip": {
            label: 'Default equipment ID for new analysis',
            type: String, // equip_id
            defaultValue: null,
        },
        "analysis.default_exposure_time": {
            label: 'Default exposure time (s) for new analysis',
            type: Number,
            defaultValue: null,
        },
        "analysis.default_exposure_temp": {
            label: 'Default exposure temperature (C) for new analysis',
            type: Number,
            defaultValue: null,
                // Warn if equipment doesn't support cooling?
        },
        "analysis.default_use_flat_correction": {
            label: 'Turn on flat correction by default?',
            type: Boolean,
            defaultValue: false,
        },
        "analysis.default_flat_image": {
            label: 'Default image for flat correction (if enabled)',
            type: String, // image_id
            defaultValue: null,
        },
        "analysis.default_use_dark_correction": {
            label: 'Turn on dark correction by default?',
            type: Boolean,
            defaultValue: false,
        },
        "analysis.default_dark_image": {
            label: 'Default image for dark correction (if enabled)',
            type: String, // image_id
            defaultValue: null,
        },
        "analysis.default_use_bkgrd_correction": {
            label: 'Turn on background correction by default?',
            type: Boolean,
            defaultValue: true,
        },
        "analysis.default_bkgrd_algorithm": {
            label: 'Default background correction algorithm',
            type: String, // TODO: change to select
            defaultValue: 'gradient',
        },
        "analysis.default_use_filter_correction": {
            label: 'Turn on filter correction by default?',
            type: Boolean,
            defaultValue: true,
        },
        "analysis.default_filter": {
            label: 'Default filter correction',
            type: String, // TODO: change to select
            defaultValue: 'median 3x3',
        },
            //default_bright_image_exposure_time: '',   // OMIT FOR NOW
            //default_bright_image_exposure_temp: '',   // OMIT FOR NOW
            //favorite_plate_type: [],                  // list of plate_ids
            //favorite_cover_type: [],                  // list of cover_ids
    }, {
        requiredByDefault: false,
    });




    // TODO: change to callAPI
    async function getUserPrefs(id) {

/*        setLoading(true);
        if (id) {
            axios.get(backend_url('user/load/' + id))
            .then((response) => {
//                setCurrentUser(response.data);
                setLoading(false);
            })
            .catch((e) => {
                console.error("GET /user/edit/" + id + ": " + e);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
*/
    }

/*  
    // Retrieve user with specified id from the database
    // TODO: Error handling if user is not found... need to redirect to not found page
    async function getUser(id) {
        setLoading(true);
        if (id) {
            axios.get(backend_url('user/load/' + id))
            .then((response) => {
                setCurrentUser(response.data);
                setLoading(false);
            })
            .catch((e) => {
                console.error("GET /user/edit/" + id + ": " + e);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }
*/

    // Call this upon first value of props.match.params.id (should only run once)
    React.useEffect(() => {
        console.log("In useEffect #1"); // currentUser and availableOrganizations are updated asynchronously
        //getUser(props.match.params.id);
    }, [props.match.params.id]);

    // This second useEffect is triggered whenever 'currentUser' changes (i.e. after loading from database).
    // When triggered, it sets the defaultValues of the form to currentUser, then triggers the form to reset.
    // This causes the form fields to fill in with the newly retrieved data in currentUser.
    // TODO: for some reason if I try to put reset(currentUser) in the getUser function it doesn't
    // properly reset the form...
/*
    React.useEffect(() => {
        console.log("In useEffect #2 => ", currentUser); //initUser);
        reset(userPrefs);
    }, [userPrefs]);
*/

    // Save the user information back to the database
    async function saveUserPrefs(data) {
        setLoading(true);
        return callAPI('POST', 'user/prefs', data)
        .then((response) => {
            setAlert({severity: 'success', message: 'Preferences successfully saved'});
            setCurrentUserPrefs(response.data);
            setLoading(false);
        })
        .catch((e) => {
            setAlert({severity: 'error', message: 'Error while saving preferences'});
            console.log("saveUserPrefs - exception: " + e);
            setLoading(false);
        });
    }

    // Returns how to render the form

    var bridge = new SimpleSchema2Bridge(schema);


    return (

          <div className="UserPrefForm" style={{ maxWidth: '500px',}}>

            <Busy busy={loading} />

            <AutoForm
              schema={bridge}
              onSubmit={saveUserPrefs}
              ref={ref => (formRef = ref)}
              model={currentUserPrefs}
            >
                <Accordion defaultExpanded={true}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon/>}>General preferences</AccordionSummary>
                    <AccordionDetails>
                        <Grid container direction="column">
                            <AutoField name="general.redirect_after_login" />
                            <ErrorField name="general.redirect_after_login" />
                            <AutoField name="general.timezone" />
                            <ErrorField name="general.timezone" />
                        </Grid>
                    </AccordionDetails>
                </Accordion>
                <Accordion defaultExpanded={true}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon/>}>Analysis preferences</AccordionSummary>
                    <AccordionDetails>
                        <Grid container direction="column">
                            <AutoField name="analysis.default_equip" component={IDInputField} objectType="equip" />
                            <ErrorField name="analysis.default_equip" />
                            <AutoField name="analysis.default_plate" />
                            <ErrorField name="analysis.default_plate" />
                            <AutoField name="analysis.default_cover" />
                            <ErrorField name="analysis.default_cover" />
                            <AutoField name="analysis.default_exposure_time" />
                            <ErrorField name="analysis.default_exposure_time" />
                            <AutoField name="analysis.default_exposure_temp" />
                            <ErrorField name="analysis.default_exposure_temp" />
                            <AutoField name="analysis.default_use_dark_correction" />
                            <ErrorField name="analysis.default_use_dark_correction" />
                            <AutoField name="analysis.default_dark_image" component={IDInputField} objectType="image" /* TODO:filter by image-type? */ />
                            <ErrorField name="analysis.default_dark_image" /> 
                            <AutoField name="analysis.default_use_flat_correction" />
                            <ErrorField name="analysis.default_use_flat_correction" />
                            <AutoField name="analysis.default_flat_image" component={IDInputField} objectType="image" /* TODO:filter by image-type? */ />
                            <ErrorField name="analysis.default_flat_image" />
                            <AutoField name="analysis.default_use_bkgrd_correction" />
                            <ErrorField name="analysis.default_use_bkgrd_correction" />
                            <AutoField name="analysis.default_bkgrd_algorithm" />
                            <ErrorField name="analysis.default_bkgrd_algorithm" />
                            <AutoField name="analysis.default_use_filter_correction" />
                            <ErrorField name="analysis.default_use_filter_correction" />
                            <AutoField name="analysis.default_filter" />
                            <ErrorField name="analysis.default_filter" />
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                <SubmitField>Save Preferences</SubmitField>

            </AutoForm>



            <Button variant='contained' onClick={() => formRef.reset()}>Reset</Button>

            <AlertList alert={alert} />

          </div>
        );
    
}

export default withRouter(UserPrefs);
