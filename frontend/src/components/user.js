import React from 'react';
import { withRouter } from "react-router";
// TODO: import database connection
// TODO: import current user
// TODO: import permissions system
import UserEditForm from './UserEditForm';


class User extends React.Component {

  renderEdit() {

   }
  renderView() { }
  renderSearch() { }

  render() {
    console.log('here');
    const action = this.props.match.params.action;
    const id = this.props.match.params.id ?? null;
    
    switch(action) {
      case 'search':
        // TODO: retrieve list of users
        // TODO: need to read any filters and search string, and ordering?
        break;
      case 'create':
      case 'edit': {
        return (
            <div width='50vw'>
              <h2>User action={action} id={id}</h2>
              <UserEditForm />
            </div>
        );
      }
      case 'view':
        // TODO:
        break;
      case 'delete':
        // TODO:
        break;
      default:
        return (<h2>Invalid request: object => user; action => {action}; id => {id}</h2>);
    }
  }
}

export default withRouter(User);