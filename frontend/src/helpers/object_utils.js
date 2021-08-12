// Implement some utilities for handling objects, especially linking to backend.
// Right now, implemented as button components with an onClick handler. Later may
// factor out the handler to improve code re-use.
//
// TODO: 
// * Clicking an action button (e.g. view from edit page) would potentially cause loss of form data. 
//      Handle this in the forms by diabling the actions after form changes?

import React from 'react';
import { callAPI } from '../helpers/api.js'; 
import { useHistory } from 'react-router-dom';
import { useConfirm } from 'material-ui-confirm';
import { useAlerts } from '../contexts/alerts';
import { useErrorResponse } from '../contexts/error';
import { StatusCodes } from 'http-status-codes';
import { useAuthState, useAuthDispatch, authRefreshSession, isFavorite } from '../contexts/auth';
import Busy from '../components/busy';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Button';
import ViewIcon from '@material-ui/icons/Visibility';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import RestoreIcon from '@material-ui/icons/RestoreFromTrash';
import PurgeIcon from '@material-ui/icons/DeleteForever';
import SearchIcon from '@material-ui/icons/Search';
import CloneIcon from '@material-ui/icons/FileCopy';
import IsFavoriteIcon from '@material-ui/icons/Star';
import NotFavoriteIcon from '@material-ui/icons/StarOutline';

import IDInputField from '../components/idfield';

import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';

// Object type icons
import UserIcon from '@material-ui/icons/Person';
import ImageIcon from '@material-ui/icons/Image';
import AnalysisIcon from '@material-ui/icons/Assessment';
import OrganizationIcon from '@material-ui/icons/Business'; // or People?
import PlateIcon from '@material-ui/icons/Note'; // TODO: need something better
import CoverIcon from '@material-ui/icons/Note'; // TODO: need something better
import EquipmentIcon from '@material-ui/icons/Camera'; // or CameraAlt


// Return action-type icon
const actionIcon = (action) => {
    switch(action) {
        case 'view': return ViewIcon;
        case 'edit': return EditIcon;
        case 'delete': return DeleteIcon;
        case 'restore': return RestoreIcon;
        case 'purge': return PurgeIcon;
        case 'search': return SearchIcon;
        case 'clone': return CloneIcon;
    }
}

// Return object-type icon
const objectIcon = (objectType) => {
    switch(objectType) {
        case 'user': return UserIcon;
        case 'org': return OrganizationIcon;
        case 'image': return ImageIcon;
        case 'analysis': return AnalysisIcon;
        case 'equip': return EquipmentIcon;
        case 'plate': return PlateIcon;
        case 'cover': return CoverIcon;
        default:
            console.error('Invalid object type');
            return <></>;
    }
}

// Return object-type name
const objectTitle = (objectType) => {
    switch(objectType) {
        case 'user': return 'User';
        case 'org': return 'Organization';
        case 'image': return 'Image';
        case 'analysis': return 'Analysis';
        case 'equip': return 'Equipment';
        case 'plate': return 'Plate';
        case 'cover': return 'Cover';
        default:
            console.error('Invalid object type');
            return '';
    }
}

// Show a favorite / unfavorite button and handle actions
const ObjectFavoriteButton = (props) => {
    const object_type = props.objectType;
    const id = props.objectID;
    const setAlert = useAlerts();
    const { favorites } = useAuthState(); // TODO: only need favorites
    const dispatch = useAuthDispatch();

    const is_fav = () => {
        return isFavorite(favorites, object_type, id);
    }

    const handleClick = (event) => {

        const action = is_fav() ? 'remove' : 'add';
        
        callAPI('POST', `api/favorite/${action}/${object_type}/${id}`)
        .then((response) => {

            if (response.error) {

                // Display the returned error
                setAlert({
                    severity: 'error',
                    message: `Operation failed. Error ${response.status}: ${response.data.error}`
                });
                return false;

            } else {

                authRefreshSession(dispatch);
                setAlert({severity: 'success', message: is_fav() ? 'Removed from favorites' : 'Added to favorites' });
                return true;
            
            }
        
        })

    }

    return (
        <>
        {/*<Button size='small' onClick={handleClick}>*/}
            {is_fav() ? (
                <Tooltip title='Remove from favorites'>
                    <IsFavoriteIcon onClick={handleClick}/>Unfavorite
                </Tooltip>
            ) : (
                <Tooltip title='Add to favorites'>
                    <NotFavoriteIcon onClick={handleClick}/>Favorite
                </Tooltip>
            )}
        {/* </Button> */}
        </>
    );
}; 


