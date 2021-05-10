import React, {useState, useEffect} from "react";
import { useHistory } from 'react-router-dom';
import axios from "axios";
import * as FormData from "form-data";
import backend_url from './config.js';
import { withRouter } from "react-router";
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import Button from "@material-ui/core/Button";
import { DataGrid } from "@material-ui/data-grid";

/* Useful documentation:
   DataGrid documentation: https://material-ui.com/api/data-grid/
   DataGrid column definitions: https://material-ui.com/components/data-grid/columns/#column-definitions
*/

// TODO: add filters and sorting (server side).  Will need a form to do this.

const UserSearch = (props) => {

    const history = useHistory();

    // Define columns to show in results list
    // TODO: do we want to display organizations, or analyses?
    // TODO: add to database.py the ability to include or exclude organizations and analyses when retrieving users
    const columns = [
      { field: 'user_id', headerName: 'User ID', flex: 0.1},
      { field: 'first_name', headerName: 'First name', flex: 0.2},
      { field: 'last_name', headerName: 'Last name', flex: 0.2},
      { field: 'email', headerName: 'Email address', flex: 0.4},
    ];

    // State
    var first_render = true;
    const [userList, setUserList] = useState([]);
    const [organizationList, setOrganizationList] = useState([]);

    // Retrieve user with specified id from the database
    const getUserList = (filters) => {
        axios.get(backend_url('user/search'))
        .then((response) => {
            // Reformat... return as array indexed by ID... but DataGrid wants list of dicts
            response.data.map((element, index) => {
                element['id'] = element['user_id']; 
                //element['id'] = index; // DataGrid requires 'id' property
            })
            setUserList(response.data);
            console.log ("In getUsers: response data => ", response.data);
        })
        .catch((e) => {
            console.error("GET /user/search (filters: " + filters + "): " + e);
        });
    }

    // Retrieve list of organizations
    // NOTE: not being used right now
    const getOrganizationList = () => {
        axios.get(backend_url('organization/search'))
        .then((response) => {
            setOrganizationList(response.data);
            console.log("in getOrganizationList: response data => ", response.data);
        })
        .catch((e) => {
            console.error("GET /organization/search: " + e);
        });
    }

    // useEffect fires after render. This one is conditional on changes in props.match.params.id
    // Because this is set by the url/route, it will be activated the first time the page is visited
    useEffect(() => {
        getUserList(); //(props.match.params.id);
        getOrganizationList();
        console.log("In useEffect #1 => ", userList, organizationList);
        first_render = false;
    }, [first_render]); 

    const onReset = () => {
        // TODO: Reset all filters and sorting to defaults
    }

    const onRowClick = (param, event) => {
        // Redirect to the user edit page
        const url = '/user/edit/' + param['id']; // row id is the user_id
        history.push(url);
    }

    // Returns the search options form and then the search results list
    return (
      <>
      <div className="UserSearchForm" width="100%">     
          {userList.length > 0 ? (
              <DataGrid
                  rows={userList}
                  columns={columns}
                  pageSize={10} // default page size
                  autoHeight
                  density="compact"
                  rowsPerPageOptions={[10,25,100]}
                  paginationMode="client" // for now client (and return all rows)... later use database pagination
                  sortingMode="client" // later server (if pagination server)
                  //checkboxSelection
                  onRowClick={onRowClick}
                  
              />
          ) : (
              <p>No results found</p>
          )}
          
        </div>
        </>
      );
}

export default withRouter(UserSearch);
