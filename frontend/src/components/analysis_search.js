// TODO:
// * Add filters and sorting (server side) in case of large number of elements.  Will need a form to do this.
// * Limitation: DataGrid only supports 1 column of filtering

import React, {useState, useEffect } from "react";
import { useConfigState } from "../contexts/config";
import { useHistory } from 'react-router-dom';
import { callAPI } from '../components/api';
import { withRouter } from "react-router";
import { DataGrid, GridLinkOperator } from "@material-ui/data-grid";
import { createFilterModel } from "../helpers/search_utils";
import Busy from '../components/busy';

const AnalysisSearch = (props) => {

    const history = useHistory();
    const config = useConfigState();
    
    // Define columns to show in results list
    // TODO: add other fields, equip_id(name), user_id(name), plate_id(name), cover_id(name), ...
    const columns = [
      { field: 'analysis_id', headerName: 'Analysis ID', flex: 0.1},
      { field: 'name', headerName: 'Name', flex: 0.3},
      { field: 'description', headerName: 'Description', flex: 0.5},
      { field: 'owner_id', headerName: 'Owner ID', flex: 0.1},
      { field: 'expt_datetime', headerName: 'Experiment date', flex: 0.2},
      { field: 'modified', headerName: 'Modified', hidden: true, flex: 0.1},
      { field: 'created', headerName: 'Created', hidden: true, flex: 0.1},
      // TODO: other analysis options, image IDs, etc...
    ];

    // State
    const [busy, setBusy] = useState(true); // Support for busy indicator
    const [analysisList, setAnalysisList] = useState([]);

    // Retrieve analysis with specified id from the database
    const getAnalysisList = (filters) => {
        setBusy(true);
        return callAPI('GET', 'analysis/search')
        .then((response) => {
            // Reformat... returned as array indexed by ID... but DataGrid wants list of dicts
            response.data.map((element, index) => {
                element['id'] = element['analysis_id']; 
            })
            setAnalysisList(response.data);
            //console.log ("In getAnalyisList: response data => ", response.data);
            setBusy(false);
        })
        .catch((e) => {
            console.error("GET /analysis/search (filters: " + filters + "): " + e);
            setBusy(false);
        });
    }

    useEffect(() => {
        getAnalysisList(); 
    }, []); 

    const onReset = () => {
        // TODO: Reset all filters and sorting to defaults
    }

    const onRowClick = (param, event) => {
        // Redirect to the analysis edit page
        const url = '/analysis/edit/' + param['id']; // row id is the analysis_id
        history.push(url);
    }

    // Returns the search options form and then the search results list
    return (
      <>

      <Busy busy={busy} />

      <div className="AnalysisSearchForm" width="100%">     
          {analysisList.length > 0 ? (
              <DataGrid
                  rows={analysisList}
                  columns={columns}
                  pageSize={10} // default page size
                  autoHeight
                  loading={busy}
                  density="compact"
                  rowsPerPageOptions={config.general.searchresult_pagesize_options}
                  paginationMode="client" // for now client (and return all rows)... later use database pagination
                  sortingMode="client" // later server (if pagination server)
                  //checkboxSelection
                  onRowClick={onRowClick}
                  filterModel={createFilterModel(props.filter)}
                  
              />
          ) : (<p>No results found</p>)
          }
          
        </div>
        </>
      );
}

export default withRouter(AnalysisSearch);
