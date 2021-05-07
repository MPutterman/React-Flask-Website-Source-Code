import React from 'react';
import { withRouter } from "react-router";
import OrganizationEditForm from './OrganizationEditForm';

class Organization extends React.Component {

  renderEdit() {

   }
  renderView() { }
  renderSearch() { }

  render() {
    return (
        <div width='50vw'>
          <h2>Organization Action={this.props.match.params.action} ID={this.props.match.params.id}</h2>
          <OrganizationEditForm />
        </div>
    );
  }
}

export default withRouter(Organization);