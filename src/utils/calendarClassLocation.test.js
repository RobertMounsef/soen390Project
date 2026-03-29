/**
 * Tests for calendarClassLocation utility:
 *  - parseClassroomLocationFromEvent
 *  - resolveNextClassroomEvent
 *  - isPotentialClassEvent
 *  - getEventStartDate
 */

// ─── Mock the buildings API ───────────────────────────────────────────────────
jest.mock('../services/api/buildings', () => ({
  getBuildingsByCampus: jest.fn((campus) => {
    if (campus === 'SGW') {
      return [
        { properties: { id: 'H', code: 'H', name: 'Hall Building', campus: 'SGW' } },
        { properties: { id: 'EV', code: 'EV', name: 'EV Building', campus: 'SGW' } },
        { properties: { id: 'MB', code: 'MB', name: 'John Molson Building', campus: 'SGW' } },
        // Code with special regex char — tests escapeRegex
        { properties: { id: 'SP', code: 'S.P', name: 'Special Building', campus: 'SGW' } },
      ];
    }
    if (campus === 'LOY') {
      return [
        { properties: { id: 'CC', code: 'CC', name: 'Centennial Building', campus: 'LOY' } },
      ];
    }
    return [];
  }),
  getBuildingInfo: jest.fn((id) => {
    const map = {
      H: { id: 'H', code: 'H', name: 'Henry F. Hall Building', campus: 'SGW' },
      EV: { id: 'EV', code: 'EV', name: 'Engineering Building', campus: 'SGW' },
      MB: { id: 'MB', code: 'MB', name: 'John Molson Building', campus: 'SGW' },
      CC: { id: 'CC', code: 'CC', name: 'Centennial Building', campus: 'LOY' },
    };
    return map[id] ?? null;
  }),
}));

import {
  parseClassroomLocationFromEvent,
  resolveNextClassroomEvent,
  isPotentialClassEvent,
  getEventStartDate,
} from './calendarClassLocation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── parseClassroomLocationFromEvent ─────────────────────────────────────────

describe('parseClassroomLocationFromEvent', () => {
  it('returns null for null/undefined event', () => {
    expect(parseClassroomLocationFromEvent(null)).toBeNull();
    expect(parseClassroomLocationFromEvent(undefined)).toBeNull();
  });

  it('parses explicit code + room from location field (e.g. "H 820")', () => {
    const result = parseClassroomLocationFromEvent({ location: 'H 820' });
    expect(result).not.toBeNull();
    expect(result.buildingId).toBe('H');
    expect(result.room).toBe('820');
    expect(result.campus).toBe('SGW');
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
    expect(result.extractedFrom).toBe('summary');
  });

  it('falls back to description field when location and summary are absent', () => {
    const result = parseClassroomLocationFromEvent({ description: 'Room: EV-1.162' });
    expect(result).not.toBeNull();
    expect(result.buildingId).toBe('EV');
    expect(result.extractedFrom).toBe('description');
  });

  it('prefers the location field over summary', () => {
    const result = parseClassroomLocationFromEvent({ location: 'EV 1.162', summary: 'H 820' });
    expect(result.buildingId).toBe('EV');
    expect(result.extractedFrom).toBe('location');
  });

  it('returns null when no building code or name is recognised', () => {
    const result = parseClassroomLocationFromEvent({ location: '1455 De Maisonneuve Blvd W' });
    expect(result).toBeNull();
  });

  it('does not throw for building codes with special regex characters', () => {
    expect(() =>
      parseClassroomLocationFromEvent({ location: 'nothing relevant here' })
    ).not.toThrow();
  });

  it('building-name path does not throw for any input', () => {
    expect(() =>
      parseClassroomLocationFromEvent({ location: 'John Molson room 820' })
    ).not.toThrow();
    expect(() =>
      parseClassroomLocationFromEvent({ location: 'Hall Building 937' })
    ).not.toThrow();
  });

  it('parses Loyola class from description', () => {
    const result = parseClassroomLocationFromEvent({
      summary: 'BIOL 201',
      description: 'Class held at CC-110',
    });
    expect(result).not.toBeNull();
    expect(result.buildingId).toBe('CC');
    expect(result.room).toBe('110');
    expect(result.campus).toBe('LOY');
  });

  it('parses room using alias fallback (building-name) without throwing', () => {
    // The alias path must not throw even if no room is found
    expect(() =>
      parseClassroomLocationFromEvent({ summary: 'Meeting at Hall Building room 820' })
    ).not.toThrow();
  });

  it('parses joined code with room successfully', () => {
    const result = parseClassroomLocationFromEvent({ summary: 'Lecture EV-1.162' });
    expect(result).not.toBeNull();
    expect(result.buildingId).toBe('EV');
    expect(result.room).toBe('1.162');
  });

  it('handles room hint with no match gracefully', () => {
    expect(() =>
      parseClassroomLocationFromEvent({ summary: 'Go to the John Molson Building classroom' })
    ).not.toThrow();
  });
});

// ─── getEventStartDate ────────────────────────────────────────────────────────

