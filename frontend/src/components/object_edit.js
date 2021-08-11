// Implement a generic object_edit (and object_create) form
//
// TODO:
// * Bug in ImageEdit -- the download link seems to give the
//     same file even if a new file is uploaded (via /image/edit).
//     Turned off back-end caching but still not working... what to do?
// * Make some custom fields for date once work out picker (with 'X' icon to clear the date)
// * Bug ImageEdit: if submit BEFORE selecting file... sets a validation error that cannot be removed,
//     even after selecting a file. Sometimes works if there is a second error gets resolved.
// * Even after callAPI, there appear to be a lot of calls to validator function... why?
//     Are onsubmit and onValidate mixedup?
// * Why does modelTransform get called so much?  (Once per field?)
//     Also it doesn't seem to delete fieldswork as advertised...... doesn't seem to delete fields prior to submission
//     nor setting user 'name' field before showing the form...
// * Possibly add a way to pull 'defaultValues' to populate initial model?
//     CallAPI from create sends far fewer fields than from edit
// * Add an onSave handler for the wrapped container?  E.g. in user edit, would allow refresh session 
//     Need to be careful how to implement... any function will need to be INSIDE a component to have context
//     e.g. for auth session
// * Look carefully at error handling and error responses, especially for full page versus modal dialog
// * Can make a 'view' mode by wrapping in 'fieldset'. However, it keeps all the '*' etc form hints...
//     Think about whether we want separate view/edit templates or share in this way...
//     Otherwise maybe can get decent autofield layout by using box and a % width for each element...
//     [Note for empty values we would want to display as '' to make sure all labels are the same size/position']
// * For Image type, is there any value in saving the front-end filename to backend database? Currently copies
//     to the 'name' field, but user can change it after
// * For images -- maybe click to view in popup window?  And then click to download?
// * Delete 'description' from images? (backend too)
// * Add a feature to prompt to update preferences (default dark and default flat) if create a new image?
//     This could be a special component to take the value of another field and store as preference.
//     (Later can be extended to 'follow' or 'add to favorites')
// * https://uniforms.tools/docs/tutorials-creating-custom-field/ -- some ideas how to show a live
//     version of selected file, i.e. img src={value}.  But not doesn't use blob, uses: URL.createObjectURL(files[0])
//     to point to file...

import React from "react";
import { callAPI } from '../helpers/api';
import { withRouter } from "react-router";
import { useAuthState, defaultUserPrefs, authRefreshSession } from '../contexts/auth';
import { useErrorResponse } from '../contexts/error';
import { useConfigState } from '../contexts/config';
import { StatusCodes } from 'http-status-codes';

import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import { spacing } from '@material-ui/system'
import Divider from '@material-ui/core/Divider';
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
//import Busy from '../components/busy';
import { useAlerts } from '../contexts/alerts';
import { useThrobber } from '../contexts/throbber';
import { userSchema, userRegistrationSchema, orgSchema, equipSchema, plateSchema, coverSchema, imageSchema, analysisSchema } from '../helpers/schema';
import { defaultValidator, userValidator, imageValidator } from '../helpers/schema';
import { ObjectViewButton, ObjectEditButton, ObjectFavoriteButton, ObjectCloneButton, ObjectDeleteButton, ObjectRestoreButton, ObjectPurgeButton } from '../helpers/object_utils';
import { ObjectIcon, objectTitle, ActionIcon } from '../helpers/object_utils';
import CardActions from '@material-ui/core/CardActions';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import Avatar from '@material-ui/core/Avatar';
import { hasPermission, listPermissions } from '../helpers/object_utils';
import InputAdornment from '@material-ui/core/InputAdornment';
import Typography from '@material-ui/core/Typography';

// Image edit form
// Usage:
//   <FullyWrappedObjectEdit create id />
// Properties:
//   - create=<Boolean> (If true, create a new record, ignore id parameters)
//   - id=<Integer> (also can get from props.match.params.id)

// Wrapper for edit/create forms
//   - WrappedEdit <Component> - component to be wrapped
//   - objectType <String> - type of object
//   - schemaFunction <Function> - function for building schema
//   - validatorFunction <Function> - async validator
//   - transformFunction <Function> - transform the model before form, validation, or submit
//   - onSaveHandler <Function> - 


