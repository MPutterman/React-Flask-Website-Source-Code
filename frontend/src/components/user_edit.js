import React, {useState, useEffect} from "react";
import axios from "axios";
import * as FormData from "form-data";
import backend_url from './config.js';
import { withRouter } from "react-router";
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";

// TODO: need to run: npm install @material-ui/lab
import { AlertList, Alert } from '../components/alerts';

/* Important notes:
   I am using Material UI for form components, and React Hook Form for handling of validation.
   To enable React Hook Form to work with Material UI (non-native HTML5 elements), it is
   necessary to wrap each form element in a "Controller", so that events are properly received
   (e.g. for re-rendering). https://react-hook-form.com/api/usecontroller/controller#main
*/

/* Open questions:
  Q: There is a provision for a customer validator function, but it is not clear how to set up
  a custom error message.  See comments in code below.  Also see the following link:
   https://spectrum.chat/react-hook-form/help/how-to-add-validation-for-controller-fields~4ddce901-6140-44b7-a561-384fe5c4cd6f
*/

/* Credits:
   Borrowing from here: https://bezkoder.com/react-hooks-crud-axios-api/
   Using functional version (rather than class) to enable use of React-Hook-Form library
*/

// User Edit form
const UserEdit = (props) => {

    const initialUserState = {
        user_id: null,
        first_name: '',
        last_name: '',
        email: '',
        org_list: [],
    };

    const [currentUser, setCurrentUser] = useState(initialUserState);
    const [message, setMessage] = useState('');
    const [availableOrganizations, setAvailableOrganizations] = useState([]);

    // Form hooks
    // mode is the render mode (both onChange and onBlur)
    // defaultValues defines how the form will be 'reset'. Fill back in with retrieved user info
    const {handleSubmit, reset, control} = useForm({mode: 'all', defaultValues: currentUser}); 

    // Actions when form is submitted
    // TODO: need to handle other types of submit, e.g. delete?
    const onSubmit = (data, e) => {
      console.log("UserEdit form submit: data => ", data);
      updateUser(data)
      // Temporary... after saving, re-retrieve the user to change currentUser and trigger useEffect
      // so cancel will now revert to the last saved value
      getUser(data.user_id)
    };
    
    // Retrieve user with specified id from the database
    const getUser = (id) => {
        axios.get(backend_url('user/load/' + id))
        .then((response) => {
            setCurrentUser(response.data);
            console.log ("In getUser: response data => ", response.data);
        })
        .catch((e) => {
            console.error("GET /user/edit/" + id + ": " + e);
        });

    }

    // Retrieve list of available organizations (for now all organizations)
    const getOrganizations = () => {
        axios.get(backend_url('organization/search'))
        .then((response) => {
            setAvailableOrganizations(response.data);
            console.log("in getOrganizations: response data => ", response.data);
        })
        .catch((e) => {
            console.error("GET /organization/search: " + e);
        });
    }

    // useEffect fires after render. This one is conditional on changes in props.match.params.id
    // Because this is set by the url/route, it will be activated the first time the page is visited
    useEffect(() => {
        getUser(props.match.params.id);
        getOrganizations();
        console.log("In useEffect #1 => ", currentUser, availableOrganizations);
    }, [props.match.params.id]);

    // This second useEffect is triggered whenever 'currentUser' changes (i.e. after loading from database).
    // When triggered, it sets the defaultValues of the form to currentUser, then triggers the form to reset.
    // This causes the form fields to fill in with the newly retrieved data in currentUser
    useEffect(() => {
        console.log("In useEffect #2 => ", currentUser); //initUser);
        reset(currentUser);
    }, [currentUser]);


    const onReset = () => {
        console.log("In resetUser: currentUser => ", currentUser);
        reset(currentUser);

    }

    // Save the user information back to the database
    const updateUser = (data) => {
        var formData = new FormData();
        formData.append('user_id', data.user_id);
        formData.append('first_name', data.first_name);
        formData.append('last_name', data.last_name);
        formData.append('email', data.email);
        formData.append('org_list', data.org_list);
        
        const config = {     
            headers: { 'content-type': 'multipart/form-data' }
        }

        axios.post(backend_url('user/save'), formData, config)
        .then((response) => {
            console.log(response.data);
            setMessage("success");
        })
        .catch((e) => {
            console.log("POST /user/save: " + e);
        });
    }

    // Delete the user matching the user-id
    // NOT YET FUNCTIONAL AND BACKEND NOT IMPLEMENTED
    const deleteUser= () => {
        axios.post(backend_url('user/delete/' + currentUser.id))
        .then((response) => {
            console.log(response.data);
            props.history.push('/user/search');  // Does this make sense to go here after?
        })
        .catch((e) => {
            console.log("POST /user/delete/" + currentUser.id + ": " + e);
        });
    }    

    // Returns how to rener the form

    return (

          <div className="UserEditForm" width="50vw">
            
              <form onSubmit={handleSubmit(onSubmit)} onReset={onReset}> 

                <Controller
                  control={control}
                  name="first_name"
                  rules= {{
                    required: {value:true, message:"First name is required"},
                      // Other types of validators:
                      // minLength: {value: 3, message:"Minimum name length is 3"},
                      // validate: ()=>{return getValues("name") === "bill";}
                      // validate: {value: ()=>{return getValues("name") === "bill";} , message: "Name must be bill"},
                  }}
                  render={({field, fieldState, formState}) => 
                  <TextField
                    label="First name:"
                    helperText={formState.errors.first_name ? formState.errors.first_name.message : ''}
                    autoComplete="given-name"
                    placeholder="First name"
                    fullWidth
                    variant='outlined'
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    value = {field.value}
                    error={Boolean(fieldState.error)}
                  />
                  }
                />

                <Controller
                  control={control}
                  name="last_name"
                  rules= {{
                    required: {value:true, message:"Last name is required"},
                  }}
                  render={({field, fieldState, formState}) =>
                  <TextField
                    label="Last name:"
                    helperText={formState.errors.last_name ? formState.errors.last_name.message : ''}
                    autoComplete="family-name"
                    placeholder="Last name"
                    fullWidth
                    variant='outlined'
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    value = {field.value}
                    error={Boolean(fieldState.error)}
                  />
                  }
                />

                <Controller
                  control={control}
                  name="email"
                  rules= {{
                    required: {value:true, message:"Email is required"},
                    pattern: {value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address"},
                  }}
                  render={({field, fieldState, formState}) =>
                  <TextField
                    label="Email address:"
                    helperText={formState.errors.email ? formState.errors.email.message : ''}
                    autoComplete="email"
                    placeholder="Email address"
                    fullWidth
                    variant='outlined'
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    value = {field.value}
                    error={Boolean(fieldState.error)}
                  />
                  }
                />

                {/* TODO: password field, but might use Google signin API */}

                {/* TODO: This element is not well-rendered. Need to look into better Material-UI options.
                    TODO: helperText doesn't work with grouped elements. Not to explore best practices here for displaying errors.  */}
                <Controller
                  control={control}
                  name="org_list"
                  rules= {{
                  }}
                  render={({field, fieldState, formState}) =>
                  <>
                  <InputLabel>Organization</InputLabel>
                  <Select
                    label="Organization:"
                    multiple
                    //helperText={formState.errors.orgList ? formState.errors.orgList.message : ''}
                    autoComplete="organization"
                    placeholder="Select your organization(s)"
                    variant='outlined'
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    value = {field.value}
                    error={Boolean(fieldState.error)}
                  >
                  <MenuItem disabled value=''>Select your organization(s)</MenuItem>
                  {
                    // Dynamically generate the list of organizations
                    availableOrganizations ? availableOrganizations.map(org => (
                      <MenuItem value={org.org_id}>{org.name}</MenuItem>
                    ))
                    : null
                  }
                  </Select>
                  </>
                  }
                />
                <br/>

                <Button type="link">Add New Organization (not yet working)</Button>
                <br/>

                <Button type="submit" >Save Changes</Button>
                <Button type="reset"> Cancel</Button>
                <Button type="delete" >Delete (not yet working)</Button>

                {/* TODO: there is a Material-UI element for temporary status messages -- use that instead */ }
                      
                <p>{message}</p>
                <AlertList />
                {
                  message === 'success' ? (
                    <Alert severity="success">User successfully updated</Alert>
                  ) : (
                    <Alert severity="error">Something went wrong</Alert>
                  )
                }

               </form>

          </div>
        );
    
}

export default withRouter(UserEdit);
