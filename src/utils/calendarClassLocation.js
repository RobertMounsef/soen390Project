/**
 * Parses classroom/building location information from a Google Calendar event.
 *
 * Tries fields in order: location → summary → description.
 * Matches patterns like: "EV 1.162", "H-937", "MB S2.285", "CC-110",
 * as well as joined forms "EV-1.162" and building-name keywords.
 */

import { getBuildingsByCampus, getBuildingInfo } from '../services/api/buildings';

// ─── Regex patterns ────────────────────────────────────────────────────────────

// Patterns used to identify likely class events and room references.
const COURSE_CODE_RE = /\b[A-Z]{3,4}\s?-?\d{3,4}\b/i;
const CLASS_WORD_RE = /\b(class|lecture|tutorial|lab|seminar|course|midterm|final|exam)\b/i;
const ROOM_HINT_RE = /\b(room|rm|classroom|local|salle)\b/i;
const ROOM_VALUE_RE = /([A-Z]?\d[\dA-Z.-]{0,7})/i;

// ─── Utilities ────────────────────────────────────────────────────────────────

// Normalize text to simplify name and alias matching.
function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

// Escape special regex characters in a building code before interpolating
// into new RegExp() — prevents crashes when codes contain . ( ) + etc.
function escapeRegex(value = '') {
  return String(value).replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

// ─── Building catalogue ───────────────────────────────────────────────────────

// Retrieve buildings from both campuses so the parser can match SGW and Loyola codes.
function getAllBuildings() {
  const sgw = getBuildingsByCampus('SGW') || [];
  const loy = getBuildingsByCampus('LOY') || [];
  return [...sgw, ...loy];
}

// Lazily computed lookup — built once and cached at module level to avoid
// rebuilding the map on every call to parseClassroomLocationFromEvent.
let _cachedLookup = null;

function buildLookup() {
  if (_cachedLookup) return _cachedLookup;

  const allBuildings = getAllBuildings();
  const byCode = new Map();
  const aliases = [];

  for (const feature of allBuildings) {
    const props = feature?.properties || {};
    const id = props.id;
    if (!id) continue;

    const info = getBuildingInfo(id) || {};
    const code = String(props.code || info.code || id).toUpperCase();
    const name = props.name || info.name || id;
    const campus = info.campus || props.campus || null;
    const entry = { buildingId: id, code, name, campus };

    byCode.set(code, entry);

    const aliasValues = new Set([
      normalize(code),
      normalize(id),
      normalize(name),
      normalize(name)
        .replaceAll(/\b(building|campus|complex|centre|center|pavilion)\b/g, '')
        .trim(),
    ]);

    aliasValues.forEach((alias) => {
      if (alias && alias.length >= 2) {
        aliases.push([alias, entry]);
      }
    });
  }

  // Longest alias first so specific matches win over short ones
  aliases.sort((a, b) => b[0].length - a[0].length);

  _cachedLookup = { byCode, aliases };
  return _cachedLookup;
}

// ─── Core parsing helpers ─────────────────────────────────────────────────────

function parseRoomFromNearbyText(raw, startIndex, matchedLength) {
  const afterMatch = raw.slice(startIndex + matchedLength, startIndex + matchedLength + 24);
  const nearby = `${raw.slice(Math.max(0, startIndex - 10), startIndex + matchedLength)} ${afterMatch}`.trim();

  const directRoomMatch = afterMatch.match(/^\s*(?:[-,:]\s*)?([A-Z]?\d[\dA-Z.-]{0,7})/i);
  if (directRoomMatch) {
    return directRoomMatch[1];
  }

  if (ROOM_HINT_RE.test(nearby)) {
    const hintedRoomMatch = ROOM_VALUE_RE.exec(nearby);
    if (hintedRoomMatch) {
      return hintedRoomMatch[1];
    }
  }

  return null;
}

function parseFromSingleText(text, lookup) {
  if (!text) return null;

  const raw = String(text);
  const normalized = normalize(raw);

  // 1. Explicit building code match with adjacent room: "EV 1.162" or "EV-1.162"
  for (const [code, building] of lookup.byCode.entries()) {
    const codePattern = escapeRegex(code);

    const explicitCodeRegex = new RegExp(String.raw`\b${codePattern}\b`, 'i');
    const codeMatch = explicitCodeRegex.exec(raw);
    if (codeMatch) {
      const room = parseRoomFromNearbyText(raw, codeMatch.index, codeMatch[0].length);
      return { ...building, room, matchedText: codeMatch[0], source: 'explicit-code' };
    }


  }

  // 2. Building name / alias match (e.g. "Hall Building room 820")
  for (const [alias, building] of lookup.aliases) {
    if (!normalized.includes(alias)) continue;

    const aliasRegex = new RegExp(escapeRegex(alias), 'i');
    const aliasMatch = aliasRegex.exec(normalized);
    const room = aliasMatch
      ? parseRoomFromNearbyText(raw, Math.max(0, aliasMatch.index), aliasMatch[0].length)
      : null;

    return { ...building, room, matchedText: alias, source: 'building-name' };
  }

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a classroom location from a Google Calendar event object.
 * Tries event.location, event.summary, event.description in order.
 *
 * @param {{ summary?: string, location?: string, description?: string }} event
 * @returns {{ buildingId, room, campus, name, source, extractedFrom } | null}
 */
export function parseClassroomLocationFromEvent(event) {
  if (!event) return null;

  const lookup = buildLookup();

  const locationResult = parseFromSingleText(event.location, lookup);
  if (locationResult) return { ...locationResult, extractedFrom: 'location' };

  const summaryResult = parseFromSingleText(event.summary, lookup);
  if (summaryResult) return { ...summaryResult, extractedFrom: 'summary' };

  const descriptionResult = parseFromSingleText(event.description, lookup);
  if (descriptionResult) return { ...descriptionResult, extractedFrom: 'description' };

  return null;
}

/**
 * Determine if an event looks like a class event (has a parseable location,
 * a course code, or a class keyword).
 *
 * @param {object} event
 * @returns {boolean}
 */
export function isPotentialClassEvent(event) {
  const summary = event?.summary || '';
  const description = event?.description || '';
  const location = event?.location || '';
  const combined = `${summary} ${description} ${location}`;

  return (
    !!parseClassroomLocationFromEvent(event) ||
    COURSE_CODE_RE.test(combined) ||
    CLASS_WORD_RE.test(combined)
  );
}

/**
 * Extract the event start time as a Date, supporting both dateTime and date-only formats.
 *
 * @param {object} event
 * @returns {Date|null}
 */
export function getEventStartDate(event) {
  const raw = event?.start?.dateTime || event?.start?.date;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Given an array of Google Calendar events, find the next potential class
 * with a recognizable Concordia building location (status: 'resolved').
 * Events without a non-empty Google Calendar "location" are ignored (many
 * holidays use a title only). Events with a location but no parseable room
 * are skipped so a mappable class can be shown instead.
 *
 * @param {Array} events
 * @param {Date} [now] - Reference time (defaults to now)
 * @returns {{ status: 'resolved', event: object, buildingId: string, room?: string|null, campus?: string|null, name?: string } | null}
 */
export function resolveNextClassroomEvent(events, now = new Date()) {
  const futureEvents = [...(events || [])]
    .filter((event) => {
      const start = getEventStartDate(event);
      return start && start.getTime() >= now.getTime();
    })
    .sort((a, b) => getEventStartDate(a).getTime() - getEventStartDate(b).getTime());

  for (const event of futureEvents) {
    if (!String(event?.location ?? '').trim()) continue;

    if (!isPotentialClassEvent(event)) continue;

    const parsed = parseClassroomLocationFromEvent(event);
    if (!parsed) continue;

    return { status: 'resolved', event, ...parsed };
  }

  return null;
}
