// TODO:
// * Allow selection of color palette for image? (Maybe less processing in backend... just convert to monochromatic PNG?)
//     Are there client-side ways to do this?
//     Some good palettes: https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html
//     Backend supports quite a few natively, we could allow a choice from front end (and a preference)
//     https://matplotlib.org/3.5.0/tutorials/colors/colormaps.html
// * There are some interesting graphical libraries, e.g. https://docs.bokeh.org/en/latest/docs/gallery.html#gallery (python)
//     that may allow use to do interesting things like live line plots, lasso-based ROI selection, etc...
//     Also more react-specific stuff here: https://stackshare.io/bokeh/alternatives
// * Disable more image control functions before the image_url are populated
// * Allow variable step-size for ROI jogging?

import React from "react";
import { withRouter } from "react-router";
import { backend_url } from '../helpers/api';
import { callAPI } from '../helpers/api';

import Button from "@material-ui/core/Button";
import Slider from "@material-ui/core/Slider";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import FormGroup from "@material-ui/core/FormGroup";
import TextField from "@material-ui/core/TextField";
import Checkbox from "@material-ui/core/Checkbox";
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { withStyles, makeStyles } from '@material-ui/core/styles';
import AnalysisResults from './analysis_results';
import AnalysisData from './analysis_data 4';
//import {useKeypress} from '../hooks/Keypress';
import {useEventListener} from '../hooks/useEventListener';
import { ServerImage } from '../components/server_file';

import { analysisSchema, analysisValidator } from '../helpers/schema';
import { connectEdit } from '../components/object_edit';
import { SubmitField } from 'uniforms-material';
import { useThrobber } from '../contexts/throbber';
import { useAlerts } from '../contexts/alerts';
import { useConfigState } from '../contexts/config';
import { useConfirm } from 'material-ui-confirm';
import Popup from '../components/popup';
import HelpIcon from '@material-ui/icons/Help';
import { useForm } from 'uniforms';

