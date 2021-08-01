// TODO:
// * Check backend, make sure when run user/save that it is properly updating the session data
// * In backend, make sure to redo all validation checks (e.g. unique email, etc...)
// * I want to hide password (if not on registration), 
//    But then there is a validation error... even if the fields are omitted from being displayed
// * Divide into toplevel form (exported with withRouter), and a modal form
// * Temporarily added a props.admin to show/edit the password.  Need to make sure user_save behaves properly
//    without the password field showing.  The 'props.admin' will later be replaced by a
//    roles/permission system.
// * Figure out how to deal with users that use external (googleAuth or other) login
//    - Do we allow multiple authentication methods?
//    - We need to register them, but do we take them to normal registration page (that asks for password)
//        or a special one that just grabs email (and maybe asks for name)?
// * Currently using this page for new user registration. In practice probably want a multi-step verification
// * Add show/hide toggle to password field?
// * Need to improve changing of password, maybe as a separate form with more authentication checks (fresh login),
//   and require successful entry of previous password.  Also a 'forgot password' functionality is needed.
// * PERHAPS, if user_id is not valid (i.e. registering), then show passwords,
//   otherwise omit these fields... and have a special change password form....
// * There is a bug... after successful save, it shows validation error (email already exists)... as soon as
//    edit another field, it's fine... somehow need to trigger validate to clear it?
// * DISABLE DELETE if id not yet defined....

import React from "react";
import { callAPI } from './api';
import { withRouter } from "react-router";
import Button from "@material-ui/core/Button";
import Box from '@material-ui/core/Box';
import { useAuthState, useAuthDispatch, authRefreshSession } from "../contexts/auth";
import { useErrorResponse } from '../contexts/error';
import { StatusCodes } from 'http-status-codes';
import { useAlerts } from '../contexts/alerts';
import { useConfirm } from 'material-ui-confirm';
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField,} from 'uniforms-material';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import Busy from '../components/busy';
import NotFound from '../components/notfound';

