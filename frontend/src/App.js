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

// Import error handler
import { ErrorHandler } from './contexts/error';

// Import alert list
import { AlertList } from './contexts/alerts';

// Import Material-UI pickers
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
//import LuxonUtils from '@date-io/luxon';
import DateFnsUtils from '@date-io/date-fns';

// Import main interface components
import Layout from './components/layout';

// Import Router and pages
import {BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import Home from './components/home';
import About from './components/about';
import Contact from './components/contact';
import NotFound from './components/notfound';

import Analysis from './components/analysis';
import AnalysisSearch from './components/analysis_search';
import Database from './components/database'
import Submission from './components/submission'
import UserEdit from './components/user_edit';
import UserSearch from "./components/user_search";
import UserLogin from "./components/user_login"; 
import UserPrefs from "./components/user_prefs";
import Organization from './components/organization';
import ImageSearch from './components/image_search';
import ImageEdit from './components/image_edit';
//import EquipEdit from './components/equip_edit';
import EquipSearch from './components/equip_search';



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
        background: {
          paper: '#222222',
          default: '#111111',
        }
      },
    });

    // How to reveal the auth context to get theme preference?
    const lightMode = createMuiTheme({
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


    return (
      <>
      <ConfigProvider>
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <AuthProvider>
        <ThemeProvider theme={darkMode}>
        <CssBaseline />
        <Router>
        <Layout>
          <AlertList>
          <ErrorHandler>
            <Switch>
{/*                <Route path = '/analysis/search' component={Database}/> */}
{/*                <Route path='/start' component={Start}/> */}
{/* TODO: Need to find a way to force a refresh for /analysis/new... or create a new component? 
      currently if in /analysis/edit/<id>, then go to /analysis/new, all the data/state is still there */}
                <Route path='/analysis/new' component={Analysis}/>
                <Route path='/analysis/edit/:id' component={Analysis}/>
                <Route path='/analysis/search' component={AnalysisSearch}/>
                <Route path='/analysis/:analysis_id' component={Analysis}/>
                <Route path='/image/search' component={ImageSearch} />
                <Route path='/image/new' render={(props)=> (<ImageEdit {...props} new={true}/>)} /> 
                <Route path='/image/edit/:id' component={ImageEdit} />
                <Route path='/equip/search' component={EquipSearch} />
                {/*
                <Route path='equip/new' render={(props) => (<EquipEdit {...props} new={true}/>)}
                <Route path='equip/edit/:id' component={EquipEdit} />
                */}
                <Route exact path='/' component={Home} />
                <Route exact path='/home' component={Home} />
                <Route exact path='/contact' component={Contact} />
                <Route exact path='/about' component={About} />
                <Route exact path='/user/edit/:id' component={UserEdit} />
                <Route exact path='/user/register' render={(props)=> (<UserEdit {...props} register={true}/>)} /> 
                <Route exact path='/user/change_password/:id' render={(props)=> (<UserEdit {...props} change_password={true}/>)} /> 
                <Route exact path='/user/login' component={UserLogin} />
                <Route path='/user/search' component={UserSearch} />
                <Route exact path='/user/prefs' component={UserPrefs} />

                {/*
                <Route exact path='/user/:action' component={User} /> 
                <Route exact path='/user/:action/:id' component={User} /> 
                <Route exact path='/organization/:action' component={Organization} />
                <Route exact path='/organization/:action/:id' component={Organization} />
                */}
                <Route component={NotFound} status={404} /> 
            </Switch>
          </ErrorHandler>
          </AlertList>
        </Layout>
        </Router>
        </ThemeProvider>
      </AuthProvider>
      </MuiPickersUtilsProvider>
      </ConfigProvider>
      </>
    );

}

export default App;
