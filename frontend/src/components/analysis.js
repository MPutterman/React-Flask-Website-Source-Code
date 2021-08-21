// MAJOR TODO:
// * Integrate 'fix background' into the backend 'analysis_generate_working_images'
//     function.  It should _not_ be a separate API route.
// * More cleanup of backend Analysis class to clarify whether it is an object instance
//     or set of class methods.
// * Move remaining computational stuff out of api.py into analysis.py
// * Clarify whether 'doUV' mean superimpose bright+Cerenkov, or whether there is
//     a second set of UV ROIs...
//
// TODO:
// * How to show only date selector?
// * Allow selection of color palette for image? (Maybe less processing in backend... just convert to monochromatic PNG?)
//     Are there client-side ways to do this?
//     Some good palettes: https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html
// * Add feature to export as .csv text file, excel file, etc.
// * Add feature to export a full PDF report?  E.g. with image, etc..
// * When change origins and ROIs, need to reset something so 'autolane' will work correctly.
// * I'm not sure how "n_l" and autolane work together.
// * Regarding RF values, I think we should always compute these if origins are defined for at least one lane.  
//   Maybe we can have a client-side option to show or hide those results if needed. But there is a use
//   case where we don't need it (e.g. Cerenkov image of chip). So maybe we should store the value in DB.
// * There are some interesting graphical libraries, e.g. https://docs.bokeh.org/en/latest/docs/gallery.html#gallery (python)
//     that may allow use to do interesting things like live line plots, lasso-based ROI selection, etc...
//     Also more react-specific stuff here: https://stackshare.io/bokeh/alternatives
// * Disable more image control functions before the image_url are populated

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

// FUTURE: embed results in ROI info...
// ROI_list: list of {id, x, y, rx, ry, intensity}
// .... this way it is independent of lanes and could be used to just calculate ROI intensities for an image
//
// lane_list: list of {id, name, roi_list (id values)}
// QUESTION: how to organize origins and RF values? Look into literature?
// QUESTION: when we add new ROIs, currently they are not assigned to the right lane...
//// That's ok in new model... just add the new ROI to the ROI list, and don't allocate in lane list
////    if needed, can compute unallocated ROIs...
////    Maybe a different results table if there are unallocated ROIs
// TODO: need a new function to separate overlapping ROIs?

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

//    const [analysisID, setAnalysisID] = React.useState(null);

    // State variables
    // TODO: check if all of these need to be state variables (i.e. affect rendering)
    // TODO: this repeats a lot of what's in 'analysis_data'... figure out which component should handle state
    /*
    const initialDataState = {
        id: props.match.params.id,
        owner_id: null,
        created: null,
        modified: null,
        name: '',
        description: '',
        expt_datetime: null,
        equip_id: null,
        plate_id: null,
        cover_id: null,
        image_radio_id: null,
        image_bright_id: null,
        image_dark_id: null,
        image_flat_id: null,
        correct_dark: false,
        correct_flat: false,
        correct_bkgd: false,
        correct_filter: false,
        algorithm_bkgd: null,
        algorithm_filter: null,
        image_computed_id: null, // Need this in the front end??
    };
    */
