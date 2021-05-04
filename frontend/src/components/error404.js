import React from 'react';

const Error404 = (props) => {

    return (
        <div>
            <p>Error: path not found (<strong>{props.location.pathname}</strong>)</p>
        </div>
    );
}

export default Error404;