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
import {BrowserRouter as Router, Switch, Route, Link, NavLink} from "react-router-dom";
import Home from './components/home';
import About from './components/about';
import Contact from './components/contact';
//import Analysis from './components/analysis';
//import User from './components/user';
//import Organization from './components/organization';
//import Equipment from './components/equipment';

// TODO: convert this to a class...
// TODO: figure out the 'auth' state, and show different content, e.g. only 'login' option if not logged in
//   and 'account' or 'logout' if logged in...

const drawerWidth = 240;

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
          />
          <h1>
            van Dam Lab - Radio-TLC Analyzer
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
            Name of current route
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
                <MenuItem onClick={handleCloseUserMenu}>My account</MenuItem>
                <MenuItem onClick={handleCloseUserMenu}>Logout</MenuItem>
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
            <NavLink to={'/'} classname="nav-link">
                <ListItemIcon><HomeIcon /></ListItemIcon>
                <ListItemText primary={'Home'} />
            </NavLink>
          </ListItem>
          <ListItem button key={'new analysis'}>
            <NavLink to={'/new-analysis'} classname="nav-link">
                        <ListItemIcon><AddIcon /></ListItemIcon>
                      <ListItemText primary={'New Analysis'} />
            </NavLink>
          </ListItem>
          <ListItem button key={'load analysis'}>
          <NavLink to={'/load-analysis'} classname="nav-link">
            <ListItemIcon><EditIcon /></ListItemIcon>
            <ListItemText primary={'Load Analysis'} />
            </NavLink>
          </ListItem>
        </List>
      </Drawer>
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
                    <Route exact path='/' component={Home} />
                    <Route path='/contact' component={Contact} />
                    <Route path='/about' component={About} />
                </Switch>
            </Router>
        );
    }
}

export default App;