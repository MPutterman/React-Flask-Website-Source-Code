// This is a Uniforms component for an ID field. It allows several options for choosing an
// object by ID, including a popup to search for an item, or a popup to create a new item. 
// The resulting ID value (selected or created) is returned to the form.
//
// Usage: <IDInputField objectType=<String> selectLabel=<String> createLabel=<String> clearLabel=<string> />
// - objectType<String> = user, image, equip, org, plate, cover
// - selectButton<String> = text to write on the 'Select' button (select an existing item)
// - chooseButton<String> = text to write on the 'Choose' button (create a new item)
// - clearButton<String> = text to write o nthe 'Clear' button (clear the selection)
// - selectTitle<String> = text to display as title on 'Select' popup
// - createTitle<String> = text to display as title on 'Create' popup
// - filter<Array> = array of dict with 'field', 'value', and 'operator' to constrain
//     the pre-populate some fields of 'create' forms, or filters on 'select' forms
//     * Note a special 'field' operator means to take the value from the current (surrounding) form for the field named ${value}

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
// * Figure out how to add a * next to label when field is required
// * When we have an error state... make sure underlying components render in error state

// Main imports
import React from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';
import { useForm } from 'uniforms';
import { callAPI } from '../components/api';  // For async lookup of 'name' corresponding to ID
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

function IDInput({ name, error, onChange, value, label, ref, ...props }: IDInputFieldProps) {

  const [temporaryModel, setTemporaryModel] = React.useState({});
  const [nameField, setNameField] = React.useState('');
  const [openSelect, setOpenSelect] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);
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


  // Whenever value of ID field changes, lookup the name to display.
  // This allows to uniformly obtain the name whether showing the form initially, or after
  //  creating or selecting an object.
  React.useEffect(() => {
      if (value) {
          lookupName(props.objectType, value)
          .then((name) => {
              setNameField(name);
          })
          .catch((e) => {
              setNameField('Lookup error');
          });
      } else {
          setNameField('');
      }
  }, [value]);


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

  const handleClear = () => {
      setNameField('');
      onChange('');
  }

  // Look up the name field for the given ID
  // TODO: add error handling if error response or no response
  async function lookupName(objectType, id) {
      return callAPI('GET', `api/${objectType}/name/${id}`)
      .then((response) => {
          return response.data.name;
      });
  }

  return (
    <div className="IDInputField">
      <TextField id={name} value={value ? value : ''} readOnly={true} disabled={true} error={error} label={label}/>
      <label htmlFor={name}>
        <TextField id={name + '-name'} disabled value={nameField} error={error} label={'Name'}/>
        <div>
            <Button variant='contained' /*component='span'*/ onClick={handleOpenSelect}>
              {props.selectButton ? (
                <span>{props.selectButton}</span>
              ) : (
                <span>Choose</span>
              )}
            </Button>
            <Button variant='contained' /*component='span'*/ onClick={handleOpenCreate}>
              {props.createButton ? (
                <span>{props.createButton}</span>
              ) : (
                <span>Create</span>
              )}
            </Button>
            <Button variant='contained' /*component='span'*/ onClick={handleClear}>
              {props.clearButton ? (
                <span>{props.clearButton}</span>
              ) : (
                <span>Clear</span>
              )}
            </Button>
        </div>
      </label>
      

      <Dialog fullWidth open={openSelect} onClose={handleCloseSelect} >
        <DialogTitle id="dialog-select">
            {props.selectTitle ? ( <span>{props.selectTitle}</span> ) : ( <span>'Select an item'</span> )}
        </DialogTitle>
        <DialogContent>
            {{
                'user': <UserSelect onSelect={setTemporaryModel} {...props} filter={filter} />,
                'image': <ImageSelect onSelect={setTemporaryModel} {...props} filter={filter} />,
                'equip': <EquipSelect onSelect={setTemporaryModel} {...props} filter={filter} />,
                'default': <></>,
            } [props.objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onCancelSelect} color="primary">
            Cancel
          </Button>
          <Button variant="contained" onClick={onOKSelect} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth open={openCreate} onClose={handleCloseCreate} >
        <DialogTitle id="dialog-select">
            {props.createTitle ? ( <span>{props.createTitle}</span> ) : ( <span>'Create an item'</span> )}
        </DialogTitle>
        <DialogContent>
            {{
                'user': <UserCreate new={true} onSave={setTemporaryModel} {...props} filter={filter} />,
                'image': <ImageCreate new={true} onSave={setTemporaryModel} {...props} filter={filter} />,
                //'equip': <EquipCreate new={true} onSave={setTemporaryModel} {...props} filter={filter} />,
                'default': <></>,
            } [props.objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
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