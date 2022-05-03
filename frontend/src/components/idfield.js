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
// * Hide buttons that are not available?
// * When 'edit', maybe should disable the OK button if the form is dirty (i.e. force user to save/cancel first)
// * Incorporate some permissions. E.g. if not permission to edit the item, show in view mode.
//     E.g. if not allowed to create iteams, don't show Create button.
// * Update to support multiple selection?
// * Allow editing ID field directly (typing)? This has some complications:
//    - We would probably want to load the name of the corresponding record,
//      which would require async request. Would we do it onChange or onBlur?
//    - Right now, if id field is NOT marked readOnly, typing in it
//      doesn't show up in the form submission. Would need to fix what is going on.
//      (Also, right now after choosing/creating new object, and setting ID automatically,
//       the id field becomes uneditable.)
// * Add some intelligent behavior if the objectType doesn't exist, e.g. remove the button altogether?
// * There is a risk of polluting the database a bit.  If a user creates a new record, it gets saved
//     immediately.  If user then creates again... it will create a whole new object and the oriignal
//     one is hanging (not part of any analysis/object).  Should 'clear' delete the object
//     (if it is not used anywhere else), and maybe disable 'create' if ID is already defined?
// * Add a 'disabled' or 'readOnly' mode that disabled/removes buttons when only want to show the ID and Name

// Main imports
import React from 'react';
import { connectField } from 'uniforms';
import { useForm } from 'uniforms';
import { name_lookup } from '../helpers/validation_utils';
import { ErrorHandler } from '../contexts/error';
import { Throbber } from '../contexts/throbber';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import ClearIcon from '@material-ui/icons/Clear';
import SelectIcon from '@material-ui/icons/Search';
import CreateIcon from '@material-ui/icons/AddCircle';
import EditIcon from '@material-ui/icons/Edit';
import ViewIcon from '@material-ui/icons/Visibility';
import InputAdornment from '@material-ui/core/InputAdornment';

// Object-specific imports
import { UserSearch as UserSelect, OrgSearch as OrgSelect, EquipSearch as EquipSelect,
    PlateSearch as PlateSelect, CoverSearch as CoverSelect, ImageSearch as ImageSelect,
    AnalysisSearch as AnalysisSelect } from '../components/object_search'; 
import { UserRegister as UserCreate, UserEdit } from '../components/object_edit';
import { OrgEdit as OrgCreate, OrgEdit } from '../components/object_edit';
import { EquipEdit as EquipCreate, EquipEdit } from '../components/object_edit';
import { PlateEdit as PlateCreate, PlateEdit } from '../components/object_edit';
import { CoverEdit as CoverCreate, CoverEdit } from '../components/object_edit';
import { ImageEdit as ImageCreate, ImageEdit } from '../components/object_edit';
import { AnalysisEdit as AnalysisCreate, AnalysisEdit } from '../components/analysis'; //object_edit';
import { UserView, OrgView, EquipView, PlateView, CoverView, ImageView, AnalysisView } from '../components/object_view';

// - objectType<String> = user, image, equip, org, plate, cover
// - selectTitle<String> = text to display as title on 'Select' popup
// - createTitle<String> = text to display as title on 'Create' popup
// - editTitle<String> = text to display as title on 'Edit' popup
// - filter<Array> = array of dict with 'field', 'value', and 'operator' to constrain

