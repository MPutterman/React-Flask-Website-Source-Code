// Retrieve file from backend server
// Usage:
//   <ServerImage url=<String> />
//   <ServerDownload url=<String> filename=<String> label=<String> />
//
// TODO:
// * For ServerDownload, any way to get filename directly? In python Flask there is a way to
//     add attachment_filename in the send_file call, but doesn't seem to show up.
// * Implementation now is hacky. Examples online show to set responseType to 'blob' and
//     then intercept response.data.  However this doesn't seem to work. Instead we set
//     responseType to 'arraybuffer', and then have to intercept in api.js to collect
//     response.request.response instead of response.data when the responseType is 'arraybuffer'.
// * Add error checking if response is blank/invalid/unauthorized

import React from 'react';
import { callAPI } from '../helpers/api';
import Button from '@material-ui/core/Button';

const ServerImage = ({ url, ...props }) => {

    const [loaded, setLoaded] = React.useState(false);
    const [src, setSrc] = React.useState('data:'); // Defaults to empty image

    React.useEffect(() => {
        if (url) {
            callAPI('GET', url, {}, { responseType: 'arraybuffer' })
            .then((response) => {
                const filename = '';
                const file = new File([response.data], filename, {type: response.data.type}); 
                setLoaded(true);
                setSrc(URL.createObjectURL(file));
            });
        }
    }, [url]);

    return (
        <img src={src} {...props} />
    )
}

const ServerDownload = ({ url, filename, label, ...props }) => {

    const onClick = (event) => {
        if (url) {
            callAPI('GET', url, {}, { responseType: 'arraybuffer' })
            .then((response) => {
                const file = new File([response.data], filename, {type: response.data.type});
                const url = URL.createObjectURL(file);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', file.name);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }
    }

    return (
        <Button onClick={onClick}>{ label ? label : 'Download' }</Button>
    )
}

export { ServerImage, ServerDownload }