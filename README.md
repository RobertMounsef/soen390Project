# Campus Guide (Debugging Demons)

**SOEN 390 – Campus Guide application.** React Native (Expo) mobile app for SGW and Loyola campuses: outdoor maps, campus switching, and (planned) indoor routing and shuttle info.

---

## Stack (per bidding document)

- **Mobile:** React Native (Expo) SDK 54 – JavaScript/TypeScript, iOS & Android
- **Maps:** react-native-maps
- **Testing:** Jest (unit), React Native Testing Library (component/UI), Maestro (E2E)

---

## Prerequisites

- **Node.js 18+** (required)
- **npm** or **yarn** package manager
- [Expo Go](https://expo.dev/go) app on your phone (for device testing), or iOS Simulator / Android Emulator

---

## Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd soen390Project

# Install dependencies
npm install
```

**Important:** The `postinstall` script will automatically apply patches to React Native (fixes Flow syntax compatibility with React Native Testing Library). This happens automatically after `npm install`.

### 2. (Optional) Google Maps on Android

For Google Maps on Android, set your API key. Create `app.config.js` (or use env) and reference it in `app.json` under `android.config.googleMaps.apiKey`. For local development, Expo's default map provider is enough.

---

## Running the App

### Development Mode

Start the Expo development server:

```bash
npm start
```

or

```bash
npx expo start
```

Then choose your platform:

- **Mobile Device:** Scan the QR code with **Expo Go** app (Android/iOS)
- **iOS Simulator:** Press **i** in the terminal
- **Android Emulator:** Press **a** in the terminal
- **Web Browser:** Press **w** in the terminal

### Platform-Specific Commands

```bash
# Start and open on iOS
npm run ios

# Start and open on Android
npm run android

# Start and open on web
npm run web
```

---

## Scripts

| Command        | Description                |
|----------------|----------------------------|
| `npm start`    | Start Expo dev server      |
| `npm run android` | Start and open on Android  |
| `npm run ios`     | Start and open on iOS      |
| `npm run web` | Start and open on web browser |
| `npm test`    | Run Jest unit/RNTL tests   |
| `npm run test:watch` | Jest in watch mode     |

---

## Project Layout

```
├── docs/
│   └── swagger.yaml          # RESTful API documentation (OpenAPI 3.0)
│
├── App.js                    # Expo entry point (re-exports src/app/App.js)
├── app.json                  # Expo config
├── babel.config.js           # Babel configuration
├── jest.setup.js             # Jest setup for RNTL
├── package.json
│
├── assets/
│   └── images/               # App icons and splash images
│
├── patches/                  # patch-package patches (auto-applied)
│   └── react-native+0.81.5.patch
│
├── __mocks__/                # Jest mocks for native modules
│   ├── react-native-maps.js
│   ├── react-native-safe-area-context.js
│   └── ViewConfigIgnore.js
│
└── src/
    ├── app/
    │   ├── App.js            # App entry (renders screens)
    │   └── App.test.js       # App component tests
    │
    ├── screens/
    │   ├── MapScreen.js      # Campus tabs + map screen
    │   ├── MapScreen.test.js # MapScreen tests
        └── RouteOptionsScreen  #  # Route selection screen with transport mode options
    │
    ├── components/
    │   ├── MapView.js        # Campus map component with building highlighting
    │   ├── MapView.test.js   # MapView tests
    │   ├── BuildingInfoPopup.js  # Building details popup
    │   └── BuildingInfoPopup.test.js  # BuildingInfoPopup tests
    │
    ├── hooks/
    │   ├── useUserLocation.js      # User location tracking hook
    │   └── useUserLocation.test.js # Location hook tests
    │
    ├── services/
    │   └── api/
    │       ├── index.js          # API exports
    │       ├── index.test.js     # API index tests
    │       ├── campuses.js       # Campus data access
    │       ├── campuses.test.js  # Campus API tests
    │       ├── buildings.js      # Building data access
    │       └── buildings.test.js # Building API tests
    │    └── routing/
    │        ├── googleDirection.js  # Google routing servicepolyline    
    │        └── routeCalculator .js # Calculates routes
    │
    ├── data/
    │   ├── campuses.js       # SGW/LOYOLA coordinates
    │   ├── buildings.js      # Building GeoJSON data
    │   ├── buildingInfo.js   # Detailed building information
    │   ├── buildingInfo.test.js  # Building info tests
    │   ├── loyola.json       # Loyola campus GeoJSON building data
    │   └── sgw.json          # SGW campus GeoJSON building data
    │
    ├── utils/
    │   ├── geolocation.js        # Point-in-polygon utilities
    │   ├── geolocation.test.js   # Geolocation tests
    │   └── geometry.js           # GeoJSON geometry utilities for coordinate extraction
    └── 
```

---

## Testing

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

### Test Configuration

Tests use:
- **Jest** with `jest-expo` preset
- **React Native Testing Library** for component testing
- **Mocks** for native modules (maps, safe area context)
- **Flow syntax support** via Babel plugin and patch-package

### Test Files

Tests are co-located with their components:
- `src/app/App.test.js` - Main app component tests
- `src/screens/MapScreen.test.js` - MapScreen component tests
- `src/components/MapView.test.js` - MapView component tests
- `src/components/BuildingInfoPopup.test.js` - BuildingInfoPopup tests
- `src/hooks/useUserLocation.test.js` - User location hook tests
- `src/services/api/index.test.js` - API index tests
- `src/services/api/campuses.test.js` - Campus API tests
- `src/services/api/buildings.test.js` - Building API tests
- `src/data/buildingInfo.test.js` - Building info data tests
- `src/utils/geolocation.test.js` - Geolocation utility tests

---

## E2E with Maestro

Install [Maestro](https://maestro.mobile.dev/getting-started/installation), then run:

```bash
maestro test .maestro/flows
```

Build and install the app (or use a development build) so the `appId` in the flow matches your app.

**Automated (CI):** The same flows run on every push/PR to `main` or `develop` via the [Maestro E2E (iOS)](.github/workflows/maestro-e2e.yml) workflow. The workflow uses a macOS runner, builds the app with `expo run:ios`, then runs `maestro test .maestro/flows`.

---

## Documentation

- **RESTful API Design**: The system is designed with a RESTful architecture in mind. View the [Swagger/OpenAPI Spec](docs/swagger.yaml) for details on data structures and endpoints.
- **Visualization**: To visualize the API, copy the content of `docs/swagger.yaml` into the [Swagger Editor](https://editor.swagger.io/).

---

## Recent Changes (SDK 54 Upgrade)

### Upgraded to Expo SDK 54

The project has been upgraded from SDK 52 to **SDK 54** with the following changes:

#### Dependencies Updated:
- **Expo:** `~52.0.0` → `~54.0.0`
- **React:** `18.3.1` → `19.1.0`
- **React Native:** `0.76.9` → `0.81.5`
- **expo-asset:** `~11.0.5` → `~12.0.12`
- **expo-status-bar:** `~2.0.0` → `~3.0.9`
- **react-native-maps:** `1.18.0` → `~1.20.1`
- **react-native-safe-area-context:** Added `~5.0.0` (replaces deprecated SafeAreaView)

#### Testing Setup:
- **@testing-library/react-native:** Updated to `^12.9.0`
- **jest-expo:** Updated to `~54.0.0`
- Added **@babel/plugin-transform-flow-strip-types** for Flow syntax support
- Added **patch-package** to fix React Native Testing Library compatibility

#### Code Changes:
- Updated test files to use `testID` queries instead of `getByRole`
- Added comprehensive Jest configuration for SDK 54

#### Patch-Package Fix:
- **Issue:** React Native Testing Library couldn't parse Flow syntax in React Native's internal files
- **Solution:** Created `patches/react-native+0.81.5.patch` to remove `const` keyword from Flow type parameters
- **Auto-application:** Patch is automatically applied via `postinstall` script after `npm install`

---

## Troubleshooting

### Patch-Package Errors

If you see patch-package errors during `npm install`:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. The patch should apply automatically

### Tests Failing with Flow Syntax Errors

If tests fail with "identifier expected in type parameter" errors:
1. Ensure `patches/react-native+0.81.5.patch` exists
2. Run `npm install` to apply the patch
3. If the patch doesn't apply, manually run: `npx patch-package react-native`

### Expo Go Issues

If the app doesn't load in Expo Go:
- Clear Expo Go cache: Shake device → "Reload"
- Restart Expo dev server: `npm start -- --clear`
- Ensure you're using the latest Expo Go app version

---
