// TODO:
// * <GoogleLogin> is triggering onLoginerror at first render. Why?
// * Add exception handling on login/logout errors

import React from "react";
import { sessionLogin, sessionLogout,sessionGoogleLogin, useSessionState, useSessionDispatch } from '../contexts/session';
import { useConfigState } from '../contexts/config';
import { withRouter } from "react-router";
import { useHistory, useLocation } from 'react-router-dom';
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import GoogleLogin from 'react-google-login';
import PasswordInputField from '../components/passwordfield';

import { AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField,} from 'uniforms-mui-5';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import { useAlerts } from '../contexts/alerts';
import { useThrobber } from '../contexts/throbber';

// User Login form

const UserLogin = (props) => {

    let formRef; // use to access reset() and submit() methods...

    const history = useHistory();
    const { state } = useLocation(); // state.from contains referrer if applicable
    const setAlert = useAlerts();
    const setBusy = useThrobber();

    const [defaults, setDefaults] = React.useState( {email: '', password: '', remember: false} );

    // Connect to Auth context
    const authDispatch = useSessionDispatch();
    const { session, profile, prefs } = useSessionState(); 
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
      setBusy(true);
      let data={}
      data.tokenId = e.tokenId
      
        return await sessionGoogleLogin(authDispatch, data)
        .then( (response) => {
            if (response) {
                const url = prefs.general.redirect_after_login;    
                history.push(state?.from || url);
            }
            setBusy(false);
        });
    }
    
    async function onLogin(data, e) {

        setBusy(true);
        return await sessionLogin(authDispatch, data)
        .then( (response) => {
            if (response) {
                const url = prefs.general.redirect_after_login;
                history.push(state?.from || url);
            } else {
                setAlert({severity:'error', message:'Incorrect username and/or password'});
            }
            setBusy(false);
        });
    }

    async function onLogout(data, e) {
        setBusy(true);
        return await sessionLogout(authDispatch)
        // TODO: if received an error, where to redirect?
        .then( (response) => {
            setBusy(false);
            history.push(config.general.redirect_after_logout);
        });
    }

    const onLoginError = (e) => {
        setAlert({severity: 'error', message: 'An error occurred during the login: ' + e});
    }

    const onRegister = () => {
        // TODO: any way to pass the email address (if entered for attempted login) automatically?
        history.push('/user/register');      
    }

    const onPasswordReset = () => {
        // TODO: implement (use confirmation)
    }

    return (
        <>
        {session.auth ? (  // If logged in:
          <form onSubmit={onLogout}>
            <p>Welcome, {profile.first_name}. </p>
            <Button type="submit" variant="outlined" onClick={onLogout}>Logout</Button>
          </form>

        ) : (  // If not logged in:

          <div className="UserLoginForm" style = {{ maxWidth: '250px', margin: 'auto', }}>
            <AutoForm schema={bridge} onSubmit={onLogin} ref={ref => (formRef = ref)}>
              <Card>
              <Box maxWidth pl={1} pr={1}>
                <AutoField variant='filled' name="email" />
                <ErrorField name="email" />
              </Box>
              <Box maxWidth pl={1} pr={1}>
                <AutoField name="password" component={PasswordInputField} />
                <ErrorField name="password" />
              </Box>
              <Box maxWidth pl={1} pr={1}>
                <AutoField name="remember" />
                <ErrorField name="remember" />
              </Box>
              <SubmitField fullWidth variant='contained'>Login</SubmitField>

              <Button fullWidth variant="contained" onClick={onRegister}>Register for Account</Button>
              <Button fullWidth variant="contained" onClick={onPasswordReset}>Forgot Password</Button>
              </Card>
            </AutoForm>

          <div>
          <p>Alternatively, you can login via an external authenticator:</p>
          {true &&<GoogleLogin
            clientId={process.env.REACT_APP_GOOGLE_OAUTH_CLIENT}
            buttonText="Login"
            onSuccess={onGoogleLogin}
            onFailure={onLoginError}
            cookiePolicy={'single_host_origin'}
          />} 
          <p>TODO: we need to add a suitable registration option for this</p>
          </div>
        </div>

        )}

        </>
    );
    
}

export default withRouter(UserLogin);
