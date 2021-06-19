// TODO: 
// * Consider a wrapper for API calls. The following looks nice and simple:
//   https://medium.com/@baraa_81910/api-requests-wrapper-with-react-redux-5498d5889c70.
//   This will help to automatically manage authentication with the backend,
//   and probably help to mediate permissions, also handling of errors, etc...
// * For axios defaults, not sure which are critical to the sessions now working properly,
//   need to figure this out.
// * Improve use of 'then' to make use of .then(funcOnSuccess, funcOnFailure)...
//     but need to check if promise is resolved/rejected based on HTTP-response,
//     or presence/absence of response...
// * Add a 'sanitize' routine to filer out desired keys of 'data' on POST
// * When passing complex data types, need to JSON.stringify in frontend, and loads in backend, which
//     is likely to cause bugs. Can callAPI be smarter and detect if there are complex objects
//     and do this automatically... or better yet, switch content-type to application/json
//     and stringify the whole data payload?  What happens to files in that case?
// * https://github.com/axios/axios#handling-errors - some info on using request.error and response.error
//     to make intelligent handling of issues
// * Axios has a concept of 'interceptors'.  Use this for all the Date types.

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
                return response; // client handles normal data response and errors
            })
            .catch((err) => {
                throw new Error (`Exception in ${method} ${route}: ${err.message}`);
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


