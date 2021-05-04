import React from "react";
import "../App.css";
import axios from "axios";
import Button from "@material-ui/core/Button";
import Slider from "@material-ui/core/Slider";
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
//import SearchField from "react-search-field";
//import ReactSlider from 'react-slider'
//import GoogleLogin from 'react-google-login';
import {withRouter} from "react-router";


class Analysis extends React.Component {
  constructor(props) {
    super(props);
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
    this.ROIs = [[]];
    this.filenum = this.props.match.params.filenumber;
    console.log(this.filenum)
    this.ret = [];
    this.submit = this.submit.bind(this);
    this.clearOrigins = this.clearOrigins.bind(this);
    this.clearROIs = this.clearROIs.bind(this);
    this.removeROI = this.removeROI.bind(this);
    this.removeOrigin = this.removeOrigin.bind(this);
    this.state = {
      arr_files: [],
      string_files: [],
      n_l: 0,
      selected: {lane:1000,spot:200},
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
      doUV:false,
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
    this.retrieve_analysis()
    
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
  retrieve_analysis=()=>{
    return axios
        .get(
          this.url + '/retrieve_analysis/' +
            this.filenum 
        )
        .then((res) => {
          this.set_data(res.data)
          this.setState({ makeUpdate: 8 });
          
          return res;
        });
  }
  set_data=(res)=>{
    console.log(res)
    console.log(res.ROIs)
    this.ROIs= res.ROIs
    this.origins=res.origins
    this.setState({autoLane:res.autoLane,n_l:res.n_l,doRF:res.doRF ? 'Disable RF Calculation' : 'Enable RF Calculation',doUV:res.doUV})
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
  UVClick = (e) => {
    var x = e.nativeEvent.offsetX;
    var y = e.nativeEvent.offsetY;
    x = this.calculate_vw(x) / 0.19;
    y = this.calculate_vh(y) / 0.3;
    x = parseInt(6.82 * x);
    y = parseInt(6.82 * y);
    var shift = e.shiftKey ? 1 : 0;
    console.log(shift);
    if (!this.state.doROIs) {
      this.origins.push([y,x]);
      this.setState({ makeUpdate: 1 });
    } else {
      return axios
        .get(
          this.url + '//radius/' +
            this.filenum +
            `/` +
            x +
            `/` +
            y +
            `/` +
            shift
        )
        .then((res) => {
          this.ROIs[0].push([
            
            res.data.row,
            res.data.col,
            res.data.rowRadius,
            res.data.colRadius,
          ]);
          this.setState({ makeUpdate: 8 });
          return res;
        });
    }
  };
  fixBackground = ()=>{
    return axios.get(this.url + '/fix_background/'+this.filenum).then((res)=>{this.setState({background_corrected:''})}).catch('An Error Occurred')
  }
    componentDidMount() {
      console.log('mounted')
    window.addEventListener("keydown", this.changeROIFromPress);
  }
  changeROIFromPress = (e) => {
    console.log(e)
    if (
      
      !this.state.resultsReturned &&
      this.ROIs[0].length > 0
    ) {
      if (e.key === "w") {
	
        this.incVert();
	      this.backVert()
        
      }
      if (e.key === "W") {
        this.decVert();
        this.backVert();
      }

      if (e.key === "D") {
        this.moveHorz();
        this.decHorz();

      }
      if (e.key === "S") {
        this.decVert();
        this.moveVert();
      }
      if (e.key === "A") {
        this.decHorz();
        this.backHorz();
      }
      if (e.key === "s") {
	
        this.incVert();
	this.moveVert()
       
      }
      if (e.key === "d") {
	
        this.incHorz();
	this.moveHorz()
        
      }
      if (e.key === "a") {
	
        this.incHorz();
	this.backHorz()
       
      }
    }
  };
  moveVert() {
    if (this.state.selected.lane === 1000) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][0] + 4 + this.ROIs[last.lane][last.spot][2] < 682) {
      this.ROIs[last.lane][last.spot][0] += 4;
      this.setState({ makeUpdate: 10 });
    }
  }
  moveHorz() {
    if (this.state.selected.lane === 1000) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][1] + 4 + this.ROIs[last.lane][last.spot][3] < 682) {
      this.ROIs[last.lane][last.spot][1] += 4;
      this.setState({ makeUpdate: 8 });
    }
  }
  backHorz() {
    if (this.state.selected.lane === 1000) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][1] - 4 - this.ROIs[last.lane][last.spot][3] > 0) {

      this.ROIs[last.lane][last.spot][1] -= 4;
      this.setState({ makeUpdate: 10 });
    }
  }
  backVert() {
    if (this.state.selected.lane === 1000) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][0] - 4 - this.ROIs[last.lane][last.spot][2] > 0) {
      this.ROIs[last.lane][last.spot][0] -= 4;
      this.setState({ makeUpdate: 10 });
    }
  }
  select(l,i) {
    this.setState({ selected: {lane:l,spot:i} });
    this.setState({ makeUpdate: 1 });
  }
  
  removeROI(e,l, i) {
    if (this.state.resultsReturned) {
      return;
    }

    if (this.state.doROIs) {
      if (l != this.state.selected.lane || i !=this.state.selected.spot) {
        this.select(l,i);
      } else {
        this.ROIs[l].splice(i, 1);
        this.setState({ makeUpdate: 9 });
        this.setState({ selected: {lane:1000,spot:1000} });
      }
    } else {
      var x = e.nativeEvent.offsetX;
      var y = e.nativeEvent.offsetY;
      var radx = this.ROIs[l][i][3];
      var rady = this.ROIs[l][i][2];
      var px = this.ROIs[l][i][1];
      var py = this.ROIs[l][i][0];
      console.log(x, y, radx, rady, px, py);
      console.log(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      x = px - radx + x + 3;
      y = py - rady + y + 3;
      this.origins.push([parseInt(y),parseInt(x)]);
      this.setState({ makeUpdate: 10 });
    }
  }

  clearROIs() {
    this.ROIs.splice(0, this.ROIs.length);
    this.setState({ makeUpdate: 8 });
  }
  clearOrigins() {
    this.origins.splice(0, this.origins.length);
    this.setState({ makeUpdate: 10 });
  }

  removeOrigin(e, i) {
    if (this.state.resultsReturned) {
      return;
    }
    if (!this.state.doROIs) {
      this.origins.splice(i, 1);
      this.setState({ makeUpdate: 19 });
    } else {
      var x = e.nativeEvent.offsetX;
      var y = e.nativeEvent.offsetY;
      var radx = 5;
      var rady = 5;
      var px = this.origins[i][1];
      var py = this.origins[i][0];
      x = px - radx + x;
      y = py - rady + y;
      x = parseInt(x);
      y = parseInt(y);
      var shift = e.shiftKey ? 1 : 0;
      console.log(shift);
      return axios
        .get(
          this.url + '//radius/' +
            this.filenum +
            `/` +
            x +
            `/` +
            y +
            "/" +
            shift
        )
        .then((res) => {
          this.ROIs[0].push([
            res.data.row,
            res.data.col,
            
            res.data.rowRadius,
            res.data.colRadius,
          ]);
          this.setState({ selected: {lane:0,spot:this.ROIs[0].length-1} });
          console.log(this.ROIs,this.state.selected)
          return res;
        })
    }
  }

  

  changeDoROIs = () => {
    if (this.state.doROIs) {
      this.setState({ doROIs: false });
    } else {
      this.setState({ doROIs: true });
    }
  };

  add_data = () => {
    this.setState({ dataUploaded: true });
    
    return axios.post(this.url + '/upload_data/'+this.filenum).then(res=>{alert(res.data.Status)});
  };
  submit() {
    console.log(this.origins)
    // if (this.state.Cerenkovname === "") {
    //   this.setState({ Cerenkovname: "Sample" });
    // }
    let data = new FormData();
    console.log('ROIs',this.ROIs)
    data.append("ROIs", JSON.stringify(this.ROIs));
    data.append('doUV',this.state.doUV)
    data.append("origins", JSON.stringify(this.origins));
    data.append("n_l", this.state.n_l);
    if (this.state.doRF === "Disable RF Calculation") {
      data.append("doRF", "true");
    } else {
      data.append("doRF", "false");
    }
    console.log(this.state.autoLane);
    if (this.state.autoLane === true) {
      data.append("autoLane", "true");
    } else {
      data.append("autoLane", "false");
    }
    return axios
      .post(this.url + '/analysis_edit/' + this.filenum, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => {
        this.ROIs = res.data.ROIs
        this.setState({})
        return axios.get(this.url+'/results/'+this.filenum).then(res2=>{
          this.setState({ results: res2.data.arr, resultsReturned: true });
        })
        
      }).catch('An Error Occurred');
  }
  incVert = () => {
    if (this.state.selected.lane === 1000) {
      return;
    }
    var last = this.state.selected;
    if (
      this.ROIs[last.lane][last.spot][0] + this.ROIs[last.lane][last.spot][2] < 682-0  &&
      this.ROIs[last.lane][last.spot][0] - this.ROIs[last.lane][last.spot][2] > 0
    ) {
      this.ROIs[last.lane][last.spot][2] += 4;
      this.setState({ makeUpdate: 12 });
    }
  };
  incHorz = () => {
    if (this.state.selected.lane === 1000) {
      return;
    }
    var last = this.state.selected;
    if (
      this.ROIs[last.lane][last.spot][1] + this.ROIs[last.lane][last.spot][3] < 682-0  &&
      this.ROIs[last.lane][last.spot][1] - this.ROIs[last.lane][last.spot][3] > 0
    ) {
      this.ROIs[last.lane][last.spot][3] += 4;
      this.setState({ makeUpdate: 12 });
    }
  };

  decHorz = () => {
    if (this.state.selected.lane === 1000) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][3] > 14) {
      this.ROIs[last.lane][last.spot][3] -= 4;
      this.setState({ makeUpdate: 12 });
    }
  };
  decVert = () => {
    if (this.state.selected.lane === 1000) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][2] > 14) {
      this.ROIs[last.lane][last.spot][2] -= 4;
      this.setState({ makeUpdate: 12 });
    }
  };
  _onMouseClick(e) {
    if (this.state.resultsReturned) {
      return;
    }
    this.setState({ dataUploaded: false });
    if (!this.state.doROIs) {
      this.origins.push([
        parseInt(e.nativeEvent.offsetY),
        parseInt(e.nativeEvent.offsetX),
        
      ]);
      this.setState({ makeUpdate: 8 });
    } 
    else {
      var x = parseInt(e.nativeEvent.offsetX);
      var y = parseInt(e.nativeEvent.offsetY);
      var shift = e.shiftKey ? 1 : 0;
      console.log(shift);
      return axios
        .get(
          this.url + '//radius/' +
            this.filenum +
            `/` +
            x +
            `/` +
            y +
            "/" +
            shift
        )
        .then((res) => {
          this.ROIs[0].push([
            res.data.row,
            res.data.col,
            
            res.data.rowRadius,
            res.data.colRadius,
          ]);
          this.setState({ selected: {lane:0,spot:this.ROIs[0].length-1} });
          return res;
        });
    }
  }
  
  render() {
    return (
      <ThemeProvider theme={this.theme}>
        <CssBaseline />
        <div id="container">

          
            <div>
              {this.state.resultsReturned && (
                <Button
                  color="primary"
                  variant="contained"
                  style={{
                    fontSize: "160%",
                    height: "12vh",
                    width: "12vw",
                    position: "absolute",
                    marginTop: "87vh",
                    marginLeft: "87vw",
                  }}
                  onClick={() => {
                    this.setState({ resultsReturned: false });
                  }}
                >
                  Reselect
                </Button>
              )}
              
              {this.state.resultsReturned === true && (
                <TableContainer component={Paper}>
                  <Table
                    style={{
                      textAlign: "center",
                      marginTop: "0vh",
                      marginLeft: "682px",
                      zIndex: 15,
                      alignContent: "center",
                      height: "" + this.state.results.length * 19 + "vh",
                      width: "" + this.state.results[0].length * 4.6 + "vw",
                      position: "absolute",
                    }}
                    size="medium"
                    aria-label="a dense table"
                  >
                    <TableHead>
                      <TableRow style={{ textAlign: "center", height: "7vh" }}>
                        <TableCell
                          id="tc"
                          padding="checkbox"
                          style={{
                            textAlign: "center",
                            height: "auto !important",
                            fontSize: "160%",
                          }}
                        >
                          ROIS
                        </TableCell>
                        {this.state.results[0].map((spot, i) => {
                          return (
                            <TableCell
                              id="tc"
                              style={{
                                fontSize: "140%",
                                textAlign: "center",
                                alignContent: "center",
                              }}
                              padding="checkbox"
                              key={i}
                              align="right"
                            >
                              L{i + 1}{" "}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {this.state.results.map((lane, i) => {
                        return (
                          <TableRow key={i}>
                            <TableCell
                              id="tc"
                              padding="checkbox"
                              style={{
                                fontSize: "110%",
                                height: "auto !important",
                              }}
                              component="th"
                              scope="row"
                            >
                              Spot {i + 1}
                            </TableCell>
                            {lane.map((spot, j) => {
                              return (
                                <TableCell
                                  id="tc"
                                  padding="checkbox"
                                  style={{
                                    fontSize: "130%",
                                    height: "auto !important",
                                  }}
                                  key={j}
                                  align="right"
                                >
                                  {parseInt(spot[0] * 100)}%{" "}
                                  {spot.length > 1 ? " " + spot[1] : ""}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {this.ROIs.map((Lane,l)=>{

                return(
                  
                  <div>
                    
                {Lane.map((x,i)=>{
                  return(
                    
                    <canvas
                    key={i}
                    className="ROI"
                    style={{
                      position: "absolute",
                      backgroundColor: "transparent",
                      zIndex: this.state.doROIs ? 11 : 10,
                      borderRadius: "50%/50%",
                      border:
                        (i === this.state.selected.spot && l === this.state.selected.lane)
                          ? "dashed 2px #0ff"
                          : `dashed 2px #${(2*l).toString(16)}${(2*l).toString(16)}${(2*l).toString(16)}`,
                      width: "" + 2 * x[3] - 2 + "px",
                      height: "" + 2 * x[2] - 2 + "px",
                      marginTop: "" + x[0] - 1 * x[2] + 1 + "px",
                      marginLeft: "" + x[1] - 1 * x[3] + 1 + "px",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      this.removeROI(e,l, i);
                    }}
                  />
                  );

                })}
                </div>)
              })}
              {this.origins.map((x, i) => {
                return (
                  <canvas
                    className="ROI"
                    key={i}
                    style={{
                      borderRadius: "50%/50%",
                      backgroundColor: "white",
                      position: "absolute",
                      marginTop: "" + 1 * x[0] - 5 + "px",
                      marginLeft: "" + 1 * x[1] - 5 + "px",
                      width: "10px",
                      height: "10px",
                      zIndex: this.state.doROIs ? 10 : 11,
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      this.removeOrigin(e, i);
                    }}
                  />
                );
              })}

              
             
              
              
              
                <img
		  className = 'noselect'    
                  id="img"
                  style={{
                    position: "absolute",
                    filter: "brightness(10)",
                    filter:
                      "contrast(" + (100 + 10 * this.state.contrast) + "%)",
                  }}
                  src={this.url + '/img/' + this.filenum+this.state.background_corrected}
                  onClick={this._onMouseClick.bind(this)}
                  alt=''
                />
              

              {!this.state.resultsReturned && (
                <div>
                  {true &&
                    this.state.doUV && ( 
                      <div>
                        
                        <img
                          src={this.url + '/UV/' + this.filenum}
                          style={{
                            position: "absolute",
                            marginTop: "30vh",
                            marginLeft: "56vw",
                            height: "30vh",
                            width: "19vw",
                            filter:
                              "contrast(" +
                              (100 + 10 * this.state.contrast) +
                              "%)",
                          }}
                          onClick={this.UVClick}
                          alt=''
                        />
                        <img
                          src={this.url + '/Cerenkov/' + this.filenum}
                          style={{
                            position: "absolute",
                            marginTop: "30vh",
                            marginLeft: "77vw",
                            height: "30vh",
                            width: "19vw",
                            filter:
                              "contrast(" +
                              (100 + 10 * this.state.contrast) +
                              "%)",
                          }}
                          onClick={this.UVClick}
                          alt=''
                        />
                      </div>
                    )}
                    {!this.state.doUV &&(
                    <div>
                      <Button
                        color="primary"
                        variant="contained"
                        style={{
                          fontSize: "120%",
                          height: "12vh",
                          width: "12vw",
                          position: "absolute",
                          marginTop: "40vh",
                          marginLeft: "60vw",
                        }}
                        onClick={() => {
                          this.state.doRF === "Enable RF Calculation"
                            ? this.setState({ doRF: "Disable RF Calculation" })
                            : this.setState({ doRF: "Enable RF Calculation" });
                        }}
                      >
                        {this.state.doRF}
                      </Button>
                      <div>
			
                      <input type = 'range'
                        name = {'#Lanes'}
                        style={{
                          position: "absolute",
                          height: "11vh",
                          width: "12vw",
                          marginTop: "59vh",
                          marginLeft: "80vw",
                        }}
                        step={1} 
                valueLabelDisplay="on"
                        marks={true}
                        defaultValue={this.state.n_l}
                        min={0}
                        max={12}
                        onInput={(e) => {
                          this.setState({ n_l: e.target.value });
                        }}
                      />
                      </div>
                      <h2
                        style={{
                          position: "absolute",
                          height: "8vh",
                          width: "18vh",
                          fontSize: "140%",
                          marginTop: "56vh",
                          marginLeft: "82vw",
                        }}
                      >
                        #Lanes: {this.state.n_l}
                      </h2>
                  
                      <Button
                        color="primary"
                        variant="contained"
                        style={{
                          fontSize: "100%",
                          height: "12vh",
                          width: "12vw",
                          position: "absolute",
                          marginTop: "40vh",
                          marginLeft: "80vw",
                        }}
                        onClick={() => {
                          console.log(this.state.autoLane);
                          this.setState({ autoLane: !this.state.autoLane });
                        }}
                      >
                        {" "}
                        {!this.state.autoLane
                          ? "Enable Auto Lane Select"
                          : "Enable Manual Lane Select"}{" "}
                      </Button>
                      </div>
                      )}
                    
		   
			<Button variant = 'contained' onClick = {this.fixBackground} color = 'primary' style = {{height:'12vh',width:'12vw',position:'absolute',marginLeft:'0px',marginTop:'682px'}}>
		        Perform Background Correction	   
	     		</Button>
		   
                  
                      
                      
                    
                  
                    <Slider
                      valueLabelDisplay="auto"
                      style={{
                        position: "absolute",
                        height: "8vh",
                        width: "32vw",
                        marginTop: "3vh",
                        marginLeft: "60vw",
                      }}
                      step={3}
                      marks={true}
                      defaultValue={this.state.contrast}
                      min={-9}
                      max={21}
                      label={"Contrast"}
                      onChange={(e, value) => {
                        this.setState({ contrast: value });
                      }}
                    >
                      Contrast
                    </Slider>
                  
                  
                    <h1
                      style={{
                        position: "absolute",
                        height: "2vh",
                        width: "10vw",
                        marginTop: "0vh",
                        marginLeft: "76vw",
                      }}
                    >
                      Contrast
                    </h1>
                  
                  
                    <Button
                      color="primary"
                      variant="contained"
                      style={{
                        fontSize: "190%",
                        height: "12vh",
                        width: "12vw",
                        position: "absolute",
                        marginTop: "70vh",
                        marginLeft: "80vw",
                      }}
                      onClick={this.submit}
                    >
                      Submit
                    </Button>
                  
                  
                    <Button
                      color="primary"
                      variant="contained"
                      style={{
                        fontSize: "90%",
                        position: "absolute",
                        height: "12vh",
                        width: "12vw",
                        marginTop: "70vh",
                        marginLeft: "60vw",
                      }}
                      id="Button"
                      onClick={this.changeDoROIs}
                    >
                      {!this.state.doROIs
                        ? "Select ROIs"
                        : "Select Origin/SF/Cerenkov Lanes"}
                    </Button>
                  
                  
                  
                    <Button
                      color="primary"
                      variant="contained"
                      style={{
                        fontSize: "170%",
                        height: "12vh",
                        width: "12vw",
                        position: "absolute",
                        marginTop: "10vh",
                        marginLeft: "80vw",
                      }}
                      onClick={this.clearROIs}
                    >
                      Clear ROIs
                    </Button>
                    <Button
                  color="primary"
                  variant="contained"
                  style={{
                    fontSize: "100%",
                    height: "12vh",
                    width: "12vw",
                    position: "absolute",
                    marginTop: "87vh",
                    marginLeft: "682px",
                  }}
                  onClick={this.add_data}
                >
                  Upload to Database
                </Button>
                    <Button
                      color="primary"
                      variant="contained"
                      style={{
                        fontSize: "170%",
                        height: "12vh",
                        width: "12vw",
                        position: "absolute",
                        marginTop: "10vh",
                        marginLeft: "60vw",
                      }}
                      onClick={this.clearOrigins}
                    >
                      Clear Origins
                    </Button>
                  
                </div>
              )}

              
            </div>
          
        </div>
      </ThemeProvider>
    );
  }
}
export default withRouter(Analysis);
