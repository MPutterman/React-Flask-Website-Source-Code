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
// * Additional fields not working well -- date format issues, checkbox missing label, need to find a way to 
//     get name lookup for owner_id
// * For org, add logo field?

import React from "react";
import { callAPI } from '../helpers/api';
import { withRouter } from "react-router";
import Button from "@material-ui/core/Button";
import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Avatar from '@material-ui/core/Avatar';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import IconButton from '@material-ui/core/IconButton';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import IDInputField from '../components/idfield';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import { useErrorResponse } from '../contexts/error';
import { StatusCodes } from 'http-status-codes';
import { useAlerts } from '../contexts/alerts';
import { useConfirm } from 'material-ui-confirm';
import { useThrobber } from '../contexts/throbber';
import { useConfigState } from '../contexts/config';
import { useHistory } from "react-router-dom";
import { ObjectFavoriteButton, ObjectEditButton, ObjectDeleteButton, ObjectRestoreButton, ObjectPurgeButton } from '../helpers/object_utils';
import { hasPermission, listPermissions } from '../helpers/object_utils';
import { objectIcon, objectTitle } from '../helpers/object_utils';
import { ServerImage } from '../components/server_file';
import { name_lookup } from '../helpers/validation_utils';

// Object type icons
// TODO: create these from objectIcon(type)?
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
    const setBusy = useThrobber();

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

    // Retrieve user with specified id from the database
    function objectLoad(id) {
        if (id) {
            setBusy(true);
            callAPI('GET', `${object_type}/load/${id}`) // change to api/object/load/id
            .then((response) => {

              if (response.error) {

                // TODO: handle some specific errors (e.g. unauthorized) or add error details?
                setErrorResponse({code: response.status, details: response.data.error ? response.data.error : '' });
                setLoaded(true);
                setBusy(false);
                return false;

              } else {

                setModel(response.data);
		      console.log('model loaded: ', response.data);
                setLoaded(true);
                setBusy(false);
                return true;
              
              }

            });
        }
        return true;
    }

    return (

        <Card>
            <CardHeader
                avatar={
                    <Avatar variant="square">
                        {React.createElement(objectIcon(object_type), {fontSize:'large'})}
                    </Avatar>
                }
                title={`VIEW ${objectTitle(object_type).toUpperCase()}`}
                subheader={`${model.name || ''}`}
                // If has permission to edit, show edit button. (Make delete etc. only available in edit mode.)
                action={
                    <>
                    <ObjectFavoriteButton objectType={object_type} objectID={id} />
                    {permissions.includes('edit') ? (<ObjectEditButton objectType={object_type} objectID={id} />) : ( <></> )}
                    </>
                }
            />
            <CardContent>

                <WrappedView id={id} model={model} />

                {/* Metadata */}
                <Box pt={1}>
                    {model.is_deleted ? (<Box>THIS RECORD HAS BEEN DELETED</Box>) : (<></>)}
                    <Box display="flex" flexDirection="row">
                        <Box width='9%' pr={1}>
                            <TextViewField label='ID' value={model[`${object_type}_id`] || ''} />
                        </Box>
                        <Box width='28%' px={1}>
                            <DatetimeViewField label="Last modified" value={model.modified} format='datetime' />
                        </Box>
                        <Box width='28%' px={1}>
                            <DatetimeViewField label="Created" value={model.created} format='datetime' />
                        </Box>
                        <Box width='35%' pl={1}>
                            <IDViewField label="Owner" objectType='user' objectID={model.owner_id} />
                        </Box>
                    </Box>
                </Box>

            </CardContent>

            <CardActions disableSpacing>
            </CardActions>

        </Card>

    )
    
}
}

// Utilities

// Render an ID field (show the name, and provide link to view the ojbect)
// TODO: add options for clickable link (e.g. enable, popup versus redirect, etc...)
const IDViewField = ({objectType, objectID, label=null, icon:Icon=null }) => { 

    const [name, setName] = React.useState('');
    //const fieldName = `${objectType}_id`;
    const fieldLabel = (label === null) ? objectTitle(objectType) : label;
    const FieldIcon = (Icon === null) ? objectIcon(objectType) : Icon;
    const history = useHistory();

    React.useEffect(() => {
        if (objectType && objectID) {
            name_lookup(objectType, objectID)
            .then((name) => {
                setName(name);
            });
        }
    },[objectType,objectID]);

    const onClick = (event) => {
        history.push(`/${objectType}/view/${objectID}`);
    }

    return (
	<TextViewField icon={FieldIcon} label={fieldLabel} value={name} onClick={onClick} />
    )
}

