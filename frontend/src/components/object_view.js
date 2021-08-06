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
// * Do we really a need a separate view and edit page?  They are very similar. Edit can be made into view
//     by wrapping all form elements in <fieldset disabled=true readOnly=true>. But the Material-UI elements
//     still show things like '*' for required fields.  Also a few cases where the public should not
//     see all the fields, e.g. a user profile.  Hmm... Maybe MOST objects can be the same but UserProfile
//     is a different view?

import React from "react";
import { callAPI } from '../helpers/api';
import { withRouter } from "react-router";
import Button from "@material-ui/core/Button";
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Avatar from '@material-ui/core/Avatar';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import IDIcon from '@material-ui/icons/Fingerprint';
import { useErrorResponse } from '../contexts/error';
import { StatusCodes } from 'http-status-codes';
import { useAlerts } from '../contexts/alerts';
import { useConfirm } from 'material-ui-confirm';
import Busy from '../components/busy';
import { ObjectEditButton, ObjectDeleteButton, ObjectRestoreButton, ObjectPurgeButton } from '../helpers/object_utils';
import { hasPermission, listPermissions } from '../helpers/object_utils';
import { objectIcon, objectTitle } from '../helpers/object_utils';


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
//import ExposureTempIcon from '@material-ui/icons/Thermostat';
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
    const [permissions, setPermissions] = React.useState([]);

    // When id is set, check permissions (cache them in state) and load object
    React.useEffect(() => {
        if (id) {
            listPermissions(object_type, id)
            .then((list) => {
                setPermissions(list);
                if (list.includes('view')) {
                    objectLoad(id);
                } else {
                    setErrorResponse({code: StatusCodes.FORBIDDEN, details: 'Not Authorized' });
                }
            });
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
            <CardHeader
                avatar={
                    <Avatar variant="square">
                        {React.createElement(objectIcon(object_type), {fontSize:'large'})}
                    </Avatar>
                }
                title={`VIEW ${objectTitle(object_type).toUpperCase()}`}
                subheader={`${model.name || ''}`}
                action={<>
                </>}
            />
            <CardContent>

                <WrappedView id={id} model={model} />

                <Divider />
                Metadata:
                <Grid fullWidth container direction='row' justifyContent='space-between'>
                    <TextField label={`${objectTitle(object_type)} ID`} value={id || ''} />
                    <TextField label="Owner ID" value={model.owner_id || ''} />
                    <TextField label="Created" value={model.created || ''} />
                    <TextField label="Last modified" value={model.modified || ''} />
                    <TextField label="Is deleted?" value={model.is_deleted} />
                </Grid>

            </CardContent>

            <CardActions disableSpacing>

                {permissions.includes('edit') ? (<ObjectEditButton objectType={object_type} objectID={id} />) : ( <></> )}
                {(permissions.includes('delete') && !model.is_deleted) ? (<ObjectDeleteButton objectType={object_type} objectID={id} />) : ( <></> )}
                {(permissions.includes('restore') && model.is_deleted) ? (<ObjectRestoreButton objectType={object_type} objectID={id} />) : ( <></> )}
                {permissions.includes('purge') ? (<ObjectPurgeButton objectType={object_type} objectID={id} />) : ( <></> )}

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
//   - permissions is an array of string with permission names
// Pass-through props: objectType

const GenericObjectView = (props) => {

    return (
        <Grid container direction='row'>
        <Grid item>
        <Box flexDirection='row' py={1}>
            {props.fields.map(({icon, label, type, value}) => (
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
        {icon: OrganizationIcon, label: 'Organization', value: props.model.org_id },
        {icon: null, label: 'Is active?', value: props.model.is_active },
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

const WrappedOrgView = (props) => {
    const fields = [
        { label: 'Name', value: props.model.name },
        { label: 'Description', value: props.model.description },
        { label: 'Location', value: props.model.address },
        // TODO: support photo(s) upload?
    ];
    const actions = [];
    return (
        <GenericObjectView id={props.objectID} fields={fields} actions={actions} model={props.model} />
    )
}

const WrappedPlateView = (props) => {
    const fields = [
        { label: 'Name', value: props.model.name },
        { label: 'Description', value: props.model.description },
        { label: 'Manufacturer', value: props.model.manufacturer },
        { label: 'Part number', value: props.model.catalog },
        // TODO: support photo(s) upload?
    ];
    const actions = [];
    return (
        <GenericObjectView id={props.objectID} fields={fields} actions={actions} model={props.model} />
    )
}

const WrappedCoverView = (props) => {
    const fields = [
        { label: 'Name', value: props.model.name },
        { label: 'Description', value: props.model.description },
        { label: 'Manufacturer', value: props.model.manufacturer },
        { label: 'Part number', value: props.model.catalog },
        // TODO: support photo(s) upload?
    ];
    const actions = [];
    return (
        <GenericObjectView id={props.objectID} fields={fields} actions={actions} model={props.model} />
    )
}

const WrappedAnalysisView = (props) => {
    const fields = [
        { label: 'Name', value: props.model.name },
        { label: 'Description', value: props.model.description },
        // TODO: support all analysis properties, and images...
        // TODO: show the image with ROIs and results table
    ];
    const actions = [];
    return (
        <GenericObjectView id={props.objectID} fields={fields} actions={actions} model={props.model} />
    )
}


const UserView = withRouter(connectView(WrappedUserView, 'user'));
const OrgView = withRouter(connectView(WrappedOrgView, 'org'));
const EquipView = withRouter(connectView(WrappedEquipView, 'equip'));
const ImageView = withRouter(connectView(WrappedImageView, 'image'));
const AnalysisView = withRouter(connectView(WrappedAnalysisView, 'analysis'));
const PlateView = withRouter(connectView(WrappedPlateView, 'plate'));
const CoverView = withRouter(connectView(WrappedCoverView, 'cover'));

export {
    UserView,
    OrgView,
    EquipView,
    PlateView,
    CoverView,
    ImageView,
    AnalysisView,
}

