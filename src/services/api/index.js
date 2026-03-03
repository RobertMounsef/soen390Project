/**
 * ───────────────────────────────────────────────────────────────────────────
 * DESIGN PATTERN: Facade Pattern
 * ───────────────────────────────────────────────────────────────────────────
 * This barrel file acts as a unified entry point (facade) for the entire
 * data-access / service layer.  Every screen and hook imports from
 * '../services/api' rather than reaching into individual service files.
 *
 * Re-exported modules:
 *   • campuses  — getCampuses(), getCampusById()
 *   • buildings — getBuildings(), getBuildingsByCampus(), getBuildingInfo(),
 *                 getBuildingCoords()
 *   • shuttle   — isShuttleOperating(), getShuttleStop(),
 *                 getNextDepartures(), getNextDeparture()
 *
 * Benefits:
 *   • Simplified imports — one path for all data functions.
 *   • Decoupling — consumers don't know (or care about) the internal file
 *     structure of the services directory.
 *   • Maintainability — modules can be split, merged, or renamed without
 *     updating import paths across every screen.
 * ───────────────────────────────────────────────────────────────────────────
 */
export * from './campuses';
export * from './buildings';
export * from './shuttle';