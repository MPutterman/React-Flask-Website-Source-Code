// TODO:
// * As we implement filters, think whether re-use strategy makes sense
//     (i.e. would using a HOC to tack on back-end make sense)?
// * Filtering provided by properties (e.g. for modal searches), but also
//     provide controls to add/change filters
// * Add support for more filters.  Use backend filtering for these:
//     Global (all object types): text search
//     Users: org_id
//     Images: owner_id, org_id, created date or range
//     Analyses: owner_id, org_id, created date or range
//     Equipment: org_id
// * Add some options to update preferences (i.e. set default dark or flat)
//     to the selected ones in an Analysis (if differ from prefs)?  Or add to
//     favorites. Or does this feature belong in the analysis_edit component?
// * Limitation: DataGrid only supports 1 column of filtering
//
// Usage:
//   Composed into object-specific search components.
//   Render: <ObjectSearch objectType columns filters onSelect />
//
// RESOURCES:
// * https://material-ui.com/api/data-grid/ (DataGrid documentation)
// * https://material-ui.com/components/data-grid/columns/#column-definitions
//     (DataGrid column definitions)

import React, {useState, useEffect } from "react";
import { useConfigState } from "../contexts/config";
import { useHistory } from 'react-router-dom';
import { callAPI } from '../helpers/api';
import { withRouter } from "react-router";
import { DataGrid, GridLinkOperator } from "@material-ui/data-grid";
import { createFilterModel } from "../helpers/search_utils";
import Busy from '../components/busy';

const ObjectSearch = (props) => {

    const history = useHistory();
    const config = useConfigState();    

    const object_type = props.objectType;
    const columns = props.columns;

    const id_column = () => {
        switch (object_type) {
            case 'analysis': return 'id';
            default:
                return `${object_type}_id`;
        }
    }

    // State
    const [loaded, setLoaded] = useState(false); // Support for loading indicator
    const [objectList, setObjectList] = useState([]);

    // Retrieve list of images
    const loadObjects = (filters) => {
        return callAPI('GET', `${object_type}/search`)
        .then((response) => {
            // Reformat... return as array indexed by ID... but DataGrid wants list of dicts
            response.data.map((element, index) => {
                element['id'] = element[id_column()];
            });
            setObjectList(response.data);
            setLoaded(true);
        })
        .catch((e) => {
            console.error("GET /image/search (filters: " + filters + "): " + e);
            setLoaded(true); // TODO: does this make sense to  (yes, it will stop the spinning wheel)??
        });
    }

    useEffect(() => {
        loadObjects(); 
    }, []); 

    const onReset = () => {
        // TODO: Reset all filters and sorting to defaults
    }

    const onRowClick = (param, event) => {
        // If props.onSelect callback is set, call it with the model value
        // ... set 'id' and 'name' properties
        if (props.onSelect) {
            props.onSelect({...param.row,
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
      <Busy busy={!loaded} />
      <div >     
          {objectList.length > 0 ? (
              <DataGrid
                  rows={objectList}
                  columns={columns}
                  pageSize={10} // default page size
                  autoHeight
                  loading={!loaded}
                  density="compact"
                  rowsPerPageOptions={config.general.searchresult_pagesize_options}
                  paginationMode="client" // for now client (and return all rows)... later use database pagination
                  sortingMode="client" // later server (if pagination server)
                  //checkboxSelection
                  onRowClick={onRowClick}
                  filterModel={createFilterModel(props.filter)}
                  
              />
          ) : ( <p>No results found</p>)}
          
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
      { field: 'owner_id', headerName: 'Owner ID', flex: 1},
      { field: 'captured', headerName: 'Captured', flex: 1},
      { field: 'created', headerName: 'created', hide: true, flex: 1},
      { field: 'modified', headerName: 'modified', hide: true, flex: 1},
      { field: 'exp_time', headerName: 'Exposure time', hide: true, flex: 1},
      { field: 'exp_temp', headerName: 'Exposure temp', hide: true, flex: 1},
      { field: 'image_path', headerName: 'Image path', hide: true, flex: 2},
    ];

    return (
        <ObjectSearch {...props} objectType='image' columns={columns} />
    )
}

const XAnalysisSearch = (props) => {

    const columns = [
      { field: 'analysis_id', headerName: 'Analysis ID', flex: 0.1},
      { field: 'name', headerName: 'Name', flex: 0.3},
      { field: 'description', headerName: 'Description', flex: 0.5},
      { field: 'owner_id', headerName: 'Owner ID', flex: 0.1},
      { field: 'expt_datetime', headerName: 'Experiment date', flex: 0.2},
      { field: 'modified', headerName: 'Modified', hidden: true, flex: 0.1},
      { field: 'created', headerName: 'Created', hidden: true, flex: 0.1},
      // TODO: other analysis options, image IDs, equip_id, plate_id, cover_id, etc...
    ];    

    return (
        <ObjectSearch {...props} objectType='analysis' columns={columns} />
    )

}

const XEquipSearch = (props) => {

    const columns = [
      { field: 'equip_id', headerName: 'ID', flex: 1},
      { field: 'name', headerName: 'Name', flex: 3},
      { field: 'camera', headerName: 'Camera', hide: true, flex: 3},
      { field: 'description', headerName: 'Description', flex: 3},
      { field: 'has_temp_control', headerName: 'Temp Control?', hide: true, flex: 1},
      { field: 'pixels_x', headerName: 'Image size - X (px)',  hide: true,  flex: 1},
      { field: 'pixels_y', headerName: 'Image size - Y (px)', hide: true,  flex: 1},
      { field: 'fov_x', headerName: 'FOV - X (mm)', hide: true, flex: 1},
      { field: 'fov_y', headerName: 'FOV - Y (mm)', hide: true, flex: 1},
      { field: 'bpp', headerName: 'Bits per px', hide: true, flex: 1},
      { field: 'file_format', headerName: 'File Format', flex: 2},
    ];

    return (
        <ObjectSearch {...props} objectType='equip' columns={columns} />
    )

}

const UserSearch = withRouter(XUserSearch);
const ImageSearch = withRouter(XImageSearch);
const EquipSearch = withRouter(XEquipSearch);
const AnalysisSearch = withRouter(XAnalysisSearch);

export {
    ImageSearch,
    EquipSearch,
    UserSearch,
    AnalysisSearch,
};