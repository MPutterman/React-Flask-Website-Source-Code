// TODO:
// * A bug during validation... sometimes shows an error that won't go away if submit without selecting
//      file.  A warning came up of duplicate key 'file'. Maybe an interal MUI field is using 'file'
//      as an html id element?
// * Provide a way to specify the upload type, or get it directly from files[0]. I'm just leaving as
//     image/png since that was previously in the submission.js file...
// * Show a progress bar when uploading large files
// * When we have an error state... make sure underlying components render in error state (doesn't seem to be working)
// * How to handle 'required'? Generally after file is uploaded and we edit record, we don't require a new file pick

// Usage:
// <FileInputField buttonLabel=<String> filenameField=<String> />
// - buttonLabel defaults to 'Choose File' but can be overridden
// - filenameField is the name of another form field in which the
//   filename will be inserted

import React from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import ClearIcon from '@material-ui/icons/Clear';
import { useForm } from 'uniforms';
//import LinearProgress from "@material-ui/core/LinearProgress";


export type FileInputFieldProps = HTMLFieldProps<string, HTMLDivElement>;

function FileInput({ onChange, name, value, label, error, ref, required, ...props }: FileInputFieldProps) {

    const form = useForm();
    const [filename, setFilename] = React.useState('');

    React.useEffect(() => {
        if (form.submitted) {
            // Reset filename (don't reset filenameField since user might want to keep that)
            setFilename('');
        }
    }, [form.submitted])

    const onClear = (event) => {
        // Reset filename (don't reset filenameField since user might want to keep the value)
        setFilename('');
        onChange(null);
    }

    const onChangeFile = ({ target: { files } }) => {
        if (files && files[0]) {
            setFilename(files[0].name);
            if (props.filenameField) form.onChange(props.filenameField, files[0].name);
            onChange(files[0]);
            //console.log('FileIDField: changing file: =>', files[0]);
        }
    }

    return (
        <>
        <label htmlFor={name}>
            <TextField
              {...props}
              margin="dense"
              disabled
              fullWidth
              id={`${name}-label`}
              value={filename ? filename : 'No file chosen'}
              error={!!(error)}
              required={required}
              label='File to upload'
              {...props}
              InputProps={{
                startAdornment:(
                  <InputAdornment position="start">
                    <Button size='small' variant='outlined' component='span'>
                      {props.buttonLabel ? (
                        <span>{props.buttonLabel}</span>
                      ) : (
                        <span>Choose file</span>
                      )}
                    </Button>
                  </InputAdornment>
                ),
                endAdornment:(
                  <InputAdornment position="end">
                      <IconButton size='small' onClick={onClear}>
                          <ClearIcon color={!!error ? 'error' : 'inherit'} />
                      </IconButton>
                  </InputAdornment>
                ),
              }}
            />
      </label>
      
      <input
        //accept="image/*" // TODO: read this from the properties if specified
        id={name}
        // onClick is a hack to set value of field to null. Ensures onChange is fired
        // even if user chooses the same file as before. (E.g. choose, clear, choose again)
        onClick={(event) => { event.target.value=null; }} 
        onChange={onChangeFile}
        style={{ display: 'none' }}
        type="file"

/*
        InputProps={{
          startAdornment:(
            <InputAdornment position="start">
              <Button variant='outlined' component='span'>
                {props.buttonLabel ? (
                  <span>{props.buttonLabel}</span>
                ) : (
                  <span>Choose file</span>
                )}
              </Button>
            </InputAdornment>
          ),}}
*/
      />
      </>
    );
}

export default connectField(FileInput); 