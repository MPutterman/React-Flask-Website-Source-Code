// Implement permission system

import { useAuthState, useAuthDispatchn } from '../contexts/auth';

async function getOwner(objectType, objectID) {
    // TODO: call appropriate API method
    // Look up user_id
    // In front end maybe we can take shortcut and just use owner-id field of the object
    // rather than API call...?  And check when actually try to edit/delete
}


export async function hasPermission(objectType, objectID, permission) {
    // TODO: in future look up permissions from database if more sophisticated
    // TODO: add some permissions to not everyone can add equipment, covers, plates, etc...
    // TODO: add some permissions related to organization membership
    // TODO: add in some roles, e.g. admin

    var session = useAuthState();
    

    switch (permission) {
        case 'view':
            return true;
        case 'edit':
            return session.authUser.user_id == getOwner(objectType, objectID);
        case 'create':
            return true;
        case 'delete':
            return session.authUser.user_id == getOwner(objectType, objectID);
    }
}
