// This is a Uniforms component for an ID field. It allows several options for choosing an
// object by ID, including a popup to search for an item, or a popup to create a new item. 
// The resulting ID value (selected or created) is returned to the form.
//
// Note: we define a new ErrorContext in here so that an error in retrieving data for
// a modal dialog just generates an error in the modal... not a full-page error page.
//
// Usage: <IDInputField objectType=<String> selectLabel=<String> createLabel=<String> clearLabel=<string> />
// - objectType<String> = user, image, equip, org, plate, cover
// - selectTitle<String> = text to display as title on 'Select' popup
// - createTitle<String> = text to display as title on 'Create' popup
// - editTitle<String> = text to display as title on 'Edit' popup
// - filter<Array> = array of dict with 'field', 'value', and 'operator' to constrain
//     the pre-populate some fields of 'create' forms, or filters on 'select' forms
//     * Note a special 'field' operator means to take the value from the current (surrounding) form for the field named ${value}

// TODO:
// * When 'edit', maybe should disable the OK button if the form is dirty (i.e. force user to save/cancel first)
// * Incorporate some permissions. E.g. if not permission to edit the item, show in view mode.
//     E.g. if not allowed to create iteams, don't show Create button.
// * Update to support multiple selection
// * Allow editing ID field directly (typing)? This has some complications:
//    - We would probably want to load the name of the corresponding record,
//      which would require async request. Would we do it onChange or onBlur?
//    - Right now, if id field is NOT marked readOnly, typing in it
//      doesn't show up in the form submission. Would need to fix what is going on.
//      (Also, right now after choosing/creating new object, and setting ID automatically,
//       the id field becomes uneditable.)
// * Add some intelligent behavior if the objectType doesn't exist, e.g. remove the button altogether?
// * Figure out how to add a * next to label when field is required
// * When we have an error state... make sure underlying components render in error state'
// * There is a risk of polluting the database a bit.  If a user creates a new record, it gets saved
//     immediately.  If user then creates again... it will create a whole new object and the oriignal
//     one is hanging (not part of any analysis/object).  Should 'clear' delete the object
//     (if it is not used anywhere else), and maybe disable 'create' if ID is already defined?
// * Add a 'disabled' or 'readOnly' mode that disabled/removes buttons when only want to show the ID and Name

// Main imports
import React from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';
import { useForm } from 'uniforms';
import { name_lookup } from '../helpers/validation_utils';
import { ErrorHandler } from '../contexts/error';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Box from '@material-ui/core/Box';
import Input from '@material-ui/core/Input';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import IconButton from '@material-ui/core/IconButton';
import ClearIcon from '@material-ui/icons/Clear';
import SelectIcon from '@material-ui/icons/Search';
import CreateIcon from '@material-ui/icons/AddCircle';
import EditIcon from '@material-ui/icons/Edit';
import InputAdornment from '@material-ui/core/InputAdornment';

// Object-specific imports
import ImageSelect from '../components/image_search'; // renaming default component
import UserSelect from '../components/user_search'; // renaming default component
import EquipSelect from '../components/equip_search'; // renaming default component
import ImageCreate from '../components/image_edit'; // renaming default component
import UserCreate from '../components/user_edit'; // renaming default component
// import EquipCreate from '../components/equip_edit'; // renaming default component
import ImageEdit from '../components/image_edit'; // renaming default component
import UserEdit from '../components/user_edit'; // renaming default component
// import EquipEdit from '../components/equip_edit'; // renaming default component

export type IDInputFieldProps = HTMLFieldProps<string, HTMLDivElement>;

