import React from 'react';
import axios from "axios";
import backend_url from './config.js';
import { withRouter } from "react-router";
// TODO: import database connection
// TODO: import current user
// TODO: import permissions system
import UserEdit from './user_edit';


class User extends React.Component {

  /*
  constructor(props) {
    super(props);
  }
  */

  renderEdit() {

   }
  renderView() { }
  renderSearch() { }

  render()
    {
    const action = this.props.match.params.action;
    const id = this.props.match.params.id ?? null;

    var data;

    // TODO: add error checking    
    switch(action) {
      case 'search':
        // TODO: retrieve list of users
        // TODO: need to read any filters and search string, and ordering?
        break;
      case 'create': 
        ;(async (id) => {
          try {
            const response = await axios.get(backend_url('user/create'));
            data = response.data;
          } catch (error) {
            console.error("GET /user/edit/" + id + ": " + error);
          }
        })(id)
        console.log('data: ' + data);

        break;
      case 'edit': 
        ;(async () => {
          try {
            const response = await axios.get(backend_url('user/load/' + id));
 //           if (!response.ok) {
 //             throw Error(response.statusText);
 //           } else {
                data = response.data;
                console.log('data: ' + data);
                return (
                  <div width='50vw'> 
                  <h2>User action = {action}; id = {id}</h2> 
                  <UserEditForm id={data.id} firstName={data.firstName} lastName={data.lastName} email={data.email} />
                  </div>
                );
//            } 
          } catch (error) {
            console.error("GET /user/edit/" + id + ": " + error);
          }
        })()
        break;

      case 'view':
        // TODO:
        break;
      case 'delete':
        // TODO:
        break;
      default:
        return (<h2>Invalid request: object => user; action => {action}; id => {id}</h2>);

    }
    console.log('datadata:' + data);

    return (
    <div width='50vw'> 
    <h2>User action = {action}; id = {id}</h2> 
    <UserEditForm />
    </div>
    );

      

  }
}

export default withRouter(User);