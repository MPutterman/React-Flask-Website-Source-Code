// MAJOR TODO:
// * DON'T AUTOLANE EVERY TIME WE CHANGE ROIs -- only have option to 'auto-assign lanes' - warning this will
//   obliterate any existing lanes
// * Maybe on the back end we can have everything sorted automatically, or grouped into lanes if not already assigned
//     E.g. for TLC lanes -- it finds the closest vertical center for each ROI...
// * CHANGE the analysisData 'save' function so it doesn't wipe out ROIs -- just mark them dirty...
// * Integrate 'fix background' into the backend 'analysis_generate_working_images'
//     function.  It should _not_ be a separate API route.
// * More cleanup of backend Analysis class to clarify whether it is an object instance
//     or set of class methods.
// * Move remaining computational stuff out of api.py into analysis.py
// * Clarify whether 'doUV' mean superimpose bright+Cerenkov, or whether there is
//     a second set of UV ROIs...
// * Change doRF to show_Rf (i.e. just indicating a visual preference)
// * Think how the user can define/adjust lanes. Right now it is just the 'origins' point.  Also when the user adds
//   a new ROI AFTER lanes are defined, should they assign to a lane, or do we automatically do it?  Or is there
//   an 'active lane' (click all the ROIs in this lane)?
// * Maybe auto-lane can return the origin_x coordinate for all the lanes?

