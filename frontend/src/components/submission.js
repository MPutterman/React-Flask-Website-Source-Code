/* TODO:

* Need some kind of file-uploader component (popup?)... also for equipment and organizations...
--- choose file
--- type (radiation, bright, dark, etc...) -- default set by parent component
--- equipment_id -- pre-fill with pref, but also include popup to select existing or add new
--- name (from filename but allow change)
--- exposure time -- pre-fill with prefs
--- exposure temperature - pre-fill with prefs
--- upload/save (and get image_id value to feed to parent)


* Need to revamp the interface a bit to gather all the needed fields...
   SECTION 1 (analysis metadata)
   - name (short description)
   - description
   - date(?)
   - equipment_id (hidden field)
   ---- Take this from the first image uploaded
   ---- Error if any images have different equipment ID
   - plate_type (pref if defined, or use picker, include option to add new)
   - cover_type (pref if defined, or use picker, include option to add new)

   SECTION 2 (primary files -- include equip_id from above)
   [Assume these are new images, but also provide a way to pick existing ones(?)]
   - radiation image 
   --- name (default to filename, but allow change)
   --- datetime (get from file?)
   --- exp time
   --- exp temp
   - brightfield image
   --- name (default to filename, but allow change)
   --- datetime (get from file?)
   --- exp time
   --- exp temp

   SECTION 3 (correction)
   - use dark correction?
   - dark image (pref if defined, or use picker, include option to add new)
   --- name
   --- datetime (get from file?)
   --- exp time
   --- exp temp
   
   - use flat correction?
   - flat image (pref if defined, or use picker, include option to add new)
   --- name
   --- datetime (get from file?)
   --- exp time
   --- exp temp
   - background correction method [none, uniform, gradient, ...] (pref by default)
   - filtering method [none, 3x3 median filtering, ...] (pref by default)
*/

import React from "react"; 
import axios from "axios";
import { withRouter } from "react-router";
import { backend_url } from './config';

import LinearProgress from "@material-ui/core/LinearProgress";

// Imports for automatic form generation
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField, LongTextField} from 'uniforms-material';
import FileInputField from './filefield';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';

// TODO: Find these web pages again:
//  --- tutorial on adding a progress bar for uploads...
//  --- video on using it with React-hook-form

class Submission extends React.Component {
  constructor(props) {
    super(props);
    axios.defaults.withCredentials = true

    this.formRef = null;

    this.schema = new SimpleSchema ({
      name: {
        label: 'Analysis Name',
        type: String,
        required: true,
      },
      description: {
        label: 'Analysis Description',
        type: String,
        required: false,
      },
      //experiment_datetime: {
      //  label: 'Experiment Date',
      //  type: Date,
      //  required: false,
      //},
      image_radiation: {
        label: 'Radiation Image',
        type: Blob,
        required: false, // TODO: should be true
      },
      image_radiation_dark: {
        label: 'Radiation Dark Image',
        type: Blob,
        required: false,
      },
      image_flat: {
        label: 'Flat Image',
        type: Blob,
        required: false,
      },
      image_brightfield: {
        label: 'Brightfield Image',
        type: Blob,
        required: false,
      },
      // TODO: REMOVE THE FIELDS BELOW... LEGACY
      image_brightfield_flat: {
        label: 'LEGACY: Brightfield Flat Image',
        type: Blob,
        required: false,
      },
      image_uv: {
        label: 'LEGACY: UV Image',
        type: Blob,
        required: false,
      },
      image_uv_flat: {
        label: 'LEGACY: UV Flat Image',
        type: Blob,
        required: false,
      },
    });

    this.bridge = new SimpleSchema2Bridge(this.schema);

  }

  onFileUpload = (data) => {
    let formData = new FormData();

    // Add meta informatoin
    formData.append('name', data.name);
    formData.append('description', data.description);
    //formData.append('experiment_datetime', data.experiment.datetime);
    
    // Transform empty files
    // TODO: fix backend so it only works with files sent...
    // TODO: also fix backend so it doesn't need filenames...
    if (!data.image_radiation) {
      data.image_radiation = new Blob([null], { type: "image/png" });
    }
    if (!data.image_radiation_dark) {
      data.image_radiation_dark = new Blob([null], { type: "image/png" });
    }
    if (!data.image_flat) {
      data.image_flat = new Blob([null], { type: "image/png" });
    }
    if (!data.image_brightfield) {
      data.image_brightfield = new Blob([null], { type: "image/png" });
    }
    if (!data.image_brightfield_flat) {
      data.image_brightfield_flat = new Blob([null], { type: "image/png" });
    }
    if (!data.image_uv) {
      data.image_uv = new Blob([null], { type: "image/png" });
    }
    if (!data.image_uv_flat) {
      data.image_uv_flat = new Blob([null], { type: "image/png" });
    }

    // Add files to formData
    formData.append('Cerenkov', data.image_radiation);
    formData.append('Dark', data.image_radiation_dark);
    formData.append('Flat', data.image_flat);
    formData.append('Bright', data.image_brightfield);
    formData.append('BrightFlat', data.image_brightfield_flat);
    formData.append('UV', data.image_uv);
    formData.append('UVFlat', data.image_uv_flat);

    // Add filenames to formData
    // TODO: fix backend so we don't need to send these
    formData.append('BrightName','');
    formData.append('FlatName', 'SampleFlatField');
    formData.append('CerenkovName', 'SampleCerenkov');
    formData.append('DarkName', 'SampleDarkField');
    formData.append('UVName','');
    formData.append('UVFlatName','');
    formData.append('BrightFlatName','');

    // Debugging (show what is being sent via the form)
    //for (var pair of formData.entries()) {
    //    console.log(pair[0]+ ', ' + pair[1]); 
    //}

    let config = {
      headers: {
          "Content-Type": "multipart/form-data",
      },
    };

    return axios.post(backend_url('/time'), formData, config)
    .then((res) => {
      let filenum = res.data.res;
      const {history} = this.props;
      history.push('/analysis/' + filenum);
      return res; // Need this?
    })
  };

  render() {
    return (
        <div> 
          <div>
              <AutoForm
                schema={this.bridge}
                onSubmit={this.onFileUpload}
                ref={ref => (this.formRef = ref)}
              >
                <AutoField name="name" />
                <ErrorField name="name" />
                <AutoField name="description" component={LongTextField} />
                <ErrorField name="description" />
{/*
                <AutoField name="experiment_datetime" />
                <ErrorField name="experiment_datetime" />
*/}
                <AutoField name="image_radiation" component={FileInputField} />
                <ErrorField name="image_radiation" />
                <AutoField name="image_radiation_dark" component={FileInputField} />
                <ErrorField name="image_radiation_dark" />
                <AutoField name="image_flat" component={FileInputField} />
                <ErrorField name="image_flat" />
                <AutoField name="image_brightfield" component={FileInputField} />
                <ErrorField name="image_brightfield" />
                <p> Below are not really supported any more </p>
                <AutoField name="image_brightfield_flat" component={FileInputField} />
                <ErrorField name="image_brightfield_flat" />
                <AutoField name="image_uv" component={FileInputField} />
                <ErrorField name="image_uv" />
                <AutoField name="image_uv_flat" component={FileInputField} />
                <ErrorField name="image_uv_flat" />
                <p>If you submit without choosing files, it will use sample data</p>

                <SubmitField>Upload Files and Start Analysis</SubmitField>
              </AutoForm>
          </div>
      </div>
    );
  }
}
export default withRouter(Submission);