// Destructure to collect many props NOT to pass to child components
function IDInput(props) {

    const {
        objectType, titleSelect, titleCreate, titleEdit, titleView, filter:incoming_filter,
        name, error, onChange, value, label, ref, required, readOnly, disabled,
        showInlineError, errorMessage, fieldType, autoValue, decimal, valueLabelDisplay, changed,
//        ...otherprops
    } = props;

  const [pendingModel, setPendingModel] = React.useState({});
  const [nameField, setNameField] = React.useState('');
  const [openSelect, setOpenSelect] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openView, setOpenView] = React.useState(false);
  const [refresh, setRefresh] = React.useState(false);
  const [filter, setFilter] = React.useState([]); // filter rewriter (will use useEffect to capture initial value)

  React.useEffect(() => {
    console.log ('In useEffect [pendingModel], received new value: ', pendingModel);
  }, [pendingModel])

  const form = useForm();

  // If props.filter (incoming_filter) is provided, check if any use the special 'field' operator, and rewrite those
  // entries into 'regular' filter entries for handling by the subforms. Ignore fields if value is '' or null.
  // Do this here because this component is definitely a child of the Form component and can access useForm()
  // whereas the ultimate 'create' and 'select' sub-components may not always be rendered inside an outer form
  // and useForm() will throw an error.
  React.useEffect(() => {
      if (incoming_filter) {
          const copyFilter = [...incoming_filter];
          let newFilter = [];
          // console.log('In idfield useEffect. Incoming props.filter = ', copyFilter);
          copyFilter.forEach( element => {
              if (element.operator === 'field') {
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
  }, [incoming_filter, form.model]); // Need to pass in form.model as a dependency


  // Whenever value of ID field changes, lookup the corresponding 'name' to display.
  // Also do this when 'refresh' flag is set. (E.g. if open the edit dialog, the user
  // might change this field.)
  React.useEffect(() => {
      if ((value || refresh) && (objectType !== undefined)) {
          setRefresh(false);
          name_lookup(objectType, value)
          .then((name) => {
              setNameField(name);
          })
          .catch((e) => {
              setNameField('ERROR: could not retrieve name');
          });
      } else {
          setNameField('');
      }
  }, [value, refresh, objectType]);


  const allowEdit = () => {
    return !!value; // Allow if ID value is not empty.  TODO: check edit permissions
  }

  const allowSelect = () => {
    return true; // TODO: only allow if ID is empty?  TODO: check search permissions
  }

  const allowCreate = () => {
    return true; // TODO: only allow if ID is empty?  TODO: check create permissions
  }

  const allowView = () => {
    return !!value; // Allow if ID value is not empty  TODO:check view permissions
  }

  const onCloseSelect = (value) => {
  }

  const onCloseCreate = (value) => {
  }

  const onCloseEdit = (value) => {
  }
 
  const onCloseView = (value) => {
  }

  const handleOpenSelect = () => {
    console.log('Opening search window, value of objectType:', objectType);
    setOpenSelect(true);
  };

  const handleCloseSelect = () => {
    setOpenSelect(false);
  };

  const onOKSelect = () => {
    // TODO: if multi-select, set value to new selection(s)
    setOpenSelect(false);
    onChange(pendingModel.id); // Set the value of the ID field
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
    onChange(pendingModel.id);  // Set the value of the ID field
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

  const handleOpenView = () => {
    setOpenView(true);
  }

  const handleCloseView = () => {
    setOpenView(false);
  }

  const handleClear = () => {
      setNameField('');
      onChange(null);
  }

  return (
    <div className="IDInputField">

      <TextField
//          {...otherprops} 
          margin="dense"
          fullWidth
          size="small"
          id={name + '-name'}
          value={nameField}
          //id={name}
          //value={value ? value : ''}
          error={!!(error)}
          label={label}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          InputProps={readOnly || disabled ? {} : {
          endAdornment:(
          <InputAdornment position="end">
              {/*{value ? ( <>{`(ID=${value})`}</> ) : ( <></> )}*/}
              <IconButton size='small' onClick={handleOpenView} disabled={!allowView()}>
		  <ViewIcon color={!!error ? 'error' : 'inherit'} />
              </IconButton>
              <IconButton size='small' onClick={handleOpenEdit} disabled={!allowEdit()}>
                  <EditIcon color={!!error ? 'error' : 'inherit'} />
              </IconButton>
              <IconButton size='small' onClick={handleOpenSelect} disabled={!allowSelect()}>
                  <SelectIcon color={!!error ? 'error' : 'inherit'} />
              </IconButton>
              <IconButton size='small' onClick={handleOpenCreate} disabled={!allowCreate()}>
                  <CreateIcon color={!!error ? 'error' : 'inherit'} />
              </IconButton>
              <IconButton size='small' onClick={handleClear}>
                  <ClearIcon color={!!error ? 'error' : 'inherit'} />
              </IconButton>

          </InputAdornment>
          ),}}
      />
{/*
      </Box>
      <Box pl={2}>
      <label htmlFor={name}>
         <TextField
            size='small'
            id={name}
            value={value || ''}
            //id={name + '-name'}
            //value={nameField}
            disabled
            error={!!(error)}
            label={'Name'}
          />
      </label>
      </Box>
      </Box>
*/}      
      <Dialog fullWidth maxWidth="md" open={openEdit} onClose={handleCloseEdit} >
        <Throbber>
        <DialogTitle id="dialog-edit">
            {titleEdit ? ( <span>{titleEdit}</span> ) : ( <span>Edit record</span> )}
        </DialogTitle>
        <DialogContent>
            <ErrorHandler>
            {{
                'user': <UserEdit objectID={value} onSave={setPendingModel} filter={filter} />,
                'org': <OrgEdit objectID={value} onSave={setPendingModel} filter={filter} />,
                'equip': <EquipEdit objectID={value} onSave={setPendingModel} filter={filter} />,
                'plate': <PlateEdit objectID={value} onSave={setPendingModel} filter={filter} />,
                'cover': <CoverEdit objectID={value} onSave={setPendingModel} filter={filter} />,
                'image': <ImageEdit objectID={value} onSave={setPendingModel} filter={filter} />,
                'analysis': <AnalysisEdit objectID={value} onSave={setPendingModel} filter={filter} />,
                'default': <></>,
            } [objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
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
        </Throbber>
      </Dialog>


      <Dialog fullWidth maxWidth="md" open={openSelect} onClose={handleCloseSelect} >
        <Throbber>
        <DialogTitle id="dialog-select">
            {titleSelect ? ( <span>{titleSelect}</span> ) : ( <span>Select record</span> )}
        </DialogTitle>
        <DialogContent>
            <ErrorHandler>
            {{
                'user': <UserSelect onSelect={setPendingModel} filter={filter} />,
                'org': <OrgSelect onSelect={setPendingModel} filter={filter} />,
                'equip': <EquipSelect onSelect={setPendingModel} filter={filter} />,
                'plate': <PlateSelect onSelect={setPendingModel} filter={filter} />,
                'cover': <CoverSelect onSelect={setPendingModel} filter={filter} />,
                'image': <ImageSelect onSelect={setPendingModel} filter={filter} />,
                'analysis': <AnalysisSelect onSelect={setPendingModel} filter={filter} />,
                'default': <></>,
            } [objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
            </ErrorHandler>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary"
                  disabled={pendingModel ? !pendingModel.id : true} // Only show 'OK' button if a row is selected
                  onClick={onOKSelect}
          >
            OK
          </Button>
          <Button variant="contained" onClick={onCancelSelect} color="primary">
            Cancel
          </Button>
        </DialogActions>
        </Throbber>
      </Dialog>

      <Dialog fullWidth maxWidth="md" open={openCreate} onClose={handleCloseCreate} >
        <Throbber>
        <DialogTitle id="dialog-create">
            {titleCreate ? ( <span>{titleCreate}</span> ) : ( <span>Create new record</span> )}
        </DialogTitle>
        <DialogContent>
            <ErrorHandler>
            {{
                'user': <UserCreate create={true} onSave={setPendingModel} filter={filter} />,
                'org': <OrgCreate create={true} onSave={setPendingModel} filter={filter} />,
                'equip': <EquipCreate create={true} onSave={setPendingModel} filter={filter} />,
                'plate': <PlateCreate create={true} onSave={setPendingModel} filter={filter} />,
                'cover': <CoverCreate create={true} onSave={setPendingModel} filter={filter} />,
                'image': <ImageCreate create={true} onSave={setPendingModel} filter={filter} />,
                'analysis': <AnalysisCreate create={true} onSave={setPendingModel} filter={filter} />,
                'default': <></>,
            } [objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
            </ErrorHandler>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary"
                  disabled={pendingModel ? !pendingModel.id : true} // Only show 'OK' button if ID is set (i.e. record saved)
                  onClick={onOKCreate}
          >
            OK
          </Button>
          <Button variant="contained" onClick={onCancelCreate} color="primary">
            Cancel
          </Button>
        </DialogActions>
        </Throbber>
      </Dialog>

      <Dialog fullWidth maxWidth="md" open={openView} onClose={handleCloseView} >
        <Throbber>
        <DialogTitle id="dialog-view">
            {titleView ? ( <span>{titleView}</span> ) : ( <span>View record</span> )}
        </DialogTitle>
        <DialogContent>
            <ErrorHandler>
            {{
                'user': <UserView objectID={value} />,
                'org': <OrgView objectID={value} />,
                'equip': <EquipView objectID={value} />,
                'plate': <PlateView objectID={value} />,
                'cover': <CoverView objectID={value} />,
                'image': <ImageView objectID={value} />,
                'analysis': <AnalysisView objectID={value} />,
                'default': <></>,
            } [objectType || 'default'] }     {/* Use || <Component /> if need 'default' */}
            </ErrorHandler>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={handleCloseView}>Close</Button>
        </DialogActions>
        </Throbber>
      </Dialog>

    </div>

  );
}

// Apply connector for uniforms form
export default connectField(IDInput); 
