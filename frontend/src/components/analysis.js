// TODO:
// I've probably broken things related to "doUV". (In general, someone wouldn't select origins etc without 
//   a brightfield or UV image... but if they want to, might as well allow it.)
// When change origins and ROIs, need to reset something so 'autolane' will work correctly.
// I'm not sure how "n_l" and autolane work together.
// Upload to database seems not working. Maybe instead of "save" we instead have a "delete from database" button?
// -- During testing I had a lot of issue trying to re-analyze the same analysis ID... I think we should instead save it
// -- automatically so the images and ROIs are always available.
// We should add export buttons (either as file, or just .CVS text that can be copied to clipboard)
// Need to implement the left column options (and merge in file selction)

import React from "react";
import "../App.css";
import axios from "axios";
import backend_url from './config.js';
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
import Grid from "@material-ui/core/Grid";
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import FormGroup from "@material-ui/core/FormGroup";
import TextField from "@material-ui/core/TextField";
import Checkbox from "@material-ui/core/Checkbox";

//import Typography from "@material-ui/core/Typography";
//import { PassThrough } from "stream";
//import { thisExpression } from "@babel/types";
//import SearchField from "react-search-field";
//import ReactSlider from 'react-slider'
//import GoogleLogin from 'react-google-login';
import { withRouter } from "react-router";