const connectEdit = (WrappedEdit, objectType, schemaFunction, validatorFunction=null, transformFunction=null) => {
return (props) => {

    // Contexts    
    const config = useConfigState();
    const  { prefs } = useAuthState();
    const setErrorResponse = useErrorResponse();
    const setAlert = useAlerts();
    const setBusy = useThrobber();

    // State
    const object_type = objectType;

    const initial_id = props.create
                ? null
                : (props.objectID
                  ? props.objectID
                  : (props.match.params.id
                    ? props.match.params.id
                    : null));
    const initial_create = props.create || (!initial_id)
    const [id, setId] = React.useState(initial_id);
    // TODO: probably can replace with a function (right now there is a bit of redundancy, since
    // we can fully determine 'create' from just the id..)
    const [create, setCreate] = React.useState(initial_create);

    React.useEffect (() => {
        setId( props.create ? null : (props.objectID ? props.objectID : (props.match.params.id ? props.match.params.id : null)));
    },[props.create, props.objectID, props.match.params.id]);

    const [loaded, setLoaded] = React.useState(create ? true : false);
    //const [busy, setBusy] = React.useState(false);

    const [permissions, setPermissions] = React.useState([]);

    // When id changes (and upon first initialization), check permissions and load object
    React.useEffect(() => {
        //console.log (`in useEffect, id: ${id}, create: ${create}, props.filter: ${props.filter}`);
        listPermissions(object_type, id)
        .then((list) => {
            setPermissions(list);
            if (id) {
                if (list.includes('view') && list.includes('edit')) {
                    objectLoad(id);
                } else {
                    setErrorResponse({code: StatusCodes.FORBIDDEN, details: 'Not Authorized' });
                }
            } else {
                if (list.includes('create')) {
                    objectCreate(id);
                } else {
                    setErrorResponse({code: StatusCodes.FORBIDDEN, details: 'Not Authorized' });
                }
            }
        });
    }, [id])

    // Form model

    let formRef;
    const [model, setModel] = React.useState({}); // default values not needed (defined in schema)

    // Convenience functions for showing action buttons. Note most are disabled until after saving so
    // that the ID value is available. Purge (complete deletion) is only available for deleted items.
    const showFavoriteButton = () => { return !create; }
    const showViewButton = () => { return !create && permissions.includes('view'); }
    const showEditButton = () => { return false; }  // We are already in edit mode
    const showCloneButton = () => { return !create && permissions.includes('clone'); }
    const showDeleteButton = () => { return !create && permissions.includes('delete') && !model.is_deleted; }
    const showRestoreButton = () => { return !create && permissions.includes('restore') && model.is_deleted; }
    const showPurgeButton = () => { return !create && permissions.includes('purge') && model.is_deleted; }

    // Create a new object
    function objectCreate(id) {
        const initialModel = {}; // TODO: need to find a way to load defaults instead
        setModel(applyFilter(initialModel)); 
        setLoaded(true);
        setBusy(false);
        return true;
    }

    // Retrieve object with specified id from the database
    function objectLoad(id) {
        if (id) {
            setBusy(true);
            callAPI('GET', `${object_type}/load/${id}`) // TODO: change to api/object/load/id
            .then((response) => {
                if (response.error) {
                    // TODO: handle some specific errors (e.g. unauthorized) or add error details?
                    setErrorResponse({code: response.status, details: response.data.error ? response.data.error : '' });
                    setLoaded(true);
                    setBusy(false);
                    return false;
                } else {
                    setModel(response.data);
                    setLoaded(true);
                    setBusy(false);
                    return true;            
                }
            });
        }
        return true;
    }

    // Apply incoming filter (in props.filter) to a model
    const applyFilter = (model) => {
        if (props.filter) {
            //console.log('in object_edit, received props.filter: ', props.filter);
            //let override = {};
            //props.filter.forEach( element => {
            //    if (!element.operator || element.operator == 'eq') {
            //        override[element.field] = element.value;
            //    }
            //});
            //console.log('overriding values from props.filter', override);
            //setModel(prev => ({...prev, ...override}));
            props.filter.forEach ( element => {
                if (!element.operator || element.operator == 'eq') {
                    model[element.field] = element.value;
                }
            })
        }
        return model;
    }


    // Save the record back to the database
    // TODO: add in 'id' field?
    async function objectSave(data) {

        setBusy(true);

        // TODO: consider separating API calls for create and save...
        return callAPI('POST', `${object_type}/save`, data)
        .then((response) => {

            if (response.error) {

                // TODO: handle some kinds of errors (e.g. unauthorized?)
                setAlert({severity: 'error', message: `Error: Received status ${response.status} from backend (${response.data.error})`});
                setBusy(false);
                return false;

            } else {

                // Retrieve new id from the response
                // TODO: error checking - if the ID is not received, return error response...
                var new_id = response.data.id;

                // Set alert message
                setBusy(false);
                const alert_message = create ? `${objectTitle(object_type)} created successfully`
                                             : `${objectTitle(object_type)} saved successfully`;
                setAlert({severity: 'success', message: alert_message});

                // Call callback 'onSave' if successfully saved image?
                // TODO: change name to onSave since it only needs to send back the ID
                if (props.onSave) {
                    props.onSave({ //...response.data,
                        id: new_id,
                        //name: response.data.name,
                    });
                } else {
                    // Not a modal
                    // Change URL to reflect edit page (rather than create)
                    props.history.replace(`/${object_type}/edit/${new_id}`);
                }

                // Reload page
                if (create) {
                    setId(new_id); // will trigger reload via useEffect
                    setCreate(false);
                } else {
                    setId(new_id);
                    objectLoad(id);
                }

            }

        });

    }


    // Build schema and bridge
    const schema = schemaFunction(config,prefs);
    const bridge = new SimpleSchema2Bridge(schema);

    return (

        <>
        <div className="EditForm" style={{ maxWidth: '800px', align:'middle'}}>

            <AutoForm
                modelTransform={transformFunction ? transformFunction : defaultTransform}
                schema={bridge}
                onSubmit={objectSave}
                ref={ref => (formRef = ref)}
                model={model}
                onValidate={validatorFunction ? validatorFunction : defaultValidator}
            >
                {/*<fieldset disabled={true} readOnly={true} style={{border: '0 none',}}>*/}
                <Card>
                <CardHeader
                    avatar={
                        <Avatar variant="square">
                            <ObjectIcon objectType={object_type} fontSize='large' />
                        </Avatar>
                    }
                    title={`${create ? 'CREATE' : 'EDIT'} ${objectTitle(object_type).toUpperCase()}`}
                    subheader={`${model.name || ''}`}
                    action={<>
                        {showFavoriteButton() ? (<ObjectFavoriteButton objectType={object_type} objectID={id} />) : ( <></> )}
                        {showViewButton() ? (<ObjectViewButton objectType={object_type} objectID={id} />) : ( <></> )}
                        {showEditButton() ? (<ObjectEditButton objectType={object_type} objectID={id} />) : ( <></> )}
                        {showCloneButton() ? (<ObjectCloneButton objectType={object_type} objectID={id} />) : ( <></> )}
                        {showDeleteButton() ? (<ObjectDeleteButton objectType={object_type} objectID={id} />) : ( <></> )}
                        {showRestoreButton() ? (<ObjectRestoreButton objectType={object_type} objectID={id} />) : ( <></> )}
                        {showPurgeButton() ? (<ObjectPurgeButton objectType={object_type} objectID={id} />) : ( <></> )}
                    </>}
                />
                <CardContent>

                <WrappedEdit model={model} {...props} /* TODO: filter out any props? Or add 'id'? */ />

                <Box py={1}>
                </Box>

                <Accordion /*defaultExpanded*/ elevation={10}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <span>Additional read-only fields</span>
                    </AccordionSummary>
                    <AccordionDetails>

  {/*              <Box border={1} p={2} style={{background:"#222225"}}> */}
                    <Box>
                        <Box display="flex" flexDirection="row">
                            <Box width='9%' pr={1}>
                                <AutoField name={`${object_type}_id`} readOnly /* can't disable (need to send to backend) */ />
                                <ErrorField name={`${object_type}_id`} />              
                            </Box>
                            <Box width='28%' px={1}>
                                <AutoField name="modified" disabled />
                                <ErrorField name="modified" />
                            </Box>
                            <Box width='28%' px={1}>
                                <AutoField name="created" disabled />
                                <ErrorField name="created" />
                            </Box>
                            <Box width='35%' pl={1}>
                                <AutoField name="owner_id" component={IDInputField} objectType='user' disabled />
                                <ErrorField name="owner_id" />
                            </Box>
                        </Box>
                        <Box display="flex" flexDirection="row">
                            <Box width='25%'>
                                <AutoField name="is_deleted" disabled/>
                                <ErrorField name="is_deleted" />
                            </Box>
                        </Box>
                    </Box>

                </AccordionDetails>
            </Accordion>
        </CardContent>
        <CardActions disableSpacing style={{ width: '100%', justifyContent: 'flex-end' }}>
            <SubmitField size='small' >Save</SubmitField>
            <Button size='small' type="reset" onClick={() => formRef.reset()}>Cancel</Button>
        </CardActions>
        </Card>

        {/*</fieldset>*/}
        </AutoForm>

    </div>
    </>

);
    
}
}


