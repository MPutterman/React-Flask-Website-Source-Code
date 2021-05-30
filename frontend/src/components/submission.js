import React from "react"; 
import "../App.css";
import axios from "axios";
import Button from "@material-ui/core/Button";
import LinearProgress from "@material-ui/core/LinearProgress";
import blueGrey from "@material-ui/core/colors/blueGrey";
import CssBaseline from "@material-ui/core/CssBaseline";
import {withRouter} from "react-router";
import {Link} from 'react-router-dom';
import { backend_url } from './config';
import Grid from "@material-ui/core/Grid";
import Divider from "@material-ui/core/Divider";

// TODO: here's a nice tutorial on adding a progress bar for uploads...
// TODO: here's a video on using it with React-hook-form


class Submission extends React.Component {
  constructor(props) {
    axios.defaults.withCredentials = true
    super(props);
    this.fileLink = React.createRef();
    this.dataLink = React.createRef();
    this.darkReference = React.createRef();
    this.flatReference = React.createRef();
    this.cerenkovReference = React.createRef();
    this.UVReference = React.createRef();
    this.UVFlatReference = React.createRef();
    this.brightReference = React.createRef();
    this.brightFlatReference = React.createRef();
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
      Darkname: "SampleDarkField",
      Flatname: "SampleFlatField",
      Cerenkovname: "SampleCerenkov",
      Brightname: "",
      BrightFlatname: "",
      UVname: "",
      UVFlatname: "",
      dataUploaded: false,
      resultsReturned: false,
      results: [[]],
      makeUpdate: 0,
      doROIs: false,
      Dark: null,
      Flat: null,
      Cerenkov: null,
      UV: null,
      UVFlat: null,
      Bright: null,
      BrightFlat: null,
      ImgReturned: false,
      img: 0,
      background_corrected:'',
      name:''
      
    };
    console.log(this.url)
    axios.defaults.withCredentials = true
  }

  // Get backend IP
  // TODO: add error checking
  get backend_ip() {
    return process.env.REACT_APP_BACKEND_IP
  }

  // Get backend port
  // TODO: add error checking and/or default value
  get backend_port() {
    return process.env.REACT_APP_BACKEND_PORT
  }

  // Get url for backend server requests
  get url() {
    return 'http://' + this.backend_ip + ':' + this.backend_port
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
    this.fileLink.current.click()
    
    
    
    this.setState({ ImgReturned: true });
    console.log(res.data);
    
    this.setState({ makeUpdate: 109 });
  };
  
  
  onFileUpload = () => {
    this.setState({ submitted: true });
    let data = new FormData();
    const fileblob1 = new Blob([this.state.Dark], { type: "image/png" });
    data.append("Dark", fileblob1);
    const fileblob2 = new Blob([this.state.Flat], { type: "image/png" });
    data.append("Flat", fileblob2);
    const fileblob3 = new Blob([this.state.UVFlat], { type: "image/png" });
    data.append("UVFlat", fileblob3);
    const fileblob4 = new Blob([this.state.UV], { type: "image/png" });
    data.append("UV", fileblob4);
    const fileblob5 = new Blob([this.state.Cerenkov], { type: "image/png" });
    data.append("Cerenkov", fileblob5);
    const fileblob6 = new Blob([this.state.Bright], { type: "image/png" });
    data.append("Bright", fileblob6);
    const fileblob7 = new Blob([this.state.BrightFlat], { type: "image/png" });
    data.append("BrightFlat", fileblob7);
    data.append('BrightName',this.state.Brightname)
    data.append('FlatName',this.state.Flatname)
    data.append('CerenkovName',this.state.Cerenkovname)
    data.append('DarkName',this.state.Darkname)
    data.append('UVName',this.state.UVname)
    data.append('UVFlatName',this.state.UVFlatname)
    data.append('BrightFlatName',this.state.BrightFlatname)
    return axios
      .post(this.url + '/time', data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
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

        <h1 align="center">Click on the buttons below to choose images for upload</h1>

        <Grid container direction='col' spacing={3}>
        <Grid container direction='row' xs='12' spacing={2} >

          <Grid item xs={4}>
              <h2 align="center">Radiation images</h2>
              <Grid container direction='column' spacing={1}>

                  <Grid item>                  
                    <input
                      type="file"
                      hidden
                      ref={this.cerenkovReference}
                      onChange={(e) => {
                        this.setState({
                          Cerenkovname: e.target.value.substr(
                            e.target.value.indexOf("FAKEPATH/") + 13
                          ),
                          Cerenkov: e.target.files[0],
                        });
                      }}
                    />
                    <Button
                      fullWidth
                      color="primary"
                      variant="contained"
                      onClick={() => this.cerenkovReference.current.click()}
                    >
                      Cerenkov Image: {this.state.Cerenkovname}
                    </Button>
                  </Grid>

                  <Grid item>
                    <input
                      type="file"
                      hidden
                      ref={this.darkReference}
                      onChange={(e) => {
                        this.setState({
                          Darkname: e.target.value.substr(
                            e.target.value.indexOf("FAKEPATH/") + 13
                          ),
                          Dark: e.target.files[0],
                        });
                      }}
                    />
                    <Button
                      fullWidth
                      color="primary"
                      variant="contained"
                      onClick={() => this.darkReference.current.click()}
                    >
                      Cerenkov Dark Image (optional): {this.state.Darkname}
                    </Button>
                  </Grid>


                  <Grid item>                  
                    <input
                      type="file"
                      hidden
                      ref={this.flatReference}
                      onChange={(e) => {
                        this.setState({
                          Flatname: e.target.value.substr(
                            e.target.value.indexOf("FAKEPATH/") + 13
                          ),
                          Flat: e.target.files[0],
                        });
                      }}
                    />
                    <Button
                     fullWidth
                      color="primary"
                      variant="contained"
                      onClick={() => this.flatReference.current.click()}
                    >
                      Cerenkov Flat Image (optional): {this.state.Flatname}
                    </Button>
                  </Grid>

                </Grid>
            
            </Grid>

          <Grid item xs={4}>
              <h2 align="center">Brightfield images (All optional)</h2>
              <Grid container direction='column' spacing={1}>

                  <Grid item>
                    <input
                      type="file"
                      hidden
                      ref={this.brightReference}
                      onChange={(e) => {
                        this.setState({
                          Brightname: e.target.value.substr(
                            e.target.value.indexOf("FAKEPATH/") + 13
                          ),
                          Bright: e.target.files[0],
                        });
                      }}
                    />
                    <Button
                      fullWidth
                      color="primary"
                      variant="contained"
                      onClick={() => this.brightReference.current.click()}
                    >
                      Brightfield Image: {this.state.Brightname}
                    </Button>
                  </Grid>

                  <Grid item>
                    <input
                      type="file"
                      hidden
                      ref={this.brightFlatReference}
                      onChange={(e) => {
                        this.setState({
                          brightFlatname: e.target.value.substr(
                            e.target.value.indexOf("FAKEPATH/") + 13
                          ),
                          BrightFlat: e.target.files[0],
                        });
                      }}
                    />
                    <Button
                      fullWidth
                      color="primary"
                      variant="contained"
                      onClick={() => this.brightFlatReference.current.click()}
                    >
                      Brightfield Flat Image:{" "}
                      {this.state.brightFlatname}
                    </Button>
                  </Grid>

                </Grid>
            </Grid>

            <Grid item xs={4}>
            
              <h2 align="center">UV images (All optional)</h2>
              <Grid container direction='column' spacing={1}>

                  <Grid item>
                    <input
                      type="file"
                      hidden
                      ref={this.UVReference}
                      onChange={(e) => {
                        this.setState({
                          UVname: e.target.value.substr(
                            e.target.value.indexOf("FAKEPATH/") + 13
                          ),
                          UV: e.target.files[0],
                        });
                      }}
                    />
                    <Button
                      fullWidth
                      color="primary"
                      variant="contained"
                      onClick={() => this.UVReference.current.click()}
                    >
                      UV Image: {this.state.UVname}
                    </Button>
                  </Grid>

                  <Grid item>
                    <input
                      type="file"
                      hidden
                      ref={this.UVFlatReference}
                      onChange={(e) => {
                        this.setState({
                          UVFlatname: e.target.value.substr(
                            e.target.value.indexOf("FAKEPATH/") + 13
                          ),
                          UVFlat: e.target.files[0],
                        });
                      }}
                    />
                    <Button
                      fullWidth
                      color="primary"
                      variant="contained"
                      onClick={() => this.UVFlatReference.current.click()}
                    >
                      UV Flat Image: {this.state.UVFlatname}
                    </Button>
                  </Grid>
                </Grid>
              
            </Grid>
          </Grid>
        </Grid>

        <h1 align="center">Submission options</h1>

        <Grid container direction="row" spacing="{10}">
            <Grid item xs={4}>
                      <Button
                        fullWidth
                        color="primary"
                        variant="contained"
                        style={{
                          //fontSize: "2vh",
                          //position: "absolute",
                          //marginTop: "70vh",
                          //marginLeft: "40vw",
                          //width: "20vw",
                          //height: "20vh",
                        }}
                        onClick={this.onFileUpload}
                        disabled={this.state.disabled}
                      >
                        Use Sample Data
                      </Button>
            </Grid>
            <Grid item xs={4}>

                    <Link
                      type = 'hidden'
                      ref={this.fileLink}
                      style={{
                        display:'none',
                      }}
                      to={{ pathname: '/analysis/'+this.filenum}}
                    >click here</Link> 

            </Grid>
            <Grid item xs={4}>

                      <Button
                        fullWidth
                        color="primary"
                        variant="contained"
                        onClick={this.onFileUpload}
                        disabled={this.state.disabled}
                      >
                        Submit files to start analysis
                      </Button>
                
              </Grid>
            </Grid>


            </div>
   
    );
  }
}
export default withRouter(Submission);