const UNDEFINED = 1000;  // TODO: possibly convert to "-1", unless backend also uses the '1000' value...

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
    this.origins = [];
    this.ROIs = [[]];
    this.filenum = this.props.match.params.filenumber;
    console.log(this.filenum)
    this.submit = this.submit.bind(this);
    this.add_data = this.add_data.bind(this);
    this.clearOrigins = this.clearOrigins.bind(this);
    this.clearROIs = this.clearROIs.bind(this);
    this.removeROI = this.removeROI.bind(this);
    this.removeOrigin = this.removeOrigin.bind(this);
    this.originsDefined = this.originsDefined.bind(this);
    this.state = {
      arr_files: [],
      string_files: [],
      n_l: 0,
      selected: {lane:UNDEFINED,spot:200},
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
      do_RF: false,
      CerenkovImg: 0,
      brightness: 0,  // brightness setting (client side only) for radiation image
      contrast: 0,    // contrast setting (client side only) for radiation image
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
      doROIs: true,
      selectMode: "roi",
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
      name:'',
      image_size_x: 682, // TODO: get these from the Image
      image_size_y: 682, // TODO: get these from the Image
      
    };
    //axios.defaults.withCredentials = true
    this.retrieve_analysis()
    
    
  }

  retrieve_analysis=()=>{
    return axios
        .get(backend_url('retrieve_analysis/' + this.filenum))
        .then((res) => {
          console.log ('response =>', res);
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
    this.setState({autoLane:res.autoLane,n_l:res.n_l,do_RF:res.doRF,doUV:res.doUV})
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
  getRadius = (x,y,shift)=>{
    let data = new FormData()
    data.append('ROIs',JSON.stringify(this.ROIs))
    return axios.post(
      backend_url(
        'radius/'+this.filenum+
        `/`+x+`/`
        +y+`/`+
        shift
        )
        ,data, {
      headers: {
        "Content-Type": "multipart/form-data",
      }},).then((res) => {
        this.ROIs[0].push([
          
          res.data.row,
          res.data.col,
          res.data.rowRadius,
          res.data.colRadius,
        ]);
        this.setState({ n_l:res.data.n_l });
        return res;
      });
  }
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
      this.getRadius(x,y,shift)
    }
  };
  fixBackground = ()=>{
    return axios.get(backend_url('fix_background/'+this.filenum))
    .then((res)=>{this.setState({background_corrected:''})}).catch('An Error Occurred')
  }
    componentDidMount() {
      console.log('mounted')
    window.addEventListener("keydown", this.changeROIFromPress);
  }
  changeROIFromPress = (e) => {
    console.log(e)
    if (
//      !this.state.resultsReturned &&
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
    if (this.state.selected.lane === UNDEFINED) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][0] + 4 + this.ROIs[last.lane][last.spot][2] < 682) {
      this.ROIs[last.lane][last.spot][0] += 4;
      this.setState({ makeUpdate: 10 });
    }
  }
  moveHorz() {
    if (this.state.selected.lane === UNDEFINED) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][1] + 4 + this.ROIs[last.lane][last.spot][3] < 682) {
      this.ROIs[last.lane][last.spot][1] += 4;
      this.setState({ makeUpdate: 8 });
    }
  }
  backHorz() {
    if (this.state.selected.lane === UNDEFINED) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][1] - 4 - this.ROIs[last.lane][last.spot][3] > 0) {

      this.ROIs[last.lane][last.spot][1] -= 4;
      this.setState({ makeUpdate: 10 });
    }
  }
  backVert() {
    if (this.state.selected.lane === UNDEFINED) {
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
//    if (this.state.resultsReturned) {
//      return;
//    }

    if (this.state.doROIs) {
      if (l != this.state.selected.lane || i !=this.state.selected.spot) {
        this.select(l,i);
      } else {
        this.ROIs[l].splice(i, 1);
        this.setState({ makeUpdate: 9 });
        this.setState({ selected: {lane:UNDEFINED,spot:UNDEFINED} }); // what does this do?
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
      this.setState({ makeUpdate: 10 });  // what is 'makeUpdate'? what do the values mean?
    }
  }

  clearROIs() {
    this.ROIs=[[]]
    this.setState({ makeUpdate: 8 });
  }
  clearOrigins() {
    this.origins.splice(0, this.origins.length);
    this.setState({ makeUpdate: 10 });
  }

  removeOrigin(e, i) {
//    if (this.state.resultsReturned) {
//      return;
//    }
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
      this.getRadius(x,y,shift)
      }
    }

    // TODO: eventually update this to return true if origins are _fully_ defined (i.e. origins and solvent fronts).
    // For now, if we have at least 3 points, assume the origins are properly defined.
    originsDefined() {
      return this.origins.length >= 3;
    }

  add_data() {
    this.setState({ dataUploaded: true });
    return axios.post(backend_url('upload_data/'+this.filenum)).then(res=>{alert(res.data.Status)});
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
    data.append("doRF", this.state.do_RF);
    data.append("autoLane", !this.originsDefined())
//    console.log(this.state.autoLane);
//    if (this.state.autoLane === true) {
//      data.append("autoLane", "true");
//    } else {
//      data.append("autoLane", "false");
//    }
    return axios
      .post(backend_url('analysis_edit/' + this.filenum), data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => {
        this.ROIs = res.data.ROIs
        //this.setState({})
        return axios.get(backend_url('results/'+this.filenum),).then(res2=>{
          this.setState({ results: res2.data.arr, resultsReturned: true });
        })
        
      }).catch('An Error Occurred');
  }

  incVert = () => {
    if (this.state.selected.lane === UNDEFINED) {
      return;
    }
    var last = this.state.selected;
    if (
      this.ROIs[last.lane][last.spot][0] + this.ROIs[last.lane][last.spot][2] < this.state.image_size_y-0  &&
      this.ROIs[last.lane][last.spot][0] - this.ROIs[last.lane][last.spot][2] > 0
    ) {
      this.ROIs[last.lane][last.spot][2] += 4;
      this.setState({ makeUpdate: 12 });
    }
  };
  incHorz = () => {
    if (this.state.selected.lane === UNDEFINED) {
      return;
    }
    var last = this.state.selected;
    if (
      this.ROIs[last.lane][last.spot][1] + this.ROIs[last.lane][last.spot][3] < this.state.image_size_x-0  &&
      this.ROIs[last.lane][last.spot][1] - this.ROIs[last.lane][last.spot][3] > 0
    ) {
      this.ROIs[last.lane][last.spot][3] += 4;
      this.setState({ makeUpdate: 12 });
    }
  };

  decHorz = () => {
    if (this.state.selected.lane === UNDEFINED) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][3] > 14) {
      this.ROIs[last.lane][last.spot][3] -= 4;
      this.setState({ makeUpdate: 12 });
    }
  };
  decVert = () => {
    if (this.state.selected.lane === UNDEFINED) {
      return;
    }
    var last = this.state.selected;
    if (this.ROIs[last.lane][last.spot][2] > 14) {
      this.ROIs[last.lane][last.spot][2] -= 4;
      this.setState({ makeUpdate: 12 });
    }
  };

  _onMouseClick(e) {
//    if (this.state.resultsReturned) {
//      return;
//    }
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
      this.getRadius(x,y,shift)
    }
  }
  
  render() {
    // Overall render a grid layout
    // Left: analysis options
    // Right top: main image(s), brightness/contrast, toggle ROI/origins
    // Right bottom: analysis results, save/export, etc...
    
    return (
      <ThemeProvider theme={this.theme}>
        <CssBaseline />
        <div style={{ position: "relative",}}>
        <Grid container direction='row' xs='12'>

          {/* Settings */}
          <Grid item xs={4}>
            {/* Make each setting a new row? */}
            <Paper>
              <h1>Analysis Options:</h1>
              <Grid container>
                <Grid item>
                  Description
                </Grid>
                <Grid item>
                  <TextField id='description'/>
                </Grid>
              </Grid>
              <Grid container>
                <Grid item>
                  TLC plate type
                </Grid>
              </Grid>
              Description: textfield
              <br/>
              Plate type: dropdown (with default selected)
              <br/>
              Cover type: dropdown (with default selected)
              <br/>
              Equipment: dropdown (with default selected)
              <br/>
              Flat image: dropdown (with default (for equipment) selected). Option to upload new file.
              <br/>
              <br/>
              <br/>
              Radiation image file: file selector. Option to search for existing file on server.
              <br/>
              Temperature (C): input (populate with default value)
              <br/>
              Exposure time (s): input (populate with default value)
              <br/>
              Dark image file: dropdown (populate with default file). Option to upload new file.
              <br/>
              Image filter method: dropdown with only 3x3 median available for now (with default selected)
              <br/>
              Background subtraction method: dropdown of options (e.g. quadratic) (with default selected)
              <br/>
              <br/>
              <br/>
              Bright image file: file selector. Option to search for existing file on server.
              <br/>
              Dark image file for bright correction: dropdown (populate with default file). Option to upload new file.
              <br/>



            </Paper>

            
          </Grid>

          {/* Image(s) */}

          <Grid container xs={8} direction='column' spacing={3}>

            <Grid item>

                <img
		              className = 'noselect'    
                  id="img"
                  style={{
                    position: "relative",
                    marginTop: "0",
                    marginLeft: "0",
                    filter:
                      "brightness(" + (100 + this.state.brightness) + "%) " + 
                      "contrast(" + (100 + this.state.contrast) + "%) ",
                  }}
                  src={backend_url('img/' + this.filenum+this.state.background_corrected)}
                  onClick={this._onMouseClick.bind(this)}
                  alt=''
                />

{/*
Below needs some work to make sure images are positioned properly, and ROI drawing works as expected...
*/}

                {true &&
                  this.state.doUV && ( 
                    <div>
                      
                      <img
                        src={backend_url('UV/' + this.filenum)}
                        style={{
                          position: "relative",
                          marginTop: "30vh",
                          marginLeft: "56vw",
                          height: "30vh",
                          width: "19vw",
                          filter:
                            "brightness(" + (100 + this.state.brightness) + "%) " + 
                            "contrast(" + (100 + this.state.contrast) + "%) ",

                        }}
                        onClick={this.UVClick}
                        alt=''
                      />
                      <img
                        src={backend_url('Cerenkov/' + this.filenum)}
                        style={{
                          position: "absolute",
                          marginTop: "30vh",
                          marginLeft: "77vw",
                          height: "30vh",
                          width: "19vw",
                          filter:
                            "brightness(" + (100 + this.state.brightness) + "%) " + 
                            "contrast(" + (100 + this.state.contrast) + "%) ",

                        }}
                        onClick={this.UVClick}
                        alt=''
                      />
                    </div>
                )}

                {/* Draw ROIs if available */}

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
                            : `dashed 2px #${((l%2)*15).toString(16)}${(15*(l%2)).toString(16)}${(15*(l%2)).toString(16)}`,
                        width: "" + 2 * x[3] - 2 + "px",
                        height: "" + 2 * x[2] - 2 + "px",
                        marginTop: "" + x[0] - 1 * x[2] + 1 - this.state.image_size_x + "px",
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

                {/* Draw origins if available */}

                {this.origins.map((x, i) => {
                  return (
                    <canvas
                      className="ROI"
                      key={i}
                      style={{
                        borderRadius: "50%/50%",
                        backgroundColor: "white",
                        position: "absolute",
                        marginTop: "" + 1 * x[0] - 5 -this.state.image_size_y + "px",
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

                <Button
                  color = 'primary' 
                  variant = 'contained'
                  onClick = {this.fixBackground}
                >
		              Perform Background Correction	   
	     		      </Button>

            </Grid>
            <Grid item>
              <h1>Image adjustments:</h1>

                <Grid container>
                  <Grid item xs={2}>
                    <p>Brightness</p>
                  </Grid>
                  <Grid item xs={10}>
                    <Slider
                      id="brightness"
                      name="brightness"
                      label="Brigthness"
                      valueLabelDisplay="auto"
                      step={1}
                      marks={true}
                      defaultValue={this.state.brightness}
                      min={-100}
                      max={500}
                      onChange={(e, value) => {
                        this.setState({ brightness: value });
                      }}
                    />
                  </Grid>
                </Grid>

                <Grid container>
                  <Grid item xs={2}>
                    <p>Contrast</p>
                  </Grid>
                  <Grid item xs={10}>
                    <Slider
                      id="contrast"
                      name="contrast"
                      label="Contrast"
                      valueLabelDisplay="auto"
                      step={1}
                      marks={true}
                      defaultValue={this.state.contrast}
                      min={-100}
                      max={500}
                      onChange={(e, value) => {
                        this.setState({ contrast: value });
                      }}
                    />  
                  </Grid>
                </Grid>

                <Grid item>

                  <h1>Selection:</h1>
                  <Grid container spacing={5}>

                    <Grid item>

                      <FormControl component="fieldset">
                        <RadioGroup name="select-mode"
                          value={this.state.selectMode}
                          onChange={(event) => {
                              this.setState({ selectMode: event.target.value });
                              if (event.target.value === "roi") {
                                this.setState({ doROIs: true });
                              } else {
                                this.setState({ doROIs: false });
                              }
                            }}
                          >
                          <FormControlLabel value="roi" control={<Radio />} label="ROIs" />
                          <FormControlLabel value="origin" control={<Radio />} label="Origin, SF, lanes" />
                        </RadioGroup>
                      </FormControl>

                    </Grid>

                    <Grid item>
                        <Button
                          color="primary"
                          variant="contained"
                          onClick={this.clearROIs}
                        >
                          Clear all ROIs
                        </Button>
                        <Button
                          color="primary"
                          variant="contained"
                          //onClick={this.autoselectROIs}
                        >
                          Autoselect ROIs (not yet implemented)
                        </Button>
                    </Grid>

                    <Grid item>
                      <Button
                        color="primary"
                        variant="contained"
                        onClick={this.clearOrigins}
                      >
                        Clear Origins
                      </Button>                
                    </Grid>

                  </Grid>

                </Grid>



            </Grid>

            {/* Analysis options */}

            <Grid item>
              <Paper>
                <h1>Analysis options:</h1>

                <Grid container direction="row">
                  <Grid item>
                    {/* Compute RF values? Only enable if origins have been defined. 
                        TODO: something not quite working with the checked/unchecked state */}
                    <FormGroup>
                    <FormControlLabel
                      control={<Checkbox
                        //color="primary"
                        //variant="contained"
                        disabled={!this.originsDefined()}
                        checked={this.state.do_RF}
                        value={this.state.do_RF ? 'on' : 'off'}
                        //checked={this.state.do_RF}
                        onChange={(event) => {
                          this.state.do_RF = event.target.checked;
                        }}
                        name="enable_RF"
                      />}
                      label="Enable RF calculation"
                    />
                    </FormGroup>
                  </Grid>

                  <Grid item>

                    {/* If origins are not defined, user must select the number of lanes */}

                    <FormGroup>
                    <FormControlLabel
                      control={<Checkbox
                        //color="primary"
                        //variant="contained"
                        //disabled={this.originsDefined}
                        disabled
                        checked={!this.originsDefined()}
                        //onChange={(event) => {
                        //  this.state.autoLane = event.target.checked;
                        //}}
                        name="enable_auto_lane"
                      />}
                      label="Enable automatic lane selection"
                    />
                    </FormGroup>

                    <p>Number of lanes: {this.state.n_l}</p>
                    <input type = 'range'
                      disabled={this.originsDefined()}
                      name = {'#Lanes'}
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

                  </Grid>

                </Grid>

                <Button
                  color="primary"
                  variant="contained"
                  onClick={this.submit}
                >
                  Update results table
                </Button>

                <Button
                  disabled={!this.state.resultsReturned}
                  color="primary"
                  variant="contained"
                  onClick={this.add_data}
                >
                  Upload to Database
                </Button>

              </Paper>
            </Grid>

            {/* Results */}

            <Grid item>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          id="tc"
                        >
                          ROIS
                        </TableCell>
                        {this.state.results[0].map((spot, i) => {
                          return (
                            <TableCell
                              id="tc"
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
                              component="th"
                              scope="row"
                            >
                              <strong>Band {i + 1}</strong>
                              <br/>Integration
                              {this.state.do_RF && (
                                <><br/>RF value</>
                              )}          
                            </TableCell>
                            {lane.map((spot, j) => {
                              return (
                                <TableCell
                                  id="tc"
                                  key={j}
                                  align="right"
                                >
                                  <br/>
                                  {(spot[0] * 100).toFixed(1)}%<br/>
                                  {spot.length > 1 ? " " + spot[1].toFixed(2) : ""}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>


            </Grid>
          </Grid>

        </Grid>
        </div>
                  
      </ThemeProvider>
    );
  }
}
export default withRouter(Analysis);
