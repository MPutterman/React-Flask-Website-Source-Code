// Error Handler context
// Credit: https://itnext.io/centralizing-api-error-handling-in-react-apps-810b2be1d39d
//
// Usage in components:
//    import { useErrorResponse } from '../contexts/error';
//    const setErrorResponse = useErrorResponse();
//    ...
//    setErrorResponse({ code:<Integer>, details:<String>})
//    -- code is the status code (e.g. 404, or StatusCodes.NOT_FOUND)
//    -- details can be used to provide any desired additional information
//
// References:
// https://www.npmjs.com/package/http-status-codes (lookup of HTTP status codes / reasons)
// https://stackoverflow.com/questions/41773406/react-router-not-found-404-for-dynamic-content
//   (other interesting concepts for error handling strategies)


import React from 'react';
import { useHistory } from 'react-router-dom';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

const ErrorContext = React.createContext();

export function useErrorResponse() {
  const context = React.useContext(ErrorContext);
  if (context === undefined) {
    throw new Error("useErrorStatus must be used within an ErrorContext.Provider");
  }
  return context;
}

export const ErrorHandler = ({ children }) => {

  const history = useHistory();

  const errorNone = {
      code: undefined,  // HTTP status code
      details: '',      // Error details (e.g. for debugging)
  }

  const [errorResponse, setErrorResponse] = React.useState(errorNone);

  // Need to remove the error status whenever the user navigates
  // to a new URL.
  React.useEffect(() => {
    // Listen for changes to the current location
    const unlisten = history.listen(() => setErrorResponse(errorNone));
    // cleanup the listener on unmount
    return unlisten;
  }, []);

  // Render the component. If there is a recognized error
  // status, render an error page. Otherwise, render the 
  // children as normal.
  const renderContent = () => {

    // If error condition (i.e. non-empty errorResponse.code), then render
    // an error page and supress rendering of children
    if (errorResponse.code) {
        return (
            <>
            <h1>Error {errorResponse.code}: {getReasonPhrase(errorResponse.code)}</h1>
            {errorResponse.details ? ( <h2>{errorResponse.details}</h2> ) : ( <></> )}
            </>
        );
    }

    return children;
  }

  // We are passing the setErrorResponse function to children components
  return (
    <ErrorContext.Provider value={setErrorResponse}>
      {renderContent()}
    </ErrorContext.Provider>
  );
}

