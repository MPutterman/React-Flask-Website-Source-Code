// Define site themes

import { createTheme, adaptV4Theme } from '@mui/material/styles';
import { blueGrey } from '@mui/material/colors';

const componentConfig = {
    MuiTextField: {
        defaultProps: {
            variant: 'filled',
            margin: 'dense',
            size: 'small',
        },
    },
    MuiCheckbox: {
        defaultProps: {
            variant: 'outlined',
            margin: 'dense',
            size: 'small',
        },
    },

};

const typographyConfig = {
    fontSize: 12,
};

export const darkTheme = createTheme({
    components: componentConfig,
    palette: {
        mode: "dark",
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
        },
    },
    typography: typographyConfig,
});

export const lightTheme = createTheme({
    components: componentConfig,
    palette: {
    mode: "light",
    /*
        primary: {
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
    typography: typographyConfig,
});

