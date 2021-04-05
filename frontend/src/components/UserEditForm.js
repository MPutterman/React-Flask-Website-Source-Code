import React from "react";
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";

/* Important notes:
   I am using Material UI for form components, and React Hook Form for handling of validation.
   To enable React Hook Form to work with Material UI (non-native HTML5 elements), it is
   necessary to wrap each form element in a "Component", so that events are properly received
   (e.g. for re-rendering). https://react-hook-form.com/api/usecontroller/controller#main
   The code below is working, including the built-in validators.  There is a provision for
   a custom validator function as well, but there are some questions how to have it generate
   an error message. See comments below.
   https://spectrum.chat/react-hook-form/help/how-to-add-validation-for-controller-fields~4ddce901-6140-44b7-a561-384fe5c4cd6f

*/

const isEmail = (input) => {
  return false;
}

const UserEditForm = () => {

  const { register, handleSubmit, reset, formState: {errors}, control, getValues } = useForm({mode: "onBlur"});

  const onSubmit = (data, e) => {
    //The line below is in many examples, but not sure what it does
    //e.preventDefault();
    console.log("Submitted data:");
    console.log(data);
  };

  // This seems to be getting called TWICE for each event (focus change, submit, etc...).
  // Could indicate an inefficiency...
  console.log("Errors:");
  console.log(errors);

  return (
    <div className="UserEditForm" width="50vw">
      <form onSubmit={handleSubmit(onSubmit)} onReset={reset}>

        <Controller
          control={control}
          name="firstName"
          rules= {{
            required: {value:true, message:"First name is required"},
//            minLength: {value: 3, message:"Minimum name length is 3"},
//            validate: ()=>{return getValues("name") === "bill";}
//            validate: {value: ()=>{return getValues("name") === "bill";} , message: "Name must be bill"},
          }}
          render={({field, fieldState, formState}) =>
          <TextField
            label="First name:"
            helperText={formState.errors.firstName ? formState.errors.firstName.message : ''}
            autoComplete="given-name"
//            {...register('name', { required: "Name is required"})}
            placeholder="First name"
            fullWidth
            variant='outlined'
            onChange={field.onChange}
            onBlur={field.onBlur}
//            error={Boolean(errors?.name)}
            error={Boolean(fieldState.error)}

          />
          }
        />

        <Controller
          control={control}
          name="lastName"
          rules= {{
            required: {value:true, message:"Last name is required"},
          }}
          render={({field, fieldState, formState}) =>
          <TextField
            label="Last name:"
            helperText={formState.errors.lastName ? formState.errors.lastName.message : ''}
            autoComplete="family-name"
            placeholder="Last name"
            fullWidth
            variant='outlined'
            onChange={field.onChange}
            onBlur={field.onBlur}
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
            error={Boolean(fieldState.error)}
          />
          }
        />

        {/* TODO: password field, but might use Google signin API */}

        <Controller
          control={control}
          name="organization"
          rules= {{
          }}
          render={({field, fieldState, formState}) =>
          <>
          <InputLabel>Organization</InputLabel>
          <Select
            label="Organization:"
            defaultValue={[]}
            multiple
            helperText={formState.errors.organization ? formState.errors.organization.message : ''}
            autoComplete="organization"
            placeholder="Select your organization(s)"
            variant='outlined'
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={Boolean(fieldState.error)}
          >
          {/* In the future these will be populated from database of organizations with the ID number */}
          <MenuItem value="id1">UCLA Crump Institute</MenuItem>
          <MenuItem value="id2">Some other place</MenuItem>
          </Select>
          </>
          }
        />

        <Button type="link">Add New Organization</Button>


        <Button type="submit">Save Changes</Button>
        <Button type="reset">Cancel</Button>

      </form>
    </div>
  );
};

export default UserEditForm;