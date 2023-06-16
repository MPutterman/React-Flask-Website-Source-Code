// TODO:
// * BUG: if there are results, but CLIENT-side filtering has zero results, then get a blank screen
// * As we implement filters, think whether re-use strategy makes sense
//     (i.e. would using a HOC to tack on back-end make sense)?
// * Filtering provided by properties (e.g. for modal searches), but also
//     provide controls to add/change filters
// * Add support for more filters.  Use backend filtering for these:
//     Global (all object types): text search
//     Users: org_id
//     Images: owner_id, org_id, created date or range
//     Analyses: owner_id, org_id, created date or range
//     Equipment, Plate, Cover: org_id
// * Add some options to update preferences (i.e. set default dark or flat)
//     to the selected ones in an Analysis (if differ from prefs)?  Or add to
//     favorites. Or does this feature belong in the analysis_edit component?
// * Limitation: DataGrid only supports 1 column of filtering
// * TODO: provide a way to only show the datagrid, and suppress title, controls, etc...
// * Separate incoming filters (props.filter) into server-side and client-side
//
// Usage:
//   Composed into object-specific search components.
//   Render: <ObjectSearch objectType columns filters onSelect title />
//
// RESOURCES:
// * https://material-ui.com/api/data-grid/ (DataGrid documentation)
// * https://material-ui.com/components/data-grid/columns/#column-definitions
//     (DataGrid column definitions)

import React, {useState, useEffect } from "react";
import { useConfigState } from "../contexts/config";
import { useSessionState } from "../contexts/session";
import { useHistory } from 'react-router-dom';
import { useThrobber } from '../contexts/throbber';
import { useErrorResponse } from '../contexts/error';
import { callAPI } from '../helpers/api';
import { withRouter } from "react-router";
import { DataGrid, GridLinkOperator } from "@material-ui/data-grid";
import { createFilterModel } from "../helpers/search_utils";
import { ObjectIcon, objectTitle } from "../helpers/object_utils";
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Avatar from '@material-ui/core/Avatar';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FavoriteIcon from '@material-ui/icons/Star';
/*
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Avatar from '@mui/material/Avatar';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FavoriteIcon from '@mui/icons-material/Star';
*/
const ObjectSearch = ({
    objectType:object_type,
    columns,
    filter:incoming_filter,
    onSelect,
    title,
    ...props }) => {

    const history = useHistory();
    const config = useConfigState();
    const setBusy = useThrobber();  
    const setErrorResponse = useErrorResponse();
    const { prefs } = useSessionState();  

    // Keep array of filters.  Most will be dict tuples, but special
    // ones are just strings, e.g. 'favorites'
    const [filter, setFilter] = React.useState(incoming_filter ? incoming_filter : []);

    const filterAdd = (f) => {
        // TODO: check for unique filters?
        setFilter((prev) => { return [...prev, f]; });
    }

    const filterRemove = (f) => {
        setFilter((prev) => {
            return prev.filter(function(value, index, arr) {
                return value != f;
            });
        })
    }

    // Convenience function
    const id_column = () => {
        return `${object_type}_id`;
    }

    // State
    const [loaded, setLoaded] = useState(false); // Support for loading indicator
    const [objectList, setObjectList] = useState([]);

    // Filter handlers
    // For now just a checkbox for favorites. In future may be a more extensive
    // form with search and sort options and other special filters
    const onFavoritesChange = (event) => {
        if (event.target.checked) {
            filterAdd('favorites');
        } else {
            filterRemove('favorites');
        }
    }

    // Retrieve list of images
    const loadObjects = (filters=[]) => {
        setBusy(true);
        var url = `/api/${object_type}/search`;
        if (filters.includes('favorites')) url += '/favorites';
        callAPI('GET', url)
        .then((response) => {
            if (response.error) {
                // TODO: handle some specific errors (e.g. unauthorized) or add error details?
                setErrorResponse({code: response.status, details: response.data.error ? response.data.error : '' });
                setLoaded(true);
                setBusy(false);
                return false;
            }
            else {
                // Reformat... return as array indexed by ID... but DataGrid wants list of dicts
                response.data.results.map((element, index) => {
                    element['id'] = element[id_column()];
                });
                setObjectList(response.data.results);
                setLoaded(true);
                setBusy(false);
                return true;
            }
        });
    }

    useEffect(() => {
        loadObjects(filter); 
    }, [filter]); 

    const onReset = () => {
        // TODO: Reset all filters and sorting to defaults
    }

    const onRowClick = (param, event) => {
        // If onSelect callback is set, call it with the model value
        // ... set 'id' and 'name' properties
        if (onSelect) {
            onSelect({...param.row,
                id: param['id'],
//                name: param.row['name'],
            });
        } else {
            // Redirect to the object view page
            const url = `/${object_type}/view/${param['id']}`; // row id is the object_id
            history.push(url);
        }
    }

    return (
        <>
            <div >
                <Card>
                <CardHeader
                    avatar={
                        <Avatar variant="square">
                            <ObjectIcon objectType={object_type} fontSize='large' />
                        </Avatar>
                    }
                    title={title ? title : `SEARCH ${objectTitle(object_type).toUpperCase()}`}
                    action={
                        <FormControlLabel
                            control={<Checkbox defaultChecked={filter.includes('favorites')} onChange={onFavoritesChange} />}
                            label="Search only favorites"
                        />}
                        

                />
                <CardContent>
                    <DataGrid
                        rows={objectList}
                        columns={columns}
                        pageSize={prefs ? prefs.search.default_pagesize : config.search.default_pagesize}
                        autoHeight
                        loading={!loaded}
                        density="compact"
                        rowsPerPageOptions={config.search.pagesize_options}
                        paginationMode="client" // for now client (and return all rows)... later use database pagination
                        sortingMode="client" // later server (if pagination server)
                        //checkboxSelection
                        onRowClick={onRowClick}
                        filterModel={createFilterModel(incoming_filter)}
                        
                    />
                </CardContent>
                <CardActions>
                </CardActions>
            </Card>

        </div>
        </>
      );
}

