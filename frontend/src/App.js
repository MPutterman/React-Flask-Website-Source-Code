// TODO:
// * Consider creating a config file to store routes. This could then also be used for menu generation.
// * Add protection of routes for logged in users
// * Move the 'snackbar' component here to allow for global message updating... there is a good example
//   here: https://browntreelabs.com/snackbars-in-react-redux-and-material-ui/

import React from 'react';

// Import theme and styles
import CssBaseline from '@material-ui/core/CssBaseline';
import "./App.css";
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import { blueGrey } from '@material-ui/core/colors';

// Import configuration, authentication, preferences
import { ConfigProvider } from './contexts/config';
import { AuthProvider } from './contexts/auth';

// Import main interface components
import Layout from './components/layout';

// Import Router and pages
import {BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Home from './components/home';
import About from './components/about';
import Contact from './components/contact';
import Error404 from './components/error404';

import Analysis from './components/analysis';
import Database from './components/database'
import Submission from './components/submission'
import Start from './components/start'
//import User from './components/user';
import UserEdit from './components/user_edit';
import UserSearch from "./components/user_search";
import UserLogin from "./components/user_login"; 
import Organization from './components/organization';
//import Equipment from './components/equipment';



const App = (props) => {
  
    // Create theme(s)
    // TODO: this can later go into a separate file
    const darkMode = createMuiTheme({
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
      },
    });


    return (
      <>
      <ConfigProvider>
      <AuthProvider>
        <ThemeProvider theme={darkMode}>
        <CssBaseline />
        <Router>
        <Layout>
            <Switch>
                <Route path = '/search' component={Database}/>
                <Route path='/start' component={Start}/>
                <Route path='/submission' component={Submission}/>
                <Route path='/analysis/:filenumber' component={Analysis}/>
                <Route exact path='/' component={Home} />
                <Route path='/contact' component={Contact} />
                <Route path='/about' component={About} />
                <Route exact path='/user/edit/:id' component={UserEdit} />
                <Route exact path='/user/register' component={UserEdit} />
                <Route exact path='/user/login' component={UserLogin} />
                <Route path='/user/search' component={UserSearch} />
                {/*
                <Route exact path='/user/:action' component={User} /> 
                <Route exact path='/user/:action/:id' component={User} /> 
                <Route exact path='/organization/:action' component={Organization} />
                <Route exact path='/organization/:action/:id' component={Organization} />
                */}
                <Route component={Error404} /> {/* No match */}
            </Switch>
        </Layout>
        </Router>
        </ThemeProvider>
      </AuthProvider>
      </ConfigProvider>
      </>
    );

}

export default App;
