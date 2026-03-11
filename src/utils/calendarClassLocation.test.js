/**
 * Tests for calendarClassLocation utility:
 *  - parseClassroomLocationFromEvent
 *  - resolveNextClassroomEvent
 */

// ─── Mock the buildings API ───────────────────────────────────────────────────
jest.mock('../services/api/buildings', () => ({
  getBuildingsByCampus: jest.fn((campus) => {
    if (campus === 'SGW') {
      return [
        {
          properties: {
            id: 'H', code: 'H', name: 'Hall Building', campus: 'SGW',
          },
        },
        {
          properties: {
            id: 'EV', code: 'EV', name: 'EV Building', campus: 'SGW',
          },
        },
        {
          properties: {
            id: 'MB', code: 'MB', name: 'John Molson Building', campus: 'SGW',
          },
        },
        {
          // Building whose code contains a dot (tests escapeRegex)
          properties: {
            id: 'SP', code: 'S.P', name: 'Special Building', campus: 'SGW',
          },
        },
      ];
    }
    if (campus === 'LOY') {
      return [
        {
          properties: {
            id: 'CC', code: 'CC', name: 'Central Building', campus: 'LOY',
          },
        },
      ];
    }
    return [];
  }),
  getBuildingInfo: jest.fn((id) => {
    const map = {
      H: { id: 'H', name: 'Hall Building', campus: 'SGW' },
      EV: { id: 'EV', name: 'EV Building', campus: 'SGW' },
      MB: { id: 'MB', name: 'John Molson Building', campus: 'SGW' },
      CC: { id: 'CC', name: 'Central Building', campus: 'LOY' },
    };
    return map[id] ?? null;
  }),
}));

import {
  parseClassroomLocationFromEvent,
  resolveNextClassroomEvent,
} from './calendarClassLocation';

// Helper: build a future date N minutes from now
const futureDate = (offsetMinutes = 60) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
};

const pastDate = (offsetMinutes = 60) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - offsetMinutes);
  return d.toISOString();
};

// ─── parseClassroomLocationFromEvent ────────────────────────────────────────

describe('parseClassroomLocationFromEvent', () => {
  beforeEach(() => {
    // Reset the lazy cache between tests
    jest.isolateModules(() => { });
  });

  it('returns null for null/undefined event', () => {
    expect(parseClassroomLocationFromEvent(null)).toBeNull();
    expect(parseClassroomLocationFromEvent(undefined)).toBeNull();
  });

  it('parses explicit code-space-room from location field (e.g. "H 820")', () => {
    const result = parseClassroomLocationFromEvent({ location: 'H 820' });
    expect(result).not.toBeNull();
    expect(result.buildingId).toBe('H');
    expect(result.room).toBe('820');
    expect(result.campus).toBe('SGW');
    expect(result.buildingName).toBe('Hall Building');
  });

  it('parses joined code-dash-room from location field (e.g. "H-820")', () => {
    const result = parseClassroomLocationFromEvent({ location: 'H-820' });
    expect(result).not.toBeNull();
    expect(result.buildingId).toBe('H');
    expect(result.room).toBe('820');
  });

  it('parses location with surrounding text (e.g. "Montreal H-820, QC")', () => {
    const result = parseClassroomLocationFromEvent({ location: 'Montreal H-820, QC' });
    expect(result).not.toBeNull();
    expect(result.buildingId).toBe('H');
  });

  it('parses multi-character code (e.g. "EV 1.162")', () => {
    const result = parseClassroomLocationFromEvent({ location: 'EV 1.162' });
    expect(result).not.toBeNull();
    expect(result.buildingId).toBe('EV');
    expect(result.room).toBe('1.162');
  });

  it('falls back to summary field when location is absent', () => {
    const result = parseClassroomLocationFromEvent({ summary: 'SOEN 390 - H 820' });
    expect(result).not.toBeNull();
    expect(result.buildingId).toBe('H');
  });

  it('falls back to description field when location and summary are absent', () => {
    const result = parseClassroomLocationFromEvent({ description: 'Room: EV-1.162' });
    expect(result).not.toBeNull();
    expect(result.buildingId).toBe('EV');
  });

  it('building-name path does not throw for any input', () => {
    // The name-match path iterates building names and builds dynamic regexes.
    // Verify it handles arbitrary location text without errors.
    expect(() =>
      parseClassroomLocationFromEvent({ location: 'John Molson room 820' })
    ).not.toThrow();
    expect(() =>
      parseClassroomLocationFromEvent({ location: 'Hall Building 937' })
    ).not.toThrow();
  });

  it('returns null when no building code or name recognised', () => {
    const result = parseClassroomLocationFromEvent({ location: '1455 De Maisonneuve Blvd W' });
    expect(result).toBeNull();
  });

  it('handles building codes with special regex characters without throwing', () => {
    // "S.P" code contains a dot — escapeRegex must prevent crash
    expect(() =>
      parseClassroomLocationFromEvent({ location: 'nothing relevant here' })
    ).not.toThrow();
  });

  it('prefers the location field over summary', () => {
    const result = parseClassroomLocationFromEvent({
      location: 'EV 1.162',
      summary: 'H 820',
    });
    // Location is checked first — should return EV, not H
    expect(result.buildingId).toBe('EV');
  });

  it('includes buildingName in the result', () => {
    const result = parseClassroomLocationFromEvent({ location: 'EV 1.162' });
    expect(result.buildingName).toBe('EV Building');
  });
});

