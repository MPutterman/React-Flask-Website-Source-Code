// Main app and routes.
// Uses <ProtectedRoute> to enforce login.
//
//TODO:
// * Consider creating a config file to store routes. This could then also be used for menu generation.
// * Add protection of routes for logged in users
// * Upgrade to router v6 syntax: https://reacttraining.com/blog/react-router-v6-pre/
//
// References:
// https://www.npmjs.com/package/material-ui-confirm (confirm provider documentation)

import React from 'react';

// Import theme and styles
import CssBaseline from '@material-ui/core/CssBaseline';
import "./App.css";

// Import configuration, authentication/preferences
import { ConfigProvider } from './contexts/config';
import { AuthContext, useAuthState } from './contexts/auth';

// Import error handler
import { ErrorHandler } from './contexts/error';
import { StatusCodes } from 'http-status-codes';

// Import confirm provider
import { ConfirmProvider } from 'material-ui-confirm';

// Import alert list
import { AlertList } from './contexts/alerts';

// Import Material-UI pickers
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
//import LuxonUtils from '@date-io/luxon';
import DateFnsUtils from '@date-io/date-fns';

// Import main interface components and themes
import Layout from './components/layout';
import { ThemeProvider } from '@material-ui/core/styles';
import { darkMode, lightMode } from './config/themes';

// Import Router and pages
import {BrowserRouter as Router, Switch, Route, Routes, Redirect } from "react-router-dom";
import { PrivateRoute } from './components/private_route';
import Home from './components/home';
import About from './components/about';
import Contact from './components/contact';
import NotFound from './components/notfound';

import Analysis from './components/analysis';
import Database from './components/database'
import Submission from './components/submission'
import { UserView, EquipView } from './components/object_view';
import UserEdit from './components/user_edit';
import { UserSearch, EquipSearch, ImageSearch, AnalysisSearch } from "./components/object_search";
import UserLogin from "./components/user_login"; 
import UserPrefs from "./components/user_prefs";
import ImageEdit from './components/image_edit';
//import EquipEdit from './components/equip_edit';


// Wrap a portion of the app so we can access the needed contexts (i.e. Auth)
const App = (props) => {
    return (
        <ConfigProvider>
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <AuthContext>
              <AppWrapped />
            </AuthContext>
          </MuiPickersUtilsProvider>
        </ConfigProvider>        
    )
}

const AppWrapped = (props) => {

    const session = useAuthState();

    return (
        <ThemeProvider theme={darkMode}>
        <ConfirmProvider defaultOptions={{confirmationButtonProps: { autoFocus: true }}}>
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
                <PrivateRoute path='/analysis/new'><Analysis new={true} /></PrivateRoute>
                <PrivateRoute path='/analysis/edit/:id'><Analysis /></PrivateRoute>
                <PrivateRoute path='/analysis/search'><AnalysisSearch /></PrivateRoute>
                <PrivateRoute path='/analysis/:analysis_id'><Analysis /></PrivateRoute>
                <PrivateRoute path='/image/search'><ImageSearch /></PrivateRoute>
                <PrivateRoute path='/image/new'><ImageEdit new={true} /></PrivateRoute>
                <PrivateRoute path='/image/edit/:id'><ImageEdit /></PrivateRoute>
                <PrivateRoute path='/equip/search'><EquipSearch /></PrivateRoute>
                {/*
                <PrivateRoute path='equip/new'><EquipEdit new={true} /></PrivateRoute>
                <PrivateRoute path='equip/edit/:id'><EquipEdit /></PrivateRoute>
                */}
                <Route exact path='/'><Home /></Route>
                <Route exact path='/home'><Home /></Route>
                <Route exact path='/contact'><Contact /></Route>
                <PrivateRoute exact path='/about'><About /></PrivateRoute>
                <PrivateRoute exact path='/user/edit/:id'><UserEdit /></PrivateRoute>
                <Route exact path='/user/register'><UserEdit register={true} /></Route> 
                <PrivateRoute exact path='/user/change_password/:id'><UserEdit change_password={true} /></PrivateRoute>
                <Route exact path='/user/login'><UserLogin /></Route>
                <PrivateRoute path='/user/search'><UserSearch /></PrivateRoute>
                <PrivateRoute exact path='/user/prefs'><UserPrefs /></PrivateRoute>
                <PrivateRoute path='/user/view/:id'><UserView /></PrivateRoute>
                <PrivateRoute path='/equip/view/:id'><EquipView /></PrivateRoute>

                <Route component={NotFound} status={StatusCodes.NOT_FOUND} /> 
            </Switch>
          </ErrorHandler>
          </AlertList>
        </Layout>
        </Router>
        </ConfirmProvider>
        </ThemeProvider>

    );

}

export default App;
