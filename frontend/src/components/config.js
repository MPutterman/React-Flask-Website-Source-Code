// TODO: 
// * Consider a wrapper for API calls. The following looks nice and simple:
//   https://medium.com/@baraa_81910/api-requests-wrapper-with-react-redux-5498d5889c70.
//   This will help to automatically manage authentication with the backend,
//   and probably help to mediate permissions, also handling of errors, etc...
// * For axios defaults, not sure which are critical to the sessions now working properly,
//   need to figure this out.

// RESOURCES:
// * https://zetcode.com/javascript/axios/ (good description of commands and request/response content)

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

// TODO: add a timeout in case of crashed server etc...
// TODO: add some error handling, and maybe extract out
//   a few return values, e.g. success, error, data from response?
export async function callAPI(method, route, data={}) {
    switch(method) {

        case 'GET':
            return axios.get(backend_url(route))
            .then((response) => {
                return response;
            })
            .catch((e) => {
                throw new Error ("Error returned in API call (" + method + " " + route + "): " + e);
            });

        case 'POST':
            console.log('callAPI/POST data: ', data);
            var formData = new FormData();

            // TODO: add some sanitizing of certain field types?
            // e.g. omit fields that are null / undefined?
            for (const [key, value] of Object.entries(data)) {
                formData.append(key, value); 
            }

            // TODO: apparently can get this from FormData...
            const config = {     
                headers: { 'content-type': 'multipart/form-data' }
            }

            return axios.post(backend_url(route), formData, config)
            .then((response) => {
                return response;
            })
            .catch((e) => {
                throw new Error ("Error returned in API call (" + method + " " + route + "): " + e);
            });

        default:
            throw new Error ("Invalid API method (" + method + ") for route '" + route + "'");
    }
}


// Axios defaults

axios.defaults.headers.post['Access-Control-Allow-Origin'] = '*';
axios.defaults.headers.get['Access-Control-Allow-Origin'] = '*';
axios.defaults.withCredentials = true;
axios.defaults.credentials = "same-origin";


