// TODO:
// * There are a few places where we need user or system preference rather than hard-coded value
// * Not yet implemented display or handling of login-errors, e.g. wrong password, etc...

import React from "react";
import { authLogin, authLogout,authGoogleLogin, useAuthState, useAuthDispatch } from '../contexts/auth';
import { useConfigState } from '../contexts/config';
import { backend_url } from './config.js';
import { withRouter } from "react-router";
import { useHistory } from 'react-router-dom';
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
//import LoadingButton from "@material-ui/lab/LoadingButton";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import GoogleLogin from 'react-google-login'

import {
  AutoForm,
  AutoField, AutoFields,
  ErrorField, ErrorsField,
  SubmitField,
} from 'uniforms-material';
//import { JSONSchemaBridge } from 'uniforms-bridge-json-schema';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
//import Ajv from 'ajv';

import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import { AlertList, Alert } from '../components/alerts';


// User Login form

const UserLogin = (props) => {

    let formRef; // use to access reset() and submit() methods...

    const history = useHistory();

    const [defaults, setDefaults] = React.useState( {email: '', password: '', remember: false} );

    // Support for 'loading' spinner while login/logout in progress
    const [loginPending, setLoginPending] = React.useState(false);
    const [logoutPending, setLogoutPending] = React.useState(false);

    // Connect to Auth context
    const authDispatch = useAuthDispatch();
    const session = useAuthState(); // provides a dictionary containing auth, authUser, loading, error, errorMessage, prefs
    const config = useConfigState();

    // Schema for automated form

    const schema = new SimpleSchema ({
      email: {
        label: 'Email',
        type: String,
        //defaultValue: '',
        required: true,
        regEx: SimpleSchema.RegEx.EmailWithTLD,
      },
      password: {
        label: 'Password',
        type: String,
        //defaultValue: '',
        required: true,
        uniforms: {
          type: 'password',
        }
      },
      remember: {
        label: 'Remember Me',
        type: Boolean,
        defaultValue: false,
      }
    })
    var bridge = new SimpleSchema2Bridge(schema);

    // Handlers
    async function onGoogleLogin(e) {
      console.log(e)
      setLoginPending(true);
      let data={}
      data.tokenId = e.tokenId
      
        return await authGoogleLogin(authDispatch, data)
        .then( (response) => {
            if (response) {
                const url = session.prefs['general']['redirect_after_login'];    
                history.push(url); 
            }
            setLoginPending(false);
        });
    }
    
    async function onLogin(data, e) {

        //console.log('session value is: =>', session);
        //console.log("UserLogin form submit: data => ", data);

        setLoginPending(true);
        return await authLogin(authDispatch, data)
        .then( (response) => {
            if (response) {
                const url = session.prefs['general']['redirect_after_login'];    
                history.push(url); 
            }
            setLoginPending(false);
        });
    }

    async function onLogout(data, e) {
        setLogoutPending(true);
        return await authLogout(authDispatch)
        // TODO: if received an error, where to redirect?
        .then( (response) => {
            // TODO: doesn't log output, but the redirect appears to be okay...
            //console.log ('here, config state is =>', config);
            setLogoutPending(false);
            history.push(config['general']['redirect_after_logout']);
        });
    }

    const onRegister = () => {
        // TODO: any way to pass the email address automatically?
        history.push('/user/register');      
    }

    return (
        <>
        

        {session['auth'] ? (  // If logged in:
          <form onSubmit={onLogout}>
            <p>Welcome, {session['authUser']['first_name']}. </p>
            <Button type="submit" variant="outlined" onClick={onLogout}>{logoutPending ? (<CircularProgress/>) : null}Logout</Button>
          </form>

        ) : (  // If not logged in:
        <div>
        <div className="UserLoginForm" style = {{ maxWidth: '250px', margin: 'auto', }}>
        <AutoForm schema={bridge} onSubmit={onLogin} ref={ref => (formRef = ref)}>
          <AutoField name="email" />
          <ErrorField name="email" />
          <AutoField name="password" />
          <ErrorField name="password" />
          <AutoField name="remember" />
          <ErrorField name="remember" />
          <SubmitField>Login</SubmitField>

          <Button fullWidth variant="outlined" onClick={onRegister}>Register for Account</Button>

        </AutoForm>

          <div>
          <p>Alternatively, you can login via an external authenticator:</p>
            {true &&<GoogleLogin
              clientId={process.env.REACT_APP_GOOGLE_OAUTH_CLIENT}
              buttonText="Login"
              onSuccess={onGoogleLogin}
              onFailure={Alert('An Error Has Occurred in the Login')}
              cookiePolicy={'single_host_origin'}
            />} 
          <p>TODO: we need to add a suitable registration option for this</p>
          </div>
        </div>
        </div>

        )}
        </>
    );
    
}

export default withRouter(UserLogin);
