# Project Restructuring Report

**Branch:** `fix/repo-structure`
**Date:** February 26, 2026

---

## 1. Motivation

The project had accumulated structural inconsistencies over several sprints:

- **Empty placeholder directories** added optimistically but never used.
- **Misplaced service module** — the Google Directions adapter lived inside `services/api/` alongside data-access functions, blurring the line between the Facade and Adapter patterns.
- **No code-level annotations** indicating where the three architecture-level design patterns (Component, Facade, Adapter) are implemented.

The goal was to clean up the structure to match the architecture described in [Section 4 of the wiki](../soen390Project.wiki/04.-Architecture.md) while:

- Changing **zero** core logic.
- Minimizing lines-of-code churn.
- Keeping all **260 existing tests passing**.

---

## 2. Changes Made

### 2.1 Removed Empty Directories

| Deleted | Reason |
|---------|--------|
| `src/constants/` | Empty — no constants were ever placed here. |
| `src/features/` | Empty — feature-based modules were never adopted. |
| `src/types/` | Empty — the project uses PropTypes, not TypeScript. |

### 2.2 Relocated the Directions Adapter

The wiki's architecture (Section 4.6 — Adapter Pattern) specifies the adapter at `src/services/routing/googleDirections.js`. The code was actually at `src/services/api/directions.js`.

| Action | Path |
|--------|------|
| **Created** | `src/services/routing/` (new directory) |
| **Moved** | `src/services/api/directions.js` → `src/services/routing/googleDirections.js` |
| **Moved** | `src/services/api/directions.test.js` → `src/services/routing/googleDirections.test.js` |

**Import updates** (4 files):

| File | Old import | New import |
|------|-----------|------------|
| `src/hooks/useDirections.js` | `../services/api/directions` | `../services/routing/googleDirections` |
| `src/hooks/useDirections.test.js` | `../services/api/directions` | `../services/routing/googleDirections` |
| `src/hooks/useShuttleDirections.js` | `../services/api/directions` | `../services/routing/googleDirections` |
| `src/hooks/useShuttleDirections.test.js` | `../services/api/directions` | `../services/routing/googleDirections` |

### 2.3 Added Design Pattern Annotations

Doc-block comments were added to the top of each file that implements a design pattern, making them easy to locate via search or code review.

| Pattern | File(s) | Comment header |
|---------|---------|----------------|
| **Component Pattern** | `src/components/MapView.js` | `DESIGN PATTERN: Component Pattern (React Native)` |
| **Component Pattern** | `src/components/BuildingInfoPopup.js` | `DESIGN PATTERN: Component Pattern (React Native)` |
| **Component Pattern** | `src/components/DirectionsPanel.js` | `DESIGN PATTERN: Component Pattern (React Native)` |
| **Facade Pattern** | `src/services/api/index.js` | `DESIGN PATTERN: Facade Pattern` |
| **Adapter Pattern** | `src/services/routing/googleDirections.js` | `DESIGN PATTERN: Adapter Pattern` |

---

## 3. Final Directory Structure

```
src/
├── app/
│   ├── App.js                      # Root app component
│   └── App.test.js
├── components/
│   ├── BuildingInfoPopup.js        # Component Pattern ✓
│   ├── BuildingInfoPopup.test.js
│   ├── DirectionsPanel.js          # Component Pattern ✓
│   ├── DirectionsPanel.test.js
│   ├── MapView.js                  # Component Pattern ✓
│   └── MapView.test.js
├── data/
│   ├── buildingInfo.js             # Static building detail data
│   ├── buildingInfo.test.js
│   ├── buildings.js                # GeoJSON building footprints
│   ├── buildings.test.js
│   ├── campuses.js                 # Campus coordinates & config
│   ├── loyola.json                 # Loyola GeoJSON polygons
│   ├── sgw.json                    # SGW GeoJSON polygons
│   ├── shuttleInfo.js              # Shuttle stops & schedules
│   └── shuttleInfo.test.js
├── hooks/
│   ├── useDirections.js            # Route-fetching hook
│   ├── useDirections.test.js
│   ├── useShuttleDirections.js     # Shuttle multi-leg route hook
│   ├── useShuttleDirections.test.js
│   ├── useUserLocation.js          # GPS / permission hook
│   └── useUserLocation.test.js
├── screens/
│   ├── MapScreen.js                # Main map screen
│   └── MapScreen.test.js
├── services/
│   ├── api/
│   │   ├── index.js                # Facade Pattern ✓
│   │   ├── index.test.js
│   │   ├── buildings.js            # Building data-access service
│   │   ├── buildings.test.js
│   │   ├── campuses.js             # Campus data-access service
│   │   ├── campuses.test.js
│   │   ├── shuttle.js              # Shuttle schedule service
│   │   └── shuttle.test.js
│   └── routing/
│       ├── googleDirections.js     # Adapter Pattern ✓
│       └── googleDirections.test.js
└── utils/
    ├── geolocation.js              # Point-in-polygon helpers
    └── geolocation.test.js
```

---

## 4. Design Patterns Summary

### 4.1 Component Pattern (Framework-specific)

**Where:** `src/components/MapView.js`, `BuildingInfoPopup.js`, `DirectionsPanel.js`

Reusable, self-contained React Native components that encapsulate their own state, rendering, and styling. They can be composed into any screen without duplicating logic.

### 4.2 Facade Pattern

**Where:** `src/services/api/index.js`

A single barrel file that re-exports all public data-access functions (`getCampuses`, `getBuildingInfo`, `getBuildingsByCampus`, `getBuildingCoords`, shuttle helpers). Screens import from `'../services/api'` — they never reach into individual service files.

### 4.3 Adapter Pattern

**Where:** `src/services/routing/googleDirections.js`

Transforms the raw Google Routes API v2 response (encoded polylines, nested transit details, HTML instructions) into the app's flat internal route format. The adapter can be swapped for another provider with zero changes to any consumer.

---

## 5. Verification

All **17 test suites** and **260 tests** pass after the restructuring:

```
PASS src/utils/geolocation.test.js
PASS src/services/routing/googleDirections.test.js
PASS src/hooks/useDirections.test.js
PASS src/data/buildings.test.js
PASS src/services/api/buildings.test.js
PASS src/data/buildingInfo.test.js
PASS src/data/shuttleInfo.test.js
PASS src/services/api/shuttle.test.js
PASS src/services/api/campuses.test.js
PASS src/hooks/useShuttleDirections.test.js
PASS src/services/api/index.test.js
PASS src/hooks/useUserLocation.test.js
PASS src/app/App.test.js
PASS src/components/MapView.test.js
PASS src/components/DirectionsPanel.test.js
PASS src/components/BuildingInfoPopup.test.js
PASS src/screens/MapScreen.test.js

Test Suites: 17 passed, 17 total
Tests:       260 passed, 260 total
```

No core logic was modified. All changes are structural (file moves, import updates, and comment additions).