// Show a clone button and handle actions
const ObjectCloneButton = (props) => {

    const object_type = props.objectType;
    const id = props.objectID;

    // Hooks and contexts
    const history = useHistory();
    const confirm = useConfirm();
    const setAlert = useAlerts();
    const [busy, setBusy] = React.useState(false);

    const handleClick = (event) => {

        confirm ({/*title:<title>, description:<description>*/})
        .then(() => {

            setBusy(true);
            callAPI('POST', `api/${object_type}/clone/${id}`)
            .then((response) => {

                if (response.error) {

                    // Display the returned error
                    setAlert({
                        severity: 'error',
                        message: `Clone failed. Error ${response.status}: ${response.data.error}`
                    });
                    setBusy(false);
                    return false;

                } else {

                    setAlert({severity: 'success', message: `Clone successful`});
                    setBusy(false);
                    const new_id = response.data.id;
                    history.push(`/${object_type}/edit/${new_id}`)
                    return true;
                
                }
            
            })
        })

    }

    return (
        <>
            {/*<Busy busy={busy}/>*/}
            <Button size='small' onClick={handleClick}><CloneIcon />Clone</Button>
        </>
    );
}; 



// Show a delete button and handle actions
const ObjectDeleteButton = (props) => {

    const object_type = props.objectType;
    const id = props.objectID;

    // Hooks and contexts
    const confirm = useConfirm();
    const setAlert = useAlerts();
    const [busy, setBusy] = React.useState(false);

    const handleClick = (event) => {

        confirm ({/*title:<title>, description:<description>*/})
        .then(() => {

            setBusy(true);
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

        confirm ({/*title:<title>, description:<description>*/})
        .then(() => {

            setBusy(true);

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

// Show an object view button and handle actions (redirect to preview)
function ObjectViewButton(props) {

    const object_type = props.objectType;
    const id = props.objectID;

    const history = useHistory();

    const handleClick = (event) => {
        history.push(`/${object_type}/view/${id}`);
    }

    return (
        <Button size='small' onClick={handleClick}><ViewIcon/>View</Button>
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

        confirm ({/*title:<title>, description:<description>*/})
        .then(() => {

            setBusy(true);

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
            <Button size='small' onClick={handleClick}><PurgeIcon />Purge</Button>
        </>
    );
};   

async function hasPermission(permission, object_type, id) {
    return callAPI('GET', `api/check_permission/${object_type}/${permission}/${id}`)
    .then((response) => {
        if (response.error) {
            console.warn(`Error ${response.status} from /api/check_permission call: ${response.data.error}`);
            return false; // Return false if any error
        } else {
            return response.data.authorized === true;
        }
    })
    .catch((error) => {
        console.warn('Exception in /api/check_permission call: ', error);
        return false; // Return false if any exception
    });
}

async function listPermissions(object_type, id) {
    return callAPI('GET', `api/list_permissions/${object_type}/${id}`)
    .then((response) => {
        if (response.error) {
            console.warn(`Error ${response.status} from /api/list_permissions call: ${response.data.error}`);
            return []; // Return empty list if any errors
        } else {
            return response.data.authorized;
        }
    })
    .catch((error) => {
        console.warn('Exception in /api/list_permissions call: ', error);
        return []; // Return empty list if any exception
    });
}


const ObjectIcon = ({objectType, children, ...props}) => {
    return React.createElement(objectIcon(objectType), props, children);
}

const ActionIcon = ({action, children, ...props}) => {
    return React.createElement(actionIcon(action), props, children);
}


export {
    ObjectViewButton,
    ObjectEditButton,
    ObjectFavoriteButton,
    ObjectCloneButton,
    ObjectDeleteButton,
    ObjectRestoreButton,
    ObjectPurgeButton,
    hasPermission,
    listPermissions,
    actionIcon,
    objectIcon,
    objectTitle,
    ObjectIcon,
    ActionIcon,
};

