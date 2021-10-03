// Password field with Visibility control for use with Uniforms
//
// CREDITS:
// * Main component from: https://www.npmjs.com/package/material-ui-password
//     (Didn't work using npm package so directly borrowed the code here)

import React from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';
import { IconButton, InputAdornment, TextField } from "@material-ui/core";
import { VisibilityOff, Visibility } from "@material-ui/icons";

export function PasswordField ({onChange, name, error, ...props}) {

    const [show, setShow] = React.useState(false);

    return (
      <TextField
        {...props}
        margin="dense"
        fullWidth
        type={show ? "text" : "password"}
        onChange={(event) => { onChange(event.target.value); }}
        InputProps={{
          ...props.InputProps,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size='small'
                color={!!error ? 'error' : 'inherit'}
                aria-label={"Toggle password visibility"}
                onClick={() => setShow(!show)}
              >
                {show ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    );
};

// Apply connector for uniforms form
export default connectField(PasswordField); 