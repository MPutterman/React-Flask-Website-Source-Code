// TODO: Create an AutoForm component that allows either:
// - typing in the ID
// - selecting an existing record (open search/filter select box)
// - creating a new record
// NOTE: this is designed for image_id, equip_id, org_id, plate_id, cover_id...
//  Need to add some special props to render well as a modal, and return the desired value...

import React from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

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