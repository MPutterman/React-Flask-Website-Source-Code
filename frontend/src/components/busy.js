// Busy indicator (full screen)
// Usage: <Busy busy=<Boolean> message=<String> />

import React from 'react';
import CircularProgress from "@material-ui/core/CircularProgress";
import Backdrop from "@material-ui/core/Backdrop";
import { withStyles, makeStyles } from '@material-ui/core/styles';
import { useTheme} from '@material-ui/core/styles';

export const Busy = (props) => {

  const theme = useTheme();

  return (
    <Backdrop className={theme.backdrop} open={props.busy} >
      {props.message ? (
        <p>{props.message}</p>
      ) : <></>}
      <CircularProgress color="inherit" />
    </Backdrop>
  );
}

export default Busy;