const WrappedAnalysisEdit = ({model, ...props}) => {

    const setBusy = useThrobber();
    const setAlert = useAlerts();
    const form = useForm();
    const confirm = useConfirm();
    const config = useConfigState();

    // Define step sizes (in pixels) to increment position or radius (via keypresses)
    const STEP_X = 4;
    const STEP_Y = 4;
    const STEP_RX = 4;
    const STEP_RY = 4;
    const UNDEFINED = -1;

    // TODO: some of this is already in the model. We replicate it here since it is editable
    // and can be separately saved back to the model. Is there a better way to organize to
    // avoid duplication?
    const initialLaneState = {
        num_lanes: 0, // number of lanes  # TODO: should add to database?  Unneded?
        origins: [],
        selectedROI: UNDEFINED,
        roi_list: [], 
        lane_list: [],
        show_Rf: false,
        is_dirty: false,
    };

    React.useEffect(() => {
        if (model.origins !== null && model.origins !== undefined) {
           setLaneState((prev) => ({ ...prev, origins: model.origins, }));
        }
        if (model.show_Rf !== null && model.show_Rf !== undefined) {
          setLaneState((prev) => ({ ...prev, show_Rf: model.show_Rf, }));
        }
        if (model.roi_list !== null && model.roi_list !== undefined) {
          setLaneState((prev) => ({ ...prev, roi_list: model.roi_list, }));
        }
        if (model.lane_list !== null && model.lane_list !== undefined) {
          setLaneState((prev) => ({ ...prev, lane_list: model.lane_list, num_lanes: Array.isArray(model.lane_list) ? model.lane_list.length : 0 }));
        }
   }, [model.show_Rf, model.origins, model.roi_list, model.lane_list])

    const initialImageState = {
        radio_brightness: 0,
        radio_contrast: 0,
        radio_opacity: 80,
        bright_brightness: 0,
        bright_contrast: 0,
        bright_opacity: 20,
        size_x: 682, // TODO: get these from the Image of the 'display image' record
        size_y: 682, // TODO: get these from the Image of the 'display image' record
    }

    // TODO: later convert these to a dict from the backend
    React.useEffect(() => {
        if (model.radio_contrast !== null && model.radio_contrast !== undefined) {
            setImageState((prev) => ({...prev, contrast: model.radio_contrast}));
        }
        if (model.radio_brightness !== null && model.radio_brightness !== undefined) {
            setImageState((prev) => ({...prev, contrast: model.radio_brightness}));
        }
        if (model.radio_opacity !== null && model.radio_opacity !== undefined) {
            setImageState((prev) => ({...prev, contrast: model.radio_opacity}));
        }
        if (model.bright_contrast !== null && model.bright_contrast !== undefined) {
            setImageState((prev) => ({...prev, contrast: model.bright_contrast}));
        }
        if (model.bright_brightness !== null && model.bright_brightness !== undefined) {
            setImageState((prev) => ({...prev, contrast: model.bright_brightness}));
        }
        if (model.bright_opacity !== null && model.bright_opacity !== undefined) {
            setImageState((prev) => ({...prev, contrast: model.bright_opacity}));
        }
    }, [
        model.radio_brightness,
        model.radio_contrast,
        model.radio_opacity,
        model.bright_brightness,
        model.bright_contrast,
        model.bright_opacity,
    ])
    
    const [selectMode, setSelectMode] = React.useState("roi");

    const [laneState, setLaneState] = React.useState(initialLaneState);
    const [imageState, setImageState] = React.useState(initialImageState);

  // Build an ROI around the specified x,y point. The ROI will not be assigned to
  // any lane until the ROIs and lanes are saved.
  // QUESTION: what does 'shift' do? (seems related to whether shift key is pressed??)
  async function buildROI(x,y,shift) {
    callAPI('GET', `/api/analysis/roi_build/${model.analysis_id}/${x}/${y}/${shift}`, {})
      .then((res) => {
        return setLaneState(prev => {
          const new_roi = res.data.roi;
          let new_roi_list = JSON.parse(JSON.stringify(prev.roi_list)); // Deep copy
          new_roi_list.push(new_roi)
          return {...prev,
            roi_list: new_roi_list,
            selectedROI: new_roi_list.length-1,
          };
        });
      });
  }

  // Interpret keypresses (currently only for ROI adjustments)

  // Event handler utilizing useCallback to allow us to define state dependencies
  // that the callback can access. (Normally state is not visible to an event handler.)
  const onKeypress = React.useCallback(
    ({ key }) => {

    // Ignore keypress if no ROI is selected
    let roi_id = laneState.selectedROI;
    if (roi_id === UNDEFINED) return;

    console.log ('in onKeyPress, roi_id=', roi_id);

    // Does this do a copy?
    let roi = laneState.roi_list[roi_id]; // selected ROI
    console.log ('roi before', roi);
    switch (key) { //e.key) {
      case "w":
        roi = incVert(roi);
        roi = backVert(roi);
        break;
      case "W":
        roi = decVert(roi);
        roi = backVert(roi);
        break;
      case "D":
        roi = moveHorz(roi);
        roi = decHorz(roi);
        break;
      case "S":
        roi = decVert(roi);
        roi = moveVert(roi);
        break;
      case "A":
        roi = decHorz(roi);
        roi = backHorz(roi);
        break;
      case "s":
        roi = incVert(roi);
        roi = moveVert(roi);
        break;
      case "d":
        roi = incHorz(roi);
        roi = moveHorz(roi);
        break;
      case "a":
        roi = incHorz(roi);
        roi = backHorz(roi);
        break;
      default:
        // do nothing
    }
    console.log('roi after', roi);
    setLaneState(prev => {
      let new_roi_list = JSON.parse(JSON.stringify(prev.roi_list)); // Deep copy
      new_roi_list[roi_id] = roi;
      return {...prev, roi_list: new_roi_list};
    }); 
  }, [laneState, setLaneState]);

  // This is the way to set up listener that can access state: https://usehooks.com/useEventListener/
  useEventListener('keydown', onKeypress);

  const moveVert = (roi) => {
    if (roi['shape_params']['y'] + STEP_Y + roi['shape_params']['ry'] < imageState.size_y)  roi['shape_params']['y'] += STEP_Y;
    return roi;
  }

  const moveHorz = (roi) => {
    if (roi['shape_params']['x'] + STEP_X + roi['shape_params']['rx'] < imageState.size_x)  roi['shape_params']['x'] += STEP_X;
    return roi;
  }

  const backHorz = (roi) => {
    if (roi['shape_params']['x'] - STEP_X - roi['shape_params']['rx'] > 0)  roi['shape_params']['x'] -= STEP_X;
    return roi;
  }

  const backVert = (roi) => {
    if (roi['shape_params']['y'] - STEP_Y - roi['shape_params']['ry'] > 0)  roi['shape_params']['y'] -= STEP_Y;
    return roi;
  }

  const incVert = (roi) => {
    if (roi.shape_params.y + roi.shape_params.ry < imageState.size_y-0  && roi.shape_params.y - roi.shape_params.ry > 0) roi.shape_params.ry += STEP_RY;
    return roi;
  };

  const incHorz = (roi) => {
    if (roi.shape_params.x + roi.shape_params.rx < imageState.size_x-0  && roi.shape_params.x - roi.shape_params.rx > 0) roi.shape_params.rx += STEP_RX;
    return roi;
  };

  const decHorz = (roi) => {
    // TODO: what is special about the value 14?
    if (roi.shape_params.rx > 14) roi.shape_params.rx -= STEP_RX;
    return roi;
  };

  const decVert = (roi) => {
    // TODO: what is special about the value 14?
    if (roi.shape_params.ry > 14) roi.shape_params.ry -= STEP_RY; 
    return roi;
  };

  const onClickROI = (e, roi_id) => {  // event and roi_id

    if (selectMode == "roi") {
      if (roi_id === laneState.selectedROI) {  
        // Remove the specified ROI, and nullify selectedROI
        console.log ('onClickROI - a selectedROI is defined... deleting it');
        setLaneState(prev => {
          let new_roi_list = JSON.parse(JSON.stringify(prev.roi_list)); // Deep copy
          new_roi_list.splice(roi_id,1);
          return {...prev, roi_list: new_roi_list, selectedROI: UNDEFINED,};
        });
      } else {
        // Select the specified ROI
        console.log ('onClickROI - a selectedROI is not defined... selecting one');
        setLaneState(prev => ({...prev, selectedROI: roi_id,}));
      }

    } else if (selectMode == "origin") {
      // These calculations translate the coordinates of the event from the ROI
      // canvas to the global coordinates to identify true location of origin.
      var x = e.nativeEvent.offsetX;
      var y = e.nativeEvent.offsetY;
      var radx = laneState.roi_list[roi_id].shape_params.rx;
      var rady = laneState.roi_list[roi_id].shape_params.ry;
      var px = laneState.roi_list[roi_id].shape_params.x;
      var py = laneState.roi_list[roi_id].shape_params.y;
      // TODO: what is the significance of 3 here?
      x = px - radx + x + 3; 
      y = py - rady + y + 3; 
      setLaneState(prev => {
        let newOrigins = [...prev.origins];
        newOrigins.push([parseInt(y),parseInt(x)]);
        return {...prev, origins: newOrigins};
      });
    }
  }; 

  // Clear all ROIs.  Just a frontend change until save to backend
  // TODO: this should also empty roi_list of all lanes (and eliminate lanes if auto-defined?)
  const clearROIs = () => {
      if (laneState.roi_list.length > 0) {
          confirm ({/*title:<title>, description:<description>*/})
          .then(() => {
              setLaneState(prev => ({...prev, roi_list: [], selectedROI: UNDEFINED,}));
          });
      } else {
          setLaneState(prev => ({...prev, roi_list: [], selectedROI: UNDEFINED,}));
      }
  };

  // Clear all Lanes.  Just a frontend change until save to backend
    const clearLanes = () => {
      if (laneState.lane_list.length > 0) {
          confirm ({/*title:<title>, description:<description>*/})
          .then(() => {
              setLaneState(prev => ({...prev, lane_list: [], }));
          });
      }
  };

  // Clear all origins. Just a frontend change until save to backend
  const clearOrigins = () => {
      if (laneState.origins.length > 0) {
          confirm ({/*title:<title>, description:<description>*/})
          .then(() => {
              setLaneState(prev => ({...prev, origins: [], }));
          });
      } else {
          setLaneState(prev => ({...prev, origins: [], }));
      }
  };

  // Reset image brightness and contrast
  const resetImage = () => {
      setImageState(prev => (initialImageState));
  };

  // Autoselect the ROIs. Just a frontend change until save to backend
  async function autoselectROIsWrapper() {
      if (laneState.roi_list.length > 0) {
          confirm ({
            title:'Are you sure?',
            description:'This action will delete all existing ROI and lane information',
            confirmationText:'Yes',
            cancellationText:'No',
          })
          .then(() => {
              return autoselectROIs();
          });          
      } else {
          return autoselectROIs();
      }
  }

  async function autoselectROIs() {
      return callAPI('GET', `/api/analysis/rois_autoselect/${model.analysis_id}`, {})
      .then((response) => {
          if (response.error) {
              setAlert({severity: 'warning', message: `Error autoselecting ROIs: ${response.data.error}`},);
          } else {
              console.log('Received from rois_autoselect:', response.data.roi_list);
              setLaneState(prev => ({...prev,
                  roi_list: response.data.roi_list, // Overwrites the previous ROIs
                  selectedROI: UNDEFINED,
              }));
          }
      })
  }

  // Autoselect the lanes. Just a frontend change until save to backend
  async function autoselectLanesWrapper() {
    if (laneState.lane_list.length > 0) {
        confirm ({
          title:'Are you sure?',
          description:'This action will delete all existing lane information',
          confirmationText:'Yes',
          cancellationText:'No',
        })
        .then(() => {
            return autoselectLanes();
        });          
    } else {
        return autoselectLanes();
    }
  }

  async function autoselectLanes() {
    
    var data = {
      'roi_list': JSON.stringify(laneState.roi_list),
      'num_lanes': laneState.num_lanes,
      'origins': JSON.stringify(laneState.origins),
    };
    return callAPI('POST', `/api/analysis/lanes_autoselect/${model.analysis_id}`, data)
    .then((response) => {
        if (response.error) {
            setAlert({severity: 'warning', message: `Error autoselecting lanes: ${response.data.error}`});
        } else {
            console.log("Received data after autoselecting lanes:", response.data);
            setLaneState(prev => ({...prev,
                origins: response.data.origins, // Overwrites the previous origins
                lane_list: response.data.lane_list, // Overwrites the previous lanes
                num_lanes: Array.isArray(response.data.lane_list) ? response.data.lane_list.length : 0,
            }));
        }
    })
  }

  const onClickOrigin = (e, i) => {
    if (selectMode == "origin") {
      // Remove origin i
      setLaneState(prev => {
        let new_origins = [...prev.origins];
        new_origins.splice(i,1);
        return {...prev, origins: new_origins, }
      });

    } else if (selectMode == "roi") {
      // Define an ROI
      console.log ('onClickOrigin - defining a new ROI by caling buildROI');
      var x = e.nativeEvent.offsetX;
      var y = e.nativeEvent.offsetY;
      var radx = 5;
      var rady = 5;
      var px = laneState.origins[i][1];
      var py = laneState.origins[i][0];
      x = px - radx + x;
      y = py - rady + y;
      x = parseInt(x);
      y = parseInt(y);
      var shift = e.shiftKey ? 1 : 0;
      console.log(shift);
      buildROI(x,y,shift); // TODO: how does this work, what is return value?
    }
  }

    // TODO: eventually update this to return true if origins are _fully_ defined (i.e. origins and solvent fronts).
    // For now, if we have at least 3 points, assume the origins are properly defined.
  const originsDefined = () => {
    return Array.isArray(laneState.origins) && laneState.origins.length >= 3;
  };

  // TODO: combine these API calls into one?
  async function submitParams() {
    console.log(laneState.origins);
    setBusy(true);
    console.log('roi_list', laneState.roi_list);
    console.log('lane_list', laneState.lane_list);
    const data = {
      roi_list: JSON.stringify(laneState.roi_list),
      lane_list: JSON.stringify(laneState.lane_list),
      origins: JSON.stringify(laneState.origins),
      show_Rf: laneState.show_Rf, 
      radio_brightness: imageState.radio_brightness,
      radio_contrast: imageState.radio_contrast,
      radio_opacity: imageState.radio_opacity,
      bright_brightness: imageState.bright_brightness,
      bright_contrast: imageState.bright_contrast,
      bright_opacity: imageState.bright_opacity,
    };

    callAPI('POST', `/api/analysis/rois_lanes_save/${model.analysis_id}`, data)
      .then((res) => {
        // Save the returned ROI and lane results
        setLaneState(prev => ({...prev,
          origins: res.data.origins,
          roi_list: res.data.roi_list,
          lane_list: res.data.lane_list,
        }));
        console.log("After ROI saved, received the following data", res.data);
        setBusy(false);
        setAlert({severity: 'success', message: `Successfully saved ROIs and lanes`});
      }).catch('An Error Occurred');
  }

  // Handle clicks on the image canvas (not on origin or ROI)
  const onClickImage = (e) => {

    if (selectMode == "origin") {
      // Add a new origin point at the click location
      var new_origin = [parseInt(e.nativeEvent.offsetY), parseInt(e.nativeEvent.offsetX)];
      setLaneState(prev => {
        let newOrigins = [...prev.origins];
        newOrigins.push(new_origin);
        let num_lanes = newOrigins.length-2;
        return {...prev, origins: newOrigins, num_lanes: num_lanes, is_dirty: true,}; // is_dirty maybe to trigger state update
      });

    } else if (selectMode == "roi") {
      // Build a new ROI at the click location
      console.log ('onClickImage - creating a new ROI via buildROI');
      var x = parseInt(e.nativeEvent.offsetX);
      var y = parseInt(e.nativeEvent.offsetY);
      var shift = e.shiftKey ? 1 : 0;
      console.log(shift);
      buildROI(x,y,shift);
    }
  }
  
    return (
        
        <div>

          {/* Panel - analysis information and files */}

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} >
              <h2>Analysis information and files</h2>
            </AccordionSummary>
            <AccordionDetails>

                <Box display="flex" flexDirection="column" width='100%'>
                  <AnalysisData model={model} /*dataState={dataState} setDataState={setDataState} */ {...props} />
                  <SubmitField size='small' >Save</SubmitField>
                  (This button will discard any ROI/origin info)
                </Box>

            </AccordionDetails>
          </Accordion>

          {/* Panel - image and ROIs */}

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} >
              <h2>Image and ROIs</h2>
            </AccordionSummary>
            <AccordionDetails>

          <Grid container direction='column' spacing={1}>

            <Grid container direction="row" spacing={1}>

              <Box  // Show image-sized placeholder while waiting for images
                width={imageState.size_x + "px"}
                height={imageState.size_y + "px"}
                style={{
                  //border: "1px solid #000000",
                  backgroundColor: "#222222",
                }}                
              >
              
        

                {/* Show main image(s) and set up listener for mouse click */}

                {model.display_bright_url ? (
                <ServerImage
                  url={model.display_bright_url}
		              className = 'noselect'    
                  id="img-bright"
                  style={{
                    position: "absolute",
                    marginTop: "0",
                    marginLeft: "0",
                    filter:
                      "brightness(" + (100 + imageState.bright_brightness) + "%) " + 
                      "contrast(" + (100 + imageState.bright_contrast) + "%) " +
                      "opacity(" + imageState.bright_opacity + "%)"
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    onClickImage(e);}}
                  alt=''
                />
                ) : ( <></> )}

                <ServerImage
                  url={model.display_radio_url}
		              className = 'noselect'    
                  id="img-radio"
                  style={{
                    position: "relative",
                    marginTop: "0",
                    marginLeft: "0",
                    filter:
                      "brightness(" + (100 + imageState.radio_brightness) + "%) " + 
                      "contrast(" + (100 + imageState.radio_contrast) + "%) " +
                      "opacity(" + imageState.radio_opacity + "%)"
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    onClickImage(e);}}
                  alt=''
                />

