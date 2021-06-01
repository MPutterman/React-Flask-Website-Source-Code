// CREDITS and RESOURCES:
// The following links provided a lot of good ideas how to implement authentication.
// * https://marmelab.com/react-admin/Authentication.html
// * https://kentcdodds.com/blog/authentication-in-react-applications (nice thoughts on keep separate the public and authenticated sites)
// * https://soshace.com/react-user-login-authentication-using-usecontext-and-usereducer/ (most of initial code design was from here)
// * https://medium.com/@thanhbinh.tran93/private-route-public-route-and-restricted-route-with-react-router-d50b27c15f5e (more thoughts on private routes)

// TODO:
// * Still considering what is the best way to handle unexpected login or logout errors. 
//   Maybe it is safer just to reload the session from backend server, rather than try to
//   guess the actual state.  Doing so would greatly simplify the code here and have only minor
//   performance impact (only when logging in or out)
// * Initialization of initial state via unconstrained useEffect is very inefficient. Need to
//   fix so it only loads at startup, possibly re-read after login/logout...


import React, { useReducer, useEffect } from "react";
import axios from "axios";
import FormData from "form-data";
import { backend_url } from "../components/config"; // TODO: move this file

// Create contexts and hooks

const AuthStateContext = React.createContext();
const AuthDispatchContext = React.createContext();

export function useAuthState() {
  const context = React.useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error("useAuthState must be used within a AuthProvider");
  }
  return context;
}
 
export function useAuthDispatch() {
  const context = React.useContext(AuthDispatchContext);
  if (context === undefined) {
    throw new Error("useAuthDispatch must be used within a AuthProvider");
  }
  return context;
}

// Provider component

export const AuthProvider = ({ children }) => {

    const [session, dispatch] = useReducer(AuthReducer, initialState);

    // Initialize the auth state from the server
    // (Note functional components don't have componentDiDmount, etc...)
    useEffect(() => {
        loadSessionFromServer(dispatch); 
    }, []); 

    return (
        <AuthStateContext.Provider value={session}>
            <AuthDispatchContext.Provider value={dispatch}>
                {children}
            </AuthDispatchContext.Provider>
        </AuthStateContext.Provider>
    );
};

// Reducer component

export const defaultPrefs = {
    general: {
        redirect_after_login: '/',                 // relative url
    },
    analysis: {
        default_equipment_id: null,               // equip_id
        default_exposure_time: null,              // seconds
        default_exposure_temp: null,              // degrees C
        default_flat_image_id: null,              // image_id
        default_dark_image_id: null,              // image_id
        default_plate_id: null,                   // plate_id
        default_cover_id: null,                   // cover_id
        default_background_correction: 'linear',  // enum: (linear | quadratic | ...)
        default_filter: '3x3 median',             // enum: (3x3 median | ...)
    },
}

export const initialState = { // This is the session info provided to child components
  auth: false,
  authUser: null,  
  loaded: false,
  error: false,
  errorMessage: '',
  prefs: defaultPrefs,
};

