// Implement a component to view various object types.
// 
// 'connectView' uses a wrapper approach to add the following to a template view:
// - Backend support to load the item from database
// - Backend support to check permissions and provide action buttons for allowed actions
//
// Individual views are built by composing GenericObjectView.
//
// TODO: 
// * Can this be adapted to wrap EditViews as well?  If don't merge, consider moving some
//     functions into a helper file (e.g. support for deletions, etc...)
// * Useful to have separate components for modal form vs a withRouter wrapped one?
// * Implement 'types' for each field to improve the display in GenericObjectView. Add an 'ID' type.

import React from "react";
import { callAPI } from '../components/api';
import { withRouter } from "react-router";
import Button from "@material-ui/core/Button";
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import IDIcon from '@material-ui/icons/Fingerprint';
import { useErrorResponse } from '../contexts/error';
import { StatusCodes } from 'http-status-codes';
import { useAlerts } from '../contexts/alerts';
import { useConfirm } from 'material-ui-confirm';
import Busy from '../components/busy';
import { ObjectEditButton, ObjectDeleteButton, ObjectRestoreButton, ObjectPurgeButton } from '../helpers/object_utils';

// Object type icons
import UserIcon from '@material-ui/icons/Person';
import ImageIcon from '@material-ui/icons/Image';
import AnalysisIcon from '@material-ui/icons/Assessment';
import OrganizationIcon from '@material-ui/icons/Business'; // or People?
import PlateIcon from '@material-ui/icons/Business';
import CoverIcon from '@material-ui/icons/Business';
import EquipmentIcon from '@material-ui/icons/Business';

// Field-specific icons
import EmailIcon from '@material-ui/icons/Email';
import LocationIcon from '@material-ui/icons/LocationOn';
import ImageSizeIcon from '@material-ui/icons/SquareFoot';
import ExposureTimeIcon from '@material-ui/icons/Timer';
//import ExposureTempIcon from '@material-ui/icons/DeviceThermostat';
import DateTimeIcon from '@material-ui/icons/Today';


// Wraps a derivative of ObjectView with backend support
//  
// Usage:
//   ObjectView = connectView(BaseObjectView, objectType)
//   <ObjectView objectID>
//   Note: if additionally wrapped by withRouter, then also look for props.match.params.id

// TODO:
// * Could have an additional layer so this one doesn't have to be aware of match params...
//     i.e. RoutedUserView = withRouter(UserView)
//              return (
//                  <UserView id={props.id ? props.id : (props.match.params.id ? props.match.params.id : null)} />
//              )

const connectView = (WrappedView, objectType) => {
return (props) => {

    // Hooks / contexts
    const setAlert = useAlerts();
    const setErrorResponse = useErrorResponse();

    // Data model
    const id = props.objectID ? props.objectID : (props.match.params.id ? props.match.params.id : null);
    const object_type = objectType;

    const initialModel = {};
    const [loaded, setLoaded] = React.useState(false);
    const [model, setModel] = React.useState(initialModel);
    const [name, setName] = React.useState('');

    // Permissions
    const [canEdit, setCanEdit] = React.useState(false);
    const [canDelete, setCanDelete] = React.useState(false);
    const [canPurge, setCanPurge] = React.useState(false);
    const [canRestore, setCanRestore] = React.useState(false);
    const [permissions, setPermissions] = React.useState([]);

    // Cache permissions
    // TODO: streamline by new API function (get all permissions), or fire async calls together
    React.useEffect(() => {
        if (id) {
            hasPermission('edit').then((response) => {setCanEdit(response); console.log('canEdit', response);})
            hasPermission('delete').then((response) => {setCanDelete(response);})
            hasPermission('restore').then((response) => {setCanRestore(response);})
            hasPermission('purge').then((response) => {setCanPurge(response);})
        }
    },[id])

    // TODO: error checking (error response, and also exception of callAPI)
    React.useEffect(() => {
        if (id) {
            callAPI('GET', `api/permission/view/${object_type}/${id}`)
            .then((response) => {
                if (response.data.authorized === true) {
                    objectLoad(id);
                } else {
                    setErrorResponse({code: StatusCodes.FORBIDDEN, details: 'Not 123 Authorized' });
                }
            })
        }
    }, [id])

/*
    // Set name property
    // TODO: QUESTION: do this, or use an 'onNameChange' callback?
    // TODO: or maybe just have the backend create this for us... (only user has this issue)
    React.useEffect(() => {
        if (Object.keys(model).length > 0) {
            if (object_type == 'user') {
                setName(`${model.first_name} ${model.last_name}`);
            } else {
                setName(model.name);
            }
        }
    }, [model])
*/

    const icon = () => {
        switch(object_type) {
            case 'user': return UserIcon;
            case 'org': return OrganizationIcon;
            case 'image': return ImageIcon;
            case 'analysis': return AnalysisIcon;
            case 'equip': return EquipmentIcon;
            case 'plate': return PlateIcon;
            case 'cover': return CoverIcon;
            default:
                console.error('Invalid object_type');
                return null;
        }
    }

    const title = () => {
        switch(object_type) {
            case 'user': return 'User';
            case 'org': return 'Organization';
            case 'image': return 'Image';
            case 'analysis': return 'Analysis';
            case 'equip': return 'Equipment type';
            case 'plate': return 'Plate type';
            case 'cover': return 'Cover type';
            default:
                console.error('Invalid object_type');
                return '';
        }
    }

    // TODO: cache these in the session? Or here? Store in state and only change when model changes?
    // TODO: swap the id and permission?
    async function hasPermission(permission) {
        return callAPI('GET', `api/permission/${permission}/${object_type}/${id}`)
        .then((response) => {
            console.log('response', response);
            return response.data.authorized;
        })
        .catch((error) => {
            console.warn('Exception in /api/permission call: ', error);
            return false;
        });
    }

    // Retrieve user with specified id from the database
    function objectLoad(id) {
        if (id) {
            callAPI('GET', `${object_type}/load/${id}`) // change to api/object/load/id
            .then((response) => {

              if (response.error) {

                // TODO: handle some specific errors (e.g. unauthorized) or add error details?
                setErrorResponse({code: response.status, details: response.data.error ? response.data.error : '' });
                setLoaded(true);
                return false;

              } else {

                setModel(response.data);
                setLoaded(true);
                return true;
              
              }

            });
        }
        return true;
    }

    return (

        <>
        <Busy busy={!loaded} />

        <Card>
        
            <CardHeader /*avatar={/`${icon()}`}*/ title={`${title()}: ${model.name} (ID=${id})`} /*avatar actions title subheader*/ />
            <CardContent>

                <WrappedView id={id} model={model} />

                <Divider />
                Metadata:
                <Grid fullWidth container direction='row' justifyContent='space-between'>
                    <TextField label="ID" value={id || ''} />
                    <TextField label="Owner ID" value={model.owner_id || ''} />
                    <TextField label="Created" value={model.created} />
                    <TextField label="Last modified" value={model.modified} />
                    <TextField label="Is deleted?" value={model.is_deleted} />
                </Grid>

            </CardContent>

            <CardActions disableSpacing>

                {canEdit ? (<ObjectEditButton objectType={object_type} objectID={id} />) : ( <></> )}
                {(canDelete && !model.is_deleted) ? (<ObjectDeleteButton objectType={object_type} objectID={id} />) : ( <></> )}
                {(canRestore && model.is_deleted) ? (<ObjectRestoreButton objectType={object_type} objectID={id} />) : ( <></> )}
                {canPurge ? (<ObjectPurgeButton objectType={object_type} objectID={id} />) : ( <></> )}

            </CardActions>

        </Card>

        </>

    )
    
}
}

