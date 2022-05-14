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
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import FormGroup from "@material-ui/core/FormGroup";
import TextField from "@material-ui/core/TextField";
import Checkbox from "@material-ui/core/Checkbox";
import ToggleButton from '@material-ui/lab/ToggleButton';
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

    // Define constants for ROI and origin manipulation via keypresses
    const STEP_X = 2; // Step size to adjust ROIs
    const STEP_Y = 2; // Step size to adjust ROIs
    const STEP_RX = 2; // Step size to adjust ROIs
    const STEP_RY = 2; // Step size to adjust ROIs
    const MIN_RX = 4; // Min radius(x)
    const MIN_RY = 4; // Min radius(y)
    const ORIGIN_R = 3; // Radius (pixels) of origin dots
    const LANE_W = 1; // Width (pixels) of lane markings
    const UNDEFINED = -1; // no ROI currently selected

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
        if (model.show_Rf !== null && model.show_Rf !== undefined) {
          setLaneState((prev) => ({ ...prev, show_Rf: model.show_Rf, }));
        }
        if (model.origins !== null && model.origins !== undefined) {
          setLaneState((prev) => ({ ...prev, origins: model.origins, }));
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
        scale_x: 1.0,
        scale_y: 1.0,
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
        if (model.image_scale_x !== null && model.image_scale_x !== undefined) {
          setImageState((prev) => ({ ...prev, scale_x: model.image_scale_x, }));
        }
        if (model.image_scale_y !== null && model.image_scale_y !== undefined) {
          setImageState((prev) => ({ ...prev, scale_y: model.image_scale_y, }));
        }

    }, [
        model.radio_brightness,
        model.radio_contrast,
        model.radio_opacity,
        model.bright_brightness,
        model.bright_contrast,
        model.bright_opacity,
        model.image_scale_x,
        model.image_scale_y,
    ])
    
    const [selectROI, setSelectROI] = React.useState(false); // Actively selecting ROIs
    const [selectOrigin, setSelectOrigin] = React.useState(false); // Actively selecting origins

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

  // Scale the main images
  const scaleX = (value) => {
    return parseInt(value*imageState.scale_x);
  }
  const scaleY = (value) => {
    return parseInt(value*imageState.scale_y);
  }
  const unscaleX = (value) => {
    return parseInt(value/imageState.scale_x);
  }
  const unscaleY = (value) => {
    return parseInt(value/imageState.scale_y);
  }


  // Interpret keypresses (currently only for ROI adjustments)

  // Event handler utilizing useCallback to allow us to define state dependencies
  // that the callback can access. (Normally state is not visible to an event handler.)
  const onKeypress = React.useCallback(
    ({ key }) => {

    // Ignore keypress if no ROI is selected
    let roi_id = laneState.selectedROI;
    if (roi_id === UNDEFINED) return;

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
    if (roi.shape_params.rx >= MIN_RX + STEP_RX) roi.shape_params.rx -= STEP_RX;
    return roi;
  };

  const decVert = (roi) => {
    if (roi.shape_params.ry >= MIN_RX + STEP_RX) roi.shape_params.ry -= STEP_RY; 
    return roi;
  };

  const onClickROI = (e, roi_id) => {  // event and roi_id

    if (selectROI) {
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

    } else if (selectOrigin) {
      // Create an origin at the selected point
      // Translate the coordinates of the event from the ROI canvas to global coordinates
      var rx = laneState.roi_list[roi_id].shape_params.rx; // ROI size
      var ry = laneState.roi_list[roi_id].shape_params.ry; // ROI size
      var px = laneState.roi_list[roi_id].shape_params.x; // ROI global position
      var py = laneState.roi_list[roi_id].shape_params.y; // ROI global position
      var x = px - rx + unscaleX(e.nativeEvent.offsetX); 
      var y = py - ry + unscaleY(e.nativeEvent.offsetY); 
      setLaneState(prev => {
        let newOrigins = [...prev.origins];
        newOrigins.push([y,x]);
        return {...prev, origins: newOrigins, };
      });
    }
  }; 

  // Clear all ROIs.  Also empties the roi_list of all lanes. Leaves lanes intact, but user can clear them.
  // Just a frontend change until the user saves the updates.
  const clearROIs = () => {
      if (laneState.roi_list.length > 0) {
          confirm ({/*title:<title>, description:<description>*/})
          .then(() => {
            return setLaneState(prev => {
              // Remove roi_list from lanes since there are no ROIs
              let new_lane_list = JSON.parse(JSON.stringify(prev.lane_list)); // Deep copy
              new_lane_list.map((lane,i) => {lane.roi_list = []});
              return {...prev, roi_list: [], lane_list: new_lane_list, selectedROI: UNDEFINED,};
            });
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
  // TODO: if there are lanes depending on the origins, we will need changes,
  //   though this will occur if user saves the info to database
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
      setBusy(true);
      return callAPI('GET', `/api/analysis/rois_autoselect/${model.analysis_id}`, {})
      .then((response) => {
          setBusy(false);
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
    if (selectOrigin) {
      // Remove origin i
      setLaneState(prev => {
        let new_origins = [...prev.origins];
        new_origins.splice(i,1);
        return {...prev, origins: new_origins, }
      });

    } else if (selectROI) {
      // Define an ROI
      // Translate the coordinates of the event from the origin canvas to global coordinates
      console.log ('onClickOrigin - defining a new ROI by caling buildROI');
      var x = laneState.origins[i][1] - ORIGIN_R + unscaleX(e.nativeEvent.offsetX);
      var y = laneState.origins[i][0] - ORIGIN_R + unscaleY(e.nativeEvent.offsetY);
      var shift = e.shiftKey ? 1 : 0;
      buildROI(x,y,shift); 
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
      image_scale_x: imageState.scale_x,
      image_scale_y: imageState.scale_y,
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

    if (selectOrigin) {
      // Add a new origin point at the click location
      var new_origin = [unscaleY(e.nativeEvent.offsetY), unscaleX(e.nativeEvent.offsetX)];
      setLaneState(prev => {
        let newOrigins = [...prev.origins];
        newOrigins.push(new_origin);
        return {...prev, origins: newOrigins, is_dirty: true,}; // is_dirty maybe to trigger state update
      });

    } else if (selectROI) {
      // Build a new ROI at the click location
      console.log ('onClickImage - creating a new ROI via buildROI');
      var x = unscaleX(e.nativeEvent.offsetX);
      var y = unscaleY(e.nativeEvent.offsetY);
      var shift = e.shiftKey ? 1 : 0;
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
                width={scaleX(imageState.size_x) + "px"}
                height={scaleY(imageState.size_y) + "px"}
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
                  width={scaleX(imageState.size_x)}
                  height={scaleY(imageState.size_y)}
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
                  width={scaleX(imageState.size_x)}
                  height={scaleY(imageState.size_y)}
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

                {laneState.origins.length > 0 ? laneState.origins.map((origin, origin_id) => {
                  return (
                    <canvas
                      className="ROI"
                      key={`origin-${origin_id}`}
                      style={{
                        borderRadius: "50%/50%",
                        backgroundColor: "white",
                        position: "absolute",
                        marginTop: "" + scaleY(origin[0] - imageState.size_y) - ORIGIN_R + "px",
                        marginLeft: "" + scaleX(origin[1]) - ORIGIN_R + "px",
                        width: "" + 2*ORIGIN_R + "px",
                        height: "" + 2*ORIGIN_R + "px",
                        zIndex: (selectOrigin) ? 11 : 10,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        onClickOrigin(e, origin_id);
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
                      zIndex: (selectROI) ? 11 : 10,
                      borderRadius: "50%/50%",
                      border:
                        (roi_id === laneState.selectedROI)
                          ? "dashed 1px #0ff"
                          : "dashed 1px #ffffff",
                      width: "" + scaleX(2 * roi.shape_params.rx - 2) + "px", // Subtract borders
                      height: "" + scaleY(2 * roi.shape_params.ry - 2) + "px", // Subtract borders
                      marginTop: "" + scaleY(roi.shape_params.y - roi.shape_params.ry - 1 - imageState.size_x) + "px",
                      marginLeft: "" + scaleX(roi.shape_params.x - roi.shape_params.rx - 1) + "px",
                    }}
                    onClick={(e) => {
                      // e.preventDefault();
                      onClickROI(e,roi_id);
                    }}
                    //onClick = { selectROI
                    //  ? (e) => { /*e.preventDefault();*/ onClickROI(e,roi_id); }
                    //  : undefined
                    //}}
                  />
                  );

                }) : (<></>)}

</div>

                {/* Draw lanes if available. For TLC lanes, draw a vertical line at origin_x coordinate*/}
                {/* TODO: why are the lines a little shifted with respect to image? */}
                {laneState.lane_list.length > 0 ? laneState.lane_list.map((lane, lane_id) => {
                  return (
                    <>
                    {lane.lane_params.origin_x !== null ? (
                    <canvas
                      className="lane"
                      key={`lane-${lane_id}`}
                      style={{
                        //borderRadius: "50%/50%",
                        //border: "dashed 2px #333333",
                        border: "none",
                        //backgroundColor: "transparent",
                        backgroundColor: "#333333",
                        position: "absolute",
                        marginTop: "" + scaleY(- imageState.size_y) + "px",
                        marginLeft: "" + scaleX(lane.lane_params.origin_x) + "px",
                        width: "" + 1 + "px",
                        height: "" + scaleY(imageState.size_y) + "px",
                        zIndex: 9, // put in the back
                      }}
                      //onClick={(e) => { # Currently not clickable
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
                <p>Define ROIs:</p>
                <Box display="flex" flexDirection="row" alignItems='center'>
                  <Popup width='50%' button_label={<HelpIcon/>}>
                        Click on a band to build a new ROI, or select an existing ROI to modify it. 
                        While an ROI is selected, click on it to delete it, or use the following keys to update it:<br/> 
                        [a / A] jog left (left / right side)<br/> 
                        [w / W] jog up (top / bottom side)<br/> 
                        [s / S] jog down (top / bottom side)<br/> 
                        [d / D] jog right (left / right side)<br/>
                  </Popup>
                  <ToggleButton size='small' variant='outlined' value="roi" selected={selectROI}
                    onChange={() => {
                      setSelectROI(!selectROI);
                      setSelectOrigin(false);
                    }}
                  > Click ROIs </ToggleButton>
                  <Button size='small' variant='outlined' onClick={autoselectROIsWrapper}> Autoselect ROIs </Button>
                  <Button size='small' variant='outlined' onClick={clearROIs} disabled={!Array.isArray(laneState.roi_list) || laneState.roi_list.length === 0}> Clear ROIs </Button>
                </Box>

                <p>Define Lanes based on Origins and Solvent Front:</p>
                <Box display="flex" flexDirection="row" alignItems='center'>

                  <Popup width='50%' button_label={<HelpIcon/>}>
                      Click on a desired point to set a new origin. Click on an existing one to delete it. 
                      To fully define the origins, click at the spotting point on each lane. You must also define two
                      points to define a solvent front line at the top of the TLC plate.
                  </Popup>
                  <ToggleButton size='small' variant='outlined' value="origin" selected={selectOrigin}
                    onChange={() => {
                      setSelectOrigin(!selectOrigin);
                      setSelectROI(false);
                    }}
                  > Click Origins </ToggleButton>
                  <Button size='small' variant='outlined' onClick={clearOrigins} disabled={!originsDefined()}> Clear origins </Button>
                  <Button size='small' variant='outlined' onClick={autoselectLanesWrapper} disabled={!originsDefined()}> Create/Update lanes </Button>
                  <Button size='small' variant='outlined' onClick={clearLanes} disabled={!Array.isArray(laneState.lane_list) || laneState.lane_list.length === 0}> Clear lanes </Button>
                </Box>

                <p>Autoselect Lanes based on ROIs:</p>
                <Box display="flex" flexDirection="row" alignItems='center'>
                  <p>Number of lanes: {laneState.num_lanes}</p>
                  <Slider
                    color='secondary'
                    name="num_lanes"
                    valueLabelDisplay="auto"
                    step={1}  
                    marks={true}
                    value={laneState.num_lanes}
                    min={0}
                    max={16}
                    onChange={(e, value) => {
                        setLaneState(prev=>({...prev, num_lanes: value}));
                    }}
                  />
                  <Button size='small' variant='outlined' onClick={autoselectLanesWrapper} disabled={originsDefined() || (!Array.isArray(laneState.roi_list) || laneState.roi_list.length === 0)}> Create/Update lanes </Button>
                  <Button size='small' variant='outlined' onClick={clearLanes} disabled={!Array.isArray(laneState.lane_list) || laneState.lane_list.length === 0}> Clear lanes </Button>
 
                </Box>

                <p>Options for results table:</p>
                <Box display="flex" flexDirection="row" alignItems='center'>
                    <FormGroup>
                    <FormControlLabel
                      control={<Checkbox
                        //color="primary"
                        //variant="contained"
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
                </Box>


            </Grid>

            {/* Image controls for radio and bright images */}

            <Grid item xs={4}>

                <Box display="flex" flexDirection="row" width='100%'>
                    <Box width='20%'>Image zoom factor: {imageState.scale_x.toFixed(2)}</Box>
                    <Box width='10%'></Box>
                    <Box width='70%'>
                        <Slider
                            color="secondary"
                            name="image_zoom"
                            valueLabelDisplay="auto"
                            step={0.05}
                            marks={true}
                            value={imageState.scale_x}
                            min={0.0}
                            max={2.0}
                            onChange={(e, value) => {
                                setImageState(prev=>({...prev, scale_x: value, scale_y: value,}));
                            }}
                        /> 
                    </Box>
                </Box> 

                {model.display_radio_url ? (
                <>
                Radio image controls:
                <Box display="flex" flexDirection="row">
                    <Box width='20%'>Brightness:</Box>
                    <Box width='10%'></Box>
                    <Box width='70%'>
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
                    <Box width='10%'></Box>
                    <Box width='70%'>
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
                    <Box width='10%'></Box>
                    <Box width='70%'>
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
                    <Box width='10%'></Box>
                    <Box width='70%'>
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
                    <Box width='10%'></Box>
                    <Box width='70%'>
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
                    <Box width='10%'></Box>
                    <Box width='70%'>
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
