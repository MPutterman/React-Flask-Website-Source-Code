// Functions for handling permissions.
//
// All permissions are granted and checked by the backend. These functions are basically wrappers
// to interrogate the backend to determine permissions for the current logged-in user (as known
// by the backend).

import { callAPI } from '../helpers/api';
import { useQuery } from 'react-query'; // Query cache

// Cache results using React.memo.
// TODO: figure out how to implement.. useMemo should not be used with async calls
// -- Perhaps this: https://react-query.tanstack.com/quick-start (for caching all API calls)
// -- Has ways of registering situations where cache should be marked dirty
// TODO: detect if there is an error and don't cache in that case
// TODO: think about cache timescale, and whether cache needs to be dirtied after any changes

/*
const cachedHasPermission = React.memo(({ action, objectType, objectID}) => {
	return hasPermission(action, objectType, objectID);
});

const cachedListPemissions = React.memo(({ objectType, objectID }) => {
    return listPermissions(objectType, objectID);
});
*/

// Determine if user has permission to perform an action on an object (or object type)
async function hasPermission(action, object_type, id) {
    return callAPI('GET', `/api/check_permission/${object_type}/${action}/${id}`)
    .then((response) => {
        if (response.error) {
            console.warn(`Error ${response.status} from /api/check_permission call: ${response.data.error}`);
            return false; // Return false if any error
        } else {
            return response.data.authorized === true;
        }
    })
    .catch((error) => {
        console.warn('Exception in /api/check_permission call: ', error);
        return false; // Return false if any exception
    });
}

// List the allowed actions on the object (or object type)
async function listPermissions(object_type, id) {
    return callAPI('GET', `/api/list_permissions/${object_type}/${id}`)
    .then((response) => {
        if (response.error) {
            console.warn(`Error ${response.status} from /api/list_permissions call: ${response.data.error}`);
            return []; // Return empty list if any errors
        } else {
            return response.data.authorized;
        }
    })
    .catch((error) => {
        console.warn('Exception in /api/list_permissions call: ', error);
        return []; // Return empty list if any exception
    });
}

/*
 * // List the allowed actions on the object (or object type)
async function listPermissions(object_type, id) {
    const { isLoading, error, data }
        = useQuery (
            ['listPermissions', {type:object_type, id:id}],
            async () => {
                // TODO: throw error (for useQuery to detect) if any error occurs...
                return callAPI('GET', `/api/list_permissions/${object_type}/${id}`)
                .then((response) => {
                    if (response.error) {
                        console.warn(`Error ${response.status} from /api/list_permissions call: ${response.data.error}`);
                        return []; // Return empty list if any errors
                    } else {
                        return response.data.authorized;
                    }
                })
                .catch((error) => {
                    console.warn('Exception in /api/list_permissions call: ', error);
                    return []; // Return empty list if any exception
                });
            });
    console.log(`isLoading: ${isLoading}, error: ${error}, data: ${data}`);
    return data;
}
*/

export {
    //cachedHasPermission,
    //cachedListPermissions,
    hasPermission,
    listPermissions,
};
