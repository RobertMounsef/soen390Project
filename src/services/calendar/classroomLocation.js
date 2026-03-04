/**
 * Maps calendar event location text to campus building IDs.
 * Parses room numbers and building codes from event location, description, and summary
 * so the app can navigate to the correct building (SGW or Loyola).
 */

import { getAllBuildingIds, getBuildingInfo } from '../../data/buildingInfo';

/** Building codes sorted by length descending so longer codes match first (e.g. GNA before GN). */
const BUILDING_CODES = (() => {
  const ids = getAllBuildingIds();
  return [...ids].sort((a, b) => b.length - a.length);
})();

/** Common name fragments that map to building ID (for "Hall Building", "Molson", etc.). */
const NAME_ALIASES = [
  { pattern: /\bhall\s+building\b/i, id: 'H' },
  { pattern: /\bhenry\s+f\.?\s*hall\b/i, id: 'H' },
  { pattern: /\bhall\b/i, id: 'H' },
  { pattern: /\bmolson\b/i, id: 'MB' },
  { pattern: /\bmcconnell\b/i, id: 'LB' },
  { pattern: /\bgrey\s*nuns\b/i, id: 'GN' },
  { pattern: /\bengineering\s*(,\s*)?(computer\s*science|cs)\s*/i, id: 'EV' },
  { pattern: /\bengineering\b/i, id: 'EV' },
  { pattern: /\bvanier\s*library\b/i, id: 'VL' },
  { pattern: /\bvanier\b/i, id: 'VL' },
  { pattern: /\bpsychology\b/i, id: 'PY' },
  { pattern: /\bfaubourg\s*ste?-?catherine\b/i, id: 'FG' },
  { pattern: /\bfaubourg\b/i, id: 'FB' },
  { pattern: /\bvisual\s*arts\b/i, id: 'VA' },
  { pattern: /\bguydemaison(neuve)?\b/i, id: 'GM' },
  { pattern: /\bcentral\s*building\b/i, id: 'CC' },
  { pattern: /\badmin(istration)?\s*building\b/i, id: 'AD' },
  { pattern: /\bscience\s*complex\b/i, id: 'SP' },
  { pattern: /\bperform\s*centre\b/i, id: 'PC' },
  { pattern: /\bstudent\s*centre\b/i, id: 'SC' },
  { pattern: /\bjournalism\b/i, id: 'CJ' },
  { pattern: /\bhingston\b/i, id: 'HA' },
];

/**
 * Combine location-relevant fields from a calendar event into one searchable string.
 * @param {Object} event - Google Calendar event (summary, description, location)
 * @returns {string}
 */
export function getEventLocationText(event) {
  if (!event || typeof event !== 'object') return '';
  const parts = [
    event.location,
    event.description,
    event.summary,
  ].filter(Boolean).map((s) => String(s).trim());
  return parts.join(' ');
}

/**
 * Try to match a building code as a whole word, optionally followed by space/dash and room.
 * @param {string} text - Combined event text
 * @returns {string|null} Building ID or null
 */
function matchBuildingCode(text) {
  if (!text || text.length < 2) return null;
  for (const code of BUILDING_CODES) {
    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b(?:\\s*[-.]?\\s*[\\d.]*)?`, 'i');
    if (re.test(text)) {
      const info = getBuildingInfo(code);
      if (info) return code;
    }
  }
  return null;
}

/**
 * Try to match known building name aliases.
 * @param {string} text - Combined event text
 * @returns {string|null} Building ID or null
 */
function matchBuildingName(text) {
  if (!text) return null;
  for (const { pattern, id } of NAME_ALIASES) {
    if (pattern.test(text)) {
      const info = getBuildingInfo(id);
      if (info) return id;
    }
  }
  return null;
}

/**
 * Parse event location text and return the first matching building ID.
 * Handles formats like "EV 1.123", "Hall Building", "MB 2.101", "VL 101".
 * Works for both SGW and Loyola buildings.
 *
 * @param {Object} event - Google Calendar event (summary, description, location)
 * @returns {{ buildingId: string, matchedText?: string } | null} Building ID and optional matched snippet, or null
 */
export function parseEventLocation(event) {
  const text = getEventLocationText(event);
  if (!text) return null;

  const codeMatch = matchBuildingCode(text);
  if (codeMatch) return { buildingId: codeMatch, matchedText: codeMatch };

  const nameMatch = matchBuildingName(text);
  if (nameMatch) return { buildingId: nameMatch, matchedText: nameMatch };

  return null;
}