const WrappedOrgEdit = ({model, ...props}) => {

    return (
        <>
        <AutoField name="name" />
        <ErrorField name="name" />
        <AutoField name="description" multiline />
        <ErrorField name="description" />
        <AutoField name="location" />
        <ErrorField name="location" />
        </>
    )
}

const WrappedPlateEdit = ({model, ...props}) => {

    return (
        <>
        <AutoField name="name" />
        <ErrorField name="name" />
        <AutoField name="description" multiline />
        <ErrorField name="description" />
        <Box display="flex" flexDirection="row">
            <Box width='50%' pr={1}>
                <AutoField name="manufacturer" />
                <ErrorField name="manufacturer" />
            </Box>
            <Box width='50%' pl={1}>
                <AutoField name="catalog" />
                <ErrorField name="catalog" />
            </Box>
        </Box>
        </>
    )
}

const WrappedCoverEdit = ({model, ...props}) => {

    return (
        <>
        <AutoField name="name" />
        <ErrorField name="name" />
        <AutoField name="description" multiline />
        <ErrorField name="description" />
        <Box display="flex" flexDirection="row">
            <Box width='50%' pr={1}>
                <AutoField name="manufacturer" />
                <ErrorField name="manufacturer" />
            </Box>
            <Box width='50%' pl={1}>
                <AutoField name="catalog" />
                <ErrorField name="catalog" />
            </Box>
        </Box>
        </>
    )
}