export const AuthReducer = (initialState, action) => {

  let user = null;
  let userPrefs = {};
  let prefs = {};

  switch (action.type) {

    case "REQUEST_SESSION":
      return {
        ...initialState,
        loaded: false,
        error: false,
        errorMessage: '',
      }

    case "SESSION_ERROR":
      return {
        ...initialState,
        loaded: false,
        error: true,
        errorMessage: action.error,
      }

    case "SESSION_LOADED":
      user = action.payload.user;
      userPrefs = action.payload.prefs;
      prefs = defaultPrefs;
      for (const category in userPrefs) {
        for (const key in userPrefs[category]) {
          prefs[category][key] = userPrefs[category][key];
        }
      }
      return {
        ...initialState,
        loaded: true,
        auth: user ? true : false,
        authUser: user,
        prefs: prefs,
      }

    case "REQUEST_LOGIN":
      return {
        ...initialState,
        loaded: false,
        error: false,
        errorMessage: '',
      };

    case "LOGIN_SUCCESS":
      user = action.payload.user;
      userPrefs = action.payload.prefs;
      prefs = defaultPrefs;
      for (const category in userPrefs) {
        for (const key in userPrefs[category]) {
          prefs[category][key] = userPrefs[category][key];
        }
      }
      return {
        ...initialState,
        auth: true,
        authUser: user,
        prefs: prefs,
        loaded: true,
      };

    case "LOGOUT":
      return {
        ...initialState,
        auth: false,
        authUser: null,
        prefs: defaultPrefs,
      };
 
    case "LOGOUT_ERROR":
      return{
        ...initialState,
        loaded: true,
        error: true,
        errorMessage: action.error,
      }
    
    case "LOGIN_ERROR":
      return {
        ...initialState,
        loaded: true,
        error: true,
        errorMessage: action.error,
      };
 
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

// Reducer actions

async function loadSessionFromServer(dispatch) { // This one is not exported and only called internally by AuthProvider

    dispatch({ type: 'REQUEST_SESSION' });
    return axios.get(backend_url('api/session/load'))
    .then((response) => {
        let user = response.data.current_user;
        let prefs = {};
        if (user) {
            prefs = user.prefs;
            delete user.prefs;
        }
        dispatch({ type: 'SESSION_LOADED', payload: { user: user, prefs: prefs }})
    })
    .catch((e) => {
        console.log("POST /user/login, error =>" + e);
        dispatch({ type: 'SESSION_ERROR', error: e });

    });
}
export async function authGoogleLogin(dispatch,data){
  var formData=new FormData();
  formData.append('tokenId',data.tokenId)
  formData.append('remember',false)
  const requestOptions = {     
    headers: { 'content-type': 'multipart/form-data' }
  }
  dispatch({ type: 'REQUEST_LOGIN' });
  return axios.post(backend_url('user/login/google'), formData, requestOptions)
  .then((response) => {
    console.log ('POST /user/login/google, response =>', response.data);
    let user = response.data.current_user;
    let prefs = {};
    
    if (user) {
        prefs = user.prefs;
        delete user.prefs;
        dispatch({ type: 'LOGIN_SUCCESS', payload: {user: user, prefs: prefs}});
        return true;
    } else {
        dispatch({ type: 'LOGIN_ERROR', error: response.data['error'] });
        return false;
    }
})
.catch((e) => {
    console.log("POST /user/login/google, error =>" + e);
    dispatch({ type: 'LOGIN_ERROR', error: e });
    return false;
});

}
export async function authLogin(dispatch, data) {

    var formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('remember', data.remember);

    const requestOptions = {     
        headers: { 'content-type': 'multipart/form-data' }
    }

    dispatch({ type: 'REQUEST_LOGIN' });

    return axios.post(backend_url('user/login/basic'), formData, requestOptions)
    .then((response) => {
        console.log ('POST /user/login/basic, response =>', response.data);
        let user = response.data.current_user;
        let prefs = {};
        if (user) {
            prefs = user.prefs;
            delete user.prefs;
            dispatch({ type: 'LOGIN_SUCCESS', payload: {user: user, prefs: prefs}});
            return true;
        } else {
            dispatch({ type: 'LOGIN_ERROR', error: response.data['error'] });
            return false;
        }
    })
    .catch((e) => {
        console.log("POST /user/login/basic, error =>" + e);
        dispatch({ type: 'LOGIN_ERROR', error: e });
        return false;
    });

}


export async function authLogout(dispatch) {

    var formData = new FormData();

    const requestOptions = {     
        headers: { 'content-type': 'multipart/form-data' }
    }

    return axios.post(backend_url('user/logout'), formData, requestOptions)
    .then((response) => {
        //console.log ('POST /user/logout, response =>', response.data);
        let user = response.data.current_user;
        if (!user) {
            dispatch({ type: 'LOGOUT' });
            return true;
        } else {
            dispatch({ type: 'LOGOUT_ERROR', error: response.data['error']});
            return true;
        }
    })
    .catch((e) => {
        dispatch({ type: 'LOGOUT_ERROR', error: e});
        console.log("POST /user/logout, error =>" + e);
        return false;
    });
}


