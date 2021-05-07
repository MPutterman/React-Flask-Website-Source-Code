// Communication with backend server
// TODO: add error check and defaults

const backend_ip = () => {
    return process.env.REACT_APP_BACKEND_IP;
}

const backend_port = () => {
    return process.env.REACT_APP_BACKEND_PORT;
}

const backend_url = (route) => {
    return 'http://' + backend_ip() + ':' + backend_port() + '/' + route;
}

export default backend_url;