const WrappedEquipEdit = ({model, ...props}) => {

    return (
        <>
        <AutoField name="name" />
        <ErrorField name="name" />
        <AutoField name="description" multiline />
        <ErrorField name="description" />
        <Box display="flex" flexDirection="row">
            <Box width='50%' pr={1}>
                <AutoField name="manufacturer" />
                <ErrorField name="manufacturer" />
            </Box>
            <Box width='50%' pl={1}>
                <AutoField name="catalog" />
                <ErrorField name="catalog" />
            </Box>
        </Box>
        <Box display="flex" flexDirection="row">
            <Box width='50%' pr={1}>
                <AutoField name="camera" />
                <ErrorField name="camera" />
            </Box>
            <Box width='25%' pl={1}>
                <AutoField name="has_temp_control" />
                <ErrorField name="has_temp_control" />
            </Box>
        </Box>
        <Box display="flex" flexDirection="row">
            <Box width='25%' pr={1}>
                <AutoField name="pixels_x" InputProps={{endAdornment:(<InputAdornment position="end">px</InputAdornment>)}} />
                <ErrorField name="pixels_x" />
            </Box>
            <Box width='25%' px={1}>
                <AutoField name="pixels_y" InputProps={{endAdornment:(<InputAdornment position="end">px</InputAdornment>)}} />
                <ErrorField name="pixels_y" />
            </Box>
            <Box width='25%' px={1}>
                <AutoField name="bpp" />
                <ErrorField name="bpp" />
            </Box>
            <Box width='25%' pl={1}>
                <AutoField name="file_format" />
                <ErrorField name="file_format" />
            </Box>
        </Box>
        <Box display="flex" flexDirection="row">
            <Box width='25%' pr={1}>
                <AutoField name="fov_x" InputProps={{endAdornment:(<InputAdornment position="end">mm</InputAdornment>)}} />
                <ErrorField name="fov_x" />
            </Box>
            <Box width='25%' pl={1}>
                <AutoField name="fov_y" InputProps={{endAdornment:(<InputAdornment position="end">mm</InputAdornment>)}} />
                <ErrorField name="fov_y" />
            </Box>
        </Box>
        </>
    )
}

