import { fetchGoogleDirections } from './googleDirections';

describe('googleDirections', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('calls fetch and returns parsed route data', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                routes: [
                    {
                        legs: [
                            {
                                distance: { value: 1200 },
                                duration: { value: 900 },
                                steps: [
                                    { html_instructions: 'Head north' },
                                ],
                            },
                        ],
                        overview_polyline: { points: 'abcd' },
                    },
                ],
            }),
        });

        const r = await fetchGoogleDirections({
            origin: { latitude: 45, longitude: -73 },
            destination: { latitude: 45.1, longitude: -73.1 },
            mode: 'walking',
        });

        expect(global.fetch).toHaveBeenCalled();
        expect(r).toBeTruthy();
    });

    it('throws when fetch fails', async () => {
        global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

        await expect(
            fetchGoogleDirections({
                origin: { latitude: 45, longitude: -73 },
                destination: { latitude: 45.1, longitude: -73.1 },
                mode: 'walking',
            })
        ).rejects.toBeTruthy();
    });

    it('throws when no routes returned', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ routes: [] }),
        });

        await expect(
            fetchGoogleDirections({
                origin: { latitude: 45, longitude: -73 },
                destination: { latitude: 45.1, longitude: -73.1 },
                mode: 'walking',
            })
        ).rejects.toBeTruthy();
    });
});