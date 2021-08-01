// TODO: 
// * Add error checking if missing API config environment variables
// * Add error handling in backend (set status codes, add message, e.g. in data.error)
// * Consider a wrapper for API calls. The following looks nice and simple:
//   https://medium.com/@baraa_81910/api-requests-wrapper-with-react-redux-5498d5889c70.
//   This will help to automatically manage authentication with the backend,
//   and probably help to mediate permissions, also handling of errors, etc...
// * For axios defaults, not sure which are critical to the sessions now working properly,
//   need to figure this out.
// * Add a 'sanitize' routine to filer out desired keys of 'data' on POST
// * When passing complex data types, need to JSON.stringify in frontend, and loads in backend, which
//     is likely to cause bugs. Can callAPI be smarter and detect if there are complex objects
//     and do this automatically... or better yet, switch content-type to application/json
//     and stringify the whole data payload?  What happens to files in that case?
// * Axios has a concept of 'interceptors'.  Use this for all the Date types.
// * GLOBAL TODO: add a 'deleted' flag to database -- needed to maintain integrity
//     if any objects are deleted
//
// RESOURCES:
// * https://zetcode.com/javascript/axios/ (good description of commands and request/response content)
// * https://github.com/axios/axios#handling-errors (good description of error handling)


import axios from "axios";

// Set axios defaults

axios.defaults.headers.post['Access-Control-Allow-Origin'] = '*';
axios.defaults.headers.get['Access-Control-Allow-Origin'] = '*';
axios.defaults.withCredentials = true;
axios.defaults.credentials = "same-origin";


// Configure communication with backend server
// TODO: add error check and defaults

const backend_ip = () => {
    return process.env.REACT_APP_BACKEND_IP;
}

const backend_port = () => {
    return process.env.REACT_APP_BACKEND_PORT;
}

// TODO: remove export once remove backend_url from all code
export function backend_url(route) {
    return 'http://' + backend_ip() + ':' + backend_port() + '/' + route;
}


export function callAPI(method, route, data={}) {

    switch(method) {

        case 'GET':

            return axios.get(backend_url(route))
            .then((response) => {
                return {
                    error: false,
                    //status: response.status,
                    //statusText: response.statusText,
                    data: response.data,
                }
            })
            .catch((error) => {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.log(error.response.data);
                    console.log(error.response.status);
                    console.log(error.response.headers);
                    return {
                        error: true,
                        status: error.response.status,
                        statusText: error.response.statusText, // TODO: does this exist?
                        data: error.response.data, // data from backend (use data.error for message)
                    }
                } else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.log(error.request);
                    return {
                        error: true,
                        status: 500,
                        statusText: 'Internal Server Error',
                        data: {error: 'Server did not respond. API call may not be recognized or server may be down.'},
                    }
                } else { 
                    // Something happened in setting up the request that triggered an Error
                    console.log('Error', error.message);
                    return {
                        error: true,
                        status: 500,
                        statusText: 'Internal Server Error',
                        data: {error: error.message},
                    }
                }
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
                return {
                    error: false,
                    //status: response.status,
                    //statusText: response.statusText,
                    data: response.data,
                }
            })
            .catch((error) => {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.log(error.response.data);
                    console.log(error.response.status);
                    console.log(error.response.headers);
                    return {
                        error: true,
                        status: error.response.status,
                        statusText: error.response.statusText, // TODO: does this exist?
                        data: error.response.data, // data from backend (use data.error for message)
                    }
                } else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.log(error.request);
                    return {
                        error: true,
                        status: 500,
                        statusText: 'Internal Server Error',
                        data: {error: 'Server did not respond'},
                    }
                } else { 
                    // Something happened in setting up the request that triggered an Error
                    console.log('Error', error.message);
                    return {
                        error: true,
                        status: 500,
                        statusText: 'Internal Server Error',
                        data: {error: error.message},
                    }
                }
            });

        default:
            return {
                error: true,
                status: 500,
                statusText: 'Internal Server Error',
                data: {error: `Invalid API method (${method})`},
            };
    }
}
