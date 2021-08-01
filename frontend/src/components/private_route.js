// Implement a <Route> that checks for authentication.
// If not authenticated, it redirects to login page.
// Passes original route to login page to redirect back after successful authentication.
// NOTE: it is important to wait until the session is loaded to avoid premature Redirect.
//
// Credit: https://ui.dev/react-router-v5-protected-routes-authentication/
//
// TODO:
// * Does not currently handle <Route component> property (children is the recommended use)

import React from 'react';
import { Route } from 'react-router';
import { useAuthState } from '../contexts/auth';
import { useAlerts } from '../contexts/alerts';
import { Redirect } from 'react-router-dom';

export function PrivateRoute({ children, component, ...rest }) {

    const session = useAuthState();
    const setAlert = useAlerts();

    return (
        <>
        { session.loaded
        ? (
            <Route {...rest} render={({ location }) => {
                return session.auth === true
                ? children
                : <><Redirect to={{
                    pathname: '/user/login',
                    state: { from: location }
                    }}/>
                    {setAlert({severity: 'warning', message: 'You must be logged in to access this page. Redirecting to login form.'})}
                    </>
            }} /> )
        : ( <></> )
        }
        </>
    )

}

