// TODO:
// * Why does the field display just slightly above others?
// * Provide a way to specify the upload type, or get it directly from files[0]. I'm just leaving as
//     image/png since that was previously in the submission.js file...
// * Show a progress bar when uploading large files
// * Add a way to view/download existing file?  Also provide a way to delete the current file?
// * When we have an error state... make sure underlying components render in error state
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
import { useForm } from 'uniforms';
//import LinearProgress from "@material-ui/core/LinearProgress";


export type FileInputFieldProps = HTMLFieldProps<string, HTMLDivElement>;

function FileInput({ onChange, name, value, label, error, ref, required, ...props }: FileInputFieldProps) {

  const form = useForm();
  const [filename, setFilename] = React.useState('');

  return (
    <>
      <label htmlFor={name}>
            <TextField disabled value={filename ? filename : 'No file chosen'} error={!!(error)}
              required={required}
              label='File to upload'
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
                )}}
            />
      </label>
      
      <Input
        //accept="image/*" // TODO: read this from the properties if specified
        id={name}
        onChange={({ target: { files } }) => {
          if (files && files[0]) {
            setFilename(files[0].name);
            if (props.filenameField) {
              form.onChange(props.filenameField, files[0].name);
            }
            value = new Blob([files[0]], {type: 'image/png',});
            onChange(value); //new Blob([files[0]],{type: 'image/png',})); //URL.createObjectURL(files[0]));
          }
        }}
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