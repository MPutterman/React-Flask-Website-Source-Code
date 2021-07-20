// Error Handler context
// Credit: https://itnext.io/centralizing-api-error-handling-in-react-apps-810b2be1d39d

// TODO:
// * Add default status messages (from HTTP specification) if not
//   provided by the calling component?

import React from 'react';
import { useHistory } from 'react-router-dom';

const ErrorContext = React.createContext();

export const ErrorHandler = ({ children }) => {

  const history = useHistory();

  const errorNone = {
      code: undefined,  // HTTP status code
      message: '',      // HTTP status message
      details: '',      // additional details (e.g. for debugging)
  }

  const [errorStatus, setErrorStatus] = React.useState(errorNone);

  // Need to remove the error status whenever the user navigates
  // to a new URL.
  React.useEffect(() => {
    // Listen for changes to the current location
    const unlisten = history.listen(() => setErrorStatus(errorNone));
    // cleanup the listener on unmount
    return unlisten;
  }, []);

  // Render the component. If there is a recognized error
  // status, render an error page. Otherwise, render the 
  // children as normal.
  const renderContent = () => {

    // Render a generic error page (assumes errorStatus.code is empty if no error)
    if (errorStatus.code) {

        return (
            <>
            <h1>Error {errorStatus.code}: {errorStatus.message}</h1>
            {errorStatus.details ? ( <h2>{errorStatus.details}</h2> ) : ( <></> )}
            </>
        );
    }

    return children;
  }

  // TODO: implement this  
  // We wrap it in a useMemo for performance reasons. More here:
  // https://kentcdodds.com/blog/how-to-optimize-your-context-value/
  const contextPayload = React.useMemo(
    () => ({ setErrorStatus }), 
    [setErrorStatus]
  );
  
  // We expose the context's value down to our components, while
  // also making sure to render the proper content to the screen 
  return (
    <ErrorContext.Provider value={setErrorStatus} /*{contextPayload}*/>
      {renderContent()}
    </ErrorContext.Provider>
  );
}

// A custom hook to quickly read the context's value. It's
// only here to allow quick imports
export const useErrorStatus = () => React.useContext(ErrorContext);

