// TODO:
// * Should profile link to the profile edit page, or just a page to view?
// * Currently when open menu, the AppBar squeezes... but not the main part of the screen. Any way to easily change that?

import React from 'react';
import clsx from 'clsx';
import { useHistory, useLocation, Link, NavLink} from "react-router-dom";

// Import authentication
import { sessionLogin, sessionLogout, useSessionState, useSessionDispatch } from '../contexts/session';

// Import Material UI components for app bar and drawer
//import {makeStyles, useTheme} from '@mui/material/styles';
import {useTheme} from '@mui/material/styles';
import {makeStyles} from '@mui/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';

// Import icons
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountCircle from '@mui/icons-material/AccountCircle';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';



const drawerWidth = 135;

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
    marginLeft: 0,
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
//    marginLeft: drawerWidth,
  },
  title: {
    flexGrow: 1,
  },
}));

const Layout = (props) => {

  const classes = useStyles();
  const theme = useTheme();
  const [openDrawer, setOpenDrawer] = React.useState(false);
  const [openUserMenu, setOpenUserMenu] = React.useState(false);
  const [anchorE1, setAnchorE1] = React.useState(null);

  const history = useHistory();

  const location = useLocation();

  // Connect to Auth context
  const dispatch = useSessionDispatch();
  const { session, profile } = useSessionState();

  // Event handlers

  const handleOpenUserMenu = (event) => {
    console.log('in handleOpenuserMenu, event=>', event);
    setAnchorE1(event.currentTarget);
    setOpenUserMenu(true);
  };

  const handleUserProfile = (event) => {
    handleCloseUserMenu(event);
    history.push('/user/edit/' + session.auth_id); 
  }

  const handleChangePassword = (event) => {
    handleCloseUserMenu(event);
    history.push('/user/password_change'); 
  }

  const handlePrefs = (event) => {
    handleCloseUserMenu(event);
    history.push('/user/prefs'); 
  }

  const handleFavorites = (event) => {
    handleCloseUserMenu(event);
    history.push('/user/favorites'); 
  }

  async function handleUserLogout(event) {
    handleCloseUserMenu(event);
    let response = await sessionLogout(dispatch); 
    history.push('/user/login');
  }

  async function handleUserLogin() {
    history.push('/user/login');
  }

  const handleCloseUserMenu = (event) => {
    setAnchorE1(event.currentTarget);
    setOpenUserMenu(false);
  };

  const handleDrawerOpen = () => {
    setOpenDrawer(true);
  };

  const handleDrawerClose = () => {
    setOpenDrawer(false);
  };


  return (

      <>
      <AppBar style={{height: '65px', topMargin: '0'}} position="fixed" className={clsx(classes.appBar, {[classes.appBarShift]: openDrawer, })} >
        <Toolbar>
          <IconButton
            edge="start"
            className={clsx(classes.menuButton, openDrawer && classes.hide)}
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
          >
            <MenuIcon />
          </IconButton>
          <img 
            style={{width: '80px', height: '40px', }}
            src={process.env.PUBLIC_URL + "/logo_UCLA_blue_boxed.png"}
            alt='logo'
          />
          &nbsp; &nbsp;
          <div>
            <p>van Dam Lab <br/> TLC Analyzer</p>
          </div>
          &nbsp; &nbsp; &nbsp; 
          <Typography variant="h6" className={classes.title}>
            {location.pathname}
          </Typography>
          {session.auth ? (
            <div>
              {profile.first_name} {profile.last_name}
              <IconButton
                aria-label="account of current user"
                aria-controls="menu-user"
                aria-haspopup="true"
                onClick={handleOpenUserMenu}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-user"
                anchore1={anchorE1}
                // Following is a hack to get positioning correct
                // https://stackoverflow.com/questions/48157863/how-to-make-a-dropdown-menu-open-below-the-appbar-using-material-ui
                getContentAnchorEl={null}
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
                <MenuItem onClick={handleUserProfile}>Profile</MenuItem>
                <MenuItem onClick={handleChangePassword}>Change password</MenuItem>
                <MenuItem onClick={handlePrefs}>Preferences</MenuItem>
                <MenuItem onClick={handleFavorites}>Favorites</MenuItem>
                <MenuItem onClick={handleUserLogout}>Logout</MenuItem>
              </Menu>
            </div>
          ) : (
            <Button variant='outlined' onClick={handleUserLogin}>Login</Button>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={openDrawer}
        onMouseLeave={handleDrawerClose}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <div className={classes.drawerHeader}>
          <IconButton onClick={handleDrawerClose}>
            {/*
            {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            */}
            <ChevronLeftIcon />
          </IconButton>
        </div>
        <Divider />
        <List >
          <ListItem button key={'home'}>
            <NavLink to={'/'} exact className="nav-link" activeClassName="nav-link-active">
                <ListItemIcon><HomeIcon /></ListItemIcon>
                <ListItemText primary={'Home'} />
            </NavLink>
          </ListItem>
          <ListItem button key={'new analysis'}>
            <NavLink to={'/analysis/new'} className="nav-link" activeClassName="nav-link-active">
              <ListItemIcon><AddIcon /></ListItemIcon>
              <ListItemText primary={'New Analysis'} />
            </NavLink>
          </ListItem>
          <ListItem button key={'Search Analyses'}>
            <NavLink to={'/analysis/search'} className="nav-link" activeClassName="nav-link-active">
              <ListItemIcon><SearchIcon /></ListItemIcon>
              <ListItemText primary={'Search Analyses'} />
            </NavLink>
          </ListItem>
          <ListItem button key={'load analysis'}>
            <NavLink to={'/analysis/load'} className="nav-link" activeClassName="nav-link-active">
              <ListItemIcon><EditIcon /></ListItemIcon>
              <ListItemText primary={'Load/Edit Analysis'} />
            </NavLink>
          </ListItem>

          <ListItem button key={'user search'}>
            <NavLink to={'/user/search'} className="nav-link" activeClassName="nav-link-active">
              <ListItemIcon><SearchIcon /></ListItemIcon>
              <ListItemText primary={'Search Users'} />
            </NavLink>
          </ListItem>

          <ListItem button key={'about'}>
            <NavLink to={'/about'} className="nav-link" activeClassName="nav-link-active">
              <ListItemIcon><InfoIcon /></ListItemIcon>
              <ListItemText primary={'About'} />
            </NavLink>
          </ListItem>

        </List>
      </Drawer>
 
      <div style={{marginTop: '75px'}} className={clsx(classes.content, {[classes.contentShift]: openDrawer, })} >

        <div>
            {props.children}
        </div>
      

      </div>
      </>
  );
}

export default Layout;