import React from 'react';
import { useErrorResponse } from '../contexts/error';

const NotFound = (props) => {

    const setErrorResponse = useErrorResponse();

    setErrorResponse({
        code: 404, // Not Found
        details: 'Invalid route',
    })

    return (<></>);
}

export default NotFound;