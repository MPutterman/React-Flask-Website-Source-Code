// Handle user preference form
// Note after saving preferences we tell the auth context to refresh the session.

// TODO:
// * After saving preferences we trigger a session reload. Would be more efficient just to mark prefs 
//     as dirty.
// * Add preference?: list of favorite plate_types
// * Add preference?: list of favorite cover_types
// * Add option to reset preferences to site defaults?  (I -think- form reset will return to state of model (from database))
// * Should tie into the backend session and be retrieved when load sesion.
// * How do we handle the case when an equipment or image, etc.. refered in someone's preference is deleted?
// * Maybe null/undefined values should not be sent to the database...? There may be an option in simplschema
//    to clean-up the values before validate/submit
// * useEffect seems to get called twice after Submit. Why?
// * Implement some checking on the server, e.g. see if selected images equip and image ids are valid,
//     and that Images are of the correct 'type' (dark/flat).
// * Implement 'reset defaults' button -- either delete prefs entry from profile, and/or load
//     current site defaults...  Need to ask for confirmation

import React from "react";
import { withRouter } from "react-router";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { useAuthState, useAuthDispatch, defaultUserPrefs, authRefreshSession } from '../contexts/auth';
import { useConfigState } from '../contexts/config';
import Busy from '../components/busy';
import { useAlerts } from '../contexts/alerts';
import { callAPI } from '../helpers/api';
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField,} from 'uniforms-material';
import { id_exists } from '../helpers/validation_utils';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import IDInputField from '../components/idfield';
import TimezoneSelect, { i18nTimezones } from 'react-timezone-select';
import InputAdornment from '@material-ui/core/InputAdornment';

