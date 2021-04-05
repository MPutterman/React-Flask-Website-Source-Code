import React from 'react';
import {withRouter} from "react-router";

class User extends React.Component {

  render() {
    return (
        <div>
          <h2>User Action={this.props.match.params} ID={this.props.match.params.id}</h2>
        </div>
    );
  }
}

export default withRouter(User);