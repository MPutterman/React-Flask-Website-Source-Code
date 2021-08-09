// Handle user favorites
// Currently just lists all favorites
//
// TODO:
// * Add some controls for unfavoriting, and maybe links to view in a popup?
//       Maybe that should go in the object_search form
// * Link somehow to user preferences (e.g. default images, plates, and covers, etc.)
// * Add options to clear some or all favorites in a particular category
// * TODO: check if have view permission before popping up?

import React from "react";
import { withRouter } from "react-router";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { useAuthState, useAuthDispatch, defaultUserPrefs, authRefreshSession } from '../contexts/auth';
import { useConfigState } from '../contexts/config';
import Busy from '../components/busy';
import { useAlerts } from '../contexts/alerts';
import { callAPI } from '../helpers/api';
import {AutoForm, AutoField, AutoFields, ErrorField, ErrorsField, SubmitField,} from 'uniforms-material';
import { id_exists } from '../helpers/validation_utils';
import SimpleSchema from 'simpl-schema';
import { SimpleSchema2Bridge } from 'uniforms-bridge-simple-schema-2';
import IDInputField from '../components/idfield';
import TimezoneSelect, { i18nTimezones } from 'react-timezone-select';
import InputAdornment from '@material-ui/core/InputAdornment';
import { UserSearch, OrgSearch, EquipSearch, PlateSearch, CoverSearch, ImageSearch, AnalysisSearch } from '../components/object_search';


const UserFavorites = (props) => {

    return (
        <>
            <UserSearch filter={['favorites']} />
            <OrgSearch filter={['favorites']} />
            <EquipSearch filter={['favorites']} />
            <PlateSearch filter={['favorites']} />
            <CoverSearch filter={['favorites']} />
            <ImageSearch filter={['favorites']} />
            <AnalysisSearch filter={['favorites']} />
        </>
    )

}

export default withRouter(UserFavorites);
