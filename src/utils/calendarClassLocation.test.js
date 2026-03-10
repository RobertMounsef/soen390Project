import {
  parseClassroomLocationFromEvent,
  resolveNextClassroomEvent,
} from './calendarClassLocation';

jest.mock('../services/api/buildings', () => ({
  getBuildingsByCampus: jest.fn((campus) => {
    if (campus === 'SGW') {
      return [
        { properties: { id: 'EV', code: 'EV', name: 'EV Building', campus: 'SGW' } },
        { properties: { id: 'H', code: 'H', name: 'Hall Building', campus: 'SGW' } },
        { properties: { id: 'MB', code: 'MB', name: 'John Molson Building', campus: 'SGW' } },
      ];
    }

    return [
      { properties: { id: 'CC', code: 'CC', name: 'Centennial Building', campus: 'LOY' } },
    ];
  }),
  getBuildingInfo: jest.fn((id) => {
    const map = {
      EV: { id: 'EV', code: 'EV', name: 'Engineering Building', campus: 'SGW' },
      H: { id: 'H', code: 'H', name: 'Henry F. Hall Building', campus: 'SGW' },
      MB: { id: 'MB', code: 'MB', name: 'John Molson Building', campus: 'SGW' },
      CC: { id: 'CC', code: 'CC', name: 'Centennial Building', campus: 'LOY' },
    };
    return map[id] || null;
  }),
}));

describe('calendar classroom parsing', () => {
  it('parses explicit code and room from location', () => {
    const result = parseClassroomLocationFromEvent({
      summary: 'SOEN 390 Lecture',
      location: 'EV 1.162',
    });

    expect(result.buildingId).toBe('EV');
    expect(result.room).toBe('1.162');
    expect(result.campus).toBe('SGW');
  });

  it('parses room from summary', () => {
    const result = parseClassroomLocationFromEvent({
      summary: 'COMP 346 - H-937',
    });

    expect(result.buildingId).toBe('H');
    expect(result.room).toBe('937');
  });

  it('parses Loyola class from description', () => {
    const result = parseClassroomLocationFromEvent({
      summary: 'BIOL 201',
      description: 'Class held at CC-110',
    });

    expect(result.buildingId).toBe('CC');
    expect(result.room).toBe('110');
    expect(result.campus).toBe('LOY');
  });

  it('returns next resolvable class event', () => {
    const events = [
      {
        id: '1',
        summary: 'Dentist Appointment',
        start: { dateTime: '2026-03-07T10:00:00.000Z' },
      },
      {
        id: '2',
        summary: 'SOEN 390 Lecture',
        location: 'MB S2.285',
        start: { dateTime: '2026-03-07T11:00:00.000Z' },
      },
    ];

    const result = resolveNextClassroomEvent(events, new Date('2026-03-07T09:00:00.000Z'));

    expect(result.status).toBe('resolved');
    expect(result.buildingId).toBe('MB');
    expect(result.room).toBe('S2.285');
  });

  it('returns unresolved when next class exists but room is unclear', () => {
    const events = [
      {
        id: '3',
        summary: 'SOEN 390 Lecture',
        description: 'See Moodle for details',
        start: { dateTime: '2026-03-07T12:00:00.000Z' },
      },
    ];

    const result = resolveNextClassroomEvent(events, new Date('2026-03-07T09:00:00.000Z'));

    expect(result.status).toBe('unresolved');
  });

  it('returns null when no future class events exist', () => {
    const events = [
      {
        id: '1',
        summary: 'Past Class',
        start: { dateTime: '2026-03-01T10:00:00.000Z' },
      },
      {
        id: '2',
        summary: 'Dentist Appointment', // Not a potential class event
        start: { dateTime: '2026-03-08T10:00:00.000Z' },
      },
    ];

    const result = resolveNextClassroomEvent(events, new Date('2026-03-07T09:00:00.000Z'));

    expect(result).toBeNull();
  });

  it('parses explicit joined code with no trailing room match', () => {
    // Tests `joinedMatch[1] || null` branch
    parseClassroomLocationFromEvent({
      summary: 'SOEN 390 Lecture',
      location: 'SGW-1.162',
    });
  });

  it('parses room using alias fallback (building-name)', () => {
    // This targets line 129-135 (`aliasRegex.exec(normalized)`)
    const result = parseClassroomLocationFromEvent({
      summary: 'Meeting at Hall Building room 820',
    });

    expect(result.buildingId).toBe('H');
    expect(result.room).toBe('820');
    expect(result.source).toBe('building-name');
  });

  it('handles room hint with no match gracefully', () => {
    // This targets line 81-88 (`ROOM_HINT_RE.test(nearby)`) where the hint exists ("classroom") but there's no room string that matches after it
    const result = parseClassroomLocationFromEvent({
      summary: 'Go to the John Molson Building classroom',
    });

    expect(result.buildingId).toBe('MB');
    expect(result.room).toBeNull(); // It should fallback to returning null for the room
    expect(result.source).toBe('building-name');
  });

  it('parses joined code with room successfully', () => {
    // Targets line 116 (if joinedMatch is found and joinedMatch[1] works)
    const result = parseClassroomLocationFromEvent({
      summary: 'Lecture EV-1.162'
    });

    expect(result.buildingId).toBe('EV');
    expect(result.room).toBe('1.162');
    expect(result.source).toBe('explicit-code');
  });
});
