import React from 'react';
import Popover from '@material-ui/core/Popover';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';

export default function Popup({button_label, element_id, children, ...props}) {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? (element_id ?? 'popup') : undefined;

  return (
    <div>
      <IconButton size='small' aria-describedby={id} onClick={handleClick}>
         {button_label ?? 'Open Popup'}
      </IconButton>
      <Popover
        p={2}
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Paper>
            <Box p={3} width='400px'>
                {children}
            </Box>
        </Paper>
      </Popover>
    </div>
  );
}