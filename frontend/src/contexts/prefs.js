// PrefProvider
// Provide access to preferences for the current user.

import React, { useReducer, useEffect } from "react";

// Import AuthProvider
import { useAuthState } from '../contexts/auth';

// Create contexts and hooks

const PrefStateContext = React.createContext();
const PrefDispatchContext = React.createContext(); // TODO: not sure if this is needed

export function usePrefState() {
  const context = React.useContext(PrefStateContext);
  if (context === undefined) {
    throw new Error("usePrefState must be used within a PrefProvider");
  }
  return context;
}
 
export function usePrefDispatch() {
  const context = React.useContext(PrefDispatchContext);
  if (context === undefined) {
    throw new Error("usePrefDispatch must be used within a PrefProvider");
  }
  return context;
}

// Main component

export const PrefProvider = ({ children }) => {

    // TODO: check for AuthProvider... if not present then can
    // just treat the same as if user not logged in
    const session = useAuthState();

    const [prefs, dispatch] = useReducer(PrefReducer, initialState);

    // Initialize the auth state from the server
    // Currently stored in session and updated whenever authUser or
    // authUser['preferences'] changes.
    useEffect(() => {
        loadPreferences(dispatch, session); 
    }, [session['authUser']]); 

    return (
        <PrefStateContext.Provider value={prefs}>
            <PrefDispatchContext.Provider value={dispatch}>
                {children}
            </PrefDispatchContext.Provider>
        </PrefStateContext.Provider>
    );
};

// Reducer

// System defaults for all preferences (access by category and key)
export const initialState = { 

  settings: {

    general: {

        redirect_after_logout: '/user/login',

    },
  },

  prefs: {

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
  },
  loading: false,
};

export const PrefReducer = (initialState, action) => {

    // TODO: check for AuthProvider... if not present then can
    // just treat the same as if user not logged in
    const session = useAuthState();

  switch (action.type) {

    case "REQUEST_PREFS":
      return {
        ...initialState,
        loading: true,
      }

    case "PREFS_LOADED":
      // Iterate through loaded prefs, overwrite any pre-existing ones
      //console.log('PREFS_LOADED =>', action.payload);
      for (const category in action.payload) {
        for (const key in action.payload[category]) {
          initialState['prefs'][category][key] = action.payload[category][key];
        }
      }
      return {
        ...initialState,
        loading: false,
      }

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

// Reducer actions

const loadPreferences = (dispatch,session) => { // This one is not exported and only called internally by PrefProvider

    dispatch({ type: 'REQUEST_PREFS' });

    const prefs = session['auth'] ? session['authUser']['prefs'] : {}
    dispatch({ type: 'PREFS_LOADED', payload: prefs });
}

// Not currently implemented
// TODO: Do we want to save multiple preferences or just one at a time?
export async function savePreference(dispatch, data) {
}

