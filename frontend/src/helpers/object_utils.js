// Implement some utilities for handling objects, especially linking to backend.
// Right now, implemented as button components with an onClick handler. Later may
// factor out the handler to improve code re-use.

import React from 'react';
import { callAPI } from '../helpers/api.js'; 
import { useHistory } from 'react-router-dom';
import { useConfirm } from 'material-ui-confirm';
import { useAlerts } from '../contexts/alerts';
import { useErrorResponse } from '../contexts/error';
import { StatusCodes } from 'http-status-codes';
import Busy from '../components/busy';
import Button from '@material-ui/core/Button';
import ViewIcon from '@material-ui/icons/Visibility';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import RestoreIcon from '@material-ui/icons/RestoreFromTrash';
import PurgeIcon from '@material-ui/icons/DeleteForever';
import IDInputField from '../components/idfield';

import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';


// Show a delete button and handle actions
const ObjectDeleteButton = (props) => {

    const object_type = props.objectType;
    const id = props.objectID;

    // Hooks and contexts
    const confirm = useConfirm();
    const setAlert = useAlerts();
    const [busy, setBusy] = React.useState(false);

    const handleClick = (event) => {

        setAlert({severity: 'warning', message: 'Delete not yet implemented in backend'});
        setBusy(true);

        confirm ({/*title:<title>, description:<description>*/})
        .then(() => {

            callAPI('POST', `api/${object_type}/delete/${id}`)
            .then((response) => {

                if (response.error) {

                    // Display the returned error
                    setAlert({
                        severity: 'error',
                        message: `Delete failed. Error ${response.status}: ${response.data.error}`
                    });
                    setBusy(false);
                    return false;

                } else {

                    setAlert({severity: 'success', message: `Delete success`});
                    setBusy(false);
                    return true;
                
                }
            
            })
        })

    }

    return (
        <>
            {/*<Busy busy={busy}/>*/}
            <Button size='small' onClick={handleClick}><DeleteIcon />Delete</Button>
        </>
    );
}; 

// Show a restore (undelete) button and handle actions
const ObjectRestoreButton = (props) => {

    const object_type = props.objectType;
    const id = props.objectID;

    // Hooks and contexts
    const confirm = useConfirm();
    const setAlert = useAlerts();
    const [busy, setBusy] = React.useState(false);

    const handleClick = (event) => {

        setAlert({severity: 'warning', message: 'Restore not yet implemented in backend'});
        setBusy(true);

        confirm ({/*title:<title>, description:<description>*/})
        .then(() => {

            callAPI('POST', `api/${object_type}/restore/${id}`)
            .then((response) => {

                if (response.error) {

                    // Display the returned error
                    setAlert({
                        severity: 'error',
                        message: `Restore failed. Error ${response.status}: ${response.data.error}`
                    });
                    setBusy(false);
                    return false;

                } else {

                    setAlert({severity: 'success', message: `Restore success`});
                    setBusy(false);
                    return true;
                
                }
            
            })
        })

    }

    return (
        <>
            {/*<Busy busy={busy}/>*/}
            <Button size='small' onClick={handleClick}><RestoreIcon />Restore</Button>
        </>
    );
};   

// Show an object edit button and handle actions (redirect to edit view)
function ObjectEditButton(props) {

    const object_type = props.objectType;
    const id = props.objectID;

    const history = useHistory();

    const handleClick = (event) => {
        history.push(`/${object_type}/edit/${id}`);
    }

    return (
        <Button size='small' onClick={handleClick}><EditIcon/>Edit</Button>
    ); 
};

// Show a purge (permanent delete) button and handle actions
const ObjectPurgeButton = (props) => {

    const object_type = props.objectType;
    const id = props.objectID;

    // Hooks and contexts
    const confirm = useConfirm();
    const setAlert = useAlerts();
    const [busy, setBusy] = React.useState(false);

    const handleClick = (event) => {

        setAlert({severity: 'warning', message: 'Purge not yet implemented in backend'});
        setBusy(true);

        confirm ({/*title:<title>, description:<description>*/})
        .then(() => {

            callAPI('POST', `api/${object_type}/purge/${id}`)
            .then((response) => {

                if (response.error) {

                    // Display the returned error
                    setAlert({
                        severity: 'error',
                        message: `Purge failed. Error ${response.status}: ${response.data.error}`
                    });
                    setBusy(false);
                    return false;

                } else {

                    setAlert({severity: 'success', message: `Purge success`});
                    setBusy(false);
                    return true;
                
                }
            
            })
        })

    }

    return (
        <>
            {/*<Busy busy={busy}/>*/}
            <Button size='small' onClick={handleClick}><PurgeIcon />Delete</Button>
        </>
    );
};   

export {
    ObjectEditButton,
    ObjectDeleteButton,
    ObjectRestoreButton,
    ObjectPurgeButton,
};

