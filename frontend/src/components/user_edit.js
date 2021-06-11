// TODO:
// * I want to hide password (if not on registration), 
//    But then there is a validation error... even if the fields are omitted from being displayed
// * Rename as 'model, setModel' so all forms more alike?
// * Divide into toplevel form (exported with withRouter), and a modal form
// * Temporarily added a props.admin to show/edit the password.  Need to make sure user_save behaves properly
//    without the password field showing.  The 'props.admin' will later be replaced by a
//    roles/permission system.
// * Need to do some error checking to avoid duplicate accounts with same email address. Duplicates break
//   retrieval from database. Add a front-end method just to check of existence of ID
// * Figure out how to deal with users that use external (googleAuth or other) login
//    - Do we allow multiple authentication methods?
// * Currently using this page for new user registration. In practice probably want a multi-step verification
// * Add show/hide toggle to password field?
// * Need to improve changing of password, maybe as a separate form with more authentication checks (fresh login),
//   and require successful entry of previous password.  Also a 'forgot password' functionality is needed.
// * PERHAPS, if user_id is not valid (i.e. registering), then show passwords,
//   otherwise omit these fields... and have a special change password form....
// * TODO: figure out if still need all the reset-related form hooks, etc...

import React from "react";
import { callAPI } from './api.js';
import { withRouter } from "react-router";
import { useParams } from 'react-router-dom';
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import { spacing } from '@material-ui/system';
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField,} from 'uniforms-material';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import Busy from '../components/busy';
import { AlertList, Alert } from '../components/alerts';
import jwt_decode from "jwt-decode";
import NoMatch from '../components/nomatch';

