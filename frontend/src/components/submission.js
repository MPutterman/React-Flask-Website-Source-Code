// TODO:
// * Find a way to capture some information about the file when upload to image table
//   such as description, filename(?), type(dark, radiation, etc...)
// * Find a way to select previously uploaded images, not always uploading new ones
// * Clean up state -- there is a lot that is no longer needed

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
    axios.defaults.withCredentials = true
    super(props);
    this.filenum=0
    this.state = {
      arr_files: [],
      string_files: [],
      n_l: 0,
      selected: 1000,
      enterC: "",
      enterD: "",
      enterF: "",
      enterUV: "",
      enterUVF: "",
      enterL: "",
      autoLane: true,
      showData: false,
      submitted: false,
      UVImg: 0,
      dataName: "",
      doRF: "Enable RF Calculation",
      CerenkovImg: 0,
      brightness: 0,
      contrast: 0,
      show_us: "About Us",
      start: false,
      dataUploaded: false,
      resultsReturned: false,
      results: [[]],
      makeUpdate: 0,
      doROIs: false,
      ImgReturned: false,
      img: 0,
      background_corrected:'',
      name:''
      
    };
    console.log(backend_url(''))
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

  makeData = (arr) => {
    arr = Object.assign({}, arr);
    return arr;
  };
  calculate_vh = (px) => {
    var vh = window.innerHeight / 100;
    return px / vh;
  };
  calculate_vw = (px) => {
    var vw = window.innerWidth / 100;
    return px / vw;
  };
  
  onReturnProcessed = (res) => {
    this.filenum = res.data.res
    this.setState({})
    console.log(this.filenum)
    const {history} = this.props;
    history.push('/analysis/' + this.filenum);
    
    
    
    this.setState({ ImgReturned: true });
    console.log(res.data);
    
    this.setState({ makeUpdate: 109 });
  };
  
  
  onFileUpload = (data) => {
    this.setState({ submitted: true });
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
      this.onReturnProcessed(res);
      return res;
    })
  };

  handleSubmitClick=()=>{
    if (!this.state.submitDisabled){
      return
    }
    this.state.submitDisabled=true
  }

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
