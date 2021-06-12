// TODO:
// * Add filters and sorting (server side) in case of large number of elements.  Will need a form to do this.

import React, {useState, useEffect } from "react";
import { useHistory } from 'react-router-dom';
import { callAPI } from '../components/api';
import { withRouter } from "react-router";
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import Button from "@material-ui/core/Button";
import { DataGrid } from "@material-ui/data-grid";
import Busy from '../components/busy';

const EquipSearch = (props) => {

    const history = useHistory();

    // Define columns to show in results list
    // TODO: do we want to display organization(s)?
    // TODO: add the capability to filter by organization, or by default to choose
    //  the equipment listed in preference?

    const columns = [
      { field: 'equip_id', headerName: 'ID', flex: 0.1},
      { field: 'name', headerName: 'Name', flex: 0.3},
      { field: 'camera', headerName: 'Camera', flex: 0.3},
      { field: 'description', headerName: 'Description', flex: 0.3},
      { field: 'has_temp_control', headerName: 'Temp Control?', flex: 0.1},
      { field: 'pixels_x', headerName: 'Image size - X (px)', flex: 0.1},
      { field: 'pixels_y', headerName: 'Image size - Y (px)', flex: 0.1},
      { field: 'fov_x', headerName: 'FOV - X (mm)', flex: 0.1},
      { field: 'fov_y', headerName: 'FOV - Y (mm)', flex: 0.1},
      { field: 'bpp', headerName: 'Bits per px', flex: 0.1},
      { field: 'image_format', headerName: 'Image Format', flex: 0.1},
    ];

    // State
    const [loading, setLoading] = useState(true); // Support for loading indicator
    const [list, setList] = useState([]);

    // Retrieve list of records
    const getList = (filters) => {
        setLoading(true);
        return callAPI('GET', 'equip/search')
        .then((response) => {
            // Reformat... return as array indexed by ID... but DataGrid wants list of dicts
            response.data.map((element, index) => {
                element['id'] = element['equip_id']; 
            })
            setList(response.data);
            setLoading(false);
        })
        .catch((e) => {
            console.error("GET /equip/search (filters: " + filters + "): " + e);
            setLoading(false);
        });
    }

    useEffect(() => {
        getList(); 
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
            const url = '/equip/edit/' + param['id']; // row id is the equip_id
            history.push(url);
        }
    }

    // Returns the search options form and then the search results list
    return (
      <>
      <Busy busy={loading} />
      <div className="EquipSearchForm" width="100%">     
          {list.length > 0 ? (
              <DataGrid
                  rows={list}
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
                  
              />
          ) : ( <p>No results found</p>)}
          
        </div>
        </>
      );
}

export default withRouter(EquipSearch);
