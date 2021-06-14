// TODO:
// * Like in other forms, need a useEffect() to reset form defaults (when user prefs changes),
//     so that after submitting form, the new values get 'locked in', and reset will return to the new saved state
// * MAJOR: does not yet mark the Auth context as dirty when update prefs (nor updates the prefs in the session)
// * Add preference: list of favorite plate_types
// * Add preference: list of favorite cover_types
// * Add option to reset preferences to site defaults?  (I -think- form reset will return to state of model (from database))
// * Should tie into the backend session and be retrieved when load sesion.
// * Make sure caching in front-end Auth context handled properly (i.e. mark dirty when preferences
//   are saved).
// * In the IDInputField, need more control over button labels... e.g. for images, we might like 'Choose' and 'Upload', rather
//   than 'Choose and 'Create'....?
// * How do we handle the case when an equipment or image, etc.. refered in someone's preference is deleted?
// * Prevent showing preferences when no user is logged in
// * Maybe null/undefined values should not be sent to the database...? There may be an option in simplschema
//    to clean-up the values before validate/submit
// * useEffect seems to get called twice after Submit. Why?

import React from "react";
import { withRouter } from "react-router";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { useAuthState, useAuthDispatch, defaultUserPrefs, authRefreshSession } from '../contexts/auth';
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

    const initialUserPrefs = defaultUserPrefs; // Defaults currently stored in auth.js

    const [loading, setLoading] = React.useState(false); 

    const [currentUserPrefs, setCurrentUserPrefs] = React.useState(initialUserPrefs);

    const [alert, setAlert] = React.useState({});

    // Schema (uses multi-level inputs for categories and keys)
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
            type: String, // TODO: convert to select? or are there some predefined validators for valid timezones?
        },
        analysis: {
            label: 'Category - Analysis preferences',
            type: Object,
        },
        "analysis.default_plate": {
            label: 'Default TLC plate type',
            type: String, // plate_id
        },
        "analysis.default_cover": {
            label: 'Default TLC cover type',
            type: String, // cover_id
        },
        "analysis.default_equip": {
            label: 'Default equipment ID for new analysis',
            type: String, // equip_id
        },
        "analysis.default_exposure_time": {
            label: 'Default exposure time (s) for new analysis',
            type: Number,
        },
        "analysis.default_exposure_temp": {
            label: 'Default exposure temperature (C) for new analysis',
            type: Number, // TODO: somehow warn if equipment doesn't support cooling?
        },
        "analysis.default_use_flat_correction": {
            label: 'Turn on flat correction by default?',
            type: Boolean,
        },
        "analysis.default_flat_image": {
            label: 'Default image for flat correction (if enabled)',
            type: String, // image_id
        },
        "analysis.default_use_dark_correction": {
            label: 'Turn on dark correction by default?',
            type: Boolean,
        },
        "analysis.default_dark_image": {
            label: 'Default image for dark correction (if enabled)',
            type: String, // image_id
        },
        "analysis.default_use_bkgrd_correction": {
            label: 'Turn on background correction by default?',
            type: Boolean,
        },
        "analysis.default_bkgrd_algorithm": {
            label: 'Default background correction algorithm',
            type: String, // TODO: change to selector
        },
        "analysis.default_use_filter_correction": {
            label: 'Turn on filter correction by default?',
            type: Boolean,
        },
        "analysis.default_filter": {
            label: 'Default filter correction',
            type: String, // TODO: change to selector
        },
        //default_bright_image_exposure_time: '',   // OMIT FOR NOW
        //default_bright_image_exposure_temp: '',   // OMIT FOR NOW
        //favorite_plate_type: [],                  // list of plate_ids
        //favorite_cover_type: [],                  // list of cover_ids
    }, {
        requiredByDefault: false,
    });


    // TODO: should this need a backend method, or just work entirely with the session?
    // When save prefs, need to trigger session to reload / update prefs...
    async function loadUserPrefs() {
        setLoading(true);
        setCurrentUserPrefs(session.prefs);
        console.log('found prefs =>', currentUserPrefs);
        setLoading(false);
    }

    React.useEffect(() => {
        console.log("In useEffect - loading prefs"); 
        loadUserPrefs();
    }, [session]);

    async function onSubmit(data, e)  {
      saveUserPrefs(data);
    };

    // Save the formdata back to the database (note it is already in nested dict format)
    // TODO: currently doesn't pass a user_id... maybe something we want in the future for admins?
    async function saveUserPrefs(data) {
        console.log ('saveUserPrefs, incoming data', data);
        setLoading(true);
        // Hack -- better option might be to set content-type to application/json
        // Backend needs to un-stringify this
        let newdata = {prefs: JSON.stringify(data)};
        console.log ('saveUserPrefs, sanitized data', newdata);

        return callAPI('POST', 'api/prefs/save', newdata)
        .then((response) => {
            setAlert({severity: 'success', message: 'Preferences successfully saved'});
            setLoading(false);
            return true;
        })
        .then(() => {
            authRefreshSession(dispatch);
        })
        .catch((e) => {
            setAlert({severity: 'error', message: 'Error while saving preferences'});
            console.log("saveUserPrefs - exception: " + e);
            setLoading(false);
            return false;
        });
    }

    var bridge = new SimpleSchema2Bridge(schema);

    return (

          <div className="UserPrefForm" style={{ maxWidth: '500px',}}>

            <Busy busy={loading} />

            <AutoForm
              schema={bridge}
              onSubmit={onSubmit}
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

            <Button variant='contained' onClick={() => formRef.reset()}>Cancel (doesn't work properly yet)</Button>

            <AlertList alert={alert} />

          </div>
        );
    
}

export default withRouter(UserPrefs);
