// Usage: <AlertList alert={severity: <severity>, text: <message>} />
// Allowed values for severity: 'error', 'warning', 'info', 'success'

import React from 'react';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
//import { makeStyles } from '@material-ui/core/styles';

export function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

/*
const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
        '& > * + *': {
            marginTop: theme.spacing(2),
        },
    },
}));
*/

// TODO: see this page: https://material-ui.com/components/snackbars/ (search SnackPack for how to 
// allow generation of multiple alerts...)

export function AlertList(props) {

    //const classes = useStyles(); // What is this for?
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        if (props.alert) {
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [props.alert]);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    return (
        <Snackbar
            anchorOrigin={{ vertical: 'top', horizontal: 'center'}}
            open={open}
            autoHideDuration={6000}
            onClose={handleClose}
        >
            {props.alert ? (
            <Alert onClose={handleClose} severity={props.alert.severity}>
                {props.alert.text}
            </Alert>
            ) : ( <></>)}
        </Snackbar>

    );
}