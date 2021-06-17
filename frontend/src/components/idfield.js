// This is a Uniforms component for an ID field. It allows several options for choosing an
// object by ID, including a popup to search for an item, or a popup to create a new item. 
// The resulting ID value (selected or created) is returned to the form.
//
// Usage: <IDInputField objectType=<String> selectLabel=<String> createLabel=<String> clearLabel=<string> />
// - objectType = user, image, equip, org, plate, cover
// - selectLabel = text to write on the 'Select' button (select an existing item)
// - chooseLabel = text to write on the 'Choose' button (create a new item)
// - clearLabel = text to write o nthe 'Clear' button (clear the selection)

// TODO:
// * Update to support multiple selection
// * Allow editing ID field directly (typing)? This has some complications:
//    - We would probably want to load the name of the corresponding record,
//      which would require async request. Would we do it onChange or onBlur?
//    - Right now, if id field is NOT marked readOnly, typing in it
//      doesn't show up in the form submission. Would need to fix what is going on.
//      (Also, right now after choosing/creating new object, and setting ID automatically,
//       the id field becomes uneditable.)
// * Add a 'View Details' button (popup or hover) to show details of currently selected item
// * Add some intelligent behavior if the objectType doesn't exist, e.g. remove the button altogether?

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
import EquipSelect from '../components/equip_search'; // renaming default component
// import EquipCreate from '../components/equip_edit'; // renaming default component

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
  }

  const onCloseCreate = (value) => {
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

  const handleClear = () => {
      setNameField('');
      onChange('');
  }


  return (
    <div className="IDInputField">
      <TextField id={name} value={value} readOnly={true} disabled={true}/>
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
            <Button variant='contained' /*component='span'*/ onClick={handleClear}>
              {props.clearLabel ? (
                <span>{props.clearLabel}</span>
              ) : (
                <span>Clear</span>
              )}
            </Button>
        </span>
      </label>
      

      <Dialog fullWidth open={openSelect} onClose={handleCloseSelect} >
        <DialogTitle id="dialog-select">Select an existing item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {{
                'user': <UserSelect onSelect={setTemporaryModel}/>,
                'image': <ImageSelect onSelect={setTemporaryModel}/>,
                'equip': <EquipSelect onSelect={setTemporaryModel}/>,
                'default': <></>,
            } [props.objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
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
                //'equip': <EquipCreate new={true} onSave={setTemporaryModel}/>,
                'default': <></>,
            } [props.objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
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