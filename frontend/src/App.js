import React from 'react';
import clsx from 'clsx';
import CssBaseline from '@material-ui/core/CssBaseline';
import "./App.css";

// Import Material UI components for app bar and drawer
import {makeStyles, useTheme} from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Drawer from '@material-ui/core/Drawer';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

// Import icons
// ** Need to run npm install @material-ui/icons
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import AccountCircle from '@material-ui/icons/AccountCircle';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import HomeIcon from '@material-ui/icons/Home';

// Import Router and pages
import {BrowserRouter as Router, Switch, Route, useParams, Link, NavLink} from "react-router-dom";
import Home from './components/home';
import About from './components/about';
import Contact from './components/contact';
import Error404 from './components/error404';

import Analysis from './components/analysisNew';
import Database from './components/database'
import Submission from './components/submission'
import Start from './components/start'
//import User from './components/user';
import UserEdit from './components/user_edit';
import UserSearch from "./components/user_search";
import Organization from './components/organization';
//import Equipment from './components/equipment';

// TODO: Look into web sessions
// TODO: figure out the 'auth' state, and show different content, e.g. only 'login' option if not logged in
// TODO: Here's an interesting tutorial on doing logins/sessions with flask: https://www.digitalocean.com/community/tutorials/how-to-add-authentication-to-your-app-with-flask-login

const drawerWidth = 120;

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexGrow: 1,
  },
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: -drawerWidth,
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  },
  title: {
    flexGrow: 1,
  },
}));

export function MenuAppBar() {
  const classes = useStyles();
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [auth, setAuth] = React.useState(true);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [anchorE2, setAnchorE2] = React.useState(null);

  const openAppMenu = Boolean(anchorEl);
  const openUserMenu = Boolean(anchorE2);

  const handleChange = (event) => {
    setAuth(event.target.checked);
  };

  const handleClickAppMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClickUserMenu = (event) => {
    setAnchorE2(event.currentTarget);
  };

  const handleCloseAppMenu = () => {
    setAnchorEl(null);
  };

  // TODO: need to figure out how to get the current user's ID
  const handleUserAccount = () => {
    handleCloseUserMenu(null);
    window.location.pathname = '/user/edit/1';
  }

  // TODO: need to figure out how to get the current user's ID
  const handleUserLogout = () => {
    handleCloseUserMenu(null);
    window.location.pathname = '/user/logout/1';
  }
  const handleCloseUserMenu = () => {
    setAnchorE2(null);
  };
  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };


  return (

    <div className={classes.root}>
      <CssBaseline />

      {/* Logo */}
      <div className='header'>
          <img 
            style={{width: '10%', height: '10%', }}
            src={process.env.PUBLIC_URL + "/logo_UCLA_blue_boxed.png"}
            alt='logo'
          />
          <h1>
            
          </h1>
          <br />
      </div>
     

      <AppBar style={{topMargin: '50'}} position="fixed" className={clsx(classes.appBar, {[classes.appBarShift]: open, })} >
        <Toolbar>
          <IconButton
            edge="start"
            className={clsx(classes.menuButton, open && classes.hide)}
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            van Dam TLC Analyzer
          </Typography>
          <NavLink to={'/about'} className="nav-link">About</NavLink>
          {auth && (
            <div>
              <IconButton
                aria-label="account of current user"
                aria-controls="menu-user"
                aria-haspopup="true"
                onClick={handleClickUserMenu}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-user"
                anchorE1={anchorE2}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={openUserMenu}
                onClose={handleCloseUserMenu}
              >
                <MenuItem onClick={handleUserAccount}>My account</MenuItem>
                <MenuItem onClick={handleUserLogout}>Logout</MenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={open}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <div className={classes.drawerHeader}>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </div>
        <Divider />
        <List>
          <ListItem button key={'home'}>
            <NavLink to={'/'} className="nav-link">
                <ListItemIcon><HomeIcon /></ListItemIcon>
                <ListItemText primary={'Home'} />
            </NavLink>
          </ListItem>
          <ListItem button key={'new analysis'}>
            <NavLink to={'/submission'} className="nav-link">
                        <ListItemIcon><AddIcon /></ListItemIcon>
                      <ListItemText primary={'New Analysis'} />
            </NavLink>
            </ListItem>
          <ListItem button key={'Search Database'}>
            <NavLink to={'/search'} className="nav-link">
                        <ListItemIcon><AddIcon /></ListItemIcon>
                      <ListItemText primary={'Search Database'} />
            </NavLink>
          </ListItem>
          
        </List>
      </Drawer>
 
      <main />

    </div>
  );
}

class App extends React.Component {

    render() {
        return (
            <Router>
                <div>
                    <MenuAppBar />
                </div>
                <Switch>
                    <Route path = '/search' component={Database}/>
                    <Route path='/start' component={Start}/>
                    <Route path='/submission' component={Submission}/>
                    <Route path='/analysis/:filenumber' component={Analysis}/>
                    <Route exact path='/' component={Start} />
                    <Route path='/contact' component={Contact} />
                    <Route path='/about' component={About} />
                    <Route exact path='/user/edit/:id' component={UserEdit} />
                    <Route path='/user/search' component={UserSearch} />
                    {/*
                    <Route exact path='/user/:action' component={User} /> 
                    <Route exact path='/user/:action/:id' component={User} /> 
                    <Route exact path='/organization/:action' component={Organization} />
                    <Route exact path='/organization/:action/:id' component={Organization} />
                    */}
                    <Route component={Error404} /> {/* No match */}
                </Switch>
            </Router>
        );
    }
}

export default App;