// Show a generic view of an object
// Usage: <ObjectView id model fields actions />
//   - id is the object ID
//   - model is the data model
//   - fields is an array of {label, field, type='string'}
//   - actions is an array of {label, callback}

const GenericObjectView = (props) => {

    return (
        <Grid container direction='row'>
        <Grid item>
        <Box flexDirection='row' s={2}>
            {props.fields.map(({label, value}) => (
                <Box py={1}>
                    <TextField
                        readOnly
                        disabled
                        label={label}
                        value={value || ''} // Otherwise undefined values mess up rendering
                    />
                </Box>
            ))}
        </Box>
        </Grid>
        <Grid item>
            {props.actions?.map(({callback, icon: Icon, label}) /* need rename to capital Icon */ => (
                <Button onClick={callback}>{Icon ? ( <Icon /> ) : (<></>)}{label}</Button>
            ))}
        </Grid>
        </Grid>
    )
}

const WrappedImageView = (props) => {
    const fields = [
        {icon: null, label: 'Name', value: props.model.name},
        {icon: null, label: 'Equipment', value: props.model.equip_id},
        {icon: DateTimeIcon, label: 'Captured', value: props.model.captured},
        {icon: ExposureTimeIcon, label: 'Exposure time (s)', value: props.model.exp_time},
        {icon: null, label: 'Exposure temp (C)', value: props.model.exp_temp},
        // TODO: somehow show the image...
    ];
    const actions = [];
    return (
        <GenericObjectView id={props.objectID} fields={fields} actions={actions} model={props.model} />
    )
}

const WrappedUserView = (props) => {

    const fields = [
        {icon: UserIcon, label: 'Name', value: `${props.model.first_name} ${props.model.last_name}`},
        {icon: EmailIcon, label: 'Email', value: props.model.email },
        {icon: OrganizationIcon, label: 'Organization', value: props.model.org_list },
    ];
    const actions = [
        {icon: null, label: 'Follow', callback: () => handleFollow()}, // just putting 'handleFollow' does not work
        {icon: ImageIcon, label: 'Images', callback: () => handleImageSearch()},
        {icon: AnalysisIcon, label: 'Analyses', callback: () => handleAnalysisSearch()},
    ];
    const handleFollow = () => {
        // Issue subscription action  (What to folow? new/edited analyses? images?)
    }
    const handleImageSearch = () => {
        // Popup image search?
    }
    const handleAnalysisSearch = () => {
        // Popup analysis search?
    }
    return (
        <GenericObjectView id={props.objectID} fields={fields} actions={actions} model={props.model} />
    )

}

const WrappedEquipView = (props) => {
    const fields = [
        { label: 'Name', value: props.model.name},
        { label: 'Description', value: props.model.description},
        { label: 'Camera', value: props.model.camera},
        { label: 'Has temp control?', value: props.model.has_temp_control},
        { label: 'Image size (pixels): ', value: props.model.pixels_x ? `${props.model.pixels_x} x ${props.model.pixels_y}`: 'Not defined'},
        { label: 'FOV size (mm): ', value: props.model.fov_x ? `${props.model.fov_x} x ${props.model.fov_y}` : 'Not defined'},
        { label: 'Bits per px', value: props.model.bpp},
        { label: 'File format', value: props.model.file_format},
    ];  
    const actions = [];      
    return (
        <GenericObjectView id={props.objectID} fields={fields} actions={actions} model={props.model} />
    )

}

const UserView = withRouter(connectView(WrappedUserView, 'user'));
const EquipView = withRouter(connectView(WrappedEquipView, 'equip'));
const ImageView = withRouter(connectView(WrappedImageView, 'image'));

export {
    UserView,
    EquipView,
    ImageView,
}

