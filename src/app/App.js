// src/app/App.js
import React, { useState } from 'react';
import MapScreen from '../screens/MapScreen';
import RouteOptionsScreen from '../screens/RouteOptionsScreen';

/**
 * Simple state-based navigation (NO extra installations).
 * - "map" shows MapScreen
 * - "routeOptions" shows RouteOptionsScreen
 */
export default function App() {
    const [screen, setScreen] = useState('map');
    const [routeParams, setRouteParams] = useState(null);

    // Called by MapScreen when user wants routes (after selecting From & To)
    const openRouteOptions = (params) => {
        // debug (you can remove later)
        console.log('[App] openRouteOptions called', params);

        setRouteParams(params);
        setScreen('routeOptions');
    };

    const goBackToMap = () => {
        setScreen('map');
        setRouteParams(null);
    };

    if (screen === 'routeOptions') {
        return (
            <RouteOptionsScreen
                route={{ params: routeParams }}
                onBack={goBackToMap}
            />
        );
    }

    return <MapScreen onGoToRoutes={openRouteOptions} />;
}