// Object-type specific search forms. The 'X' prefix is a temporary name
// as they will be wrapped before export.  In future could separate into
// individual files and use export default withRouter(...) 

const XUserSearch = (props) => {

    const columns = [
      { field: 'user_id', headerName: 'User ID', flex: 0.1},
      { field: 'first_name', headerName: 'First name', flex: 0.2},
      { field: 'last_name', headerName: 'Last name', flex: 0.2},
      { field: 'email', headerName: 'Email address', flex: 0.4},
      { field: 'org_id', headerName: 'Org ID', hide: true, flex: 0.1},
      { field: 'is_active', headerName: 'Active?', hide: true, flex: 1},
      { field: 'created', headerName: 'Created', hide: true, flex: 1},
      { field: 'modified', headerName: 'Modified', hide: true, flex: 1},
      { field: 'is_deleted', headerName: 'Deleted?', hide: true, flex: 1},
    ];

    return (
        <ObjectSearch {...props} objectType='user' columns={columns} />
    )

}
const XImageSearch = (props) => {

    const columns = [
      { field: 'image_id', headerName: 'ID', flex: 1},
      { field: 'image_type', headerName: 'Type', flex: 1},
      { field: 'name', headerName: 'Name', flex: 2},
      { field: 'equip_id', headerName: 'Equipment ID', flex: 1},
      { field: 'captured', headerName: 'Captured', flex: 1},
      { field: 'exp_time', headerName: 'Exposure time', hide: true, flex: 1},
      { field: 'exp_temp', headerName: 'Exposure temp', hide: true, flex: 1},
      { field: 'image_path', headerName: 'Image path', hide: true, flex: 2},
      { field: 'owner_id', headerName: 'Owner ID', hide: true, flex: 1},
      { field: 'created', headerName: 'Created', hide: true, flex: 1},
      { field: 'modified', headerName: 'Modified', hide: true, flex: 1},
      { field: 'is_deleted', headerName: 'Deleted?', hide: true, flex: 1},
    ];

    return (
        <ObjectSearch {...props} objectType='image' columns={columns} />
    )
}

// TODO: other analysis options, image IDs, equip_id, plate_id, cover_id, etc...
const XAnalysisSearch = (props) => {

    const columns = [
      { field: 'analysis_id', headerName: 'Analysis ID', flex: 0.1},
      { field: 'name', headerName: 'Name', flex: 0.3},
      { field: 'description', headerName: 'Description', flex: 0.5},
      { field: 'expt_datetime', headerName: 'Experiment date', flex: 0.2},
      { field: 'owner_id', headerName: 'Owner ID', hide: true, flex: 1},
      { field: 'created', headerName: 'Created', hide: true, flex: 1},
      { field: 'modified', headerName: 'Modified', hide: true, flex: 1},
      { field: 'is_deleted', headerName: 'Deleted?', hide: true, flex: 1},
    ];    

    return (
        <ObjectSearch {...props} objectType='analysis' columns={columns} />
    )

}

