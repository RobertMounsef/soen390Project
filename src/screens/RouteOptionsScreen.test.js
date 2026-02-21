import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RouteOptionsScreen from './RouteOptionsScreen';

jest.mock('../services/routing/routeCalculator', () => ({
    calculateRoute: jest.fn(),
}));

const { calculateRoute } = require('../services/routing/routeCalculator');

const baseParams = {
    start: { latitude: 45.497, longitude: -73.579, label: 'SGW' },
    end: { latitude: 45.458, longitude: -73.64, label: 'LOY' },
    destinationName: 'Loyola',
};

describe('RouteOptionsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders and calls calculateRoute on mount', async () => {
        calculateRoute.mockResolvedValueOnce({
            mode: 'walk',
            distanceMeters: 1200,
            durationMinutes: 15,
            summary: 'Walk route',
            steps: [],
            polyline: [],
        });

        const { getByText } = render(
            <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
        );

        await waitFor(() => expect(calculateRoute).toHaveBeenCalled());
        expect(getByText('Route Options')).toBeTruthy();
        expect(getByText('15 min')).toBeTruthy();
    });

    it('switching modes triggers route recalculation with correct mode', async () => {
        calculateRoute
            .mockResolvedValueOnce({
                mode: 'walk',
                distanceMeters: 1000,
                durationMinutes: 12,
                summary: 'Walk route',
                steps: [],
                polyline: [],
            })
            .mockResolvedValueOnce({
                mode: 'drive',
                distanceMeters: 2500,
                durationMinutes: 7,
                summary: 'Drive route',
                steps: [],
                polyline: [],
            });

        const { getByLabelText, getByText } = render(
            <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
        );

        await waitFor(() => expect(calculateRoute).toHaveBeenCalledTimes(1));
        fireEvent.press(getByLabelText('mode-drive'));

        await waitFor(() => expect(calculateRoute).toHaveBeenCalledTimes(2));
        expect(calculateRoute).toHaveBeenLastCalledWith(
            expect.objectContaining({ mode: 'drive' })
        );

        await waitFor(() => expect(getByText('7 min')).toBeTruthy());
    });

    it('shows and hides directions when steps exist', async () => {
        calculateRoute.mockResolvedValueOnce({
            mode: 'walk',
            distanceMeters: 400,
            durationMinutes: 5,
            summary: 'Walk route',
            polyline: [],
            steps: [
                { instruction: 'Head north', kind: 'walk', distanceText: '100 m', durationText: '1 min' },
                { instruction: 'Turn left', kind: 'walk', distanceText: '300 m', durationText: '4 min' },
            ],
        });

        const { getByText, queryByText } = render(
            <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
        );

        await waitFor(() => expect(getByText('Show directions')).toBeTruthy());

        fireEvent.press(getByText('Show directions'));
        expect(getByText('Hide directions')).toBeTruthy();
        expect(getByText(/Head north/i)).toBeTruthy();

        fireEvent.press(getByText('Hide directions'));
        expect(queryByText(/Head north/i)).toBeNull();
    });

    it('gracefully handles calculateRoute error', async () => {
        calculateRoute.mockRejectedValueOnce(new Error('boom'));

        const { getByText } = render(
            <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
        );

        await waitFor(() => expect(getByText('Could not calculate route.')).toBeTruthy());
    });

    it('calls onBack when Back is pressed', async () => {
        calculateRoute.mockResolvedValueOnce({
            mode: 'walk',
            distanceMeters: 1200,
            durationMinutes: 15,
            summary: 'Walk route',
            steps: [],
            polyline: [],
        });

        const onBack = jest.fn();
        const { getByText } = render(
            <RouteOptionsScreen route={{ params: baseParams }} onBack={onBack} />
        );

        await waitFor(() => expect(getByText('Back')).toBeTruthy());
        fireEvent.press(getByText('Back'));
        expect(onBack).toHaveBeenCalled();
    });
});