// TODO: provide a way to specify the upload type,
// or get it directly from files[0]. I'm just leaving as
// image/png since that was previously in the submission.js file...

import React from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

export type FileInputFieldProps = HTMLFieldProps<string, HTMLDivElement>;

function FileInput({ name, onChange, value, label, ref, ...props }: FileInputFieldProps) {

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
            if (props.setFilename) {
              props.setFilename(files[0].name);
            }
            onChange(new Blob([files[0]],{type: 'image/png',})); //URL.createObjectURL(files[0]));
          }
        }}
        style={{ display: 'none' }}
        type="file"
      />
    </div>
  );
}

export default connectField(FileInput); 