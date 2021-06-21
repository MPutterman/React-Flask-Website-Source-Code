// TODO:
// * Add filters and sorting (server side) in case of large number of elements.  Will need a form to do this.
// * Add initial filtering, but DataGrid only supports 1 column filtering...

import React, {useState, useEffect } from "react";
import { useHistory } from 'react-router-dom';
import { callAPI } from '../components/api';
import { withRouter } from "react-router";
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import Button from "@material-ui/core/Button";
import { DataGrid, GridLinkOperator } from "@material-ui/data-grid";
import Busy from '../components/busy';

/* Useful documentation:
   DataGrid documentation: https://material-ui.com/api/data-grid/
   DataGrid column definitions: https://material-ui.com/components/data-grid/columns/#column-definitions
*/

const ImageSearch = (props) => {

    const history = useHistory();

    // Define columns to show in results list
    // TODO: do we want to display organizations, or analyses?
    // TODO: add to database.py the ability to include or exclude organizations and analyses when retrieving images
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

    // State
    const [loading, setLoading] = useState(true); // Support for loading indicator
    const [imageList, setImageList] = useState([]);

    // Retrieve list of images
    const getImageList = (filters) => {
        setLoading(true);
        return callAPI('GET', 'image/search')
        .then((response) => {
            // Reformat... return as array indexed by ID... but DataGrid wants list of dicts
            response.data.map((element, index) => {
                element['id'] = element['image_id']; 
            })
            setImageList(response.data);
            setLoading(false);
        })
        .catch((e) => {
            console.error("GET /image/search (filters: " + filters + "): " + e);
            setLoading(false);
        });
    }

    useEffect(() => {
        getImageList(); 
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
                name: param.row['name'],
            });
        } else {
            // Redirect to the image edit page
            const url = '/image/edit/' + param['id']; // row id is the image_id
            history.push(url);
        }
    }

    // Create filter model for data grid based on props.filter
    // TODO: need to translate the actual operators, but haven't yet found list of
    //   GridFilterModel operators...
    const createFilterModel = (filters) => {
        var filterModel = {
            items: [],
            linkOperator: GridLinkOperator.And,
        };
        filters.forEach(element => {
            filterModel.items.push({
                columnField: element.field,
                operatorValue: element.operator ? element.operator : 'equals',
                value: element.value,
            });
        });
        console.log('heres the filter model=>', filterModel);
        return filterModel;
    }

    // Returns the search options form and then the search results list
    return (
      <>
      <Busy busy={loading} />
      <div className="ImageSearchForm" width="100%">     
          {imageList.length > 0 ? (
              <DataGrid
                  rows={imageList}
                  columns={columns}
                  pageSize={10} // default page size
                  autoHeight
                  loading={loading}
                  density="compact"
                  rowsPerPageOptions={[10,25,100]}
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

export default withRouter(ImageSearch);
