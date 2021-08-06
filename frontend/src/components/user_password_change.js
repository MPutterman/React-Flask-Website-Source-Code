// Show a form to change user password. Ask for current password and the new password.
// TODO: add visibility on/off

import React from "react";
import { withRouter } from "react-router";
import Button from "@material-ui/core/Button";
import { AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField,} from 'uniforms-material';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import { callAPI } from '../helpers/api';
import { useAlerts } from '../contexts/alerts';
import Busy from '../components/busy';

// User password change form

const UserPasswordChange = (props) => {

    let formRef; 

    // Support for alerts and busy indicator
    const setAlert = useAlerts();
    const [busy, setBusy] = React.useState(false);

    // Schema for automated form
    const schema = new SimpleSchema ({
        password: {
            label: 'Password',
            type: String,
            defaultValue: '',
            required: true,
            uniforms: { type: 'password', },
        },
        new_password: {
            label: 'New password',
            type: String,
            defaultValue: '',
            required: true,
            uniforms: { type: 'password', },
            // TODO: add some validation for password strength
        },
        new_password_confirm: {
            label: 'Confirm new password',
            type: String,
            defaultValue: '',
            required: true,
            uniforms: { type: 'password', },
            custom() {
                if (this.value !== this.field("new_password").value) {
                return "New passwords must match";
                }
            },
        },
    });
    var bridge = new SimpleSchema2Bridge(schema);

    // Submit handler
    async function onSubmit(model) {

        setBusy(true);

        // Send back only the needed data
        const data = { password: model.password, new_password: model.new_password };

        return callAPI('POST', `/api/user/password_change`, data)
        .then((response) => {

            if (response.error) {

                // TODO: handle some kinds of errors (e.g. unauthorized?)
                setAlert({severity: 'error', message: `Error: Received status ${response.status} from backend (${response.data.error})`});
                setBusy(false);
                return false;

            } else {

                setBusy(false);
                if (response.data.error) {
                    setAlert({severity: 'error', message: response.data.error});
                    return false;
                } else {
                    setAlert({severity: 'success', message: 'Password successfully changed'});
                    // Go back to previous page
                    // TODO: always want to do this?
                    this.props.history.goBack();
                    return true;
                }
            }
        });
    }

    return (
        <>
        <div className="UserPasswordChangeForm" style = {{ maxWidth: '250px', margin: 'auto', }}>
            <Busy busy={busy} />
            <AutoForm schema={bridge} onSubmit={onSubmit} ref={ref => (formRef = ref)}>
                <AutoField name="password" />
                <ErrorField name="password" />
                <AutoField name="new_password" />
                <ErrorField name="new_password" />
                <AutoField name="new_password_confirm" />
                <ErrorField name="new_password_confirm" />

                <SubmitField size='small'>Submit</SubmitField>
                <Button size='small' type="reset" onClick={() => formRef.reset()}>Clear Form</Button>
            </AutoForm>

        </div>
        </>
    );
    
}

export default withRouter(UserPasswordChange);
