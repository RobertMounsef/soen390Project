# Campus Guide (Debugging Demons)

**SOEN 390 – Campus Guide application.** React Native (Expo) mobile app for SGW and Loyola campuses: outdoor maps, campus switching, and (planned) indoor routing and shuttle info.

---

## Stack (per bidding document)

- **Mobile:** React Native (Expo) – JavaScript/TypeScript, iOS & Android
- **Maps:** react-native-maps
- **Testing:** Jest (unit), React Native Testing Library (component/UI), Maestro (E2E)

---

## Prerequisites

- Node.js 18+
- Yarn or npm
- [Expo Go](https://expo.dev/go) on your phone (for device testing), or iOS Simulator / Android Emulator

---

## Setup

### 1. Install dependencies

```bash
yarn
```

or

```bash
npm install
```

### 2. (Optional) Google Maps on Android

For Google Maps on Android, set your API key. Create `app.config.js` (or use env) and reference it in `app.json` under `android.config.googleMaps.apiKey`. For local development, Expo’s default map provider is enough.

---

## Run the app

```bash
yarn start
```

or

```bash
npx expo start
```

Then:

- Scan the QR code with **Expo Go** (Android/iOS), or  
- Press **i** for iOS Simulator / **a** for Android Emulator

---

## Scripts

| Command        | Description                |
|----------------|----------------------------|
| `yarn start`   | Start Expo dev server      |
| `yarn android` | Start and open on Android  |
| `yarn ios`     | Start and open on iOS      |
| `yarn test`    | Run Jest unit/RNTL tests   |
| `yarn test:watch` | Jest in watch mode     |

---

## E2E with Maestro

Install [Maestro](https://maestro.mobile.dev/getting-started/installation), then run:

```bash
maestro test .maestro/flows
```

Flows are in `.maestro/flows/` (e.g. campus tab switch). Build and install the app (or use a development build) so the `appId` in the flow matches your app.

---

## Project layout

```
├── App.js                 # Root component (campus tabs + map)
├── App.test.js            # RNTL tests for App
├── __mocks__/react-native-maps.js  # Jest mock for map in tests
├── app.json               # Expo config
├── src/
│   ├── components/
│   │   └── MapView.js      # Campus map (react-native-maps)
│   └── constants/
│       └── campuses.js    # SGW/LOYOLA coordinates and list
└── .maestro/flows/        # Maestro E2E flows
```

---

## Next steps (from bid)

- Indoor shortest-path directions (multi-floor)
- Google Calendar API + Concordia Open Data (class schedules, locations)
- Node.js backend: shuttle timings, indoor POI data
- Accessibility routing and user acceptance testing on device