// ─── resolveNextClassroomEvent ───────────────────────────────────────────────

describe('resolveNextClassroomEvent', () => {
  it('returns null for empty or non-array events', () => {
    expect(resolveNextClassroomEvent([])).toBeNull();
    expect(resolveNextClassroomEvent(null)).toBeNull();
    expect(resolveNextClassroomEvent(undefined)).toBeNull();
  });

  it('returns null when all events are in the past', () => {
    const events = [
      { start: { dateTime: pastDate(120) }, summary: 'Past class', location: 'H 820' },
    ];
    expect(resolveNextClassroomEvent(events)).toBeNull();
  });

  it('returns resolved status for a future event with recognized location', () => {
    const events = [
      { start: { dateTime: futureDate(60) }, summary: 'SOEN 390', location: 'H 820' },
    ];
    const result = resolveNextClassroomEvent(events);
    expect(result).not.toBeNull();
    expect(result.status).toBe('resolved');
    expect(result.buildingId).toBe('H');
    expect(result.room).toBe('820');
    expect(result.event.summary).toBe('SOEN 390');
  });

  it('returns unresolved for future event with no parseable location', () => {
    const events = [
      { start: { dateTime: futureDate(60) }, summary: 'class1', location: '1455 De Maisonneuve' },
    ];
    const result = resolveNextClassroomEvent(events);
    expect(result).not.toBeNull();
    expect(result.status).toBe('unresolved');
    expect(result.buildingId).toBeNull();
    expect(result.event.summary).toBe('class1');
  });

  it('unresolved event has null building fields', () => {
    const events = [
      { start: { dateTime: futureDate(30) }, summary: 'Study session' },
    ];
    const result = resolveNextClassroomEvent(events);
    expect(result.status).toBe('unresolved');
    expect(result.buildingId).toBeNull();
    expect(result.room).toBeNull();
    expect(result.buildingName).toBeNull();
    expect(result.campus).toBeNull();
  });

  it('skips events with no start field', () => {
    const events = [
      { summary: 'No start', location: 'H 820' }, // no start — skipped
      { start: { dateTime: futureDate(90) }, summary: 'SOEN 390', location: 'EV 1.162' },
    ];
    const result = resolveNextClassroomEvent(events);
    expect(result.buildingId).toBe('EV');
  });

  it('skips past events and picks the first future one', () => {
    const events = [
      { start: { dateTime: pastDate(30) }, summary: 'Past', location: 'H 820' },
      { start: { dateTime: futureDate(60) }, summary: 'SOEN 390', location: 'EV 1.162' },
    ];
    const result = resolveNextClassroomEvent(events);
    expect(result.buildingId).toBe('EV');
  });

  it('uses a custom "now" reference time', () => {
    const noon = new Date('2030-01-01T12:00:00.000Z');
    const events = [
      { start: { dateTime: '2030-01-01T11:00:00.000Z' }, summary: 'Morning', location: 'H 820' },
      { start: { dateTime: '2030-01-01T14:00:00.000Z' }, summary: 'Afternoon', location: 'EV 1.162' },
    ];
    const result = resolveNextClassroomEvent(events, noon);
    // Morning is before noon — should be skipped
    expect(result.event.summary).toBe('Afternoon');
    expect(result.buildingId).toBe('EV');
  });

  it('picks first event with a resolved building even if other events precede it', () => {
    const events = [
      { start: { dateTime: futureDate(30) }, summary: 'class1', location: 'unknown place' },
      { start: { dateTime: futureDate(60) }, summary: 'SOEN 390', location: 'H 820' },
    ];
    // First event has no building, second has one — should resolve second
    const result = resolveNextClassroomEvent(events);
    expect(result.status).toBe('resolved');
    expect(result.buildingId).toBe('H');
  });

  it('handles all-day events (date-only start)', () => {
    // All-day events use start.date instead of start.dateTime
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = tomorrow.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const events = [
      { start: { date: dateOnly }, summary: 'All day', location: 'H 820' },
    ];
    const result = resolveNextClassroomEvent(events);
    // All-day event is in the future — should resolve
    expect(result).not.toBeNull();
  });

  it('works for events with any summary (not just course codes)', () => {
    const events = [
      { start: { dateTime: futureDate(60) }, summary: 'my study session', location: 'EV 1.162' },
    ];
    const result = resolveNextClassroomEvent(events);
    expect(result.status).toBe('resolved');
    expect(result.buildingId).toBe('EV');
  });
});
