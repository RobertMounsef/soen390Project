import { getBuildingsByCampus, getBuildingInfo } from '../services/api/buildings';

// Patterns used to identify likely class events and room references.
const COURSE_CODE_RE = /\b[A-Z]{3,4}\s?-?\d{3,4}\b/i;
const CLASS_WORD_RE = /\b(class|lecture|tutorial|lab|seminar|course|midterm|final|exam)\b/i;
const ROOM_HINT_RE = /\b(room|rm|classroom|local|salle)\b/i;
const ROOM_VALUE_RE = /([A-Z]?\d[\dA-Z.-]{0,7})/i;

// Normalize text to simplify name and alias matching.
function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Retrieve buildings from both campuses so the parser can match SGW and Loyola codes.
function getAllBuildings() {
  const sgw = getBuildingsByCampus('SGW') || [];
  const loy = getBuildingsByCampus('LOY') || [];
  return [...sgw, ...loy];
}

// Build lookup tables from the building dataset used elsewhere in the app.
function buildLookup() {
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
    const entry = {
      buildingId: id,
      code,
      name,
      campus,
    };

    byCode.set(code, entry);

    const aliasValues = new Set([
      normalize(code),
      normalize(id),
      normalize(name),
      normalize(name).replace(/\b(building|campus|complex|centre|center|pavilion)\b/g, '').trim(),
    ]);

    aliasValues.forEach((alias) => {
      if (alias && alias.length >= 2) {
        aliases.push([alias, entry]);
      }
    });
  }

  aliases.sort((a, b) => b[0].length - a[0].length);

  return { byCode, aliases };
}

function parseRoomFromNearbyText(raw, startIndex, matchedLength) {
  const afterMatch = raw.slice(startIndex + matchedLength, startIndex + matchedLength + 24);
  const nearby = `${raw.slice(Math.max(0, startIndex - 10), startIndex + matchedLength)} ${afterMatch}`.trim();

  const directRoomMatch = afterMatch.match(/^\s*[-,:]?\s*([A-Z]?\d[\dA-Z.-]{0,7})/i);
  if (directRoomMatch) {
    return directRoomMatch[1];
  }

  if (ROOM_HINT_RE.test(nearby)) {
    const hintedRoomMatch = nearby.match(ROOM_VALUE_RE);
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

  // Prefer explicit building code matches like "EV 1.162" or "CC-110".
  for (const [code, building] of lookup.byCode.entries()) {
    const codePattern = escapeRegex(code);
    const explicitCodeRegex = new RegExp(`\\b${codePattern}\\b`, 'i');
    const codeMatch = explicitCodeRegex.exec(raw);

    if (codeMatch) {
      const room = parseRoomFromNearbyText(raw, codeMatch.index, codeMatch[0].length);
      return {
        ...building,
        room,
        matchedText: codeMatch[0],
        source: 'explicit-code',
      };
    }

    const joinedPattern = new RegExp(`\\b${codePattern}-([A-Z]?\\d[\\dA-Z.-]{0,7})\\b`, 'i');
    const joinedMatch = joinedPattern.exec(raw);
    if (joinedMatch) {
      return {
        ...building,
        room: joinedMatch[1] || null,
        matchedText: joinedMatch[0],
        source: 'joined-code-room',
      };
    }
  }

  // Fall back to matching building names and aliases like "Hall Building room 820".
  for (const [alias, building] of lookup.aliases) {
    if (!normalized.includes(alias)) continue;

    const aliasRegex = new RegExp(escapeRegex(alias), 'i');
    const aliasMatch = aliasRegex.exec(normalized);
    const room = aliasMatch
      ? parseRoomFromNearbyText(raw, Math.max(0, aliasMatch.index), aliasMatch[0].length)
      : null;

    return {
      ...building,
      room,
      matchedText: alias,
      source: 'building-name',
    };
  }

  return null;
}

// Parse classroom location from the main event fields in order of reliability.
export function parseClassroomLocationFromEvent(event) {
  const lookup = buildLookup();

  const locationResult = parseFromSingleText(event?.location, lookup);
  if (locationResult) {
    return {
      ...locationResult,
      extractedFrom: 'location',
    };
  }

  const summaryResult = parseFromSingleText(event?.summary, lookup);
  if (summaryResult) {
    return {
      ...summaryResult,
      extractedFrom: 'summary',
    };
  }

  const descriptionResult = parseFromSingleText(event?.description, lookup);
  if (descriptionResult) {
    return {
      ...descriptionResult,
      extractedFrom: 'description',
    };
  }

  return null;
}

// Determine if an event looks like a class even when the location is incomplete.
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

// Extract the event start time so events can be sorted chronologically.
export function getEventStartDate(event) {
  const raw = event?.start?.dateTime || event?.start?.date;
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Identify the next upcoming class and resolve its building information if possible.
export function resolveNextClassroomEvent(events, now = new Date()) {
  const futureEvents = [...(events || [])]
    .filter((event) => {
      const start = getEventStartDate(event);
      return start && start.getTime() >= now.getTime();
    })
    .sort((a, b) => getEventStartDate(a).getTime() - getEventStartDate(b).getTime());

  for (const event of futureEvents) {
    if (!isPotentialClassEvent(event)) {
      continue;
    }

    const parsed = parseClassroomLocationFromEvent(event);

    if (parsed) {
      return {
        status: 'resolved',
        event,
        ...parsed,
      };
    }

    return {
      status: 'unresolved',
      event,
      reason: 'The next class event was found, but the classroom location could not be determined.',
    };
  }

  return null;
}
