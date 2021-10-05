// Communication with backend server
// TODO: add error check and defaults

const backend_ip = () => {
    return 'compute.cerenkov.org'
}

const backend_port = () => {
    return '5000';
}

const backend_url = (route) => {
    return 'http://' + backend_ip() + ':' + backend_port() + '/' + route;
}

export default backend_url;
