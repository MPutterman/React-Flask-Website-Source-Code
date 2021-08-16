// CREDITS and RESOURCES:
// The following links provided a lot of good ideas how to implement authentication.
// * https://marmelab.com/react-admin/Authentication.html
// * https://kentcdodds.com/blog/authentication-in-react-applications (nice thoughts on keep separate the public and authenticated sites)
// * https://soshace.com/react-user-login-authentication-using-usecontext-and-usereducer/ (most of initial code design was from here)
// * https://medium.com/@thanhbinh.tran93/private-route-public-route-and-restricted-route-with-react-router-d50b27c15f5e (more thoughts on private routes)
// * https://stackoverflow.com/questions/60866924/how-to-pass-multiple-states-through-react-context-api
//     (some ideas how to implement separate states with one reducer)

// TODO:
// * Rename to SessionContext etc. instead of AuthContext
// * Still considering what is the best way to handle unexpected login or logout errors. 
//   Maybe it is safer just to reload the session from backend server, rather than try to
//   guess the actual state.  Doing so would greatly simplify the code here and have only minor
//   performance impact (only when logging in or out)
// * Separate profile out of the user_id? 
// * Implement a way to 'dirty' the prefs (or the whole session) when prefs are saved. Trigger reload of
//     these values from backend.
// * Add 'roles'
// * For now, favorites are stored in user table and session. Performance impact should be 
//     small if only a relatively small number of preferences is stored

import React, { useReducer, useEffect } from "react";
import { callAPI } from '../helpers/api';
import _ from 'lodash';

// Create contexts and hooks

const AuthStateContext = React.createContext();
const AuthDispatchContext = React.createContext();

export function useAuthState() {
  const context = React.useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error("useAuthState must be used within a AuthStateContext");
  }
  return context;
}
 
export function useAuthDispatch() {
  const context = React.useContext(AuthDispatchContext);
  if (context === undefined) {
    throw new Error("useAuthDispatch must be used within a AuthDispatchContext");
  }
  return context;
}



