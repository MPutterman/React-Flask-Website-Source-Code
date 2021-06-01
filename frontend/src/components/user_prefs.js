// TODO:
// For each preference, may be useful to store not only category and key and default value,
// but also datatype, description, to help automatically build a form.

// QUESTION: is it okay if when save preferences, that ALL prefs save.  Or
// do we want the ability for a user to leave something 'blank' (e.g. the default temperature)??

import React from "react";
import axios from "axios";
import * as FormData from "form-data";
import backend_url from './config.js';
import { withRouter } from "react-router";
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import Grid from "@material-ui/core/Grid";
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import FormGroup from "@material-ui/core/FormGroup";
import TextField from "@material-ui/core/TextField";
import Checkbox from "@material-ui/core/Checkbox";
import { useAuthState, useAuthDispatch, defaultPrefs } from '../contexts/auth';

// TODO: need to run: npm install @material-ui/lab
import { AlertList, Alert } from '../components/alerts';

// User Preferences form
// Uses the database, not the session to retrieve and save preferences
// Can get here with props.match.param.id, or blank.  If blank, get user_id from the session

export const preferences = {
    general: {
        redirect_after_login: {
            description: 'Redirect after login (relative URL)',
            type: 'textfield',
            default: '/user/login',
        },
    },
    analysis: {
        default_equipment_id: {
            description: 'Default equipment ID for new analysis',
            type: 'select',
            select: 'equipment_selector',
            default: None,
        },
        default_exposure_time: {
            description: 'Default exposure time (s) for new analysis',
            type: 'number',
            default: None,
        },
        default_exposure_temp: {
            description: 'Default exposure temperature (C) for new analysis',
            type: 'number',
            default: None,
            // Warn if equipment doesn't support cooling?
        }

        //default_bright_image_exposure_time: '',   // OMIT FOR NOW
        //default_bright_image_exposure_temp: '',   // OMIT FOR NOW
        default_use_flat_correction: true,        
        default_flat_image_id: null,              // image_id
        default_use_dark_correction: true,
        default_dark_image_id: null,              // image_id
        default_plate_id: null,                   // plate_id
        default_cover_id: null,                   // cover_id
        favorite_plate_id: null,                  // list of plate_ids
        favorite_cover_id: null,                  // list of cover_ids
        default_background_correction: 'linear',  // enum: (none | linear | quadratic | ...)
        default_filter_correction: '3x3 median',  // enum: (none | 3x3 median | ...)
    },
}