//
    const initialLaneState = {
        autoLane: false,  // LEGACY? not sure this is needed...
        num_lanes: 0, // number of lanes  # TODO: should add to database?
        origins: [],
        ROIs: [],
        selectedROI: { lane: UNDEFINED, band: UNDEFINED},
        is_dirty: false,
    };

    // TODO: note: autolane and num_lane aren't in the database. Should they be?
    React.useEffect(() => {
        if (model.auto_lane !== null && model.auto_lane !== undefined) {
           setLaneState((prev) => ({ ...prev, autoLane: model.auto_lane, }));
        }
//        if (model.num_lanes !== null && model.num_lanes !== undefined) {
//           setLaneState((prev) => ({ ...prev, num_lanes: model.num_lanes, }));
//        }
        if (model.origins !== null && model.origins !== undefined) {
           setLaneState((prev) => ({ ...prev, origins: model.origins, }));
        }
        if (model.ROIs !== null && model.ROIs !== undefined) {
           setLaneState((prev) => ({ ...prev, ROIs: model.ROIs, num_lanes: model.ROIs.length}));
        }
    }, [model.auto_lane, /*model.num_lanes,*/ model.origins, model.ROIs])

    const initialLegacyState = {
        doRF: false,  // LEGACY: phase this out 
        results: [],            // TODO: will come from ROIs later
    };

    // TODO: in future results come from ROI states
    React.useEffect(() => {
        if (model.doRF !== null && model.doRF !== undefined) {
            setLegacyState((prev) => ({...prev, doRF: model.doRF}));
        }
        if (model.results !== null && model.results !== undefined) {
            setLegacyState((prev) => ({...prev, results: model.results}));
        }
    }, [model.doRF, model.results])

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

    // TODO: NEED A BETTER STRUCTURE FOR ALL THIS DATA!! AND BETTER NAMES...
    // AND THEN NEED TO UPDATED THROUGHOUT TO USE THE FULL NAMING
    // Be careful, it's not that simple:
    // setDict(prevDict => ({...prevDict, keyToUpdate: [...prevDict.keyToChange, "newValue"]}))

