// TODO: 
// * Consider a wrapper for API calls. The following looks nice and simple:
//   https://medium.com/@baraa_81910/api-requests-wrapper-with-react-redux-5498d5889c70.
//   This will help to automatically manage authentication with the backend,
//   and probably help to mediate permissions, etc...
// * For axios defaults, not sure which are critical to the sessions now working properly,
//   need to figure this out.

import axios from "axios";

// Configure communication with backend server
// TODO: add error check and defaults

const backend_ip = () => {
    return process.env.REACT_APP_BACKEND_IP;
}

const backend_port = () => {
    return process.env.REACT_APP_BACKEND_PORT;
}

export function backend_url(route) {
    return 'http://' + backend_ip() + ':' + backend_port() + '/' + route;
}

export default backend_url;

// Axios defaults

axios.defaults.headers.post['Access-Control-Allow-Origin'] = '*';
axios.defaults.headers.get['Access-Control-Allow-Origin'] = '*';
axios.defaults.withCredentials = true;
axios.defaults.credentials = "same-origin";