describe('getEventStartDate', () => {
  it('parses dateTime events', () => {
    const d = getEventStartDate({ start: { dateTime: '2026-03-07T10:00:00.000Z' } });
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2026);
  });

  it('parses all-day (date-only) events', () => {
    const d = getEventStartDate({ start: { date: '2026-03-07' } });
    expect(d).toBeInstanceOf(Date);
  });

  it('returns null for missing start', () => {
    expect(getEventStartDate({})).toBeNull();
    expect(getEventStartDate(null)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(getEventStartDate({ start: { dateTime: 'not-a-date' } })).toBeNull();
  });
});

// ─── isPotentialClassEvent ────────────────────────────────────────────────────

describe('isPotentialClassEvent', () => {
  it('returns true for event with parseable building location', () => {
    expect(isPotentialClassEvent({ location: 'EV 1.162' })).toBe(true);
  });

  it('returns true for event with course code in summary', () => {
    expect(isPotentialClassEvent({ summary: 'SOEN 390 Lecture' })).toBe(true);
  });

  it('returns true for event with class keyword', () => {
    expect(isPotentialClassEvent({ summary: 'Weekly lecture' })).toBe(true);
  });

  it('returns false for an unrelated event', () => {
    expect(isPotentialClassEvent({ summary: 'Dentist Appointment', description: '' })).toBe(false);
  });
});

// ─── resolveNextClassroomEvent ────────────────────────────────────────────────

describe('resolveNextClassroomEvent', () => {
  it('returns null for empty or non-array events', () => {
    expect(resolveNextClassroomEvent([])).toBeNull();
    expect(resolveNextClassroomEvent(null)).toBeNull();
    expect(resolveNextClassroomEvent(undefined)).toBeNull();
  });

  it('returns null when all events are in the past', () => {
    const events = [
      { start: { dateTime: pastDate(120) }, summary: 'SOEN 390', location: 'H 820' },
    ];
    expect(resolveNextClassroomEvent(events)).toBeNull();
  });

  it('returns null when no future event is a potential class event', () => {
    const events = [
      { start: { dateTime: futureDate(60) }, summary: 'Dentist Appointment' },
    ];
    expect(resolveNextClassroomEvent(events)).toBeNull();
  });

  it('returns resolved status for a future event with recognized location', () => {
    const events = [
      { start: { dateTime: futureDate(60) }, summary: 'SOEN 390', location: 'EV 1.162' },
    ];
    const result = resolveNextClassroomEvent(events);
    expect(result).not.toBeNull();
    expect(result.status).toBe('resolved');
    expect(result.buildingId).toBe('EV');
    expect(result.room).toBe('1.162');
  });

  it('returns null when next potential class has no parseable location (skips it)', () => {
    const events = [
      {
        start: { dateTime: futureDate(60) },
        summary: 'SOEN 390',
        location: 'Online — see Moodle',
        description: 'See Moodle',
      },
    ];
    expect(resolveNextClassroomEvent(events)).toBeNull();
  });

  it('returns null when summary has a room but location field is empty', () => {
    const events = [
      { start: { dateTime: futureDate(60) }, summary: 'SOEN 390 - H 820' },
    ];
    expect(resolveNextClassroomEvent(events)).toBeNull();
  });

  it('skips future event without classroom and returns the next with a location', () => {
    const events = [
      {
        start: { dateTime: futureDate(30) },
        summary: 'Reading week — no class',
        description: 'Holiday',
      },
      { start: { dateTime: futureDate(90) }, summary: 'COMP 346', location: 'EV 1.162' },
    ];
    const result = resolveNextClassroomEvent(events);
    expect(result.status).toBe('resolved');
    expect(result.buildingId).toBe('EV');
    expect(result.event.summary).toBe('COMP 346');
  });

  it('skips past events and picks the first future potential class', () => {
    const events = [
      { start: { dateTime: pastDate(30) }, summary: 'SOEN 390', location: 'H 820' },
      { start: { dateTime: futureDate(60) }, summary: 'COMP 346', location: 'EV 1.162' },
    ];
    const result = resolveNextClassroomEvent(events);
    expect(result.buildingId).toBe('EV');
  });

  it('skips non-class future events to find the next class', () => {
    const events = [
      { start: { dateTime: futureDate(30) }, summary: 'Dentist Appointment' },
      { start: { dateTime: futureDate(60) }, summary: 'SOEN 390', location: 'MB S2.285' },
    ];
    const result = resolveNextClassroomEvent(events);
    expect(result.status).toBe('resolved');
    expect(result.buildingId).toBe('MB');
    expect(result.room).toBe('S2.285');
  });

  it('uses a custom now reference time', () => {
    const noon = new Date('2030-01-01T12:00:00.000Z');
    const events = [
      { start: { dateTime: '2030-01-01T11:00:00.000Z' }, summary: 'SOEN 390', location: 'H 820' },
      { start: { dateTime: '2030-01-01T14:00:00.000Z' }, summary: 'COMP 346', location: 'EV 1.162' },
    ];
    const result = resolveNextClassroomEvent(events, noon);
    expect(result.event.summary).toBe('COMP 346');
    expect(result.buildingId).toBe('EV');
  });
});