// Provider component
// Divide up state so we can independently refresh certain parts and avoid triggering
// whole page refresh when we just update a portion
export const AuthContext = ({ children }) => {

    const [{session, profile, roles, prefs, favorites}, dispatch]
        = useReducer(
          AuthReducer,
          {
            session: initialSession,
            profile: initialProfile,
            roles: initialRoles,
            prefs: initialPrefs,
            favorites: initialFavorites
          }
        );

    // Initialize the auth state from the server
    useEffect(() => {
        loadSessionFromServer(dispatch); 
    }, []); 

    return (
        <AuthStateContext.Provider value={{session: session, profile: profile, roles: roles, prefs: prefs, favorites: favorites}}>
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
        default_searchresult_pagesize: 10,      // Any way to bring in config here?      
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
        default_bkgrd_algorithm: 'None',         
        default_use_filter_correction: false,
        default_filter: 'None',              
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
    //'user:view-profile',
    //'admin',

];

// Default favorites
// Stored as dictionary of Arrays, with object_type as the index
const defaultFavorites = {};


// Initial states
const initialSession = {
    auth: false,
    auth_id: null, // user_id
    loaded: false,
    error: false,
    errorMessage: '',
};
const initialProfile = {
    first_name: '',
    last_name: '',
};
const initialRoles = {}; //defaultUserRoles;
const initialPrefs = defaultUserPrefs;
const initialFavorites = defaultFavorites;


export const AuthReducer = ({session: prevSession, profile: prevProfile, roles: prevRoles, prefs: prevPrefs, favorites: prevFavorites}, action) => {

  let user = null;    
  let userPrefs = {};   // prefs from backend
  let prefs = {};       // prefs with defaults merged in
  let favorites = {};

  switch (action.type) {

    case "REQUEST_SESSION":
      return {
        session: prevSession,
        profile: prevProfile,
        roles: prevRoles,
        prefs: prevPrefs,
        favorites: prevFavorites,
      }

    case "SESSION_ERROR": // reset all state to defaults
      return { 
        session: { auth: false, auth_id: null, loaded: false, error: true, errorMessage: action.error },
        profile: {},
        roles: {},
        prefs: {},
        favorites: {},
      }

    case "SESSION_LOADED":
      user = action.payload.user;
      //console.log('user =>', user);
      userPrefs = action.payload.prefs;
      prefs = defaultUserPrefs;
      // TODO: change to
      // prefs = {};
      // _.merge(prefs, [defaultUserPrefs, userPrefs]);
      for (const category in userPrefs) {
        for (const key in userPrefs[category]) {
          // Copy if not null/undefined
          if (userPrefs[category][key] !== null && userPrefs[category][key] !== undefined) prefs[category][key] = userPrefs[category][key];
        }
      }
      favorites = action.payload.favorites;
      return {
        session: { ...prevSession, loaded: true, auth: user ? true : false, auth_id: user ? user.user_id : null, error: false, errorMessage: ''},
        profile: { first_name: user ? user.first_name : '', last_name: user ? user.last_name : '' },
        roles: {}, // Not yet implemented
        prefs: prefs,
        favorites: favorites, 
      }

    case "REQUEST_LOGIN":
      return {
        session: {...prevSession, loaded: false, error: false, errorMessage: ''},
        profile: prevProfile,
        roles: prevRoles,
        prefs: prevPrefs,
        favorites: prevFavorites,
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
          if (userPrefs[category][key] !== null && userPrefs[category][key] !== undefined) prefs[category][key] = userPrefs[category][key];
        }
      }
      favorites = action.payload.favorites;
      return {
        session: { ...prevSession, loaded: true, auth: user ? true : false, auth_id: user ? user.user_id : null, error: false, errorMessage: ''},
        profile: { first_name: user ? user.first_name : '', last_name: user ? user.last_name : '' },
        roles: {}, // Not yet implemented
        prefs: prefs,
        favorites: favorites, 
      }

    case "LOGOUT":
      return {
        session: initialSession,
        profile: initialProfile,
        roles: initialRoles,
        prefs: initialPrefs,
        favorites: initialFavorites,
      };
 
    case "LOGOUT_ERROR":
      return{
        session: {...prevSession, loaded: true, error: true, errorMessage: action.error},
        profile: prevProfile,
        roles: prevRoles,
        prefs: prevPrefs,
        favorite: prevFavorites,
      }
    
    case "LOGIN_ERROR":
      return {
        session: {...prevSession, loaded: true, error: true, errorMessage: action.error},
        profile: initialProfile,
        roles: initialRoles,
        prefs: initialPrefs,
        favorites: initialFavorites,
      };
 
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

// Reducer actions

async function loadSessionFromServer(dispatch) { // This one is not exported and only called internally by AuthContext

    dispatch({ type: 'REQUEST_SESSION' });
    return callAPI('GET', 'api/session/load')
    .then((response) => {
        let user = response.data.current_user;
        let prefs = response.data.prefs;
        let favorites = response.data.favorites;
        dispatch({ type: 'SESSION_LOADED', payload: { user: user, prefs: prefs, favorites: favorites }});
    })
    .catch((e) => {
        console.log("POST /user/login, error =>" + e);
        dispatch({ type: 'SESSION_ERROR', error: e });

    });
}

// TODO: think if this is the best approach. Called after changing prefs, favorites, or profile on 
//  the server. Or changing permissions/roles
// TODO: session now split into multiple variables, though may be considered a single state update
//   depending on useReducer function...
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
    let favorites = response.data.favorites;
    if (user) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: {user: user, prefs: prefs, favorites: favorites}});
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
        let favorites = response.data.favorites;
        if (user) {
            dispatch({ type: 'LOGIN_SUCCESS', payload: {user: user, prefs: prefs, favorites: favorites}});
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

// Helper functions
// TODO: it should be possible to incorporate this into the context (i.e. context value can
//   be not only state but also contain functions). This will clean up the usage

export function isFavorite (favorites, object_type, object_id) {
    if (favorites?.[object_type]) {
        return favorites[object_type].includes(parseInt(object_id));
    } else {
        return false;
    }
};

