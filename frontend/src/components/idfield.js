// This is a Uniforms component for an ID field. It allows several
// options, e.g. typing the ID, or clicking a button to open a box
// to search/select a previously existing record, or clicking a button
// to create a new record. The latter two return the ID value to the
// form.

// TODO:
// * Update to support multiple selection
// * After choosing/creating an object, the ID and name are populated, 
//   but they seem to be uneditable (probably the way they are updated).
//   However, the desired behavior would be to allow the user to type in
//   new value if they wanted to.

// Main imports
import React from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

// Object-specific imports
import ImageSelect from '../components/image_search'; // renaming default component
import UserSelect from '../components/user_search'; // renaming default component
import ImageCreate from '../components/image_edit'; // renaming default component
import UserCreate from '../components/user_edit'; // renaming default component


export type IDInputFieldProps = HTMLFieldProps<string, HTMLDivElement>;

function IDInput({ name, onChange, value, label, ref, ...props }: IDInputFieldProps) {

  const [temporaryModel, setTemporaryModel] = React.useState({});
  const [nameField, setNameField] = React.useState('');
  const [openSelect, setOpenSelect] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);

  React.useEffect(() => {
    console.log ('In useEffect [temporaryModel], received new value: ', temporaryModel);
  }, [temporaryModel])

  const onCloseSelect = (value) => {
    console.log('closed select dialog, value=', value);
  }

  const onCloseCreate = (value) => {
    console.log('closed create dialog, value=', value);
  }

  const handleOpenSelect = () => {
    setOpenSelect(true);
  };

  const handleCloseSelect = () => {
    setOpenSelect(false);
  };


  const onOKSelect = () => {
    setOpenSelect(false);
    setNameField(temporaryModel.name); // Set the text for the 'name' display
    onChange(temporaryModel.id); // Set the value of the ID field
  };

  const onCancelSelect = () => {
    setOpenSelect(false);
  };

  const handleOpenCreate = () => {
    setOpenCreate(true);
  };

  const handleCloseCreate = () => {
    setOpenCreate(false);
  };

  const onOKCreate = () => {
    setOpenCreate(false);
    setNameField(temporaryModel.name); // Set the text for the 'name' display
    onChange(temporaryModel.id);  // Set the value of the ID field
  };

  const onCancelCreate = () => {
    setOpenCreate(false);
  };

  return (
    <div className="IDInputField">
      <TextField id={name} value={value}/>
      <label htmlFor={name}>
        <TextField id={name + '-name'} disabled value={nameField}/>
        <div>{label}</div>
        <span>
            <Button variant='contained' /*component='span'*/ onClick={handleOpenSelect}>
              {props.selectLabel ? (
                <span>{props.selectLabel}</span>
              ) : (
                <span>Choose</span>
              )}
            </Button>
            <Button variant='contained' /*component='span'*/ onClick={handleOpenCreate}>
              {props.createLabel ? (
                <span>{props.createLabel}</span>
              ) : (
                <span>Create</span>
              )}
            </Button>
        </span>
      </label>
      

      <Dialog fullWidth open={openSelect} onClose={handleCloseSelect} >
        <DialogTitle id="dialog-select">Select an existing item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {{
                'user': <UserSelect new={true} onSelect={setTemporaryModel}/>,
                'image': <ImageSelect new={true} onSelect={setTemporaryModel}/>,
            } [props.objectType] }     {/* Use || <Component /> if need 'default' */}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          TODO: maybe should have a way to override buttons in the modal... otherwise user will have to SAVE, and then hit OK after
          <Button variant="contained" onClick={onCancelSelect} color="primary">
            Cancel
          </Button>
          <Button variant="contained" onClick={onOKSelect} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth open={openCreate} onClose={handleCloseCreate} >
        <DialogTitle id="dialog-select">Create a new item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {{
                'user': <UserCreate new={true} onSave={setTemporaryModel}/>,
                'image': <ImageCreate new={true} onSave={setTemporaryModel}/>,
            } [props.objectType] }     {/* Use || <Component /> if need 'default' */}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onCancelCreate} color="primary">
            Cancel
          </Button>
          <Button variant="contained" onClick={onOKCreate} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>


    </div>

  );
}

export default connectField(IDInput); 