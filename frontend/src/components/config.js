// TODO: 
// * For axios defaults, not sure which are critical to the sessions now working properly

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


