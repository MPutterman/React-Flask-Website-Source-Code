// Busy indicator (full screen)
// Usage: <Busy busy=<Boolean> message=<String> />

import React from 'react';
import CircularProgress from "@mui/material/CircularProgress";
import Backdrop from "@mui/material/Backdrop";

const Busy = (props) => {
  return (
    <Backdrop
      open={props.busy}
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      {props.message ? (
        <p>{props.message}</p>
      ) : <></>}
      <CircularProgress color="inherit" />
    </Backdrop>
  );
}

export default Busy;