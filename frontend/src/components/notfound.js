import React from 'react';

const NotFound = (props) => {

    return (
        <div>
            <p>Error: the requested resource could not be found (<strong>{props.location.pathname}</strong>)</p>
        </div>
    );
}

export default NotFound;