const WrappedUserRegistration = ({model, ...props}) => {

    return (

        <>
{/*
        <AutoField name="user_id" disabled={true} />
        <ErrorField name="user_id" />
*/}
        <Box display="flex" flexDirection="row">
            <Box width='50%' pr={1}>
                <AutoField name="first_name" />
                <ErrorField name="first_name" />
            </Box>
            <Box width='50%' pl={1}>
                <AutoField name="last_name" />
                <ErrorField name="last_name" />
            </Box>
        </Box>
        <Box display="flex" flexDirection="row">
            <Box width='50%' pr={1}>
                <AutoField name="email"  />
                <ErrorField name="email" />
            </Box>
            <Box width='50%' pl={1}>
                <AutoField name="email_confirm" />
                <ErrorField name="email_confirm" />
            </Box>
        </Box>
        <Box display="flex" flexDirection="row">
            <Box width='50%' pr={1}>
                <AutoField name="password"  />
                <ErrorField name="password" />
            </Box>
            <Box width='50%' pl={1}>
                <AutoField name="password_confirm" />
                <ErrorField name="password_confirm" />
            </Box>
        </Box>
        <AutoField name="org_id" component={IDInputField} objectType='org' />
        <ErrorField name="org_id" />

        <AutoField name="org_list" />
        <ErrorField name="org_list" />

        </>

    )
}


// * Separate user create (register) and user edit (profile).  Currently separate components, 
//     but maybe can do it with one by looking at 'create' state....
// * Add email validation (via email send link) and change password functions, and forgot password
// * Add request membership for an organization?
// * Add show/hide toggle to password field?
// * Make a tabbed interface for user profile? E.g. if owner, add prefs tab, show roles info (admin, or org-admin)
// * TODO: when save user data, need to update session in backend... but also need to force frontend to refresh**
//      Use authRefreshSession(dispatch)???  May need a way to inject a callback
// * In backend, make sure to redo all validation checks (e.g. unique email, etc...)
// * Divide into toplevel form (exported with withRouter), and a modal form?
// * Figure out how to deal with users that use external (googleAuth or other) login
//    - Do we allow multiple authentication methods?
//    - We need to register them, but do we take them to normal registration page (that asks for password)
//        or a special one that just grabs email (and maybe asks for name)?

const WrappedUserEdit = ({model, ...props}) => {

    const handlePasswordChange = (event) => {
        props.history.push('/user/password_change')

    }


    return (

        <>
{/*
        <AutoField name="user_id" disabled={true} />
        <ErrorField name="user_id" />
*/}
        <Box display="flex" flexDirection="row">
            <Box width='25%' pr={1}>
                <AutoField name="first_name" />
                <ErrorField name="first_name" />
            </Box>
            <Box width='25%' px={1}>
                <AutoField name="last_name" />
                <ErrorField name="last_name" />
            </Box>
            <Box width='50%' pl={1}>
                <AutoField name="email" disabled />
                <ErrorField name="email" />
            </Box>
        </Box>

        <AutoField name="org_id" component={IDInputField} objectType='org' />
        <ErrorField name="org_id" />

        <Divider />

        <Box pt={3} width='100%'>
            <Button onClick={handlePasswordChange}>Change password</Button>
        </Box>


        Button: Change email
        Button: preferences
        Button: roles

        </>

    )
}

