// Handle user favorites
// Currently just lists all favorites
//
// TODO:
// * Link somehow to user preferences (e.g. default images, plates, and covers, etc.)
// * Add options to clear some or all favorites in a particular category

import React from "react";
import { withRouter } from "react-router";
import Box from "@material-ui/core/Box";
import { sessionRefresh } from '../contexts/session';
import { UserSearch, OrgSearch, EquipSearch, PlateSearch, CoverSearch, ImageSearch, AnalysisSearch } from '../components/object_search';


const UserFavorites = (props) => {

    return (
        <>
            <UserSearch title='Followed Users' filter={['favorites']} />
            <OrgSearch title='Followed Organizations' filter={['favorites']} />
            <EquipSearch title='Favorite Equipment' filter={['favorites']} />
            <PlateSearch title='Favorite TLC Plates' filter={['favorites']} />
            <CoverSearch title='Favorite TLC Covers' filter={['favorites']} />
            <ImageSearch title='Favorite Images' filter={['favorites']} />
            <AnalysisSearch title='Favorite Analyses' filter={['favorites']} />
        </>
    )

}

export default withRouter(UserFavorites);