const UserPrefs = (props) => {

    let formRef;

    const { prefs } = useAuthState(); // TODO: only need 'prefs'
    const dispatch = useAuthDispatch();
    const config = useConfigState();
    const setAlert = useAlerts();

    const initialUserPrefs = defaultUserPrefs; // Defaults currently stored in auth.js

    const [busy, setBusy] = React.useState(false); 

    const [currentUserPrefs, setCurrentUserPrefs] = React.useState(initialUserPrefs);

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
        "general.theme": {
            label: 'Theme',
            type: String,
            allowedValues: config.general.theme_options,
        },
        "general.default_searchresult_pagesize": {
            label: 'Default number of entries per page in searh results',
            type: Number,
            allowedValues: config.search.pagesize_options,
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
            label: 'Default equipment',
            type: String, // equip_id
        },
        "analysis.default_exposure_time": {
            label: 'Default exposure time',
            type: Number,
        },
        "analysis.default_exposure_temp": {
            label: 'Default exposure temperature',
            type: Number, // TODO: somehow warn if equipment doesn't support cooling?
        },
        "analysis.default_use_flat_correction": {
            label: 'Turn on flat correction by default?',
            type: Boolean,
        },
        "analysis.default_flat_image": {
            label: 'Default flat image',
            type: String, // image_id
        },
        "analysis.default_use_dark_correction": {
            label: 'Turn on dark correction by default?',
            type: Boolean,
        },
        "analysis.default_dark_image": {
            label: 'Default dark image',
            type: String, // image_id
        },
        "analysis.default_use_bkgrd_correction": {
            label: 'Turn on background correction by default?',
            type: Boolean,
        },
        "analysis.default_bkgrd_algorithm": {
            label: 'Default background correction algorithm',
            type: String, // TODO: change to selector
            allowedValues: config.analysis.bkgrd_algorithm_options,
        },
        "analysis.default_use_filter_correction": {
            label: 'Turn on filter correction by default?',
            type: Boolean,
        },
        "analysis.default_filter": {
            label: 'Default filter correction',
            type: String, // TODO: change to selector
            allowedValues: config.analysis.filter_algorithm_options,
        },
        //default_bright_image_exposure_time: '',   // OMIT FOR NOW
        //default_bright_image_exposure_temp: '',   // OMIT FOR NOW
        //favorite_plate_types: [],                  // list of plate_ids
        //favorite_cover_types: [],                  // list of cover_ids
    }, {
        requiredByDefault: false,
    });


    // TODO: should this need a backend method, or just work entirely with the session?
    // When save prefs, need to trigger session to reload / update prefs...
    async function loadUserPrefs() {
        setBusy(true);
        setCurrentUserPrefs(prefs);
        console.log('found prefs =>', currentUserPrefs);
        setBusy(false);
    }

    React.useEffect(() => {
        console.log("In useEffect - loading prefs"); 
        console.log('preferences are now: ', prefs);
        loadUserPrefs();
    }, [prefs]);

    async function onSubmit(data, e)  {
      saveUserPrefs(data);
    };

    // Save the formdata back to the database (note it is already in nested dict format)
    // TODO: currently doesn't pass a user_id... maybe something we want in the future for admins?
    async function saveUserPrefs(data) {
        console.log ('saveUserPrefs, incoming data', data);
        setBusy(true);
        // Hack -- better option might be to set content-type to application/json
        // Backend needs to un-stringify this
        let newdata = {prefs: JSON.stringify(data)};
        console.log ('saveUserPrefs, sanitized data', newdata);

        return callAPI('POST', 'api/prefs/save', newdata)
        .then((response) => {
            setAlert({severity: 'success', message: 'Preferences successfully saved'});
            setBusy(false);
            return true;
        })
        .then(() => {
            authRefreshSession(dispatch);
        })
        .catch((e) => {
            setAlert({severity: 'error', message: 'Error while saving preferences'});
            console.log("saveUserPrefs - exception: " + e);
            setBusy(false);
            return false;
        });
    }

    var bridge = new SimpleSchema2Bridge(schema);

    // Asynchronous validation check (to check if ID parameters are valid)
    // TODO: is the return set up properly and return a promise as expected?
    // TODO: there should be a way to launch all async checks at once
    // TODO: improve error handling
    async function onValidate(model, error) {

        console.log ('In onValidate. model =>', model);
        if (error) console.log ('error.details =>', error.details);

        return Promise.all([
            id_exists('equip', model.analysis.default_equip),
            id_exists('plate', model.analysis.default_plate),
            id_exists('cover', model.analysis.default_cover),
            id_exists('image', model.analysis.default_dark_image),
            id_exists('image', model.analysis.default_flat_image),
        ])
        .then(([exists_equip, exists_plate, exists_cover, exists_default_flat, exists_default_dark]) => {

            var new_errors = [];
            if (!exists_equip) {
                new_errors.push({name: 'analysis.default_equip', value: model.analysis.default_equip, type: 'custom', message: 'Invalid ID'});
            }
            if (!exists_plate) {
                new_errors.push({name: 'analysis.default_plate', value: model.analysis.default_plate, type: 'custom', message: 'Invalid ID'});
            }
            if (!exists_cover) {
                new_errors.push({name: 'analysis.default_cover', value: model.analysis.default_cover, type: 'custom', message: 'Invalid ID'});
            }
            if (!exists_default_flat) { 
                new_errors.push({name: 'analysis.default_flat_image', value: model.analysis.default_flat_image, type: 'custom', message: 'Invalid ID'});
            }
            if (!exists_default_dark) {
                new_errors.push({name: 'analysis.default_dark_image', value: model.analysis.default_dark_image, type: 'custom', message: 'Invalid ID'});
            }

            if (new_errors.length > 0) {
                if (!error) error = {errorType: 'ClientError', name: 'ClientError', error: 'validation-error', details: [], };
                error.details.push(new_errors);
                console.log('new_errors', new_errors);
                return error;
            } else {
                console.log('error', error);
                return error;
            }
        });
    }

    return (

          <div className="UserPrefForm" style={{ margin: 'auto', maxWidth: '500px',}}>

            <Busy busy={busy} />

            <AutoForm
              schema={bridge}
              onSubmit={onSubmit}
              ref={ref => (formRef = ref)}
              model={currentUserPrefs}
              onValidate={onValidate}
            >
                <Accordion defaultExpanded={true} square variant='elevation' elevation={8}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon/>}>General preferences</AccordionSummary>
                    <AccordionDetails >
                        <Grid container direction="column">
                            <AutoField name="general.redirect_after_login" />
                            <ErrorField name="general.redirect_after_login" />
                            <AutoField name="general.timezone" /* component={TimezoneSelect} timezone={i18nTimezones} */ />
                            <ErrorField name="general.timezone" />
                            <AutoField name="general.theme" />
                            <ErrorField name="general.theme" />
                            <AutoField name="general.default_searchresult_pagesize" />
                            <ErrorField name="general.default_searchresult_pagesize" />
                        </Grid>
                    </AccordionDetails>
                </Accordion>
                <Accordion defaultExpanded={true} square variant='elevation' elevation={8}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon/>}>Analysis preferences (Defaults for New Analysis)</AccordionSummary>
                    <AccordionDetails >
                        <Grid container direction="column">
                            <AutoField name="analysis.default_equip" component={IDInputField} objectType="equip" />
                            <ErrorField name="analysis.default_equip" />
                            <AutoField name="analysis.default_plate" component={IDInputField} objectType="plate" />
                            <ErrorField name="analysis.default_plate" />
                            <AutoField name="analysis.default_cover" component={IDInputField} objectType="cover" />
                            <ErrorField name="analysis.default_cover" />
                            <AutoField name="analysis.default_exposure_time"
                                InputProps={{endAdornment:(<InputAdornment position="end">s</InputAdornment>)}}
                            />
                            <ErrorField name="analysis.default_exposure_time" />
                            <AutoField name="analysis.default_exposure_temp"
                                InputProps={{endAdornment:(<InputAdornment position="end">&deg;C</InputAdornment>)}}
                            />
                            <ErrorField name="analysis.default_exposure_temp" />
                            <AutoField name="analysis.default_use_dark_correction" />
                            <ErrorField name="analysis.default_use_dark_correction" />
                            <AutoField name="analysis.default_dark_image"
                                component={IDInputField} objectType="image"
                                filter={[{field:'image_type', value:'dark'},]}
                            /> {/* Also filter by equip_id? */}
                            <ErrorField name="analysis.default_dark_image" /> 
                            <AutoField name="analysis.default_use_flat_correction" />
                            <ErrorField name="analysis.default_use_flat_correction" />
                            <AutoField name="analysis.default_flat_image"
                                component={IDInputField} objectType="image"
                                filter={[{field:'image_type', value:'flat'},]}
                            /> {/* Also filter by equip_id? */}
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

                <ButtonGroup variant='contained'>
                    <SubmitField>Save Changes</SubmitField>
                    <Button onClick={() => formRef.reset()}>Cancel</Button>
                    <Button>Reset Defaults</Button>
                </ButtonGroup>

            </AutoForm>

          </div>
        );
    
}

export default withRouter(UserPrefs);
