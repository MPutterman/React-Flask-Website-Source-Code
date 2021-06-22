// TODO:
// * Add filters and sorting (server side) in case of large number of elements.  Will need a form to do this.
// * Limitation: DataGrid only supports 1 column of filtering

import React, {useState, useEffect } from "react";
import { useHistory } from 'react-router-dom';
import { callAPI } from '../components/api';
import { withRouter } from "react-router";
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import Button from "@material-ui/core/Button";
import { DataGrid, GridLinkOperator } from "@material-ui/data-grid";
import { createFilterModel } from "../helpers/search_utils";
import Busy from '../components/busy';

/* Useful documentation:
   DataGrid documentation: https://material-ui.com/api/data-grid/
   DataGrid column definitions: https://material-ui.com/components/data-grid/columns/#column-definitions
*/

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
    const [renderOnce] = useState(true);
    const [loading, setLoading] = useState(true); // Support for loading indicator
    const [userList, setUserList] = useState([]);
    const [organizationList, setOrganizationList] = useState([]);

    // Retrieve user with specified id from the database
    const getUserList = (filters) => {
        setLoading(true);
        return callAPI('GET', 'user/search')
        .then((response) => {
            // Reformat... return as array indexed by ID... but DataGrid wants list of dicts
            response.data.map((element, index) => {
                element['id'] = element['user_id']; 
                //element['id'] = index; // DataGrid requires 'id' property
            })
            setUserList(response.data);
            //console.log ("In getUsers: response data => ", response.data);
            setLoading(false);
        })
        .catch((e) => {
            console.error("GET /user/search (filters: " + filters + "): " + e);
            setLoading(false);
        });
    }

    // Retrieve list of organizations
    // NOTE: not being used right now
    const getOrganizationList = () => {
        return callAPI('GET', 'organization/search')
        .then((response) => {
            setOrganizationList(response.data);
            //console.log("in getOrganizationList: response data => ", response.data);
        })
        .catch((e) => {
            console.error("GET /organization/search: " + e);
        });
    }

    useEffect(() => {
        getUserList(); //(props.match.params.id);
        getOrganizationList();
    }, [renderOnce]); 

    const onReset = () => {
        // TODO: Reset all filters and sorting to defaults
    }


    const onRowClick = (param, event) => {
        // If props.onSelect callback is set, call it with the model value
        // ... set 'id' and 'name' properties
        if (props.onSelect) {
            props.onSelect({...param.row,
                id: param['id'],
                name: param.row['first_name'] + ' ' + param.row['last_name'],
            });
        } else {
            // Redirect to the user edit page
            const url = '/user/edit/' + param['id']; // row id is the user_id
            history.push(url);
        }
    }

    // Returns the search options form and then the search results list
    return (
      <>
      <Busy busy={loading} />
      <div className="UserSearchForm" width="100%">     
          {userList.length > 0 ? (
              <DataGrid
                  rows={userList}
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

export default withRouter(UserSearch);
