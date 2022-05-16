// Show a form to change user password. Ask for current password and the new password.
//
// CREDITS:
// * Password field component: https://www.npmjs.com/package/material-ui-password
//
// TODO:
// * Need some mechanism to deal with blank passwords, e.g. if user created with
//   a third party login (e.g. google)

import React from "react";
import { withRouter } from "react-router";
import Button from "@material-ui/core/Button";
import { AutoForm, AutoField, ErrorField, SubmitField,} from 'uniforms-material';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import { callAPI } from '../helpers/api';
import { useAlerts } from '../contexts/alerts';
import { useThrobber } from '../contexts/throbber';
import PasswordInputField from '../components/passwordfield';

// User password change form

const UserPasswordChange = (props) => {

    let formRef; 

    // Support for alerts and busy indicator
    const setAlert = useAlerts();
    const setBusy = useThrobber();

    // Schema for automated form
    const schema = new SimpleSchema ({
        password: {
            label: 'Password',
            type: String,
            required: true,
            uniforms: { type: 'password', },
        },
        new_password: {
            label: 'New password',
            type: String,
            required: true,
            uniforms: { type: 'password', },
            // TODO: add some validation for password strength
        },
        new_password_confirm: {
            label: 'Confirm new password',
            type: String,
            required: true,
            uniforms: { type: 'password', },
            custom() {
                if (this.value !== this.field("new_password").value) {
                    return "passwordMismatch";
                }
            },
        },
    });
    schema.messageBox.messages({
        en: {
            passwordMismatch: "New passwords must match",
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
                setAlert({severity: 'error', message: `Error: Received status ${response.status} from backend (${response.data})`});
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
            <AutoForm schema={bridge} onSubmit={onSubmit} ref={ref => (formRef = ref)}>
                <AutoField name="password" component={PasswordInputField} />
                <ErrorField name="password" />
                <AutoField name="new_password" component={PasswordInputField} />
                <ErrorField name="new_password" />
                <AutoField name="new_password_confirm" component={PasswordInputField} />
                <ErrorField name="new_password_confirm" />

                <SubmitField size='small'>Submit</SubmitField>
                <Button size='small' type="reset" onClick={() => formRef.reset()}>Clear Form</Button>
                
            </AutoForm>

        </div>
        </>
    );
    
}

export default withRouter(UserPasswordChange);
