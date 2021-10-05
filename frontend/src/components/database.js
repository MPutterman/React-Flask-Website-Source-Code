import React from "react"; 
// { useState, useEffect } from "react";
import "../App.css";
import axios from "axios";
//import Button from "@material-ui/core/Button";
//import Slider from "@material-ui/core/Slider";
//import { palette } from "@material-ui/system";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import blueGrey from "@material-ui/core/colors/blueGrey";
import CssBaseline from "@material-ui/core/CssBaseline";
//import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
//import Typography from "@material-ui/core/Typography";
//import { PassThrough } from "stream";
//import { thisExpression } from "@babel/types";
import SearchField from "react-search-field";
//import ReactSlider from 'react-slider'
//import GoogleLogin from 'react-google-login';
import {Link} from 'react-router-dom'


class Database extends React.Component {
  constructor(props) {
    super(props);
    this.fileLink = React.createRef();
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
    this.rads = [];
    this.origins = [];
    this.ROIs = [];
    this.filenum = 0;
    this.ret = [];
    this.state = {
      arr_files: [],
      string_files: [[]],
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
    return 'compute.cerenkov.org'
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
  load_data = (i) => {
    this.filenum = i
    console.log(this.filenum)
    this.fileLink.current.click()

  };
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
  
  retrieve = () => {
    console.log(this.state.enterL);
    var data = new FormData();
    data.append("cerenkov_name", this.state.enterC);
    data.append("dark_name", this.state.enterD);
    data.append("flat_name", this.state.enterF);
    data.append("UV_name", this.state.enterUV);
    data.append("UVFlat_name", this.state.enterUVF);

    console.log(this.url,"url")
    return axios
      .post(this.url + '/database_retrieve', data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => {
        var arr = [];
        for (let i = 0; i < res.data.files.length; i++) {
          var to_push=[]
          for (let j = 1; j <res.data.files[i].length;j++){
	     to_push.push(res.data.files[i][j])
	  }
          arr.push(to_push);
        }
        this.setState({ string_files: res.data.files });
        
        this.setState({ arr_files: arr });
      });
  };
  
  
  

  render() {
    return (
      <ThemeProvider theme={this.theme}>
        <CssBaseline />
        <div id="container">
          {true && (

            <div>
		  {this.state.string_files.length>0 && <Link type = 'hidden' ref={this.fileLink} style={{
                      display:'none',
                      fontSize: "2.5vh",
                      position: "absolute",
                      marginTop: "44vh",
                      marginLeft: "41vw",
                      width: "0vw",
                      height: "0vh",
                    }} to={{ pathname: '/analysis/'+this.state.string_files[this.filenum][0]}} >click here</Link> }
		  {false && <div
                style={{
                  fontSize: "160%",
                  height: "12vh",
                  width: "12vw",
                  position: "absolute",
                  marginTop: "8vh",
                  marginLeft: "0vw",
                }}
              >
                <SearchField
                  onChange={(val, e) => {
                    this.setState({ enterL: val });
                  }}
                  onEnter={(val, e) => {
                    this.setState({ enterL: val }, () => {
                      this.retrieve();
                    });
                  }}
                  onSearchClick={(val) => {
                    this.setState({ enterL: val }, () => {
                      this.retrieve();
                    });
                  }}
                  placeholder="Enter # Lanes"
                />
              </div>}
		  
              <div
                style={{
                  position: "absolute",
                  marginTop: "8vh",
                  marginLeft: "10vw",
                }}
              >
                <SearchField
                  onChange={(val, e) => {
                    this.setState({ enterC: val });
                  }}
                  onEnter={(val, e) => {
                    this.setState({ enterC: val }, () => {
                      this.retrieve();
                    });
                  }}
                  onSearchClick={(val) => {
                    this.setState({ enterC: val }, () => {
                      this.retrieve();
                    });
                  }}
                  placeholder="Enter Cerenkov Name"
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  marginTop: "8vh",
                  marginLeft: "26vw",
                }}
              >
                <SearchField
                  onChange={(val, e) => {
                    this.setState({ enterD: val });
                  }}
                  onEnter={(val, e) => {
                    this.setState({ enterD: val }, () => {
                      this.retrieve();
                    });
                  }}
                  onSearchClick={(val) => {
                    this.setState({ enterD: val }, () => {
                      this.retrieve();
                    });
                  }}
                  placeholder="Enter Darkfield Name"
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  marginTop: "8vh",
                  marginLeft: "42vw",
                }}
              >
                <SearchField
                  onChange={(val, e) => {
                    this.setState({ enterF: val });
                  }}
                  onEnter={(val, e) => {
                    this.setState({ enterF: val }, () => {
                      this.retrieve();
                    });
                  }}
                  onSearchClick={(val) => {
                    this.setState({ enterF: val }, () => {
                      this.retrieve();
                    });
                  }}
                  placeholder="Enter Flatfield Name"
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  marginTop: "8vh",
                  marginLeft: "58vw",
                }}
              >
                <SearchField
                  onChange={(val, e) => {
                    this.setState({ enterUV: val });
                  }}
                  onEnter={(val, e) => {
                    this.setState({ enterUV: val }, () => {
                      this.retrieve();
                    });
                  }}
                  onSearchClick={(val) => {
                    this.setState({ enterUV: val }, () => {
                      this.retrieve();
                    });
                  }}
                  placeholder="Enter UV Name"
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  marginTop: "8vh",
                  marginLeft: "74vw",
                }}
              >
                <SearchField
                  onChange={(val, e) => {
                    this.setState({ enterUVF: val });
                  }}
                  onEnter={(val, e) => {
                    this.setState({ enterUVF: val }, () => {
                      this.retrieve();
                    });
                  }}
                  onSearchClick={(val) => {
                    this.setState({ enterUVF: val }, () => {
                      this.retrieve();
                    });
                  }}
                  placeholder="Enter UV Flatfield Name"
                />
              </div>
              <TableContainer component={Paper}>
                <Table
                  style={{
                    textAlign: "center",
                    marginTop: "16vh",
                    marginLeft: "10vw",
                    height:
                      6 * Math.min(this.state.arr_files.length + 1, 10 + 1) +
                      "vh",
                    width: "80vw",
                    position: "absolute",
                  }}
                >
                  <TableHead>
                    <TableRow style={{ textAlign: "center", height: "10vh" }}>
                      {[
                        "File",
                        "Cerenkov",
                        "Darkfield",
                        "Flatfield",
                        "UV",
                        "UV Flat",
                        
                      ].map((name, i) => {
                        return (
                          <TableCell
                            id="tc"
                            style={{ textAlign: "center" }}
                            padding="checkbox"
                            key={i}
                            align="center"
                          >
                            {" "}
                            {name}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {this.state.arr_files.map((file, num) => {
                      return (
                        <TableRow style={{ height: "6vh" }}>
                          <TableCell
                            id="tc"
                            onClick={() => {
                              this.load_data(num);
                            }}
                            padding="checkbox"
                            align="center"
                          >
                            File {num + 1}
                          </TableCell>

                          {file.map((name, num2) => {
                            return (
                              <TableCell
                                onClick={() => {
                                  this.load_data(num);
                                }}
                                id="tc"
                                padding="checkbox"
                                align="center"
                                style={{ textAlign: "center" }}
                              >
                                {name}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          )}
          
        </div>
      </ThemeProvider>
    );
  }
}
export default Database;