const DatetimeViewField = ({icon:Icon=null, label, value, onClick=null, format='datetime'}) => {
    var datetimeString = '';
    if (value !== null && value instanceof Date) {
	// TODO: fix: this may not work if value is only a date or time
	// Uncorrect the conversion to local time used for edit fields
	const localDatetime = new Date (value.getTime() + value.getTimezoneOffset() * 60 * 1000);
	switch (format) {
	    case 'date': datetimeString = localDatetime.toLocaleDateString(); break;
	    case 'time': datetimeString = localDatetime.toLocaleTimeString(); break;
	    case 'datetime': datetimeString = localDatetime.toLocaleString(); break;
            default: break;
        }
    }
    return (
        <TextViewField icon={Icon} label={label} value={datetimeString} onClick={onClick} />
    );
}

	
const TextViewField = ({icon:Icon=null, label, value, onClick=null}) => {
    return (
	<Paper p={1} m={0} square={true} className='view-field' >
	<Box display='flex' flex_direction='row' onClick={onClick} p={0} m={0}>
	    <Box p={0} m={0} mr={1}>
	        {Icon ? ( <Icon /> ) : ( <></> )}
	    </Box>
	    <Box p={0} m={0} ml={1}>
	        <Typography color='textSecondary'> {label} </Typography>
	        <Typography color='textPrimary'> {value || '\u00A0' /* &nbsp; */} </Typography>
	    </Box>
	</Box>
	</Paper>
    );
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
            {props.fields.map(({icon: Icon, label, type, value}) => (
        		<TextViewField icon={Icon} label={label} value={value} />
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

// TODO: show a thumbnail (generate when upload -- maximuimze contrast/range)
const WrappedImageView = ({model}) => {
    return (
	<>
	<Box display='flex' flexDirection='row'>
	    <Box width='40%' pr={1}>
	        <TextViewField label='Name' value={model.name} />
	    </Box>
	    <Box width='60%' pl={1}>
	    	<IDViewField objectType='equip' objectID={model.equip_id}  />
	    </Box>
	</Box>
	<TextViewField label='Description' value={model.description} />
	<Box display='flex' flexDirection='row'>
	    <Box width='40%' pr={1}>
	    	<TextViewField icon={DateTimeIcon} label='Captured' value={model.capture} />
	    </Box>
	    <Box width='30%' px={1}>
	    	<TextViewField icon={ExposureTimeIcon} label='Exposure time' value={model.exp_time} />
	    </Box>
	    <Box width='30%' pl={1}>
	    	<TextViewField label='Exposure temp' value={model.exp_temp} />
	    </Box>
	</Box>
	</>
    );
}

// TODO: add some actions... search images or analyses by user.   Maybe 'contact'?
const WrappedUserView = ({model, ...props}) => {
    const config = useConfigState();

    return (
        <Box display='flex' flexDirection='row'>
	    <Box width='20%'>
            {model.thumbnail_url ? (
		        <ServerImage url={model.thumbnail_url} height='100%'/>
	        ) : (
                <img src={config.general.user_thumbnail_blank_url} height='100%'/>
            )}
	    </Box>
	    <Box width='80%'>
	    	<TextViewField icon={UserIcon} label="Name" value={`${model.first_name} ${model.last_name}`} />
            <IDViewField objectType='org' objectID={model.org_id}  />
	    </Box>
	</Box>
    )
}

const WrappedEquipView = ({model}) => {
    return (
	<>
	<Box display='flex' flexDirection='row' p={0} m={0} mb={2}>
	    <Box width='40%' mr={1}>
	        <TextViewField label='Name' value={model.name} />
	    </Box>
	    <Box width='30%' mx={1}>
	    	<TextViewField label='Manufacturer' value={model.manufacturer} />
	    </Box>
	    <Box width='30%' ml={1}>
	    	<TextViewField label='Model' value={model.catalog} />
	    </Box>
	</Box>
	<Box p={0} m={0} mb={2}>
	    <TextViewField label='Description' value={model.description} />
	</Box>
	<Box display='flex' flexDirection='row' p={0} m={0} mb={2}>
	    <Box width='20%' mr={1}>
	    	<TextViewField label='Image size (pixels)'
                value={model.pixels_x ? `${model.pixels_x} x ${model.pixels_y}`: 'Not defined'}
	        />
	    </Box>
	    <Box width='20%' mx={1}>
	    	<TextViewField
	            label='FOV size (mm)'
                value={model.fov_x ? `${model.fov_x} x ${model.fov_y}`: 'Not defined'}
	        />
            </Box>
	    <Box width='20%' mx={1}>
	        <TextViewField label='Temp control?' value={model.has_temp_control ? 'Yes' : 'No'} />
	    </Box>
	    <Box width='20%' mx={1}>
		    <TextViewField label='Bits per px' value={model.bpp} />
	    </Box>
	    <Box width='20%' ml={1}>
		    <TextViewField label='File format' value={model.file_format} />
	    </Box>
	</Box>
	</>
    );
}

// TODO: add a map? (or link to map) 
// TODO: add a logo
const WrappedOrgView = ({model}) => {
    return (
        <>
        <Box display='flex' flexDirection='row'>
            <Box width='50%' pr={1}>
                <TextViewField label='Name' value={model.name} />
            </Box>
        </Box>
        <TextViewField label='Description' value={model.description} />
        <TextViewField label='Location' value={model.location} />
        </>
    );
}

const WrappedPlateView = ({model}) => {
    return (
        <>
        <Box display='flex' flexDirection='row'>
            <Box width='40%' pr={1}>
                <TextViewField label='Name' value={model.name} />
            </Box>
            <Box width='30%' px={1}>
                <TextViewField label='Manufacturer' value={model.manufacturer} />
            </Box>
            <Box width='30%' pl={1}>
                <TextViewField label='Part number' value={model.catalog} />
            </Box>
        </Box>
        <TextViewField label='Description' value={model.description} />
        </>
    );
}

const WrappedCoverView = ({model}) => {
    return (
        <>
        <Box display='flex' flexDirection='row'>
            <Box width='40%' pr={1}>
                <TextViewField label='Name' value={model.name} />
            </Box>
            <Box width='30%' px={1}>
                <TextViewField label='Manufacturer' value={model.manufacturer} />
            </Box>
            <Box width='30%' pl={1}>
                <TextViewField label='Part number' value={model.catalog} />
            </Box>
        </Box>
        <TextViewField label='Description' value={model.description} />
        </>
    );
}

const WrappedAnalysisView = ({model, objectID}) => {
    const fields = [
        { label: 'Name', value: model.name },
        { label: 'Description', value: model.description },
        // TODO: support all analysis properties, and images...
        // TODO: show the image with ROIs and results table
    ];
    const actions = [];
    return (
        <GenericObjectView id={objectID} fields={fields} actions={actions} model={model} />
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

