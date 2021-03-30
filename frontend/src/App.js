import React from "react";
import "./App.css";

//import NavBar from './components/navbar';
import {BrowserRouter as Router, Switch, Route, Link, NavLink} from "react-router-dom";
import Home from './components/home';
import About from './components/about';
import Contact from './components/contact';

class App extends React.Component {

    render() {
        return (
            <Router>
                <div>
                <nav className="navbar navbar-expand-lg navbar-light bg-light">
                <ul className="navbar-nav mr-auto">
                    <li><NavLink to={'/'} className="nav-link"> Home </NavLink></li>
                    <li><NavLink to={'/contact'} className="nav-link">Contact</NavLink></li>
                    <li><NavLink to={'/about'} className="nav-link">About</NavLink></li>
                </ul>
                </nav>
                <hr />
                <Switch>
                    <Route exact path='/' component={Home} />
                    <Route path='/contact' component={Contact} />
                    <Route path='/about' component={About} />
                </Switch>
                </div>
            </Router>
        );
    }
}

export default App;