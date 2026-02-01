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
├── app.json               # Expo config
├── babel.config.js        # Babel configuration with Flow syntax support
├── jest.setup.js          # Jest setup for React Native Testing Library
├── patches/               # patch-package patches (auto-applied on install)
│   └── react-native+0.81.5.patch  # Fixes Flow syntax for RNTL compatibility
├── __mocks__/             # Jest mocks for native modules
│   ├── react-native-maps.js
│   ├── react-native-safe-area-context.js
│   └── ViewConfigIgnore.js
├── src/
│   ├── components/
│   │   └── MapView.js      # Campus map (react-native-maps)
│   └── constants/
│       └── campuses.js    # SGW/LOYOLA coordinates and list
└── .maestro/flows/        # Maestro E2E flows
```

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
- `App.test.js` - Tests for the main App component (campus tab switching)

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

## Next steps (from bid)

- Indoor shortest-path directions (multi-floor)
- Google Calendar API + Concordia Open Data (class schedules, locations)
- Node.js backend: shuttle timings, indoor POI data
- Accessibility routing and user acceptance testing on device