function IDInput({ name, error, onChange, value, label, ref, ...props }: IDInputFieldProps) {

  const [temporaryModel, setTemporaryModel] = React.useState({});
  const [nameField, setNameField] = React.useState('');
  const [openSelect, setOpenSelect] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [refresh, setRefresh] = React.useState(false);
  const [filter, setFilter] = React.useState([]); // filter rewriter (will use useEffect to capture initial value)

  React.useEffect(() => {
    console.log ('In useEffect [temporaryModel], received new value: ', temporaryModel);
  }, [temporaryModel])

  const form = useForm();

  // If props.filter is provided, check if any use the special 'field' operator, and rewrite those
  // entries into 'regular' filter entries for handling by the subforms. Ignore fields if value is '' or null.
  // Do this here because this component is definitely a child of the Form component and can access useForm()
  // whereas the ultimate 'create' and 'select' sub-components may not always be rendered inside an outer form
  // and useForm() will throw an error.
  React.useEffect(() => {
      if (props.filter) {
          const copyFilter = [...props.filter];
          let newFilter = [];
          // console.log('In idfield useEffect. Incoming props.filter = ', copyFilter);
          copyFilter.forEach( element => {
              if (element.operator == 'field') {
                  if (form.model[element.value]) {
                      newFilter.push({field: element.field, value: form.model[element.value]});
                  }
              } else {
                  newFilter.push(element);
              }
          });
          setFilter(newFilter);
          // console.log ('In idfield useEffect. Rewritten props.filter = ', newFilter);
      }
  }, [props.filter, form.model]); // Need to pass in form.model as a dependency


  // Whenever value of ID field changes, lookup the corresponding 'name' to display.
  // Also do this when 'refresh' flag is set. (E.g. if open the edit dialog, the user
  // might change this field.)
  React.useEffect(() => {
      if (value || refresh) {
          setRefresh(false);
          name_lookup(props.objectType, value)
          .then((name) => {
              setNameField(name);
          })
          .catch((e) => {
              setNameField('Lookup error');
          });
      } else {
          setNameField('');
      }
  }, [value, refresh]);


  const allowEdit = () => {
    return !!value; // Allow if ID value is not empty
  }

  const allowSelect = () => {
    return true;
  }

  const allowCreate = () => {
    return true;
  }


  const onCloseSelect = (value) => {
  }

  const onCloseCreate = (value) => {
  }

  const onCloseEdit = (value) => {
  }
 
  const handleOpenSelect = () => {
    setOpenSelect(true);
  };

  const handleCloseSelect = () => {
    setOpenSelect(false);
  };

  const onOKSelect = () => {
    // TODO: if multi-select, set value to new selection(s)
    setOpenSelect(false);
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
    // TODO: if multi-select, APPEND new item to currently selected item(s)
    //  Or just replace?
    setOpenCreate(false);
    onChange(temporaryModel.id);  // Set the value of the ID field
  };

  const onCancelCreate = () => {
    setOpenCreate(false);
  };

  const handleOpenEdit = () => {
    setOpenEdit(true);
  }

  const handleCloseEdit = () => {
    setOpenEdit(false);
  }

  const onOKEdit = () => {
    setOpenEdit(false);
    // ID value didn't change, but Name might have
    setRefresh(true);
  };

  const onCancelEdit = () => {
    setOpenEdit(false);
    // Even if cancel, may have changed and saved Name
    setRefresh(true);
  };




  const handleClear = () => {
      setNameField('');
      onChange('');
  }

  return (
    <div className="IDInputField">
      <Box display="flex" flexDirection="row" fullWidth>
      <Box width={280}>
      <TextField size="small" id={name} value={value ? value : ''} error={!!(error)} label={label} 
            InputProps={{
            endAdornment:(
            <InputAdornment position="end">
                <IconButton size='small' onClick={handleOpenEdit} disabled={!allowEdit()}>
                    <EditIcon />
                </IconButton>
                <IconButton size='small' onClick={handleOpenSelect} disabled={!allowSelect()}>
                    <SelectIcon />
                </IconButton>
                <IconButton size='small' onClick={handleOpenCreate} disabled={!allowCreate()}>
                    <CreateIcon />
                </IconButton>
                <IconButton size='small' onClick={handleClear}>
                    <ClearIcon />
                </IconButton>

              </InputAdornment>
            ),}}
      />
      </Box>
      <Box pl={2}>
      <label htmlFor={name}>
         <TextField size='small' id={name + '-name'} disabled value={nameField} error={!!(error)} label={'Name'}/>
      </label>
      </Box>
      </Box>
      
      <Dialog fullWidth open={openEdit} onClose={handleCloseEdit} >
        <DialogTitle id="dialog-edit">
            {props.editTitle ? ( <span>{props.editTitle}</span> ) : ( <span>Edit record</span> )}
        </DialogTitle>
        <DialogContent>
            <ErrorHandler>
            {{
                'user': <UserEdit object_id={value} onSave={setTemporaryModel} {...props} />,
                'image': <ImageEdit object_id={value} onSave={setTemporaryModel} {...props} />,
                //'equip': <EquipEdit object_id={value} onSave={setTemporaryModel} {...props} />,
                'default': <></>,
            } [props.objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
            </ErrorHandler>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" /* not disabled */ onClick={onOKEdit}>
            OK
          </Button>
          <Button variant="contained" onClick={onCancelEdit} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog fullWidth open={openSelect} onClose={handleCloseSelect} >
        <DialogTitle id="dialog-select">
            {props.selectTitle ? ( <span>{props.selectTitle}</span> ) : ( <span>Select record</span> )}
        </DialogTitle>
        <DialogContent>
            <ErrorHandler>
            {{
                'user': <UserSelect onSelect={setTemporaryModel} {...props} filter={filter} />,
                'image': <ImageSelect onSelect={setTemporaryModel} {...props} filter={filter} />,
                'equip': <EquipSelect onSelect={setTemporaryModel} {...props} filter={filter} />,
                'default': <></>,
            } [props.objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
            </ErrorHandler>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary"
                  disabled={temporaryModel ? !temporaryModel.id : true} // Only show 'OK' button if a row is selected
                  onClick={onOKSelect}
          >
            OK
          </Button>
          <Button variant="contained" onClick={onCancelSelect} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth open={openCreate} onClose={handleCloseCreate} >
        <DialogTitle id="dialog-select">
            {props.createTitle ? ( <span>{props.createTitle}</span> ) : ( <span>Create new record</span> )}
        </DialogTitle>
        <DialogContent>
            <ErrorHandler>
            {{
                'user': <UserCreate new={true} onSave={setTemporaryModel} {...props} filter={filter} />,
                'image': <ImageCreate new={true} onSave={setTemporaryModel} {...props} filter={filter} />,
                //'equip': <EquipCreate new={true} onSave={setTemporaryModel} {...props} filter={filter} />,
                'default': <></>,
            } [props.objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
            </ErrorHandler>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary"
                  disabled={temporaryModel ? !temporaryModel.id : true} // Only show 'OK' button if ID is set (i.e. record saved)
                  onClick={onOKCreate}
          >
            OK
          </Button>
          <Button variant="contained" onClick={onCancelCreate} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>


    </div>

  );
}

export default connectField(IDInput); 