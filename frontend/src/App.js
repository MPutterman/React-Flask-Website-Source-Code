// Main app and routes.
// Uses <ProtectedRoute> to enforce login.
//
//TODO:
// * Consider creating a config file to store routes. This could then also be used for menu generation.
// * Add protection of routes for logged in users
// * Any way to put the useRouter routing in here?  (Also the props.match.params.<xyz>, since it is 
//     not needed if component used alone).  Maybe be some bugs for embedded
//     pages the way it is now (should strip out props.params.match in those cases...)
// * Future: Upgrade to router v6 syntax: https://reacttraining.com/blog/react-router-v6-pre/
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

// Import throbber
import { Throbber } from './contexts/throbber';

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
import { UserView, OrgView, EquipView, PlateView, CoverView, ImageView, AnalysisView } from './components/object_view';
import { UserSearch, OrgSearch, EquipSearch, PlateSearch, CoverSearch, ImageSearch, AnalysisSearch } from "./components/object_search";
import UserLogin from "./components/user_login"; 
import UserPrefs from "./components/user_prefs";
import UserPasswordChange from './components/user_password_change';
import { UserEdit, UserRegister, OrgEdit, EquipEdit, PlateEdit, CoverEdit, ImageEdit, /*AnalysisEdit*/ } from './components/object_edit';

// Wrap a portion of the app so we can access the needed contexts (i.e. Auth)
const App = (props) => {
    return (
      <Throbber>
        <ConfigProvider>
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <AuthContext>
              <AppWrapped />
            </AuthContext>
          </MuiPickersUtilsProvider>
        </ConfigProvider>        
      </Throbber>
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

                <PrivateRoute path='/analysis/new'><Analysis new={true} /></PrivateRoute>
                <PrivateRoute path='/analysis/edit/:id'><Analysis /></PrivateRoute>
                <PrivateRoute path='/analysis/search'><AnalysisSearch /></PrivateRoute>
                <PrivateRoute path='/analysis/:analysis_id'><Analysis /></PrivateRoute>


                <PrivateRoute path='/org/view/:id'><OrgView /></PrivateRoute>
                <PrivateRoute path='/org/new'><OrgEdit create={true} /></PrivateRoute>
                <PrivateRoute path='/org/edit/:id'><OrgEdit /></PrivateRoute>
                <PrivateRoute path='/org/search'><OrgSearch /></PrivateRoute>

                <PrivateRoute path='/equip/view/:id'><EquipView /></PrivateRoute>
                <PrivateRoute path='/equip/new'><EquipEdit create={true} /></PrivateRoute>
                <PrivateRoute path='/equip/edit/:id'><EquipEdit /></PrivateRoute>
                <PrivateRoute path='/equip/search'><EquipSearch /></PrivateRoute>

                <PrivateRoute path='/plate/view/:id'><PlateView /></PrivateRoute>
                <PrivateRoute path='/plate/new'><PlateEdit create={true} /></PrivateRoute>
                <PrivateRoute path='/plate/edit/:id'><PlateEdit /></PrivateRoute>
                <PrivateRoute path='/plate/search'><PlateSearch /></PrivateRoute>

                <PrivateRoute path='/cover/view/:id'><CoverView /></PrivateRoute>
                <PrivateRoute path='/cover/new'><CoverEdit create={true} /></PrivateRoute>
                <PrivateRoute path='/cover/edit/:id'><CoverEdit /></PrivateRoute>
                <PrivateRoute path='/cover/search'><CoverSearch /></PrivateRoute>

                <PrivateRoute path='/image/view/:id'><ImageView /></PrivateRoute>
                <PrivateRoute path='/image/new'><ImageEdit create={true} /></PrivateRoute>
                <PrivateRoute path='/image/edit/:id'><ImageEdit /></PrivateRoute>
                <PrivateRoute path='/image/search'><ImageSearch /></PrivateRoute>

                <Route exact path='/'><Home /></Route>
                <Route exact path='/home'><Home /></Route>
                <Route exact path='/contact'><Contact /></Route>
                <PrivateRoute exact path='/about'><About /></PrivateRoute>
                <PrivateRoute path='/user/view/:id'><UserView /></PrivateRoute>
                <Route exact path='/user/register'><UserRegister create={true}/></Route> 
                <PrivateRoute exact path='/user/edit/:id'><UserEdit /></PrivateRoute>
                <PrivateRoute exact path='/user/password_change'><UserPasswordChange /></PrivateRoute>
                <Route exact path='/user/login'><UserLogin /></Route>
                <PrivateRoute path='/user/search'><UserSearch /></PrivateRoute>
                <PrivateRoute exact path='/user/prefs'><UserPrefs /></PrivateRoute>

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