const XEquipSearch = (props) => {

    const columns = [
      { field: 'equip_id', headerName: 'ID', flex: 1},
      { field: 'name', headerName: 'Name', flex: 3},
      { field: 'description', headerName: 'Description', hide: true, flex: 3},
      { field: 'manufacturer', headerName: 'Manufacturer', flex: 3},
      { field: 'catalog', headerName: 'Catalog #', flex: 3},
      { field: 'camera', headerName: 'Camera', hide: true, flex: 3},
      { field: 'has_temp_control', headerName: 'Temp Control?', hide: true, flex: 1},
      { field: 'pixels_x', headerName: 'Image size - X (px)',  hide: true,  flex: 1},
      { field: 'pixels_y', headerName: 'Image size - Y (px)', hide: true,  flex: 1},
      { field: 'fov_x', headerName: 'FOV - X (mm)', hide: true, flex: 1},
      { field: 'fov_y', headerName: 'FOV - Y (mm)', hide: true, flex: 1},
      { field: 'bpp', headerName: 'Bits per px', hide: true, flex: 1},
      { field: 'file_format', headerName: 'File Format', flex: 2},
      { field: 'owner_id', headerName: 'Owner ID', hide: true, flex: 1},
      { field: 'created', headerName: 'Created', hide: true, flex: 1},
      { field: 'modified', headerName: 'Modified', hide: true, flex: 1},
      { field: 'is_deleted', headerName: 'Deleted?', hide: true, flex: 1},
    ];

    return (
        <ObjectSearch {...props} objectType='equip' columns={columns} />
    )
}

const XPlateSearch = (props) => {

    const columns = [
      { field: 'plate_id', headerName: 'ID', flex: 1},
      { field: 'name', headerName: 'Name', flex: 3},
      { field: 'description', headerName: 'Description', hide: true, flex: 3},
      { field: 'manufacturer', headerName: 'Manufacturer', flex: 3},
      { field: 'catalog', headerName: 'Catalog #', flex: 3},
      { field: 'owner_id', headerName: 'Owner ID', hide: true, flex: 1},
      { field: 'created', headerName: 'Created', hide: true, flex: 1},
      { field: 'modified', headerName: 'Modified', hide: true, flex: 1},
      { field: 'is_deleted', headerName: 'Deleted?', hide: true, flex: 1},
    ];
    return (
        <ObjectSearch {...props} objectType='plate' columns={columns} />
    )
}

const XCoverSearch = (props) => {

    const columns = [
      { field: 'cover_id', headerName: 'ID', flex: 1},
      { field: 'name', headerName: 'Name', flex: 3},
      { field: 'description', headerName: 'Description', hide: true, flex: 3},
      { field: 'manufacturer', headerName: 'Manufacturer', flex: 3},
      { field: 'catalog', headerName: 'Catalog #', flex: 3},
      { field: 'owner_id', headerName: 'Owner ID', hide: true, flex: 1},
      { field: 'created', headerName: 'Created', hide: true, flex: 1},
      { field: 'modified', headerName: 'Modified', hide: true, flex: 1},
      { field: 'is_deleted', headerName: 'Deleted?', hide: true, flex: 1},
    ];
    return (
        <ObjectSearch {...props} objectType='cover' columns={columns} />
    )
}

const XOrgSearch = (props) => {

    const columns = [
      { field: 'org_id', headerName: 'ID', flex: 1},
      { field: 'name', headerName: 'Name', flex: 3},
      { field: 'description', headerName: 'Description', hide: true, flex: 3},
      { field: 'location', headerName: 'Address', flex: 3},
      { field: 'owner_id', headerName: 'Owner ID', hide: true, flex: 1},
      { field: 'created', headerName: 'Created', hide: true, flex: 1},
      { field: 'modified', headerName: 'Modified', hide: true, flex: 1},
      { field: 'is_deleted', headerName: 'Deleted?', hide: true, flex: 1},
    ];
    return (
        <ObjectSearch {...props} objectType='org' columns={columns} />
    )
}

const UserSearch = withRouter(XUserSearch);
const OrgSearch = withRouter(XOrgSearch);
const EquipSearch = withRouter(XEquipSearch);
const PlateSearch = withRouter(XPlateSearch);
const CoverSearch = withRouter(XCoverSearch);
const ImageSearch = withRouter(XImageSearch);
const AnalysisSearch = withRouter(XAnalysisSearch);

export {
    UserSearch,
    OrgSearch,
    EquipSearch,
    PlateSearch,
    CoverSearch,
    ImageSearch,
    AnalysisSearch,
};