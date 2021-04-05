import React, { useState, useEffect } from "react";
import "../App.css";
import axios from "axios";
import Button from "@material-ui/core/Button";
import Slider from "@material-ui/core/Slider";
import { palette } from "@material-ui/system";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import blueGrey from "@material-ui/core/colors/blueGrey";
import CssBaseline from "@material-ui/core/CssBaseline";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import { PassThrough } from "stream";
import { thisExpression } from "@babel/types";
import SearchField from "react-search-field";
import ReactSlider from 'react-slider'
import GoogleLogin from 'react-google-login';
import {withRouter} from "react-router";
import {Link} from 'react-router-dom'

class Submission extends React.Component {
  constructor(props) {
    super(props);
    this.fileLink = React.createRef();
    this.darkReference = React.createRef();
    this.flatReference = React.createRef();
    this.cerenkovReference = React.createRef();
    this.UVReference = React.createRef();
    this.UVFlatReference = React.createRef();
    this.brightReference = React.createRef();
    this.brightFlatReference = React.createRef();
    this.theme = createMuiTheme({
      palette: {
        type: "dark",
        primary: {
          light: blueGrey[500],
          main: blueGrey[800],
          dark: blueGrey[900],
          contrastText: "#fff",
        },

        secondary: {
          light: "#ff7961",
          main: blueGrey[700],
          dark: "#002884",
          contrastText: "#000",
        },
      },
    });
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
      Darkname: "",
      Flatname: "",
      Cerenkovname: "",
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
  }

  // Get backend IP
  // TODO: add error checking
  get backend_ip() {
    return 'localhost'
  }

  // Get backend port
  // TODO: add error checking and/or default value
  get backend_port() {
    return '5000'
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

  render() {
    return (
      <ThemeProvider theme={this.theme}>
        <CssBaseline />
        <div id="container">
          
          
              
                <div>
                  
                      <Button
                        color="primary"
                        variant="contained"
                        style={{
                          fontSize: "2.5vh",
                          position: "absolute",
                          marginTop: "80vh",
                          marginLeft: "80vw",
                          width: "20vw",
                          height: "20vh",
                        }}
                        onClick={this.onFileUpload}
                      >
                        Submit
                      </Button>
                    
                  
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
                      color="primary"
                      variant="contained"
                      style={{
                        fontSize: "2vh",
                        position: "absolute",
                        marginTop: "45vh",
                        marginLeft: "40vw",
                        width: "20vw",
                        height: "20vh",
                      }}
                      onClick={() => this.UVFlatReference.current.click()}
                    >
                      UV Flatfield Upload (optional): {this.state.UVFlatname}
                    </Button>
                  

                  
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
                      style={{
                        fontSize: "2.5vh",
                        position: "absolute",
                        marginTop: "20vh",
                        marginLeft: "40vw",
                        width: "20vw",
                        height: "20vh",
                      }}
                      color="primary"
                      variant="contained"
                      onClick={() => this.UVReference.current.click()}
                    >
                      UV Upload (optional): {this.state.UVname}
                    </Button>
                  

                  
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
                      color="primary"
                      variant="contained"
                      style={{
                        fontSize: "2vh",
                        position: "absolute",
                        marginTop: "45vh",
                        marginLeft: "70vw",
                        width: "20vw",
                        height: "20vh",
                      }}
                      onClick={() => this.brightFlatReference.current.click()}
                    >
                      Bright Flatfield Upload (optional):{" "}
                      {this.state.brightFlatname}
                    </Button>
                  
                  
                      <Button
                        color="primary"
                        variant="contained"
                        style={{
                          fontSize: "2vh",
                          position: "absolute",
                          marginTop: "70vh",
                          marginLeft: "40vw",
                          width: "20vw",
                          height: "20vh",
                        }}
                        onClick={this.onFileUpload}
                      >
                        Use Sample Data
                      </Button>
                    

                   <Button
                      color="primary"
                      variant="contained"
                      onClick={(e) => {
                        this.setState({ showData: true });
                      }}
                      style={{
                        fontSize: "5.5vh",
                        textAlign: "center",
                        position: "absolute",
                        marginTop: "0vh",
                        marginLeft: "0vw",
                        width: "100vw",
                        height: "10vh",
                        backgroundColor: blueGrey[900],
                      }}
                    >
                      Click Here to Search Our Database Instead
                    </Button>
                  

                  
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
                      color="primary"
                      style={{
                        fontSize: "2vh",
                        position: "absolute",
                        marginTop: "20vh",
                        marginLeft: "70vw",
                        width: "20vw",
                        height: "20vh",
                      }}
                      variant="contained"
                      onClick={() => this.brightReference.current.click()}
                    >
                      Brightfield Upload (optional): {this.state.Brightname}
                    </Button>
                  

                  
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
                      style={{
                        fontSize: "2.5vh",
                        position: "absolute",
                        marginTop: "20vh",
                        marginLeft: "10vw",
                        width: "20vw",
                        height: "20vh",
                      }}
                      color="primary"
                      variant="contained"
                      onClick={() => this.cerenkovReference.current.click()}
                    >
                      Cerenkov Upload: {this.state.Cerenkovname}
                    </Button>
                  

                  
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
                  
                  <Link type = 'hidden' ref={this.fileLink} style={{
                      display:'none',
                      fontSize: "2.5vh",
                      position: "absolute",
                      marginTop: "44vh",
                      marginLeft: "41vw",
                      width: "0vw",
                      height: "0vh",
                    }} to={{ pathname: '/analysis/'+this.filenum}} >click here</Link> 

                    <Button
                      style={{
                        fontSize: "2.3vh",
                        position: "absolute",
                        marginTop: "45vh",
                        marginLeft: "10vw",
                        width: "20vw",
                        height: "20vh",
                      }}
                      color="primary"
                      variant="contained"
                      onClick={() => this.flatReference.current.click()}
                    >
                      Flatfield Upload (optional): {this.state.Flatname}
                    </Button>
                  

                  
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
                      style={{
                        fontSize: "2.3vh",
                        position: "absolute",
                        marginTop: "70vh",
                        marginLeft: "10vw",
                        width: "20vw",
                        height: "20vh",
                      }}
                      color="primary"
                      variant="contained"
                      onClick={() => this.darkReference.current.click()}
                    >
                      Darkfield Upload (optional): {this.state.Darkname}
                    </Button>
                  
                </div>
              
            </div>
          
        
      </ThemeProvider>
    );
  }
}
export default withRouter(Submission);
