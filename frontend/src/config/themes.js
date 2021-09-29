// Define site themes

import { createTheme } from '@material-ui/core/styles';
import { blueGrey } from '@material-ui/core/colors';

export const darkMode = createTheme({
    props: {
        MuiTextField: {
            // The properties to apply
            variant: 'filled'
        },
        MuiCheckbox: {
            variant: 'outlined'
        },
    },    
    palette: {
    type: "dark",
    primary: {
        light: blueGrey[500],
        main: blueGrey[700],
        dark: blueGrey[900],
        contrastText: "#fff",
    },
    secondary: {
        light: "#ff7961",
        main: "#555599", 
        dark: "#002884",
        contrastText: "#000",
    },
    background: {
        paper: '#222222',
        default: '#111111',
    }
    },
    typography: {
        fontSize: 13,
    }
});

export const lightMode = createTheme({
    palette: {
    type: "light",
/*        primary: {
        light: blueGrey[500],
        main: blueGrey[800],
        dark: blueGrey[900],
        contrastText: "#fff",
    },
    secondary: {
        light: "#ff7961",
        main: blueGrey[700],
        dark: "#002884",
        contrastText: "#000",
    },
    background: {
        paper: '#222222',
        default: '#111111',
    }
*/
    },
    typography: {
        fontSize: 13,
    }
});

