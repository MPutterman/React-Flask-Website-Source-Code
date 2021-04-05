import React from 'react';
import { withRouter } from "react-router";
import UserEditForm from './UserEditForm';

class User extends React.Component {

  renderEdit() {

   }
  renderView() { }
  renderSearch() { }

  render() {
    return (
        <div width='50vw'>
          <h2>User Action={this.props.match.params.action} ID={this.props.match.params.id}</h2>
          <UserEditForm />
        </div>
    );
  }
}

export default withRouter(User);