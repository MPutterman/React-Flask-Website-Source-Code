// TODO:
// * There are a few places where we need user or system preference rather than hard-coded value
// * Not yet implemented display or handling of login-errors, e.g. wrong password, etc...

import React from "react";
import { authLogin, authLogout, useAuthState, useAuthDispatch } from '../contexts/auth';
import { useConfigState } from '../contexts/config';
import backend_url from './config.js';
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

import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import { AlertList, Alert } from '../components/alerts';


// User Login form
const UserLogin = (props) => {

    const history = useHistory();

    // Support for 'loading' spinner while login/logout in progress
    const [loginPending, setLoginPending] = React.useState(false);
    const [logoutPending, setLogoutPending] = React.useState(false);

    // Connect to Auth context
    const authDispatch = useAuthDispatch();
    const session = useAuthState(); // provides a dictionary containing auth, authUser, loading, error, errorMessage, prefs
    const config = useConfigState();


    // Form hooks
    // mode is the render mode (both onChange and onBlur)
    // defaultValues defines how the form will be 'reset'. Fill back in with retrieved user info
    const {handleSubmit, control} = useForm({mode: 'all'}); 

    // Handlers

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

          <div className="UserLoginForm" style = {{ maxWidth: '250px', margin: 'auto', }}>

            {session['auth'] ? (  // If logged in:
              <form onSubmit={handleSubmit(onLogout)}>
                <p>Welcome, {session['authUser']['first_name']}. </p>
                <Button type="submit" variant="outlined" onClick={onLogout}>{logoutPending ? (<CircularProgress/>) : null}Logout</Button>
              </form>

            ) : (
              <form onSubmit={handleSubmit(onLogin)}> 

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
                  type="password"
                  rules= {{
                    required: {value:true, message:"Password is required"},
                  }}
                  render={({field, fieldState, formState}) =>
                  <TextField
                    label="Password:"
                    helperText={formState.errors.last_name ? formState.errors.last_name.message : ''}
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

                <FormGroup>
                <FormControlLabel
                  control={<Checkbox
                    name="remember"
                  />}
                  label="Remember Me"
                />
                </FormGroup>

                <Button fullWidth type="submit" variant="outlined">{loginPending ? (<CircularProgress/>) : null}Login</Button>

                <Button fullWidth variant="outlined" onClick={onRegister}>Register for Account</Button>

               </form>
            )}

          </div>
    );
    
}

export default withRouter(UserLogin);
