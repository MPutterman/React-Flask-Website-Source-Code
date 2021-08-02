// Define site themes

import { createTheme, ThemeProvider } from '@material-ui/core/styles';
import { blueGrey } from '@material-ui/core/colors';

export const darkMode = createTheme({
    palette: {
    type: "dark",
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
    },
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
});

