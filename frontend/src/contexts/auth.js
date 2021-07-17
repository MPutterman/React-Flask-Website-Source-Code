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
// * Separate profile out of the user_id? 
// * Implement a way to 'dirty' the prefs (or the whole session) when prefs are saved. Trigger reload of
//     these values from backend.
// * Add 'roles' to authUser

import React, { useReducer, useEffect } from "react";
import { callAPI } from '../components/api';
import _ from 'lodash';

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


// Default preferences
export const defaultUserPrefs = {
    general: {
        redirect_after_login: '/',                 // relative url
        timezone: '',
        theme: 'dark',
        default_searchresult_pagesize: 10,      
    },
    analysis: {
        default_equip: null,                       // equip_id
        default_plate: null,                       // plate_id
        default_cover: null,                       // cover_id
        default_exposure_time: null,               // seconds
        default_exposure_temp: null,               // degrees C
        default_use_flat_correction: false,
        default_flat_image: null,                  // image_id
        default_use_dark_correction: false,
        default_dark_image: null,                  // image_id
        default_use_bkgrd_correction: false,
        default_bkgrd_algorithm: '',         
        default_use_filter_correction: false,
        default_filter: '',              
    },
}

// Default roles
export const defaultAnonymousRoles = [];
export const defaultUserRoles = [
    'image:create',
    'image:view',
    'analysis:create',
    'analysis:view',
    'equip:create',
    'equip:view',
    'plate:create',
    'plate:view',
    'cover:create',
    'cover:view',
    //'user:create',
    //'user:view',
];


const initialState = { // This is the session info provided to child components
  auth: false,
  authUser: null,  
  loaded: false,
  error: false,
  errorMessage: '',
  prefs: defaultUserPrefs,
  roles: defaultUserRoles,
};

export const AuthReducer = (initialState, action) => {

  let user = null;    
  let userPrefs = {};   // prefs from backend
  let prefs = {};       // prefs with defaults merged in

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
      prefs = defaultUserPrefs;
      // TODO: change to
      // prefs = {};
      // _.merge(prefs, [defaultUserPrefs, userPrefs]);
      for (const category in userPrefs) {
        for (const key in userPrefs[category]) {
          // Copy if not null/undefined
          if (userPrefs[category][key]) prefs[category][key] = userPrefs[category][key];
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
      prefs = defaultUserPrefs;
      // TODO: change to
      // prefs = {}
      // _.merge(prefs, [defaultUserPrefs, userPrefs]);
      for (const category in userPrefs) {
        for (const key in userPrefs[category]) {
          if (userPrefs[category][key]) prefs[category][key] = userPrefs[category][key];
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
        prefs: defaultUserPrefs, // Prefs for anonymous user are the defaults
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
    return callAPI('GET', 'api/session/load')
    .then((response) => {
        let user = response.data.current_user;
        let prefs = response.data.prefs;
        dispatch({ type: 'SESSION_LOADED', payload: { user: user, prefs: prefs }})
    })
    .catch((e) => {
        console.log("POST /user/login, error =>" + e);
        dispatch({ type: 'SESSION_ERROR', error: e });

    });
}

// TODO: think if this is the best approach. Called after changing prefs or profile on 
//  the server. Or changing permissions/roles
export async function authRefreshSession(dispatch,data){
    return loadSessionFromServer(dispatch);
}

export async function authGoogleLogin(dispatch,data){
  dispatch({ type: 'REQUEST_LOGIN' });
  // TODO: filter 'data' to contain only tokenId and remember
  data.remember = false;  
  return callAPI('POST', 'user/login/google', data)
  .then((response) => {
    console.log ('POST /user/login/google, response =>', response.data);
    let user = response.data.current_user;
    let prefs = response.data.prefs;
    if (user) {
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

    dispatch({ type: 'REQUEST_LOGIN' });

    // TODO: filter 'data' to just contain the keys: email, password, remember

    return callAPI('POST', 'user/login/basic', data)
    .then((response) => {
        console.log ('POST /user/login/basic, response =>', response.data);
        let user = response.data.current_user;
        let prefs = response.data.prefs;
        if (user) {
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

    return callAPI('POST', 'user/logout', [])
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


