// TODO:
// * Provide a way to specify the upload type, or get it directly from files[0]. I'm just leaving as
//     image/png since that was previously in the submission.js file...
// * Show a prorgress bar when uploading large files

// Usage:
// <FileInputField buttonLabel=<String> filenameField=<String> />
// - buttonLabel defaults to 'Choose File' but can be overridden
// - filenameField is the name of another form field in which the
//   filename will be inserted

import React from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import { useForm } from 'uniforms';
//import LinearProgress from "@material-ui/core/LinearProgress";


export type FileInputFieldProps = HTMLFieldProps<string, HTMLDivElement>;

function FileInput({ name, value, label, ref, ...props }: FileInputFieldProps) {

  const { onChange } = useForm();
  const [filename, setFilename] = React.useState('');

  return (
    <div className="FileInputField">
      <label htmlFor={name}>
        <div>{label}</div>
        <span>
            <Button variant='contained' component='span'>
              {props.buttonLabel ? (
                <span>{props.buttonLabel}</span>
              ) : (
                <span>Choose file</span>
              )}
            </Button>
            <TextField disabled value={filename ? filename : 'No file chosen'} />
        </span>
      </label>
      
      <input
        //accept="image/*" // TODO: read this from the properties if specified
        id={name}
        onChange={({ target: { files } }) => {
          if (files && files[0]) {
            setFilename(files[0].name);
            if (props.filenameField) {
              onChange(props.filenameField, files[0].name);
            }
            onChange(name, new Blob([files[0]],{type: 'image/png',})); //URL.createObjectURL(files[0]));
          }
        }}
        style={{ display: 'none' }}
        type="file"
      />
    </div>
  );
}

export default connectField(FileInput); 