import React from 'react';

const Home = (props) => {

    return (
        <div>
            <h1>van Dam Lab</h1>
            <h2>Multi-lane Radio-TLC Analyzer</h2>

            <p>
                This application is designed to streamline the analysis of image-based radio-TLC
                data obtained from Cerenkov- or scintillation imaging setups, autoradiography,
                or 2D TLC scanners. Click on "About" (left menu bar) to learn more about this project.
            </p>

            <p>
                To begin an analysis, click on "New Analysis" (left menu bar). To streamline the
                process, be sure to set default values for Analysis options using the "Preferences"
                dialog.
            </p>

            <p>
                IMPORTANT NOTE: You must be signed in to use the full features of this application.
                Log in or register for an account by clicking the "Login" button
                at the top right. 
            </p>

        </div>

    );
}

export default Home;