//    const [dataState, setDataState] = React.useState(initialDataState);
    const [laneState, setLaneState] = React.useState(initialLaneState);
    const [legacyState, setLegacyState] = React.useState(initialLegacyState);
    // TODO: maybe the 'display' image will have to be its own DB type to provide
    //   these values, or need a backend method to populate them (e.g. size, etc...)
    const [imageState, setImageState] = React.useState(initialImageState);


    // TODO: this will call /api/analysis/load (which returns analysis data, params, and results)
    // TODO: add error checking if record not found
    /*
    async function loadAnalysis(id) {
      if (!id) return;
      return axios
          .get(backend_url('retrieve_analysis/' + id)) // TODO: change to /api/analysis/load
          .then((res) => {

            console.log ('response =>', res);
            setLegacyState(prev => ({...prev,
              do_RF: res.data.doRF,
            }));
            setImageState(prev => ({...prev,
              uri: id,  // TODO: this is just temporary to set a non-empty value (need to get from server)
            }));
            setDataState(prev => ({...prev,
              name: res.data.name,
              description: res.data.description,
              owner_id: res.data.owner_id,
            }));
            setLaneState(prev => ({...prev,
              ROIs: res.data.ROIs,
              origins: res.data.origins,
              autoLane: res.data.autoLane,
              num_lanes: res.data.n_l,
            }));
            
            return res; // TODO: why return this?
          });
    }
*/


  // Build an ROI around the specified x,y point
  // QUESTION: what does 'shift' do? (seems related to whether shift key is pressed??)
  async function buildROI(x,y,shift) {
    // Make API call
    // Note: send ROI list back to server.  QUESTION: is this to ensure no overlap?
    // TODO: update API call to pass the x, y, shift data as part of formData
    var data = {
        'ROIs': JSON.stringify(laneState.ROIs),
    };
    callAPI('POST', `api/analysis/roi_build/${model.analysis_id}/${x}/${y}/${shift}`, data)
      .then((res) => {
        // Add the new ROI info (assign initially to lane '0')
        // QUESTION: is n_l changed by the server?
        // TODO: maybe the server should regenerate the lane list as much as possible?
        return setLaneState(prev => {
          var newROIs = [];
          if (prev.ROIs) newROIs = JSON.parse(JSON.stringify(prev.ROIs)); // hack to make a true DEEP copy, [...prev.ROIs only first level are copied, rest are referenced]
          const ROI_to_add = [ res.data.row, res.data.col, res.data.rowRadius, res.data.colRadius];
          if (!newROIs[0]) newROIs[0] = [ROI_to_add];
          else newROIs[0].push(ROI_to_add);
          return {...prev,
            ROIs: newROIs,
            num_lanes: res.data.num_lanes,
            selectedROI: {lane: 0, band: (!Array.isArray(prev.ROIs) || !prev.ROIs[0]) ? 0 : prev.ROIs[0].length-1+1},
          };
        });
      });
  }


  // Interpret keypresses (currently only for ROI adjustments)

  
  // Event handler utilizing useCallback to allow us to define state dependencies
  // that the callback can access. (Normally state is not visible to an event handler.)
  const onKeypress = React.useCallback(
    ({ key }) => {

    //console.log(e)

    // Ignore keypress if no ROI is selected
    //console.log('just entered onKeypress, here is value of laneState', laneState);
    let lane = laneState.selectedROI.lane;
    let band = laneState.selectedROI.band;
    if (lane === UNDEFINED || band === UNDEFINED) return;

    console.log ('in onKeyPress, lane=', lane);
    console.log ('in onKeyPress, band=', band);

    let roi = laneState.ROIs[lane][band]; // selected ROI
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
    // TODO: is this correct?
    setLaneState(prev => {
      let newROIs = JSON.parse(JSON.stringify(prev.ROIs)); 
      newROIs[lane][band] = roi;
      return {...prev, ROIs: newROIs};
    }); 
  }, [laneState, setLaneState]);

  // This is the way to set up listener that can access state: https://usehooks.com/useEventListener/
  useEventListener('keydown', onKeypress);

  const moveVert = (roi) => {
    if (roi[0] + STEP_Y + roi[2] < imageState.size_y)  roi[0] += STEP_Y;
    return roi;
  }

  const moveHorz = (roi) => {
    if (roi[1] + STEP_X + roi[3] < imageState.size_x) roi[1] += STEP_X;
    return roi;
  }

  const backHorz = (roi) => {
    if (roi[1] - STEP_X - roi[3] > 0) roi[1] -= STEP_X;
    return roi;
  }

  const backVert = (roi) => {
    if (roi[0] - STEP_Y - roi[2] > 0) roi[0] -= STEP_Y;
    return roi;
  }

  const incVert = (roi) => {
    if (roi[0] + roi[2] < imageState.size_y-0  && roi[0] - roi[2] > 0) roi[2] += STEP_RY;
    return roi;
  };

  const incHorz = (roi) => {
    if (roi[1] + roi[3] < imageState.size_x-0  && roi[1] - roi[3] > 0) roi[3] += STEP_RX;
    return roi;
  };

  const decHorz = (roi) => {
    if (roi[3] > 14) roi[3] -= STEP_RX; // TODO: what is special about the value 14?
    return roi;
  };

  const decVert = (roi) => {
    if (roi[2] > 14) roi[2] -= STEP_RY; // TODO: what is special about the value 14?
    return roi;
  };



  const onClickROI = (e, l, i) => {  // event, lane, and band

    if (selectMode == "roi") {
      if (l === laneState.selectedROI.lane && i === laneState.selectedROI.band) {  
        // Remove the specified ROI, and nullify selectedROI
        console.log ('onClickROI - a selectedROI is defined... deleting it');
        setLaneState(prev => {
          let newROIs = JSON.parse(JSON.stringify(prev.ROIs)); 
          newROIs[l].splice(i,1);
          return {...prev, ROIs: newROIs, selectedROI: {lane: UNDEFINED, band: UNDEFINED},};
        });
      } else {
        // Select the specified ROI
        console.log ('onClickROI - a selectedROI is not defined... selecting one');
        setLaneState(prev => ({...prev, selectedROI: { lane: l, band: i},}));
      }

    } else if (selectMode == "origin") {
      // QUESTION: why so much calculation for origins?  And what is the + 3 near the end?
      var x = e.nativeEvent.offsetX;
      var y = e.nativeEvent.offsetY;
      var radx = laneState.ROIs[l][i][3];
      var rady = laneState.ROIs[l][i][2];
      var px = laneState.ROIs[l][i][1];
      var py = laneState.ROIs[l][i][0];
      console.log(x, y, radx, rady, px, py);
      console.log(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      x = px - radx + x + 3; 
      y = py - rady + y + 3; 
      console.log('prev origins', laneState.origins);
      setLaneState(prev => {
        let newOrigins = [...prev.origins];
        newOrigins.push([parseInt(y),parseInt(x)]);
        return {...prev, origins: newOrigins};
      });
    }
  }; 

  // Clear all ROIs.  Just a local change until save to backend
  const clearROIs = () => {
      if (laneState.ROIs.length > 0) {
          confirm ({/*title:<title>, description:<description>*/})
          .then(() => {
              setLaneState(prev => ({...prev, ROIs: [], selectedROI:{lane:UNDEFINED, band:UNDEFINED},}));
          });
      } else {
          setLaneState(prev => ({...prev, ROIs: [], selectedROI:{lane:UNDEFINED, band:UNDEFINED},}));
      }
  };

  // Clear all origins. Just a local change until save to backend
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


  // Autoselect the ROIs. Just a local change until save to backend
  async function autoSelectWrapper() {
      if (laneState.ROIs.length > 0) {
          confirm ({/*title:<title>, description:<description>*/})
          .then(() => {
              return autoSelect();
          });          
      } else {
          return autoSelect();
      }
  }

  async function autoSelect() {
      return callAPI('POST', `/api/analysis/rois_autoselect/${model.analysis_id}`, {})
      .then((response) => {
          if (response.error) {
              setAlert({severity: 'warning', message: `Error autoselecting ROIs: ${response.data.error}`});
          } else {
              setLaneState(prev => ({...prev,
                  ROIs: response.data.ROIs,
                  selectedROI: {lane: UNDEFINED, band: UNDEFINED},
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
    console.log('ROIs', laneState.ROIs);
    const data = {
      ROIs: JSON.stringify(laneState.ROIs),
      origins: JSON.stringify(laneState.origins),
      num_lanes: laneState.num_lanes, // phase this out later...
      doRF: legacyState.doRF, // phase this out later
      autoLane: !originsDefined(),
      radio_brightness: imageState.radio_brightness,
      radio_contrast: imageState.radio_contrast,
      radio_opacity: imageState.radio_opacity,
      bright_brightness: imageState.bright_brightness,
      bright_contrast: imageState.bright_contrast,
      bright_opacity: imageState.bright_opacity,
    };

    callAPI('POST', `/api/analysis/rois_save/${model.analysis_id}`, data)
      .then((res) => {
        // Save the returned ROI results
        setLaneState(prev => ({...prev,
          ROIs: res.data.ROIs,
          origins: res.data.origins,
          num_lanes: res.data.ROIs ? res.data.ROIs.length : 0, /// TODO: is this correct? is it needed here?
        }));
        // Also save the returned analysis results /// TODO: or have a model that retrieves it directly?
        setLegacyState(prev => ({ ...prev,
          results: res.data.results,
        }));
        setBusy(false);
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
        return {...prev, origins: newOrigins, is_dirty: true,}; // is_dirty maybe to trigger state update
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

                {/* Draw ROIs if available */}


                {laneState.ROIs.length > 0 ? laneState.ROIs.map((Lane,l)=>{

                  return(
                    
                    <div key={`roi-lane-${Lane}`}>
                      
                  {Lane.map((x,i)=>{
                    return(
                      
                      <canvas
                      key={`roi-${l}-${i}`}
                      style={{
                        position: "absolute",
                        backgroundColor: "transparent",
                        zIndex: (selectMode == "roi") ? 11 : 10,
                        borderRadius: "50%/50%",
                        border:
                          (i === laneState.selectedROI.band && l === laneState.selectedROI.lane)
                            ? "dashed 2px #0ff"
                            : `dashed 2px #${((l%2)*15).toString(16)}${(15*(l%2)).toString(16)}${(15*(l%2)).toString(16)}`,
                        width: "" + 2 * x[3] - 2 + "px",
                        height: "" + 2 * x[2] - 2 + "px",
                        marginTop: "" + x[0] - 1 * x[2] + 1 - imageState.size_x + "px",
                        marginLeft: "" + x[1] - 1 * x[3] + 1 + "px",
                      }}
                      onClick={(e) => {
                        //e.preventDefault();
                        onClickROI(e,l, i);  
                      }}
                    />
                    );

                  })}
                  </div>)
                }) : (<div></div>)}

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
                                Click on a band to build a new ROI, or select on an existing ROI to modify it. 
                                While an ROI is select, click on it to delete it, or use the following keys to update it:<br/> 
                                [a / A] jog left (left or right side)<br/> 
                                [w / W] jog up (top or bottom side)<br/> 
                                [s / S] jog down (top or bottom side)<br/> 
                                [d / D] jog right (left or right side)<br/>
                          </Popup>
                          <Button size='small' variant='outlined' onClick={autoSelectWrapper}> Autoselect ROIs </Button>
                          <Button size='small' variant='outlined' onClick={clearROIs}> Clear ROIs </Button>
                      </Box>}
                  />
                  <FormControlLabel value="origin" control={<Radio />} label={
                      <Box display="flex" flexDirection="row" alignItems='center'>
                          Select Origins
                          <Popup width='50%' button_label={<HelpIcon/>}>
                              Click on a desired point to set a new origin. Click on an existing one to delete it. 
                              To fully define the origins, click at the spotting point on each lane, and then use two 
                              points to define a solvent front line at the top of the TLC plate. These solvent front points 
                              are assumed to be the highest two points chosen.
                          </Popup>
                          <Button size='small' variant='outlined' onClick={clearOrigins}> Clear origins </Button>
                      </Box>}
                  />
                </RadioGroup>
              </FormControl>

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
                            defaultValue={initialImageState.radio_brightness}
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
                            defaultValue={initialImageState.radio_contrast}
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
                            defaultValue={initialImageState.radio_opacity}
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
                            defaultValue={initialImageState.bright_brightness}
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
                            defaultValue={initialImageState.bright_contrast}
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
                            defaultValue={initialImageState.bright_opacity}
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
                        checked={legacyState.doRF /*legacyState.do_RF*/}
                        value={legacyState.doRF /*legacyState.do_RF*/ ? 'on' : 'off'}
                        //checked={this.state.do_RF}
                        onChange={(event) => {
                          setLegacyState(prev=>({...prev, doRF: event.target.checked,}));
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
                        disabled={originsDefined()}
                        defaultValue={!originsDefined()}
                        onChange={(event) => {
                          setLaneState(prev => ({ ...prev, autoLane: event.target.checked}));
                        }}
                        name="enable_auto_lane"
                      />}
                      label="Enable automatic lane selection"
                    />
                    </FormGroup>

                    <p>Number of lanes: {laneState.num_lanes}</p>
                    <input type = 'range'
                      disabled={originsDefined()}
                      name = {'#Lanes'}
                      step={1} 
                      valueLabelDisplay="on"
                      marks='true' //{true} Native HTML elements only accept strings
                      value={laneState.num_lanes}
                      min={0}
                      max={12}
                      onInput={(e) => {
                        var num_lanes = e.target.value;
                        setLaneState(prev => ({ ...prev, num_lanes: num_lanes }));
                      }}
                    />

                  </Grid>

                </Grid>
            </Grid>
                <Button color="primary" variant="contained" onClick={submitParams}> Save ROI info </Button>

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
                results={legacyState.results}
                results_loaded={legacyState.results.length > 0}
                doRF={legacyState.doRF}
              />

        </AccordionDetails>
        </Accordion>

        </div>
                  
    );
}

const AnalysisEdit = withRouter(connectEdit(WrappedAnalysisEdit, 'analysis', analysisSchema, analysisValidator));

export { AnalysisEdit };
