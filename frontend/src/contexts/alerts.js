// Implements a context for showing alerts in a 'Snackbar'

// TODO:
// * Implemented for image_edit.js.  Next switch all other components to use context instead of
//     inline elements


// Usage in child component:
//      import { useAlerts } from './contexts/alerts';
//      const setAlert = useAlerts();
//      ...
//      setAlert ({ severity:<severity>, message:<message> });
// Allowed values for severity: 'error', 'warning', 'info', 'success'

// REFERENCES:
// * https://material-ui.com/components/snackbars/ (search SnackPack for multiple alert handing)


import React from 'react';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

// Create context
const AlertContext = React.createContext();

// Define hook
export function useAlerts() {
  const context = React.useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlerts must be used within an AlertContext.Provider");
  }
  return context;
}

// Helper component
const Alert = (props) => {
    return (
        <MuiAlert elevation={10} variant="filled" {...props} />
    );
}

// Main component
export const AlertList = ({children}) => {

    const [alert, setAlert] = React.useState({});
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        if (alert.message) { // if alert message is non-empty
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [alert]);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    function renderContent() {
        return (
            <Snackbar
                anchorOrigin={{ vertical: 'top', horizontal: 'center'}}
                open={open}
                autoHideDuration={10000}
                onClose={handleClose}
            >
                {alert ? (
                <Alert onClose={handleClose} severity={alert.severity}>
                    {alert.message}
                </Alert>
                ) : ( <></> )}
            </Snackbar>
        );
    }

    return (
        <AlertContext.Provider value={setAlert}>
            {renderContent()}
            {children}
        </AlertContext.Provider>
    )

}
