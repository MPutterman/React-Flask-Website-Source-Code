
import React from "react";

import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";

const AnalysisResults = (props) => {

    return (

      <>  
      {props.results_loaded ? ( 

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell id="tc">
                  ROIS
                </TableCell>
                {props.results[0].map((band, i) => {
                  return (
                    <TableCell id="tc" key={`lane-${i}`} align="right">
                      Lane {i + 1}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {props.results.map((lane, i) => {
                return (
                  <TableRow key={`band-${i}`}>
                    <TableCell id="tc" component="th" scope="row">
                      <strong>Band {i + 1}</strong>
                      <br/>Signal
                      {props.doRF && (
                        <><br/>RF value</>
                      )}          
                    </TableCell>
                    {lane.map((band, j) => {
                      return (
                        <TableCell id="tc" key={`band-${i}-lane-${j}`} align="right">
                          <br/>
                          {(band[0] * 100).toFixed(1)}%<br/>
                          {band.length > 1 ? " " + band[1].toFixed(2) : ""}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

      ) : (
        <p>Results table not yet available</p>
      )}
      </>
                  
    );
}

export default AnalysisResults;