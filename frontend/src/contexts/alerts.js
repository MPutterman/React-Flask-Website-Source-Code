// Implements a context for showing alerts in a 'Snackbar'
//
// Usage in child component:
//      import { useAlerts } from './contexts/alerts';
//      const setAlert = useAlerts();
//      ...
//      setAlert ({ severity:<severity>, message:<message> });
// Allowed values for severity: 'error', 'warning', 'info', 'success'
//
// REFERENCES:
// * https://material-ui.com/components/snackbars/ (search SnackPack for multiple alert handing)
// * https://browntreelabs.com/snackbars-in-react-redux-and-material-ui/ (single snackbar for whole app)


import React from 'react';
import Snackbar from '@mui/material/Snackbar';
//import MuiAlert from '@material-ui/lab/Alert';
import MuiAlert from '@mui/material/Alert';

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
export const AlertList = (props) => {

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
                ref={props.ref}
                autoHideDuration={10000}
                TransitionProps={{appear: false,}} // TODO: needed for a bug(?) in transitions
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
            {props.children}
        </AlertContext.Provider>
    )

}
