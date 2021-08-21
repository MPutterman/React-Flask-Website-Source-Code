// Password field with Visibility control for use with Uniforms
//
// CREDITS:
// * Main component from: https://www.npmjs.com/package/material-ui-password
//     (Didn't work using npm package so directly borrowed the code here)

import React from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';
import { IconButton, InputAdornment, TextField } from "@material-ui/core";
import { VisibilityOff, Visibility } from "@material-ui/icons";


export type PasswordFieldProps = HTMLFieldProps<string, HTMLDivElement>;

//function PasswordInput({ /*onChange, name, value, label, error, required, readOnly, disabled, ...*/props }: PasswordFieldProps) {

export function PasswordField ({onChange, name, error, ...props}: PasswordFieldProps) {

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

export default connectField(PasswordField); 