// TODO: tweak layout
const WrappedImageEdit = ({model, ...props}) => {
  
    const setAlert = useAlerts();

    const handleDownload = (event) => {
        // TODO: how to configure if don't know ahead of time the file type?
        //const config = {headers: {'Content-Type': 'application/png',}};
        callAPI('GET', `api/image/download/${model.image_id}`, {}, {responseType: 'arraybuffer'})
        .then((response) => {
            const file = new File([response.data], model.filename, {type: response.data.type});
            // Any way to get filename from the server directly, i.e. from the response?
            console.log('file=>', file);
            const url = window.URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.name);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
    }

    return (
        <>
        <Grid s={1} container direction='row'>
            <Grid item xs={9}>
                <Box display="flex" flexDirection="row">
                    <Box style={{width:'30%'}} width='30%' pr={1}>
                        <AutoField name="image_type" />
                        <ErrorField name="image_type" />
                    </Box>
                    <Box width='70%' style={{width: '70%'}} pl={1} pr={1} /* TODO: width not working? */ >
                        <AutoField name="file" component={FileInputField}
                        buttonLabel={model.filename ? 'Replace Image' : 'Select Image'}
                        filenameField='name'
                        />
                        <ErrorField name="file" />
                    </Box>
                </Box>
                <Box display="flex" flexDirection="row" pr={1}>
                    <Box width='100%' >
                        <AutoField name="name" />
                        <ErrorField name="name" />
                    </Box>
                </Box>
                <Box display="flex" flexDirection="row" pt={1} pr={1}>
                    <Box width='100%' >
                        <AutoField name="equip_id" component={IDInputField} objectType='equip' />
                        <ErrorField name="equip_id" />
                    </Box>
                </Box>
            </Grid>
            <Grid item xs={3} >
                <CardMedia 
                    style={{height: '9rem', justifyContent: 'center'}}
                    image={process.env.PUBLIC_URL + "/logo_UCLA_blue_boxed.png"}
                    alt='logo'
                    onClick={model.filename ? handleDownload : null}
                />
                {model.filename ? (
                <CardContent style={{justifyContent: 'center'}}>
                    <Typography variant="body2">Click thumbnail to download original</Typography>
                </CardContent>
                ) : ( <></> )}
            </Grid>
        </Grid>
        <Box display="flex" flexDirection="row">
            <Box width='25%' pr={1}>
                <AutoField name="exp_time" InputProps={{endAdornment:(<InputAdornment position="end">s</InputAdornment>)}}/>
                <ErrorField name="exp_time" />
            </Box>
            <Box width='25%' px={1}>
                <AutoField name="exp_temp" InputProps={{endAdornment:(<InputAdornment position="end">&deg;C</InputAdornment>)}}/>
                <ErrorField name="exp_temp" />
            </Box>
            <Box width='25%' px={1}>
                <AutoField name="captured" format="yyyy-mm-ddThh:mm:ss"/>
                <ErrorField name="captured" />
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
            </Box>
            <Box width='25%' pl={1}>
                <AutoField name="filename" disabled={true}/>
                <ErrorField name="filename" />
            </Box>

        </Box>
        
        </>
    );

}


const defaultTransform = (mode, model) => {
    if (mode === 'form') return model;
    if (mode === 'validate') return model;
    if (mode === 'submit') {
        var new_model = {}
        const omit_fields = ['owner_id', 'created', 'modified', 'is_deleted'];
        for (let key of Object.keys(model)) {
            if (!omit_fields.includes(key)) {
                new_model[key] = model[key];
            }
        }
        return new_model;
    }
}

const userTransform = (mode, model) => {
    var new_model = defaultTransform(mode, model);
    if (mode === 'form') {
        // Make a name property available
        // TODO: this doesn't seem recognized by the subtitle in the outer form...
        new_model.name = new_model.first_name + ' ' + new_model.last_name;
    }
    if (mode === 'validate') { /* Nothing to do */ }
    if (mode === 'submit') {
        delete new_model.name;
        delete new_model.password_confirm;
        delete new_model.email_confirm;
    }
    console.log(`mode: ${mode}, new model ===>`, new_model);
    return new_model;
}

//const orgTransform = (mode, model) => { return defaultTransform(mode, model) }


const ImageEdit = withRouter(connectEdit(WrappedImageEdit, 'image', imageSchema, imageValidator));
const EquipEdit = withRouter(connectEdit(WrappedEquipEdit, 'equip', equipSchema)); // equipValidator));
const OrgEdit = withRouter(connectEdit(WrappedOrgEdit, 'org', orgSchema));
const PlateEdit = withRouter(connectEdit(WrappedPlateEdit, 'plate', plateSchema));
const CoverEdit = withRouter(connectEdit(WrappedCoverEdit, 'cover', coverSchema));
const UserEdit = withRouter(connectEdit(WrappedUserEdit, 'user', userSchema, userValidator, userTransform));
const UserRegister = withRouter(connectEdit(WrappedUserRegistration, 'user', userRegistrationSchema, userValidator, userTransform));

export {
    UserEdit,
    UserRegister,
    OrgEdit,
    EquipEdit,
    PlateEdit,
    CoverEdit,
    ImageEdit,
    //AnalysisEdit,
}
