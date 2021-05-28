// CREDITS and RESOURCES:
// The following links provided a lot of good ideas how to implement authentication.
// * https://marmelab.com/react-admin/Authentication.html
// * https://kentcdodds.com/blog/authentication-in-react-applications (nice thoughts on keep separate the public and authenticated sites)
// * https://soshace.com/react-user-login-authentication-using-usecontext-and-usereducer/ (most of initial code design was from here)

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

// Main component

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

// Reducer

export const initialState = { // This is the session info provided to child components
  auth: false,
  authUser: null,  
  loading: true,
  error: false,
  errorMessage: '',
};

export const AuthReducer = (initialState, action) => {

  switch (action.type) {

    case "REQUEST_SESSION":
      return {
        ...initialState,
        loading: true,
        error: false,
        errorMessage: '',
      }

    case "SESSION_ERROR":
      return {
        ...initialState,
        loading: false,
        error: true,
        errorMessage: action.error,
      }

    case "SESSION_LOADED":
      return {
        ...initialState,
        loading: false,
        auth: action.payload ? true : false,
        authUser: action.payload,
      }

    case "REQUEST_LOGIN":
      return {
        ...initialState,
        loading: true,
        error: false,
        errorMessage: '',
      };

    case "LOGIN_SUCCESS":
      return {
        ...initialState,
        auth: true,
        authUser: action.payload,
        loading: false,
      };

    case "LOGOUT":
      return {
        ...initialState,
        auth: false,
        authUser: null,
      };
 
    case "LOGOUT_ERROR":
      return{
        ...initialState,
        loading: false,
        error: true,
        errorMessage: action.error,
      }
    
    case "LOGIN_ERROR":
      return {
        ...initialState,
        loading: false,
        error: true,
        errorMessage: action.error,
      };
 
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

// Reducer actions

const loadSessionFromServer = (dispatch) => { // This one is not exported and only called internally by AuthProvider

    dispatch({ type: 'REQUEST_SESSION' });
    axios.get(backend_url('api/session/load'))
    .then((response) => {
        const user = response.data['current_user'];
        dispatch({ type: 'SESSION_LOADED', payload: user });
    })
    .catch((e) => {
        console.log("POST /user/login, error =>" + e);
        dispatch({ type: 'SESSION_ERROR', error: e });

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

    axios.post(backend_url('user/login'), formData, requestOptions)
    .then((response) => {
        console.log ('POST /user/login, response =>', response.data);
        const user = response.data['current_user'];
        if (user) {
            dispatch({ type: 'LOGIN_SUCCESS', payload: user });
            localStorage.setItem('currentUser', JSON.stringify(user));
            return true;
        } else {
            dispatch({ type: 'LOGIN_ERROR', error: response.data['error'] });
            return false;
        }
    })
    .catch((e) => {
        console.log("POST /user/login, error =>" + e);
        dispatch({ type: 'LOGIN_ERROR', error: e });
        return false;
    });

}


export async function authLogout(dispatch) {

    var formData = new FormData();

    const requestOptions = {     
        headers: { 'content-type': 'multipart/form-data' }
    }

    axios.post(backend_url('user/logout'), formData, requestOptions)
    .then((response) => {
        console.log ('POST /user/logout, response =>', response.data);
        const user = response.data['current_user'];
        if (!user) {
            dispatch({ type: 'LOGOUT' });
            localStorage.removeItem('currentUser');
            return true;
        } else {
            dispatch({ type: 'LOGOUT_ERROR', error: response.data['error']});
            return false;
        }
    })
    .catch((e) => {
        dispatch({ type: 'LOGOUT_ERROR', error: e});
        console.log("POST /user/logout, error =>" + e);
        return false;
    });
}


