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

### 3. (Optional) Google Calendar connection

To enable "Connect Google Calendar" in the app (OAuth2 for class schedule):

1. In [Google Cloud Console](https://console.cloud.google.com/), create OAuth 2.0 credentials: **APIs & Services → Credentials → Create credentials → OAuth client ID**. Choose **Web application**.
2. **Redirect URIs for Expo Go (shared repo):**  
   The app does **not** contain any username. In Expo Go, the redirect URI is `https://auth.expo.io/@EXPO_USERNAME/campus-guide`, where `EXPO_USERNAME` is the Expo account of the person running the app.  
   - **Add one redirect URI per tester** in your OAuth client: open the client → **Authorized redirect URIs** → add `https://auth.expo.io/@alice/campus-guide`, `https://auth.expo.io/@bob/campus-guide`, etc. (use each person’s Expo username).  
   - Google allows many URIs on one client, so the whole team can share the same Client ID.  
   - Do **not** use `campusguide://redirect` here: Google’s Web application client type only allows URIs with a public top-level domain (e.g. `.com`), so custom schemes are rejected.
3. Enable the **Google Calendar API** for your project (APIs & Services → Library → Google Calendar API).
4. Copy your **Client ID** into `.env` as `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your_client_id_here` (see `.env.example`). Everyone can use the same Client ID; only the redirect URIs in Google Console need to list each tester’s Expo username.

This app uses the OAuth **PKCE flow without a client_secret**, which is the recommended approach for native/mobile clients. If you later need to use a Web application client that requires a `client_secret`, do the code→token exchange on a backend API instead of shipping the secret in the mobile app.

Without this, the Calendar button still appears but connecting will show a configuration message.

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
    │   └── MapScreen.test.js # MapScreen tests
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
    │   └── geolocation.test.js   # Geolocation tests
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

**Prerequisites:** [Maestro CLI](https://maestro.mobile.dev/getting-started/installation), Xcode, and the app built for the iOS Simulator (not Expo Go — the flow uses `appId: com.debuggingdemons.campusguide`).

**1. Build and install the app on the simulator**

```bash
npx expo run:ios
```

Use the simulator that opens (or boot one via Xcode → Open Developer Tool → Simulator). Leave the app installed; you can close it.

**Simulator location (outdoor POI / “My Location” routes):** After the simulator is booted, pin the device near Concordia SGW so directions from the current location match campus POIs:

```bash
xcrun simctl location booted set 45.496953,-73.578809
```

The Maestro GitHub workflow runs this automatically before E2E tests.

**2. Run all flows**

```bash
maestro test .maestro/flows
```

**3. Run only the Epic 1 flow (campus maps + building popup)**

```bash
maestro test .maestro/flows/epic1-campus-maps-and-buildings.yaml
```

**4. Run only specific flows**

```bash
# US-1.3 – Campus switch (SGW ↔ LOY)
maestro test .maestro/flows/US1.3campus-switch.yaml

# Epic 2 – Route planning (US-2.1, US-2.3, US-2.4)
maestro test .maestro/flows/epic2-route-planning.yaml

# Epic 6 – US-6.2 Outdoor POI directions (tap POI → route from current location)
maestro test .maestro/flows/epic6-outdoor-poi-directions.yaml
```

**Automated (CI):** On every push/PR to `main` or `develop`, the [Maestro E2E (iOS)](.github/workflows/maestro-e2e.yml) workflow builds the app and runs **Epic 1** and **Epic 2** flows only. **Epic 6** (outdoor POI directions) is not in the CI suite until US-6.2 is officially in scope; run it locally with the command in step 4 above when needed.

---

## Documentation

- **RESTful API Design**: The system is designed with a RESTful architecture in mind. View the [Swagger/OpenAPI Spec](docs/swagger.yaml) for details on data structures and endpoints.
- **Visualization**: To visualize the API, copy the content of `docs/swagger.yaml` into the [Swagger Editor](https://editor.swagger.io/).

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
