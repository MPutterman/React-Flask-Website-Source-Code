// Manage global site configuration
//
// TODO:
// * Do we need dynamic setting of config variables?  If not, this can be a simple import.
// * Do we need the reducer portion?

import React from "react";

// Create contexts and hooks

const ConfigStateContext = React.createContext();
const ConfigDispatchContext = React.createContext(); 

export function useConfigState() {
  const context = React.useContext(ConfigStateContext);
  if (context === undefined) {
    throw new Error("useConfigState must be used within a ConfigProvider");
  }
  return context;
}
 
export function useConfigDispatch() {
  const context = React.useContext(ConfigDispatchContext);
  if (context === undefined) {
    throw new Error("useConfigDispatch must be used within a ConfigProvider");
  }
  return context;
}

// Provider

export const ConfigProvider = ({ children }) => {

    const [config, dispatch] = React.useReducer(ConfigReducer, initialState);

    return (
        <ConfigStateContext.Provider value={config}>
            <ConfigDispatchContext.Provider value={dispatch}>
                {children}
            </ConfigDispatchContext.Provider>
        </ConfigStateContext.Provider>
    );
};

// Reducer

// Configuration info (dictionary with categories and keys)
export const initialState = {
    general: {
        maintenance_mode: false,
        redirect_after_logout: '/user/login',
        theme_options: ['dark', 'light'],
    },
    search: {
        pagesize_options: [5, 10, 25, 50, 100],
        default_pagesize: 10,
    },
    analysis: {
        bkgrd_algorithm_options: ['None', '1st order', '2nd order', '3rd order',],
        filter_algorithm_options: ['None', 'median 3x3',],
        default_radio_opacity: 80,
        default_bright_opacity: 20,
        brightness_min: -100, // What should this be?
        brightness_max: 500, // What should this be?
        brightness_step: 1,
        contrast_min: -100, // What should this be?
        contrast_max: 500, // What should this be?
        contrast_step: 1,
        opacity_min: 0,
        opacity_max: 100,
        opacity_step: 1,
    },
}

export const ConfigReducer = (initialState, action) => {

  switch (action.type) {

  //  default:
  //    throw new Error(`Unhandled action type: ${action.type}`);
  }
  
};

