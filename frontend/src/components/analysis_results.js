
import React from "react";

import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

const AnalysisResults = (props) => {

    return (

      <>  
      {props.lane_list?.length > 0 ? ( 

        <>

        <Grid container direction='column' spacing={1}>

        <Grid item>
        <p>
          For each lane (column), data for all ROIs are listed. The first value is the
          signal fraction in that ROI, and the second value is the Rf value (if option selected).
        </p>
        </Grid>

        <Grid item>
        <TableContainer component={Paper}>
          <Table fullWidth>
            <TableHead>
              <TableRow>
                {props.lane_list.map((lane, i) => {
                  return (
                    <TableCell id="tc" key={`result-header-lane-${i}`} align="center">
                      Lane {lane.lane_id != null ? lane.lane_id : i+1}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                {props.lane_list.map((lane, i) => {
                  return (
                    <TableCell id="tc" key={`result-data-lane-${i}`} align="center" style={{ verticalAlign: 'top' }}>
                      {lane.roi_list.map((roi, j) => {
                        return (
                          <>
                            <br/>
                            ROI {roi.roi_id} <br/>
                            {roi.signal_fraction !== undefined ? (
                              <>{(roi.signal_fraction*100).toFixed(1)}%<br/></>
                            ) : (<></>)}
                            {props.show_Rf && roi.Rf !== undefined ? ("Rf = " + roi.Rf.toFixed(2) ) : (<></>)}
                          <br/>
                          </>
                        );
                      })}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        </Grid>

        </Grid>
        </>

      ) : (
        <p>Define at least one lane to show analysis results.</p>
      )}
      </>
                  
    );
}

export default AnalysisResults;