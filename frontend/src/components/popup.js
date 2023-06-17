import React from 'react';
import Popover from '@mui/material/Popover';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

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