<div>

                { /* NOTE: NEED THE DIV TO GET THESE TO ALIGN ON THE IMAGE */ }

                {/* Draw origins if available */}

                {laneState.origins.length > 0 ? laneState.origins.map((x, i) => {
                  return (
                    <canvas
                      className="ROI"
                      key={`origin-${i}`}
                      style={{
                        borderRadius: "50%/50%",
                        backgroundColor: "white",
                        position: "absolute",
                        marginTop: "" + 1 * x[0] - 5 - imageState.size_y + "px",
                        marginLeft: "" + 1 * x[1] - 5 + "px",
                        width: "10px",
                        height: "10px",
                        zIndex: (selectMode == "roi") ? 10 : 11,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        onClickOrigin(e, i);
                      }}
                    />
                  );
                }) : ( <></> )}

                {/* Draw ROIs if available */}

                {laneState.roi_list.length > 0 ? laneState.roi_list.map((roi,roi_id)=>{

                return(
                  
                    <canvas
                    key={`roi-${roi_id}`}
                    style={{
                      position: "absolute",
                      backgroundColor: "transparent",
                      zIndex: (selectMode == "roi") ? 11 : 10,
                      borderRadius: "50%/50%",
                      border:
                        (roi_id === laneState.selectedROI)
                          ? "dashed 2px #0ff"
                          : `dashed 2px #ffffff`,
                      width: "" + 2 * roi.shape_params.rx - 2 + "px",
                      height: "" + 2 * roi.shape_params.ry - 2 + "px",
                      marginTop: "" + roi.shape_params.y - 1 * roi.shape_params.ry + 1 - imageState.size_x + "px",
                      marginLeft: "" + roi.shape_params.x - 1 * roi.shape_params.rx + 1 + "px",
                    }}
                    onClick={(e) => {
                      // e.preventDefault();
                      onClickROI(e,roi_id);
                    }}
                    //onClick = { selectMode == 'roi'
                    //  ? (e) => { /*e.preventDefault();*/ onClickROI(e,roi_id); }
                    //  : undefined
                    //}}
                  />
                  );

                }) : (<></>)}