//
// TODO:
// * How to show only date selector?
// * Allow selection of color palette for image? (Maybe less processing in backend... just convert to monochromatic PNG?)
//     Are there client-side ways to do this?
//     Some good palettes: https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html
//     Backend supports quite a few natively, we could allow a choice from front end (and a preference)
//     https://matplotlib.org/3.5.0/tutorials/colors/colormaps.html
// * Add feature to export as .csv text file, excel file, etc.
// * Add feature to export a full PDF report?  E.g. with image, etc..
// * When change origins and ROIs, need to reset something so 'autolane' will work correctly.
// * I'm not sure how "n_l" and autolane work together.
// * There are some interesting graphical libraries, e.g. https://docs.bokeh.org/en/latest/docs/gallery.html#gallery (python)
//     that may allow use to do interesting things like live line plots, lasso-based ROI selection, etc...
//     Also more react-specific stuff here: https://stackshare.io/bokeh/alternatives
// * Disable more image control functions before the image_url are populated
// * When autoselect ROIs, consider whether it makes sense to keep current ROIs. I don't think so
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
        //autoLane: false,  // LEGACY? not sure this is needed...  We should just have a button to autodetect lanes and clear lanes
        num_lanes: 0, // number of lanes  # TODO: should add to database?  Unneded?
        origins: [],
        //ROIs: [],
        selectedROI: UNDEFINED,
        roi_list: [], // TODO: new format
        lane_list: [], // TODO: new format
        is_dirty: false,
    };

    // TODO: note: autolane and num_lane aren't in the database. Should they be?
    // DON'T NEED num_lanes -- it will be determinable from lane_list
    // DON'T nEED AUTOLANE in DB either -- it will be a one-time thing?
    React.useEffect(() => {
        //if (model.auto_lane !== null && model.auto_lane !== undefined) {
        //   setLaneState((prev) => ({ ...prev, autoLane: model.auto_lane, }));
        //}
//        if (model.num_lanes !== null && model.num_lanes !== undefined) {
//           setLaneState((prev) => ({ ...prev, num_lanes: model.num_lanes, }));
//        }
        if (model.origins !== null && model.origins !== undefined) {
           setLaneState((prev) => ({ ...prev, origins: model.origins, }));
        }
       //if (model.ROIs !== null && model.ROIs !== undefined) {
        //   setLaneState((prev) => ({ ...prev, ROIs: model.ROIs, num_lanes: model.ROIs.length}));
        //}
        if (model.roi_list !== null && model.roi_list !== undefined) {
          setLaneState((prev) => ({ ...prev, roi_list: model.roi_list, }));
        }
        if (model.lane_list !== null && model.lane_list !== undefined) {
          setLaneState((prev) => ({ ...prev, lane_list: model.lane_list, }));
        }
   }, [/*model.auto_lane, model.num_lanes,*/ model.origins, /*model.ROIs,*/ model.roi_list, model.lane_list])

    const initialLegacyState = {
        doRF: false,  // LEGACY: phase this out 
    };

    React.useEffect(() => {
        if (model.doRF !== null && model.doRF !== undefined) {
            setLegacyState((prev) => ({...prev, doRF: model.doRF}));
        }
    }, [model.doRF])

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
    //var data = {
    //    'ROIs': JSON.stringify(laneState.ROIs),
    //};
    callAPI('GET', `api/analysis/roi_build/${model.analysis_id}/${x}/${y}/${shift}`, {})
      .then((res) => {
        // Add the new ROI info (assign initially to lane '0')
        // QUESTION: is n_l changed by the server?
        // TODO: maybe the server should regenerate the lane list as much as possible?
        return setLaneState(prev => {
          const new_roi = res.data.roi;
          console.log('new roi in build_roi', new_roi);
          let new_roi_list = JSON.parse(JSON.stringify(prev.roi_list)); // Deep copy
          new_roi_list.push(new_roi)
          console.log('new_roi_list in buildROI', new_roi_list);
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

    //console.log(e)

    // Ignore keypress if no ROI is selected
    //console.log('just entered onKeypress, here is value of laneState', laneState);
    //let lane = laneState.selectedROI.lane;
    //let band = laneState.selectedROI.band;
    let roi_id = laneState.selectedROI;
    if (roi_id === UNDEFINED) return;
//    if (lane === UNDEFINED || band === UNDEFINED) return;

//    console.log ('in onKeyPress, lane=', lane);
//    console.log ('in onKeyPress, band=', band);
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
    // TODO: is this correct?
    setLaneState(prev => {
      //let newROIs = JSON.parse(JSON.stringify(prev.ROIs)); // Deep copy
      //newROIs[lane][band] = roi;
      //return {...prev, ROIs: newROIs};
      let new_roi_list = JSON.parse(JSON.stringify(prev.roi_list)); // Deep copy
      // TODO: is the coordinate ordering correct here?
      new_roi_list[roi_id] = roi;
      return {...prev, roi_list: new_roi_list};
    }); 
  }, [laneState, setLaneState]);

  // This is the way to set up listener that can access state: https://usehooks.com/useEventListener/
  useEventListener('keydown', onKeypress);

  const moveVert = (roi) => {
//    if (roi[0] + STEP_Y + roi[2] < imageState.size_y)  roi[0] += STEP_Y;
    if (roi['shape_params']['y'] + STEP_Y + roi['shape_params']['ry'] < imageState.size_y)  roi['shape_params']['y'] += STEP_Y;
    return roi;
  }

  const moveHorz = (roi) => {
//    if (roi[1] + STEP_X + roi[3] < imageState.size_x) roi[1] += STEP_X;
    if (roi['shape_params']['x'] + STEP_X + roi['shape_params']['rx'] < imageState.size_x)  roi['shape_params']['x'] += STEP_X;
return roi;
  }

  const backHorz = (roi) => {
//    if (roi[1] - STEP_X - roi[3] > 0) roi[1] -= STEP_X;
    if (roi['shape_params']['x'] - STEP_X - roi['shape_params']['rx'] < 0)  roi['shape_params']['x'] -= STEP_X;
return roi;
  }

  const backVert = (roi) => {
//    if (roi[0] - STEP_Y - roi[2] > 0) roi[0] -= STEP_Y;
    if (roi['shape_params']['y'] - STEP_Y - roi['shape_params']['ry'] < 0)  roi['shape_params']['y'] -= STEP_Y;
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
    if (roi.shape_params.rx > 14) roi.shape_params.rx -= STEP_RX; // TODO: what is special about the value 14?
    return roi;
  };

  const decVert = (roi) => {
    if (roi.shape_params.ry > 14) roi.shape_params.ry -= STEP_RY; // TODO: what is special about the value 14?
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
      // QUESTION: why so much calculation for origins?  And what is the + 3 near the end?
      // It's for clicking inside an ROI -- to find the true coordinates with respect to image
      var x = e.nativeEvent.offsetX;
      var y = e.nativeEvent.offsetY;
      var radx = laneState.roi_list[roi_id].shape_params.rx;
      var rady = laneState.roi_list[roi_id].shape_params.ry;
      var px = laneState.roi_list[roi_id].shape_params.x;
      var py = laneState.roi_list[roi_id].shape_params.y;
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
      if (laneState.roi_list.length > 0) {
          confirm ({/*title:<title>, description:<description>*/})
          .then(() => {
              setLaneState(prev => ({...prev, roi_list: [], selectedROI: UNDEFINED,}));
          });
      } else {
          setLaneState(prev => ({...prev, roi_list: [], selectedROI: UNDEFINED,}));
      }
  };

  // Clear all Lanes.  Just a local change until save to backend
    const clearLanes = () => {
      if (laneState.lane_list.length > 0) {
          confirm ({/*title:<title>, description:<description>*/})
          .then(() => {
              setLaneState(prev => ({...prev, lane_list: [], }));
          });
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
  async function autoselectROIsWrapper() {
      if (laneState.roi_list.length > 0) {
          confirm ({/*title:<title>, description:<description>*/})
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
              setAlert({severity: 'warning', message: `Error autoselecting ROIs: ${response.data.error}`});
          } else {
              // Override the ROIs (i.e. delete anything already defined).
              console.log('Received from rois_autoselect:', response.data.roi_list);
              setLaneState(prev => ({...prev,
//                  ROIs: response.data.ROIs,
                  roi_list: response.data.roi_list,
                  selectedROI: UNDEFINED,
              }));
          }
      })
  }

  // Autoselect the lanes. Just a local change until save to backend
  async function autoselectLanesWrapper() {
    if (laneState.lane_list.length > 0) {
        confirm ({/*title:<title>, description:<description>*/})
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
    return callAPI('POST', `api/analysis/lanes_autoselect/${model.analysis_id}`, data)
    .then((response) => {
        if (response.error) {
            setAlert({severity: 'warning', message: `Error autoselecting lanes: ${response.data.error}`});
        } else {
            // Override the ROIs (i.e. delete anything already defined).
            setLaneState(prev => ({...prev,
                lane_list: response.data.lane_list,
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
//    console.log('ROIs', laneState.ROIs);
    console.log('roi_list', laneState.roi_list);
    console.log('lane_list', laneState.lane_list);
    const data = {
//      ROIs: JSON.stringify(laneState.ROIs),
      roi_list: JSON.stringify(laneState.roi_list),
      lane_list: JSON.stringify(laneState.lane_list),
      origins: JSON.stringify(laneState.origins),
//      num_lanes: laneState.num_lanes, // phase this out later...
      doRF: legacyState.doRF, // phase this out later
//      autoLane: !originsDefined(),
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
//          ROIs: res.data.ROIs,
          origins: res.data.origins,
//          num_lanes: res.data.ROIs ? res.data.ROIs.length : 0, /// TODO: is this correct? is it needed here?
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
                { /* TODO: how to prevent click issue. ROIs are on top of image. if want to click */ }
                { /* an origin INSIDE an ROI, then the ROI gets clicked, not the image */ }
                { /* TODO: draw lanes in another manner (not canvas) to avoid this issue */ }

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
                                Click on a band to build a new ROI, or select on an existing ROI to modify it. 
                                While an ROI is select, click on it to delete it, or use the following keys to update it:<br/> 
                                [a / A] jog left (left or right side)<br/> 
                                [w / W] jog up (top or bottom side)<br/> 
                                [s / S] jog down (top or bottom side)<br/> 
                                [d / D] jog right (left or right side)<br/>
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
                              To fully define the origins, click at the spotting point on each lane, and then use two 
                              points to define a solvent front line at the top of the TLC plate. These solvent front points 
                              are assumed to be the highest two points chosen.
                          </Popup>
                          <Button size='small' variant='outlined' onClick={clearOrigins}> Clear origins </Button>
                          <Button size='small' variant='outlined' onClick={autoselectLanesWrapper}> Create lanes without origins </Button>

                          {//<Button size='small' variant='outlined' onClick={createLanes}> Create lanes from origins </Button>
                          // TODO: think about whether to create lanes at frontend or backend,
                          //  when to populate which ROIs are in the lanes and what to do about redundancy
                          //  of origins and lanes
                          }
                          <Button size='small' variant='outlined' onClick={clearLanes}> Clear lanes </Button>
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
                        checked={legacyState.doRF /*legacyState.do_RF*/}
                        value={legacyState.doRF /*legacyState.do_RF*/ ? 'on' : 'off'}
                        //checked={this.state.do_RF}
                        onChange={(event) => {
                          setLegacyState(prev=>({...prev, doRF: event.target.checked,}));
                        }}
                        name="show_rf"
                      />}
                      label="Show Rf values"
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
                      //disabled={originsDefined()}
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
                show_Rf={legacyState.doRF}
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
