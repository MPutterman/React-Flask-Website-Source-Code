import { callAPI } from '../helpers/api';

// Check if object with the specified ID exists
// TODO: need to add handling for error response or no response
export async function id_exists (objectType, id) {
    if (!id) return true;
    return callAPI('GET', `/api/${objectType}/exists/${id}`)
    .then((response) => {
        return response.data.exists;
    });
}

// Lookup up name field for the object with the specified ID
// TODO: add error handling if error response or no response
export async function name_lookup(objectType, id) {
    if (!id) return '';
    return callAPI('GET', `/api/${objectType}/name/${id}`)
    .then((response) => {
        return response.data.name;
    });
}