</div>

                {/* Draw lanes if available. For TLC lanes, draw a vertical line at origin_x coordinate
                    TODO: why do we need the -6 in here? Maybe from z-index and shadow feature? */}

                {laneState.lane_list.length > 0 ? laneState.lane_list.map((lane, i) => {
                  return (
                    <>
                    {lane.lane_params.origin_x !== null ? (
                    <canvas
                      className="lane"
                      key={`lane-${i}`}
                      style={{
                        borderRadius: "50%/50%",
                        backgroundColor: "#222222",
                        position: "absolute",
                        marginTop: "" - 6 - imageState.size_y + "px",
                        marginLeft: "" + lane.lane_params.origin_x + "px",
                        width: "1px",
                        height: "" + imageState.size_y + "px",
                        //zIndex: (selectMode == "roi") ? 10 : 11,
                        zIndex: 12, // put in the back
                      }}
                      //onClick={(e) => {
                      //  e.preventDefault();
                      //  onClickOrigin(e, i);
                      //}}
                    />
                    ) : ( <> </> ) }
                    </>

                  );
                }) : ( <></> )}

            </Box>

            <Grid container direction="row" fullWidth>

              {/* ROI / lane selection controls */}

              <Grid item xs={8}>
              <FormControl component="fieldset">
                <RadioGroup name="select-mode"
                  value={selectMode}
                  onChange={(event) => {
                      setSelectMode(event.target.value );
                    }}
                  >
                  <FormControlLabel value="roi" control={<Radio />} label={
                      <Box display="flex" flexDirection="row" alignItems='center'>
                          Select ROIs
                          <Popup width='50%' button_label={<HelpIcon/>}>
                                Click on a band to build a new ROI, or select an existing ROI to modify it. 
                                While an ROI is selected, click on it to delete it, or use the following keys to update it:<br/> 
                                [a / A] jog left (left / right side)<br/> 
                                [w / W] jog up (top / bottom side)<br/> 
                                [s / S] jog down (top / bottom side)<br/> 
                                [d / D] jog right (left / right side)<br/>
                          </Popup>
                          <Button size='small' variant='outlined' onClick={autoselectROIsWrapper}> Autoselect ROIs </Button>
                          <Button size='small' variant='outlined' onClick={clearROIs}> Clear ROIs </Button>
                      </Box>}
                  />
                  <FormControlLabel value="origin" control={<Radio />} label={
                      <Box display="flex" flexDirection="row" alignItems='center'>
                          Select Origins
                          <Popup width='50%' button_label={<HelpIcon/>}>
                              Click on a desired point to set a new origin. Click on an existing one to delete it. 
                              To fully define the origins, click at the spotting point on each lane. You must also define two
                              points to define a solvent front line at the top of the TLC plate.
                          </Popup>
                          <Button size='small' variant='outlined' onClick={clearOrigins}> Clear origins </Button>
                      </Box>}
                  />
                </RadioGroup>
              </FormControl>

                <Button size='small' variant='outlined' onClick={autoselectLanesWrapper}> Create lanes </Button>
                <Button size='small' variant='outlined' onClick={clearLanes}> Clear lanes </Button>
            </Grid>


            {/* Image controls for radio and bright images */}

            <Grid item xs={4}>

                {model.display_radio_url ? (
                <>
                Radio image controls:
                <Box display="flex" flexDirection="row">
                    <Box width='20%'>Brightness:</Box>
                    <Box width='80%'>
                        <Slider
                            color='secondary'
                            name="radio_brightness"
                            valueLabelDisplay="auto"
                            step={config.analysis.brightness_step}
                            marks={true}
                            value={imageState.radio_brightness}
                            min={config.analysis.brightness_min}
                            max={config.analysis.brightness_max}
                            onChange={(e, value) => {
                                setImageState(prev=>({...prev, radio_brightness: value}));
                            }}
                        />
                    </Box>
                </Box>
                <Box display="flex" flexDirection="row" width='100%'>
                    <Box width='20%'>Contrast:</Box>
                    <Box width='80%'>
                        <Slider
                            color="secondary"
                            name="radio_contrast"
                            valueLabelDisplay="auto"
                            step={config.analysis.contrast_step}
                            marks={true}
                            value={imageState.radio_contrast}
                            min={config.analysis.contrast_min}
                            max={config.analysis.contrast_max}
                            onChange={(e, value) => {
                                setImageState(prev=>({...prev, radio_contrast: value}));
                            }}
                        /> 
                    </Box>
                </Box> 
                <Box display="flex" flexDirection="row" width='100%'>
                    <Box width='20%'>Opacity:</Box>
                    <Box width='80%'>
                        <Slider
                            color="secondary"
                            name="radio_opacity"
                            valueLabelDisplay="auto"
                            step={config.analysis.opacity_step}
                            marks={true}
                            value={imageState.radio_opacity}
                            min={config.analysis.opacity_min}
                            max={config.analysis.opacity_max}
                            onChange={(e, value) => {
                                setImageState(prev=>({...prev, radio_opacity: value}));
                            }}
                        /> 
                    </Box>
                </Box>
                </>
                ) : ( <></> )}

                {model.display_bright_url ? (
                <>
                Brightfield image controls:
                <Box display="flex" flexDirection="row">
                    <Box width='20%'>Brightness:</Box>
                    <Box width='80%'>
                        <Slider
                            color='secondary'
                            name="bright_brightness"
                            valueLabelDisplay="auto"
                            step={config.analysis.brightness_step}
                            marks={true}
                            value={imageState.bright_brightness}
                            min={config.analysis.brightness_min}
                            max={config.analysis.brightness_max}
                            onChange={(e, value) => {
                                setImageState(prev=>({...prev, bright_brightness: value}));
                            }}
                        />
                    </Box>
                </Box>
                <Box display="flex" flexDirection="row" width='100%'>
                    <Box width='20%'>Contrast:</Box>
                    <Box width='80%'>
                        <Slider
                            color="secondary"
                            name="bright_contrast"
                            valueLabelDisplay="auto"
                            step={config.analysis.contrast_step}
                            marks={true}
                            value={imageState.bright_contrast}
                            min={config.analysis.contrast_min}
                            max={config.analysis.contrast_max}
                            onChange={(e, value) => {
                                setImageState(prev=>({...prev, bright_contrast: value}));
                            }}
                        /> 
                    </Box>
                </Box> 
                <Box display="flex" flexDirection="row" width='100%'>
                    <Box width='20%'>Opacity:</Box>
                    <Box width='80%'>
                        <Slider
                            color="secondary"
                            name="bright_opacity"
                            valueLabelDisplay="auto"
                            step={config.analysis.opacity_step}
                            marks={true}
                            value={imageState.bright_opacity}
                            min={config.analysis.opacity_min}
                            max={config.analysis.opacity_max}
                            onChange={(e, value) => {
                                setImageState(prev=>({...prev, bright_opacity: value}));
                            }}
                        /> 
                    </Box>
                </Box>
                </>
                ) : ( <></> )}

                <Button size='small' variant="outlined" onClick={resetImage}>Reset images</Button>

            </Grid>  
          </Grid>
            <Grid container direction="row">
                  <Grid item>
                    {/* Compute RF values? Only enable if origins have been defined. 
                        TODO: something not quite working with the checked/unchecked state
                     */}
                    <FormGroup>
                    <FormControlLabel
                      control={<Checkbox
                        //color="primary"
                        //variant="contained"
                        disabled={!originsDefined()}
                        checked={laneState.show_Rf}
                        value={laneState.show_Rf ? 'on' : 'off'}
                        onChange={(event) => {
                          setLaneState(prev=>({...prev, show_Rf: event.target.checked,}));
                        }}
                        name="show_Rf"
                      />}
                      label="Show Rf values"
                    />
                    </FormGroup>
                  </Grid>

                  <Grid item>

                    <p>Number of lanes: {laneState.num_lanes}</p>
                    <input type = 'range'
                      //disabled={originsDefined()}
                      name = {'#Lanes'}
                      step={1} 
                      valueLabelDisplay="on"
                      marks='true' //{true} Native HTML elements only accept strings
                      value={laneState.num_lanes}
                      min={0}
                      max={16}
                      onInput={(e) => {
                        var num_lanes = e.target.value;
                        setLaneState(prev => ({ ...prev, num_lanes: num_lanes }));
                      }}
                    />

                  </Grid>

                </Grid>
            </Grid>
                <Button color="primary" variant="contained" onClick={submitParams}> Save ROI info and Regenerate Results </Button>

            </Grid>


          </AccordionDetails>
          </Accordion>

          {/* Panel - results and export options */}

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} >
              <h2>Results and export</h2>
            </AccordionSummary>
            <AccordionDetails>

              <AnalysisResults
                show_Rf={laneState.show_Rf}
                roi_list={laneState.roi_list}
                lane_list={laneState.lane_list}
              />

        </AccordionDetails>
        </Accordion>

        </div>
                  
    );
}

const AnalysisEdit = withRouter(connectEdit(WrappedAnalysisEdit, 'analysis', analysisSchema, analysisValidator));

export { AnalysisEdit };