const UserPrefs = (props) => {

    const session = useAuthState();
    const dispatch = useAuthDispatch();

    const initialUserPrefs = {};

    const [loaded, setLoaded] = React.useState('false');
    const [userPrefs, setUserPrefs] = React.useState(initialUserPrefs);
    //const [currentUser, setCurrentUser] = React.useState(initialUserState);
    const [message, setMessage] = React.useState('');
    const [availableOrganizations, setAvailableOrganizations] = React.useState([]);
    // TODO: add available images, etc...

    // Form hooks
    // mode is the render mode (both onChange and onBlur)
    // defaultValues defines how the form will be 'reset'. Fill back in with retrieved user info
    const {handleSubmit, reset, control} = useForm({mode: 'all', defaultValues: currentUser}); 

    // Actions when form is submitted
    // TODO: need to handle other types of submit, e.g. delete?
/*
    const onSubmit = (data, e) => {
      //console.log("UserEdit form submit: data => ", data);
      updateUser(data)
      // Temporary... after saving, re-retrieve the user to change currentUser and trigger useEffect
      // so cancel will now revert to the last saved value
      getUser(data.user_id)
    };
*/  
    async function getUserPrefs(id) {
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
    // Retrieve list of available organizations (for now all organizations)
    async function getOrganizations() {
        axios.get(backend_url('organization/search'))
        .then((response) => {
            setAvailableOrganizations(response.data);
            console.log("in getOrganizations: response data => ", response.data);
        })
        .catch((e) => {
            console.error("GET /organization/search: " + e);
        });
    }

    // Call this upon first value of props.match.params.id (should only run once)
    React.useEffect(() => {
        console.log("In useEffect #1"); // currentUser and availableOrganizations are updated asynchronously
        getUser(props.match.params.id);
        getOrganizations();
    }, [props.match.params.id]);

    // This second useEffect is triggered whenever 'currentUser' changes (i.e. after loading from database).
    // When triggered, it sets the defaultValues of the form to currentUser, then triggers the form to reset.
    // This causes the form fields to fill in with the newly retrieved data in currentUser.
    // TODO: for some reason if I try to put reset(currentUser) in the getUser function it doesn't
    // properly reset the form...
    React.useEffect(() => {
        console.log("In useEffect #2 => ", currentUser); //initUser);
        reset(userPrefs);
    }, [userPrefs]);


    const onReset = () => {
        //console.log("In resetUser: currentUser => ", currentUser);
        reset(currentUser);

    }

    // Save the user information back to the database
    async function savePrefs(data) {
        var formData = new FormData();
        var prefs = {};
        // TODO: assemble into dictionary
        for category in defaultPrefs {
            for key in defaultPrefs[category] {
                // Check if empty?????
                prefs[category][key] = data.{category + ':' + key};
            }
        }
        formData.append('user_id', data.user_id);
        formData.append('first_name', data.first_name);
        formData.append('last_name', data.last_name);
        formData.append('email', data.email);
        formData.append('password', data.password);
        formData.append('org_list', data.org_list);

        const config = {     
            headers: { 'content-type': 'multipart/form-data' }
        }

        setLoading(true);
        return axios.post(backend_url('user/save'), formData, config)
        .then((response) => {
            console.log(response.data);
            setMessage("success");
            setCurrentUser(response.data);
            reset(currentUser);
            setLoading(false);
        })
        .catch((e) => {
            console.log("POST /user/save: " + e);
            setLoading(false);
        });
    }

    // Delete the user matching the user-id
    // NOT YET FUNCTIONAL AND BACKEND NOT IMPLEMENTED (add a status message when implement this)
    const deleteUser= () => {
        axios.post(backend_url('user/delete/' + currentUser.id))
        .then((response) => {
            console.log(response.data);
            props.history.push('/user/search');  // Does this make sense to go here after?
        })
        .catch((e) => {
            console.log("POST /user/delete/" + currentUser.id + ": " + e);
        });
    }    

    // Returns how to rener the form

    return (

          <div className="UserPreferencesForm" style={{ maxWidth: '350px',}}>

              {loading ? (<><p>Loading... </p><CircularProgress/></>) : (
            
              <form onSubmit={handleSubmit(onSubmit)} onReset={onReset}> 

              <h1>General settings</h1> {/* Category: general */}

              <Grid container direction="row" xs={12}>

                <Grid item>
                  Redirect after login  {/* Key: redirect_after_login */}
                </Grid>
                <Grid item>
                  redirect_after_login


                // TODO: list as a grid, but grouped by categories
                // Show key, description, current value (or default), 
                ///// if a simple text type, allow direct editing...
                ///// for enum types, used radio buttons or single-selector dropdown
                ///// for id types, click button to choose...?

                /// Save button (save all).... QUESTION: what about values not specified?
                ////////   save the defaults? YES,  Might as well, that's how the defaults are
                ////////   used, i.e. it fills in when preference is missing

                /// Cancel button (reset from database)
                /// Reset defaults (reset from defaults)

                <Controller
                  control={control}
                  name="first_name"
                  rules= {{
                    required: {value:true, message:"First name is required"},
                      // Other types of validators:
                      // minLength: {value: 3, message:"Minimum name length is 3"},
                      // validate: ()=>{return getValues("name") === "bill";}
                      // validate: {value: ()=>{return getValues("name") === "bill";} , message: "Name must be bill"},
                  }}
                  render={({field, fieldState, formState}) => 
                  <TextField
                    label="First name:"
                    helperText={formState.errors.first_name ? formState.errors.first_name.message : ''}
                    autoComplete="given-name"
                    placeholder="First name"
                    fullWidth
                    variant='outlined'
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    value = {field.value}
                    error={Boolean(fieldState.error)}
                  />
                  }
                />

                <Controller
                  control={control}
                  name="last_name"
                  rules= {{
                    required: {value:true, message:"Last name is required"},
                  }}
                  render={({field, fieldState, formState}) =>
                  <TextField
                    label="Last name:"
                    helperText={formState.errors.last_name ? formState.errors.last_name.message : ''}
                    autoComplete="family-name"
                    placeholder="Last name"
                    fullWidth
                    variant='outlined'
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    value = {field.value}
                    error={Boolean(fieldState.error)}
                  />
                  }
                />

                <Controller
                  control={control}
                  name="email"
                  rules= {{
                    required: {value:true, message:"Email is required"},
                    pattern: {value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address"},
                  }}
                  render={({field, fieldState, formState}) =>
                  <TextField
                    label="Email address:"
                    helperText={formState.errors.email ? formState.errors.email.message : ''}
                    autoComplete="email"
                    placeholder="Email address"
                    fullWidth
                    variant='outlined'
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    value = {field.value}
                    error={Boolean(fieldState.error)}
                  />
                  }
                />

                <Controller
                  control={control}
                  name="password"
                  rules= {{
                    required: {value:true, message:"Password is required"},
                    // TODO: add some rules for strictness
                  }}
                  render={({field, fieldState, formState}) =>
                  <TextField
                    label="Password:"
                    helperText={formState.errors.password ? formState.errors.password.message : ''}
                    autoComplete="password"
                    placeholder="Password"
                    fullWidth
                    variant='outlined'
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    value = {field.value}
                    error={Boolean(fieldState.error)}
                  />
                  }
                />


                {/* TODO: This element is not well-rendered. Need to look into better Material-UI options.
                    TODO: helperText doesn't work with grouped elements. Not to explore best practices here for displaying errors.  */}
                <Controller
                  control={control}
                  name="org_list"
                  rules= {{
                  }}
                  render={({field, fieldState, formState}) =>
                  <>
                  <InputLabel>Organization</InputLabel>
                  <Select
                    label="Organization:"
                    multiple
                    //helperText={formState.errors.orgList ? formState.errors.orgList.message : ''}
                    autoComplete="organization"
                    placeholder="Select your organization(s)"
                    variant='outlined'
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    value = {field.value}
                    error={Boolean(fieldState.error)}
                  >
                  <MenuItem disabled value=''>Select your organization(s)</MenuItem>
                  {
                    // Dynamically generate the list of organizations
                    availableOrganizations ? availableOrganizations.map(org => (
                      <MenuItem value={org.org_id}>{org.name}</MenuItem>
                    ))
                    : null
                  }
                  </Select>
                  </>
                  }
                />
                <br/>

                <Button fullWidth variant='outlined' type="link">Add New Organization (not yet working)</Button>
                <br/>

                <Button fullWidth variant='outlined' type="submit" >Save Changes</Button>
                <Button fullWidth variant='outlined' type="reset"> Cancel</Button>
                <Button fullWidth variant='outlined' type="delete" >Delete (not yet working)</Button>

                {message ? ( 

                  <>
                  <p>{message}</p>

                  <AlertList />
                  {message === 'success' ? (
                    <Alert severity="success">User successfully updated</Alert>
                  ) : (
                    <Alert severity="error">Something went wrong</Alert>
                  )}
                  </>
                ):( <></>
                )}

               </form>
              )}
          </div>
        );
    
}

export default withRouter(UserEdit);
