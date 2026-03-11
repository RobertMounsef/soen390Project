/**
 * Parses classroom/building location information from a Google Calendar event.
 *
 * Tries fields in order: location → summary → description.
 * Matches patterns like: "EV 1.162", "H-937", "MB S2.285", "CC-110",
 * as well as joined forms "EV-1.162" and building-name keywords.
 */

import { getBuildingsByCampus, getBuildingInfo } from '../services/api/buildings';

// ─── Constants ────────────────────────────────────────────────────────────────

// Matches a class-code-style room number: optional letter prefix + digits + optional suffix
// e.g. "1.162", "S2.285", "937", "110", "A-201"
const ROOM_RE = /([A-Z]?\d[\dA-Z.-]{0,7})/i;

// Escape special regex characters in a building code before interpolating
// into new RegExp() — prevents crashes when codes contain . ( ) + etc.
const escapeRegex = (s) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

// Explicit "CODE ROOM" or "CODE-ROOM" separator
// e.g. "EV 1.162", "H-937", "MB S2.285"
const EXPLICIT_RE = (code) =>
  new RegExp(String.raw`\b${escapeRegex(code)}[\s-]+(${ROOM_RE.source})\b`, 'i');

// Joined "CODE-ROOM" (no space) e.g. "EV-1.162"
const JOINED_RE = (code) =>
  new RegExp(String.raw`\b${escapeRegex(code)}-([A-Z]?\d[\dA-Z.-]{0,7})\b`, 'i');

// Words that hint a room number follows nearby
const ROOM_HINT_RE = /\b(?:room|rm|salle|local|class(?:room)?)\b/i;

// ─── Building catalogue (lazy-loaded once) ────────────────────────────────────

let _allBuildings = null;

function getAllBuildings() {
  if (_allBuildings) return _allBuildings;
  const sgw = getBuildingsByCampus('SGW') || [];
  const loy = getBuildingsByCampus('LOY') || [];
  _allBuildings = [...sgw, ...loy].map((f) => f.properties).filter(Boolean);
  return _allBuildings;
}

// ─── Core parsing helpers ─────────────────────────────────────────────────────

/**
 * Try to extract a room number from text that appears near a building match.
 * "nearby" is the substring following the building code/name in the original text.
 */
function parseRoomFromNearbyText(nearby) {
  if (!nearby) return null;
  const trimmed = nearby.trim();

  // If a hint word precedes the number, trust it more
  if (ROOM_HINT_RE.test(trimmed)) {
    const hinted = /\b([A-Z]?\d[\dA-Z.-]{0,7})\b/i.exec(trimmed);
    return hinted ? hinted[1] : null;
  }

  // Otherwise accept the first standalone room-like token
  const m = ROOM_RE.exec(trimmed);
  return m ? m[1] : null;
}

/**
 * Try to parse a building + room from a single text string.
 * Returns { buildingId, room, campus, source } or null.
 */
function parseFromSingleText(text) {
  if (!text) return null;
  const normalized = text.trim();
  const buildings = getAllBuildings();

  for (const b of buildings) {
    const code = b.code || b.id;
    if (!code) continue;

    // 1. Explicit separator: "EV 1.162" or "H-937"
    const explicitMatch = EXPLICIT_RE(code).exec(normalized);
    if (explicitMatch) {
      return {
        buildingId: b.id,
        room: explicitMatch[1] || null,
        campus: b.campus,
        source: 'explicit-code',
      };
    }

    // 2. Joined no-space: "EV-1.162"
    const joinedMatch = JOINED_RE(code).exec(normalized);
    if (joinedMatch) {
      return {
        buildingId: b.id,
        room: joinedMatch[1] || null,
        campus: b.campus,
        source: 'joined-code-room',
      };
    }
  }

  // 3. Building name keyword match (e.g. "Hall Building room 820")
  for (const b of buildings) {
    const name = (b.name || '').toLowerCase();
    if (!name) continue;
    // Build a regex from the first 2+ significant words of the name
    const words = name.split(/\s+/).filter((w) => w.length > 2);
    if (words.length === 0) continue;
    const aliasPattern = words.slice(0, 3).map(escapeRegex).join(String.raw`\s+`);
    const aliasRegex = new RegExp(aliasPattern, 'i');
    const aliasMatch = aliasRegex.exec(normalized);
    if (aliasMatch) {
      const after = normalized.slice(aliasMatch.index + aliasMatch[0].length);
      const room = parseRoomFromNearbyText(after);
      return {
        buildingId: b.id,
        room,
        campus: b.campus,
        source: 'building-name',
      };
    }
  }

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a classroom location from a Google Calendar event object.
 * Tries event.location, event.summary, event.description in order.
 *
 * @param {{ summary?: string, location?: string, description?: string }} event
 * @returns {{ buildingId: string, room: string|null, campus: string, buildingName: string, source: string } | null}
 */
export function parseClassroomLocationFromEvent(event) {
  if (!event) return null;

  const fields = [event.location, event.summary, event.description];

  for (const field of fields) {
    if (!field) continue;
    const result = parseFromSingleText(field);
    if (result) {
      const info = getBuildingInfo(result.buildingId);
      return {
        ...result,
        buildingName: info?.name ?? result.buildingId,
      };
    }
  }

  return null;
}

/**
 * Given a sorted array of Google Calendar events, find the next one with a
 * recognizable Concordia building location. Falls back to the very next event
 * (with status 'unresolved') if none contain a parseable location.
 *
 * @param {Array} events - Sorted chronologically (soonest first)
 * @param {Date} [now]   - Reference time (defaults to Date.now())
 * @returns {{ status: string, event: object|null, buildingId: string|null, room: string|null, buildingName: string|null, campus: string|null } | null}
 *   Returns null if there are no future events at all.
 *   status can be: 'resolved' | 'unresolved'
 */
export function resolveNextClassroomEvent(events, now = new Date()) {
  if (!Array.isArray(events) || events.length === 0) return null;

  const nowMs = now instanceof Date ? now.getTime() : Date.now();

  // All future events (any name — not just class-code patterns)
  const futureEvents = events.filter((ev) => {
    const startStr = ev?.start?.dateTime || ev?.start?.date;
    if (!startStr) return false;
    return new Date(startStr).getTime() >= nowMs;
  });

  if (futureEvents.length === 0) return null;

  // Try each event in order; return the first one with a resolved building
  for (const ev of futureEvents) {
    const location = parseClassroomLocationFromEvent(ev);
    if (location) {
      return {
        status: 'resolved',
        event: ev,
        buildingId: location.buildingId,
        room: location.room,
        buildingName: location.buildingName,
        campus: location.campus,
      };
    }
  }

  // No event had a parseable location — return the soonest one as 'unresolved'
  return {
    status: 'unresolved',
    event: futureEvents[0],
    buildingId: null,
    room: null,
    buildingName: null,
    campus: null,
  };
}