// User Edit form
// Special props:
// - register - any value if desire to create a new user registration form
// - id       - user id (if empty, create a new user)
// - new      - force to create a new user (ignore any props.match.params.id) // temporary fix with multiple components loaded
// - onSave   - callback function called with model as argument after ID becomes valid
//                (sends back 'id' and 'name' keys)
const UserEdit = (props) => {

    let formRef;

    const initialUserState = {
        user_id: null,
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirm: '',
        org_list: [],
    };

    const [loading, setLoading] = React.useState('false');
    const [currentUser, setCurrentUser] = React.useState(initialUserState);
    const [alert, setAlert] = React.useState({});
    const [availableOrganizations, setAvailableOrganizations] = React.useState([]);

    // Form hooks
    // mode is the render mode (both onChange and onBlur)
    // defaultValues defines how the form will be 'reset'. Fill back in with retrieved user info
    const {handleSubmit, reset, control} = useForm({mode: 'all', defaultValues: currentUser}); 

    // Actions when form is submitted
    // TODO: need to handle other types of submit, e.g. delete?
    async function onSubmit(data, e)  {
      saveUser(data);
    };
    
    // Check whether email exists
    // TODO: test
    async function emailExists(email) {
      // TODO: implement
    }

    // Retrieve user with specified id from the database
    // TODO: Error handling if user is not found... need to redirect to not found page
    async function loadUser(id) {
        setLoading(true);
        if (id) {
            callAPI('GET', 'user/load/' + id)
            .then((response) => {
                setCurrentUser(response.data);
                setLoading(false);
            })
            .catch((e) => {
                console.error("GET /user/edit/" + id + ": " + e);
                // TODO: replace this with an error 404 message
                setAlert({severity: 'error', message: "Could not load user with id: " + id});
                setLoading(false);
                return(<NoMatch/>); // TODO: this doesn't work... how to return it
                // See here for others asking about this
                // https://stackoverflow.com/questions/41773406/react-router-not-found-404-for-dynamic-content
                // Rename it to 'NotFound'??
            });
        } else {
            setLoading(false);
        }
    }

    // Retrieve list of available organizations (for now all organizations)
    async function getOrganizations() {
        callAPI('GET', 'organization/search')
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
        // if props.new is set, force this to be a fresh user
        loadUser(props.new ? null : props.match.params.id);
        getOrganizations();
    }, [props.match.params.id]);

    // This second useEffect is triggered whenever 'currentUser' changes (i.e. after loading from database).
    // When triggered, it sets the defaultValues of the form to currentUser, then triggers the form to reset.
    // This causes the form fields to fill in with the newly retrieved data in currentUser.
    // TODO: for some reason if I try to put reset(currentUser) in the loadUser function it doesn't
    // properly reset the form...
    React.useEffect(() => {
        console.log("In useEffect #2 => ", currentUser); //initUser);
        reset(currentUser);
    }, [currentUser]);


    // Hack to implement an 'onSave'
    React.useEffect(() => {
        if (props.onSave) {
          props.onSave({...currentUser,
            id: currentUser.user_id,
            name: currentUser.first_name + ' ' + currentUser.last_name,
          });
        }
    }, [currentUser.user_id])



    const onReset = () => {
        //console.log("In resetUser: currentUser => ", currentUser);
        reset(currentUser);

    }

    // Save the user information back to the database
    async function saveUser(data) {
        // TODO: need to filter anything out of 'data'?
        setLoading(true);
        return callAPI('POST', 'user/save', data)
        .then((response) => {
            console.log(response.data);
            setAlert({severity: 'success', message: 'User saved successfully'});
            setCurrentUser(response.data);
            reset(currentUser); // set form with current value so reset won't revert
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
        setAlert({severity: 'error', message: 'Delete function not yet implemented'});
        callAPI('POST', 'user/delete/' + currentUser.id)
        .then((response) => {
            console.log(response.data);
            props.history.push('/user/search');  // Does this make sense to go here after?
        })
        .catch((e) => {
            console.log("POST /user/delete/" + currentUser.id + ": " + e);
        });
    }    

    // Schema for form
    // NOTE: Good docs here: https://github.com/longshotlabs/simpl-schema 
    // that describe special validation (e.g. passwordMistmatch) and customized error messages

    const schema = new SimpleSchema ({
      email: {
        label: 'Email',
        type: String,
        //defaultValue: '',
        required: true,
        regEx: SimpleSchema.RegEx.EmailWithTLD,
      },
      first_name: {
        label: 'First Name',
        type: String,
        required: true,
      },
      last_name: {
        label: 'Last Name',
        type: String,
        required: true,
      },
      password: {
        label: 'Password',
        type: String,
        required: true,
        uniforms: {
          type: 'password',
        }
      },
      password_confirm: {
        label: 'Confirm Password',
        type: String,
        required: true,
        uniforms: {
          type: 'password',
        },
        custom() {
          if (this.value !== this.field("password").value) {
            return "Passwords must match";
          }
        },
      },
      org_list: {
        label: 'Organization List',
        type: Array,
        // TODO: Need to figure out how to have 'allowedValues' here, but 
        // since it is async retrieved the validator is created with outdated version
        //allowedValues: availableOrganizations ? availableOrganizations.map(x => (x.org_id)) : [], // make an array of org_ids
        required: false,
        // TODO: how to add a label like "Select your organization(s)"?
        // Tried adding an extra entry with label and null value(key) but didn't work...
        uniforms: {
          checkboxes: false,
          options: availableOrganizations ? availableOrganizations.map((x) => ({label:x.name, value:x.org_id})) : [],
        }
      },
      // NOTE: org_id is an array of integers, but with the request/responses, easiest to keep as strings
      'org_list.$': {
        type: SimpleSchema.Integer,
      }
    });

// TODO: should put message above as 'passwordMismatch', but seems i would have
// to then define all the messages here...
//    SimpleSchema.messageBox.messages({
//      en: {
//        passwordMismatch: "Passwords must match",
//      },
//    });

    var bridge = new SimpleSchema2Bridge(schema);


    return (

          <div className="UserEditForm" style={{ maxWidth: '350px',}}>

            <Busy busy={loading} />


            {props.register ? (<p>New user registration</p>) : (<></>)}
            {props.change_password ? (<p>Change password</p>) : (<></>)}

            <AutoForm
              schema={bridge}
              onSubmit={onSubmit}
              ref={ref => (formRef = ref)}
              model={currentUser}
            >
              <AutoField name="first_name" />
              <ErrorField name="first_name" />
              <AutoField name="last_name" />
              <ErrorField name="last_name" />
              <AutoField name="email" />
              <ErrorField name="email" />
{/*

              {props.register || props.change_password ? ( 
              <>
*/}
              <AutoField name="password" />
              <ErrorField name="password" />
              <AutoField name="password_confirm" />
              <ErrorField name="password_confirm" />
{/*
              </>
              ) : (<></>)}
*/}
              <AutoField name="org_list" />
              <ErrorField name="org_list" />
              <SubmitField>Save Changes</SubmitField>

              <Button fullWidth variant='outlined' type='reset' onClick={() => formRef.reset()}>Cancel</Button>
              <Button fullWidth variant='outlined' type="delete" >Delete (not yet working)</Button>

            </AutoForm>

            <AlertList alert={alert} />

          </div>
        );
    
}

export default withRouter(UserEdit);
