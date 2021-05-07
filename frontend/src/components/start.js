import React from "react";
//, { useState, useEffect } from "react";
import "../App.css";
//import axios from "axios";
import Button from "@material-ui/core/Button";
//import Slider from "@material-ui/core/Slider";
//import { palette } from "@material-ui/system";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import blueGrey from "@material-ui/core/colors/blueGrey";
import CssBaseline from "@material-ui/core/CssBaseline";
//import { makeStyles } from "@material-ui/core/styles";
//import Table from "@material-ui/core/Table";
//import TableBody from "@material-ui/core/TableBody";
//import TableCell from "@material-ui/core/TableCell";
//import TableContainer from "@material-ui/core/TableContainer";
//import TableHead from "@material-ui/core/TableHead";
//import TableRow from "@material-ui/core/TableRow";
//import Paper from "@material-ui/core/Paper";
//import Typography from "@material-ui/core/Typography";
//import { PassThrough } from "stream";
//import { thisExpression } from "@babel/types";
//import SearchField from "react-search-field";
//import ReactSlider from 'react-slider'
import GoogleLogin from 'react-google-login';
import {withRouter} from "react-router";
import {Link} from 'react-router-dom'


class Start extends React.Component {
  constructor(props) {
    super(props);
    this.submissionLink = React.createRef();
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

  
  
  calculate_vh = (px) => {
    var vh = window.innerHeight / 100;
    return px / vh;
  };
  calculate_vw = (px) => {
    var vw = window.innerWidth / 100;
    return px / vw;
  };
 
  render() {
    return (
      <ThemeProvider theme={this.theme}>
        <CssBaseline />
        <div id="container">
          
          
              
		   <div style = {{position:'absolute',marginTop:'0vh',marginLeft:'0vw',zIndex:12}}>
		   {true &&<GoogleLogin
    			clientId="828188331922-408c37t2bu6d1dqi870g4dghhjc2cdn7.apps.googleusercontent.com"
    			buttonText="Login"
			
    			onSuccess={this.Success}
    			onFailure={console.log('')}
    			cookiePolicy={'single_host_origin'}
 	 		/>} 
		    </div>
                  <Button
                    style={{
                      fontSize: "5vh",
                      position: "absolute",
                      marginTop: "0vh",
                      marginLeft: "0vh",
                      width: "100vw",
                      height: "10vh",
                      backgroundColor: blueGrey[900],
                    }}
                    onClick={() => {
                      this.state.show_us === ""
                        ? this.setState({ show_us: "About Us" })
                        : this.setState({ show_us: "" });
                    }}
                  >
                    {this.state.show_us}
                  </Button>
                  <img
                    style={{
                      position: "absolute",
                      marginTop: "30vh",
                      marginLeft: "25vw",
                      width: "15vw",
                      height: "10vh",
                    }}
                    src={process.env.PUBLIC_URL + "/logo_UCLA_blue_boxed.png"}
                    alt="logo"
                  />
                  <h1
                    style={{
                      fontSize: "6vh",
                      position: "absolute",
                      marginTop: "28vh",
                      marginLeft: "41vw",
                      width: "50vw",
                      height: "10vh",
                    }}
                  >
                    van Dam Lab
                  </h1>
                  <h1
                    style={{
                      position: "absolute",
                      marginTop: "36.5vh",
                      marginLeft: "41vw",
                      width: "70vw",
                      height: "10vh",
                      fontSize: "2.5vh",
                    }}
                  >
                    Calculate RF values and Cerenkov Percentages of radio-TLC images
                    quickly
                  </h1>
                  <Button
                    style={{
                      fontSize: "2.5vh",
                      position: "absolute",
                      marginTop: "44vh",
                      marginLeft: "41vw",
                      width: "10vw",
                      height: "10vh",
                    }}
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      this.submissionLink.current.click();
                    }}
                  >
                    Get Started
                  </Button>
                  <Link type = 'hidden' ref={this.submissionLink} style={{
                      display:'none',
                      fontSize: "2.5vh",
                      position: "absolute",
                      marginTop: "44vh",
                      marginLeft: "41vw",
                      width: "0vw",
                      height: "0vh",
                    }} to={{ pathname: '/submission'}} >click here</Link>
                </div>
            
              
                
              
            
      </ThemeProvider>
    
    )}
}
export default withRouter(Start);
