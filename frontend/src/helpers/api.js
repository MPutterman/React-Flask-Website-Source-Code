// Functions for making backend API calls
// IMPORTANT: callAPI (POST method) now sends all non-file data as a JSON stringified
// dict under the field name 'JSON_data'. This must be decoded at the backend
// with 'loads'. Currently sends the fields BOTH directly in the 'formData'
// object, but also repeated within 'JSON_data'. However, this properly handles
// null, Array, Date, and Boolean values, that are forced to String within
// formData (creating many problems in the backend).
//
// TODO: 
// * Change backend calls uniformly to 'api/....'
// * Add error checking if missing API config environment variables
// * Add error handling in backend (set status codes, add message, e.g. in data.error)
// * For axios defaults, not sure which are critical to the sessions now working properly,
//   need to figure this out.
//
// RESOURCES:
// * https://zetcode.com/javascript/axios/ (good description of commands and request/response content)
// * https://github.com/axios/axios#handling-errors (good description of error handling)
// * https://khaledgarbaya.net/articles/4-ways-to-use-axios-interceptors (implementing axios interceptors)
// * https://medium.com/@baraa_81910/api-requests-wrapper-with-react-redux-5498d5889c70 (another API wrapper approach)

import axios from "axios";

// Set axios defaults

axios.defaults.headers.post['Access-Control-Allow-Origin'] = '*';
axios.defaults.headers.get['Access-Control-Allow-Origin'] = '*';
axios.defaults.withCredentials = true;
axios.defaults.credentials = "same-origin";

// Hack for handling of non-timezone-aware front end. 
// Datetimes created in the frontend are incorrectly sent as local time but with implied UTC timezone info.
// Thus they need to be shifted to UTC datetimes before sending to the backend (fixOutgoingDatetime).
// Similarly, datetimes received from the backend (in UTC timezone with timezone info) are incorrectly
// interpretted as local datetimes and must be shifted before using in the frontend (fixIncomingDatetime).

function fixOutgoingDatetime (date) { // Date object or null
    if (!date) return null; // convert any empty value to null
    const shiftedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
    return shiftedDate; // Date object
}

function fixIncomingDatetime (dateString) { // Date string (ISO format)
    if (!dateString) return null; // convert any empty value to null
    const date = new Date(dateString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000); // Date object
}

// Set axios response interceptor to convert datetime string (ISO 8601 format) to Date objects.
axios.interceptors.response.use(
    function(response) { // Handling for non-error status codes (2xx)

        // ISO 8601 datetime regex
        // Source: https://stackoverflow.com/questions/28020805/regex-validate-correct-iso8601-date-string-with-time
        const regex = /^(?:[1-9]\d{3}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00)-02-29)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-][01]\d:[0-5]\d)$/;

        var new_data = {};
        for (var key in response.data) {
            if (typeof(response.data[key]) === 'string') {
                if (response.data[key].match(regex)) {
                    new_data[key] = fixIncomingDatetime(response.data[key]);
                } else {
                    new_data[key] = response.data[key];
                }
            } else {
                new_data[key] = response.data[key];
            }
        }
        delete response.data;
        response.data = new_data;
        return response;
    },
    function(error) { // Handling of error status codes
        // Nothing to do
        return Promise.reject(error);
    }
);

// Note we could also work with request interceptor, but instead perform the outgoing conversion in
// callAPI (POST method) where it is easier to work with.


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


export function callAPI(method, route, data={}, config={}) {

    switch(method) {

        case 'GET':

            return axios.get(backend_url(route), config)
            .then((response) => {
                console.log('response within callAPI[GET]:', response);
                return {
                    error: false,
                    //status: response.status,
                    //statusText: response.statusText,
                    // TODO: hack... all the online guides of using responseType = 'blob'
                    // and accessing response.data did not work...  This seems to work.
                    data: response.config.responseType=='arraybuffer' ? response.request.response : response.data
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

            // Sends fields both in formData (all fields) and formData.JSON_data
            // (all fields except files). 
            // TODO: in future may remove this duplication?

            console.log('callAPI/POST data: ', data);
            var formData = new FormData();

            // The main dict to be JSON stringified
            var JSON_data = {};

            for (const [key, value] of Object.entries(data)) {

                if (value === null || value === undefined) {
                    // For empty values, don't append to formData (they get converted to strings).
                    // TODO: would it be better to send as ''?
                    JSON_data[key] = null;

                } else if (value instanceof Date) {
                    // Automatically intercept and convert datetime fields for reasons discussed above.
                    formData.append(key, fixOutgoingDatetime(value).toISOString());
                    JSON_data[key] = fixOutgoingDatetime(value);

                } else {
                    formData.append(key, value);
                    if (!(value instanceof File)) {
                        JSON_data[key] = value;
                    }
                }
            }
            formData.append('JSON_data', JSON.stringify(JSON_data));

            // TODO: apparently can get this from FormData...
            const headers = {     
                headers: { 'content-type': 'multipart/form-data' }
            }

            // TODO: post doesn't support custom config currently
            return axios.post(backend_url(route), formData, headers)
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
