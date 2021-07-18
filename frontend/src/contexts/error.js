// Error Handler context
// Credit: https://itnext.io/centralizing-api-error-handling-in-react-apps-810b2be1d39d

import React from 'react';
import { useHistory } from 'react-router-dom';

const ErrorContext = React.createContext();

export const ErrorHandler = ({ children }) => {

  const history = useHistory();

  const noError = {
      code: undefined,
      message: '',
      //redirect: '',
  }

  const [errorStatus, setErrorStatus] = React.useState(noError);

  const messagePrefix = {
      '401': 'Unauthorized',
      '403': 'Forbidden', // TODO: maybe just use 404 message?
      '404': 'Resource not found',
      '500': 'Internal server error',
  }

  // Make sure to "remove" this status code whenever the user 
  // navigates to a new URL. If we didn't do that, then the user
  // would be "trapped" into error pages forever
  React.useEffect(() => {
    // Listen for changes to the current location.
    const unlisten = history.listen(() => setErrorStatus(noError));
    // cleanup the listener on unmount
    return unlisten;
  }, []);
  
  // This is what the component will render. If it has an 
  // errorStatusCode that matches an API error, it will only render
  // an error page. If there is no error status, then it will render
  // the children as normal
  const renderContent = () => {

    // Render a generic error page
    if (errorStatus.code) {

        return (
            <>
            <h1>Error {errorStatus.code}: {messagePrefix[errorStatus.code]}</h1>
            <p>Message: {errorStatus.message}</p>
            </>
        );
    }

    return children;
  }
  
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

