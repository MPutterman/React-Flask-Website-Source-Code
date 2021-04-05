import React from "react";
import { useForm, Controller } from "react-hook-form";
import Input from "@material-ui/core/Input";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";

const OrganizationEditForm = () => {

  const { register, handleSubmit, reset, formState: {errors}, control, getValues } = useForm({mode: "onBlur"});

  const onSubmit = (data, e) => {
    console.log("Submitted data:");
    console.log(data);
  };

  // This seems to be getting called TWICE for each event (focus change, submit, etc...).
  // Could indicate an inefficiency...
  console.log("Errors:");
  console.log(errors);

  return (
    <div className="OrganizationEditForm" width="50vw">
      <form onSubmit={handleSubmit(onSubmit)} onReset={reset}>

        <Controller
          control={control}
          name="name"
          rules= {{
            required: {value:true, message:"Name is required"},
          }}
          render={({field, fieldState, formState}) =>
          <TextField
            label="Orgaization name:"
            helperText={formState.errors.name ? formState.errors.name.message : ''}
            placeholder="Name of organization"
            fullWidth
            variant='outlined'
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={Boolean(fieldState.error)}
          />
          }
        />

        {/*TODO:
          Add location field
          E.g. see here: https://www.npmjs.com/package/material-ui-address-input
          */ }

        <Controller
          control={control}
          name="description"
          rules= {{
            required: false,
          }}
          render={({field, fieldState, formState}) =>
          <TextField
            label="Description:"
            helperText={formState.errors.description ? formState.errors.description.message : ''}
            placeholder="Enter a brief description of your organization (optional)"
            fullWidth
            multiline
            rows={4}
            variant='outlined'
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={Boolean(fieldState.error)}
          />
          }
        />

        <Controller
          control={control}
          name="equipment"
          rules= {{
          }}
          render={({field, fieldState, formState}) =>
          <>
          <InputLabel>Equipment</InputLabel>
          <Select
            label="Equipment:"
            defaultValue={[]}
            multiple
            helperText={formState.errors.organization ? formState.errors.organization.message : ''}
            placeholder="Select the radio-TLC readout equipment"
            variant='outlined'
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={Boolean(fieldState.error)}
          >
          {/* In the future these will be populated from database of equipment with the ID number */}
          <MenuItem value="id1">Cerenkov System Gen 1</MenuItem>
          <MenuItem value="id2">Cerenkov System Gen 2</MenuItem>
          <MenuItem value="id3">Cell-phone reader v0.1</MenuItem>
          </Select>
          </>
          }
        />

        <Button type="link">Add New Equipment</Button>


        <Button type="submit">Save Changes</Button>
        <Button type="reset">Cancel</Button>

      </form>
    </div>
  );
};

export default OrganizationEditForm;