// User Edit form
// Special props:
// - register - any value if desire to render as a new user registration form
// - object_id - user id (if empty, create a new user)
// - new      - force to create a new user (ignore any props.match.params.id) // temporary fix with multiple components loaded
// - onSave   - callback function called with model as argument after ID becomes valid
//                (sends back 'id' and 'name' keys)
const UserEdit = (props) => {

    let formRef;
    const object_type = 'user';

    const session = useAuthState();
    const dispatch = useAuthDispatch();
    const setAlert = useAlerts();
    const setErrorResponse = useErrorResponse();
    
    const confirm = useConfirm();

    const initialModel = {
        user_id: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirm: '',
        org_list: [],
    };

    const [busy, setBusy] = React.useState(false);
    const [model, setModel] = React.useState(initialModel);
    const [availableOrganizations, setAvailableOrganizations] = React.useState([]);

    const hasPermissionView = () => {
        return true;
    }

    const hasPermissionEdit = () => {
        // TODO: include admin as well...
        return true;// session.authUser.user_id == model.owner_id || props.new;
    }

    const hasPermissionDelete = () => {
        return true; // session.authUser.user_id == model.owner_id;
    }

    const enableDelete = () => {
        return !!model.user_id;
    }

    // Actions when form is submitted
    // TODO: need to handle other types of submit, e.g. delete?
    async function onSubmit(data, e)  {
      save(data);
    }
    
    // Retrieve user with specified id from the database
    // TODO: Error handling if user is not found... need to redirect to not found page
    async function load(id) {
        if (id) {
            setBusy(true);
            callAPI('GET', 'user/load/' + id)
            .then((response) => {

              if (response.error) {

                // TODO: handle some specific errors (e.g. unauthorized) or add error details?
                setErrorResponse({code: response.status, details: response.data.error ? response.data.error : '' });
                setBusy(false);
                return false;

              } else {

                setModel(response.data);
                setBusy(false);
                return true;
              
              }

            });
        }
        return true;
    }

    // Retrieve list of available organizations (for now all organizations)
    // TODO: add error handling...
    async function loadOrganizations() {
        callAPI('GET', 'organization/search')
        .then((response) => {
            setAvailableOrganizations(response.data);
            console.log("in loadOrganizations: response data => ", response.data);
        })
        .catch((e) => {
            console.error("GET /organization/search: " + e);
        });
    }

    React.useEffect(() => {
        console.log("In useEffect, change of [props.new, props.object_id, or props.match.params.id]");
        var id = null;
        if (props.new) {
          id = null;
        } else if (props.object_id) {
          id = props.object_id;
        } else if (props.match.params.id) {
          id = props.match.params.id;
        }
        // Check permission
        callAPI('GET', `api/permission/edit/user/${id}`)
        .then((response) => {
            if (response.data.authorized === true) {
                load(id);
                loadOrganizations();
            } else {
                setErrorResponse({code: StatusCodes.FORBIDDEN, details: 'Not Authorized' });
            }
        }); // TODO: catch exception?
    }, [props.new, props.object_id, props.match.params.id]);

    // TODO: improve this... this is used in IDInputField to feedback 'name' in addition to the ID
    //   for newly created items.  Need a uniform way of doing this across all objects, both for 'edit' and 'select' forms...
    // Hack to implement an 'onSave'
    React.useEffect(() => {
        if (model.user_id && props.onSave) {
          props.onSave({...model,
            id: model.user_id,
            name: model.first_name + ' ' + model.last_name,
          });
        } else if (model.user_id) {
          setAlert({severity:'error', message:'TO FIX: dont change URL when changing password'});
          props.history.replace('/user/edit/' + model.user_id);
        }

    }, [model.user_id])

    // Save the user information back to the database
    async function save(data) {
        // TODO: need to filter anything out of 'data'?
        setBusy(true);
        return callAPI('POST', 'user/save', data)
        .then((response) => {
            console.log(response.data);
            setAlert({severity: 'success', message: 'User saved successfully'});
            setModel(response.data);
            setBusy(false);
        })
        .then(() => {
            authRefreshSession(dispatch);
        })

        .catch((e) => {
            console.log("POST /user/save: " + e);
            setBusy(false);
        });
    }

    // Delete the user matching the user-id
    // NOT YET FUNCTIONAL AND BACKEND NOT IMPLEMENTED (add a status message when implement this)
    const remove = () => {
        setAlert({severity: 'error', message: 'Delete function not yet implemented'});
        confirm ({/*title:<title>, description:<description>*/})
        .then(() => {
            callAPI('POST', 'user/delete/' + model.id)
            .then((response) => {
                console.log(response.data);
                props.history.push('/user/search');  // Does this make sense to go here after?
            })
            .catch((e) => {
                console.log("POST /user/delete/" + model.id + ": " + e);
            });
        })
        .catch(() => {});
    }    

    // Schema for form
    // NOTE: Good docs here: https://github.com/longshotlabs/simpl-schema 
    // that describe special validation (e.g. passwordMistmatch) and customized error messages

    const schema = new SimpleSchema ({
      user_id: {
        label: 'ID',
        type: Number, // TODO: change to integer type
        required: false,
      },
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

    // Asynchronous validation check (to see if email is unique)
    async function onValidate(model, error) {

        // Do backend validation, but only if user_id is not defined (i.e. new user), and
        // email address is provided
        console.log ('model =>', model);
        if (error) console.log ('error.details =>', error.details);
        if (!model.user_id && model.email) { 
            return callAPI('POST', 'api/user/exists', model)
            .then((response) => {
                if (response.data.exists) {
                    if (!error) error = {errorType: 'ClientError', name: 'ClientError', error: 'validation-error', details: [], };
                    error.details.push({name: 'email', value: model.email, type: 'custom', message: 'An account with this email address already exists'});
                    return error;
                } else {
                    return error;
                }
            })
            .catch((e) => {
                if (!error) error = {errorType: 'ClientError', name: 'ClientError', error: 'validation-error', details: [], };
                error.details.push({name: 'email', value: model.email, type: 'custom', message: 'Server error. Could not check for duplicate email'});
                return error;
            });
            // TODO: Handle the reject case? doesn't seem handled by Uniforms...

        } else {
            return error;
        }
    }


    return (

          <div className="UserEditForm" style={{ margin: 'auto', maxWidth: '350px',}}>

            <Busy busy={busy} />


            {props.register ? (<p>New user registration</p>) : (<></>)}
            {props.change_password ? (<p>Change password</p>) : (<></>)}

            <AutoForm
              schema={bridge}
              onSubmit={onSubmit}
              ref={ref => (formRef = ref)}
              model={model}
              onValidate={onValidate}
            >
              <AutoField name="user_id" disabled={true} />
              <ErrorField name="user_id" />
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

              <Box py={2} display="flex" flexDirection="row" justifyContent="flex-end">
                  <Box pr={1}>
                  <SubmitField variant='contained'>Save Changes</SubmitField>
                  </Box>
                  <Box pl={1} pr={1}>
                  <Button variant='contained' type="reset" onClick={() => formRef.reset()}>Cancel</Button>
                  </Box>
                  <Box pl={1}>
                  <Button disabled={!(enableDelete() && hasPermissionDelete())} variant='contained' type="delete" onClick={remove}>Delete (not working)</Button>
                  </Box>
              </Box>

            </AutoForm>

          </div>
        );
    
}

export default withRouter(UserEdit);
