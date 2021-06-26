// Manage global site configuration
// TODO: Do we need dynamic setting of config variables?  If not, this can be a simple import.

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
        searchresults_pagesize_options: [5, 10, 25, 100],
    },
    analysis: {
        bkgrd_algorithm_options: ['1st order', '2nd order', '3rd order',],
        filter_algorithm_options: ['median 3x3',],
    },
}

export const ConfigReducer = (initialState, action) => {

  switch (action.type) {

  //  default:
  //    throw new Error(`Unhandled action type: ${action.type}`);
  }
  
};

