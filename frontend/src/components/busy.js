import React from 'react';
import CircularProgress from "@material-ui/core/CircularProgress";
import Backdrop from "@material-ui/core/Backdrop";
import { withStyles, makeStyles } from '@material-ui/core/styles';

export const Busy = (props) => {

  return (
    <Backdrop className={props.classes.backdrop} open={props.busy} >
      <CircularProgress color="inherit" />
    </Backdrop>
  );
}

const styles = (theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
});

export default withStyles(styles, {withTheme: true})(Busy);
