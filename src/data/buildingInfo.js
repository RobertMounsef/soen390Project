/**
 * Building Information Data
 * Contains detailed information about all Concordia University buildings
 * including departments, facilities, accessibility features, and key services
 */

// Helper function to create default building info
const createBuildingInfo = (id, name, campus, overrides = {}) => ({
  id,
  name,
  campus,
  code: id,
  accessibility: {
    ramps: false,
    elevators: false,
    accessibleWashrooms: false,
    notes: '',
    ...overrides.accessibility,
  },
  keyServices: overrides.keyServices || [],
  departments: overrides.departments || [],
  facilities: overrides.facilities || [],
  description: overrides.description || '',
  address: overrides.address || '',
  hours: overrides.hours || '',
});

// SGW Campus Buildings
const SGW_BUILDINGS = {
  // Priority Buildings
  EV: createBuildingInfo(
    'EV',
    'Engineering, Computer Science and Visual Arts Integrated Complex',
    'SGW',
    {
      accessibility: {
        ramps: true,
        elevators: true,
        accessibleWashrooms: true,
        notes: 'Ramp & elevators',
      },
      keyServices: [
        'Student Service Centre',
        'Library Services',
        'Computer Labs',
        'Study Spaces',
      ],
      departments: [
        'Engineering Dept.',
        'Computer Science Dept.',
        'Visual Arts Dept.',
      ],
      facilities: [
        'Washrooms',
        'Water fountains',
        'Elevators',
        'Study rooms',
        'Computer labs',
      ],
      description: 'Modern integrated complex housing engineering, computer science, and visual arts programs.',
    }
  ),

  H: createBuildingInfo('H', 'Henry F. Hall Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: [
      'Registrar\'s Office',
      'Student Services',
      'Financial Aid',
      'Admissions',
    ],
    departments: [
      'Administration',
      'Student Affairs',
      'Enrollment Services',
    ],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Information desk',
    ],
    description: 'Main administrative building housing student services and enrollment offices.',
  }),

  MB: createBuildingInfo('MB', 'John Molson Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: [
      'Business Library',
      'Career Services',
      'Study Spaces',
    ],
    departments: [
      'John Molson School of Business',
      'Business Administration',
      'Accountancy',
      'Finance',
      'Management',
    ],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Classrooms',
      'Lecture halls',
    ],
    description: 'Home to the John Molson School of Business with modern facilities and study spaces.',
  }),

  LB: createBuildingInfo('LB', 'J.W. McConnell Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: [
      'Library Services',
      'Study Spaces',
      'Research Facilities',
    ],
    departments: [
      'Library',
      'Research Services',
    ],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Study rooms',
      'Computer labs',
    ],
    description: 'Main library building with extensive study spaces and research resources.',
  }),

  GM: createBuildingInfo('GM', 'Guy-De Maisonneuve Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: [
      'Student Services',
      'Study Spaces',
    ],
    departments: [
      'Arts & Science',
      'Humanities',
      'Social Sciences',
    ],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Classrooms',
    ],
    description: 'Academic building housing various arts and science departments.',
  }),

  // Additional Major Buildings
  GS: createBuildingInfo('GS', 'GS Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Classrooms'],
  }),

  TD: createBuildingInfo('TD', 'Toronto-Dominion Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Classrooms'],
  }),

  FB: createBuildingInfo('FB', 'Faubourg Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Classrooms'],
  }),

  FG: createBuildingInfo('FG', 'Faubourg Ste-Catherine Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Classrooms'],
  }),

  VA: createBuildingInfo('VA', 'Visual Arts Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    departments: ['Visual Arts', 'Fine Arts'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Art studios',
      'Exhibition spaces',
    ],
    description: 'Dedicated facility for visual arts programs with studios and exhibition spaces.',
  }),

  SB: createBuildingInfo('SB', 'Samuel Bronfman Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Classrooms'],
  }),

  ER: createBuildingInfo('ER', 'ER Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Engineering Labs', 'Research Facilities'],
    departments: ['Engineering'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Labs'],
  }),

  LD: createBuildingInfo('LD', 'LD Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Classrooms'],
  }),

  LS: createBuildingInfo('LS', 'Learning Square', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Study Spaces', 'Group Study Rooms'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Study spaces'],
  }),

  // Grey Nuns Complex
  GNA: createBuildingInfo('GNA', 'Grey Nuns Building - wing A', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Student Residence', 'Housing Services'],
    departments: ['Residence', 'Student Housing'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Residence rooms'],
  }),

  GNB: createBuildingInfo(
    'GNB',
    'Grey Nuns Building - wings B, C, D, E, F, G, P',
    'SGW',
    {
      accessibility: {
        ramps: true,
        elevators: true,
        accessibleWashrooms: true,
        notes: 'Ramp & elevators',
      },
      keyServices: ['Student Residence', 'Housing Services'],
      departments: ['Residence', 'Student Housing'],
      facilities: [
        'Washrooms',
        'Water fountains',
        'Elevators',
        'Residence rooms',
        'Common areas',
      ],
    }
  ),

  GNH: createBuildingInfo(
    'GNH',
    'Grey Nuns Building - wings H, I, J, K',
    'SGW',
    {
      accessibility: {
        ramps: true,
        elevators: true,
        accessibleWashrooms: true,
        notes: 'Ramp & elevators',
      },
      keyServices: ['Student Residence', 'Housing Services'],
      departments: ['Residence', 'Student Housing'],
      facilities: [
        'Washrooms',
        'Water fountains',
        'Elevators',
        'Residence rooms',
      ],
    }
  ),

  GN: createBuildingInfo('GN', 'Grey Nuns Building', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Student Residence', 'Housing Services'],
    departments: ['Residence', 'Student Housing'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Residence rooms',
      'Common areas',
    ],
    description: 'Historic residence building with multiple wings.',
    address: '1190 Guy St.',
  }),

  GA: createBuildingInfo('GA', 'Grey Nuns Annex', 'SGW', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Student Residence', 'Housing Services'],
    departments: ['Residence', 'Student Housing'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators'],
  }),

  // Annexes
  B: createBuildingInfo('B', 'B Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  CI: createBuildingInfo('CI', 'CI Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  CL: createBuildingInfo('CL', 'CL Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  D: createBuildingInfo('D', 'D Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  EN: createBuildingInfo('EN', 'EN Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  FA: createBuildingInfo('FA', 'FA Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  K: createBuildingInfo('K', 'K Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  M: createBuildingInfo('M', 'M Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  MI: createBuildingInfo('MI', 'MI Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  MU: createBuildingInfo('MU', 'MU Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  P: createBuildingInfo('P', 'P Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  PR: createBuildingInfo('PR', 'PR Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  Q: createBuildingInfo('Q', 'Q Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  R: createBuildingInfo('R', 'R Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  RR: createBuildingInfo('RR', 'RR Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  S: createBuildingInfo('S', 'S Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  T: createBuildingInfo('T', 'T Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  V: createBuildingInfo('V', 'V Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  X: createBuildingInfo('X', 'X Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  Z: createBuildingInfo('Z', 'Z Annex', 'SGW', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),
};

// Loyola Campus Buildings
const LOYOLA_BUILDINGS = {
  // Priority Buildings
  VL: createBuildingInfo('VL', 'Vanier Library Building', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: [
      'Library Services',
      'Study Spaces',
      'Research Facilities',
      'Computer Labs',
    ],
    departments: ['Library', 'Research Services'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Study rooms',
      'Computer labs',
    ],
    description: 'Main library building on Loyola campus with extensive study spaces.',
  }),

  PY: createBuildingInfo('PY', 'Psychology Building', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Research Labs', 'Study Spaces'],
    departments: [
      'Psychology Dept.',
      'Behavioural Neuroscience',
      'Clinical Psychology',
    ],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Research labs',
      'Classrooms',
    ],
    description: 'Dedicated facility for psychology programs and research.',
  }),

  SP: createBuildingInfo('SP', 'Richard J. Renaud Science Complex', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: [
      'Research Labs',
      'Study Spaces',
      'Science Facilities',
    ],
    departments: [
      'Biology Dept.',
      'Chemistry Dept.',
      'Physics Dept.',
      'Mathematics & Statistics',
    ],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Research labs',
      'Classrooms',
    ],
    description: 'State-of-the-art science complex housing multiple science departments.',
  }),

  // Additional Major Buildings
  AD: createBuildingInfo('AD', 'Administration Building', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Administrative Services', 'Student Services'],
    departments: ['Administration', 'Student Affairs'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Offices',
    ],
    description: 'Main administrative building on Loyola campus.',
  }),

  CC: createBuildingInfo('CC', 'Central Building', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Classrooms',
    ],
  }),

  SC: createBuildingInfo('SC', 'Student Centre', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: [
      'Student Services',
      'Cafeteria',
      'Study Spaces',
      'Student Organizations',
    ],
    departments: ['Student Life'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Food services',
      'Common areas',
    ],
    description: 'Central hub for student activities and services.',
  }),

  RA: createBuildingInfo('RA', 'Recreation and Athletics Complex', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: [
      'Fitness Centre',
      'Athletic Facilities',
      'Recreation Programs',
    ],
    departments: ['Athletics', 'Recreation'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Gymnasium',
      'Fitness equipment',
    ],
    description: 'Comprehensive athletic and recreation facility.',
  }),

  PC: createBuildingInfo('PC', 'PERFORM Centre', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: [
      'Performance Research',
      'Sports Medicine',
      'Fitness Facilities',
    ],
    departments: ['Health Sciences', 'Kinesiology'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Research labs',
      'Fitness facilities',
    ],
    description: 'State-of-the-art performance and health research centre.',
  }),

  PT: createBuildingInfo('PT', 'Oscar Peterson Concert Hall', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Concert Hall', 'Performance Venue'],
    departments: ['Music', 'Performing Arts'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Concert hall',
      'Practice rooms',
    ],
    description: 'Premier concert hall for musical performances.',
  }),

  FC: createBuildingInfo('FC', 'F.C. Smith Building', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Classrooms',
    ],
  }),

  GE: createBuildingInfo('GE', 'Centre for Structural and Functional Genomics', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Research Labs', 'Genomics Research'],
    departments: ['Biology', 'Genomics', 'Biochemistry'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Research labs',
    ],
    description: 'Advanced genomics research facility.',
  }),

  HU: createBuildingInfo('HU', 'Applied Science Hub', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Research Labs', 'Applied Science'],
    departments: ['Engineering', 'Applied Sciences'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Research labs',
      'Classrooms',
    ],
    description: 'Hub for applied science and engineering programs.',
  }),

  RF: createBuildingInfo('RF', 'Loyola Jesuit Hall and Conference Centre', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: [
      'Conference Facilities',
      'Meeting Rooms',
      'Event Spaces',
    ],
    departments: ['Administration'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Conference rooms',
    ],
    description: 'Conference and event facility.',
  }),

  TA: createBuildingInfo('TA', 'Terrebonne Building', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Classrooms',
    ],
  }),

  PS: createBuildingInfo('PS', 'Physical Services Building', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    departments: ['Facilities Management'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Offices'],
    description: 'Facilities and maintenance services building.',
  }),

  SH: createBuildingInfo('SH', 'Future Buildings Laboratory', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Ramp access',
    },
    keyServices: ['Sustainability Research', 'Building Science'],
    departments: ['Engineering', 'Sustainability'],
    facilities: ['Washrooms', 'Research labs'],
    description: 'Sustainable energy and building science research facility.',
  }),

  JR: createBuildingInfo('JR', 'Jesuit Residence', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    departments: ['Residence', 'Student Housing'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Residence rooms',
    ],
  }),

  CJ: createBuildingInfo('CJ', 'Communication Studies and Journalism Building', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Media Labs', 'Studios', 'Study Spaces'],
    departments: ['Communication Studies', 'Journalism'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Media labs', 'Recording studios'],
    description: 'Home to communication studies and journalism programs with media facilities.',
  }),

  // CJ Building Wings
  CJA: createBuildingInfo('CJA', 'CJ Building - wing A', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Classrooms',
    ],
  }),

  CJN: createBuildingInfo('CJN', 'CJ Building - wing N', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Classrooms',
    ],
  }),

  CJS: createBuildingInfo('CJS', 'CJ Building - wing S', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Classrooms',
    ],
  }),

  // Hingston Hall Wings
  HA: createBuildingInfo('HA', 'Hingston Hall, wing HA', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Student Residence', 'Housing Services'],
    departments: ['Residence', 'Student Housing'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Residence rooms',
    ],
  }),

  HB: createBuildingInfo('HB', 'Hingston Hall, wing HB', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Student Residence', 'Housing Services'],
    departments: ['Residence', 'Student Housing'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Residence rooms',
    ],
  }),

  HC: createBuildingInfo('HC', 'Hingston Hall, wing HC', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Student Residence', 'Housing Services'],
    departments: ['Residence', 'Student Housing'],
    facilities: [
      'Washrooms',
      'Water fountains',
      'Elevators',
      'Residence rooms',
    ],
  }),

  DO: createBuildingInfo('DO', 'Stinger Dome', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: false,
      accessibleWashrooms: true,
      notes: 'Ramp access',
    },
    keyServices: ['Athletic Facilities', 'Sports Events'],
    departments: ['Athletics', 'Recreation'],
    facilities: ['Washrooms', 'Sports field', 'Seating'],
    description: 'Indoor sports dome for athletic events and recreation.',
  }),

  QA: createBuildingInfo('QA', 'Quadrangle', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Outdoor space',
    },
    keyServices: ['Outdoor Space', 'Events'],
    facilities: ['Outdoor seating', 'Green space'],
    description: 'Central outdoor quadrangle for gatherings and events.',
  }),

  SI: createBuildingInfo('SI', 'St. Ignatius of Loyola Church', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: false,
      accessibleWashrooms: true,
      notes: 'Ramp access',
    },
    keyServices: ['Chapel Services', 'Spiritual Life'],
    departments: ['Campus Ministry'],
    facilities: ['Washrooms', 'Chapel', 'Meeting rooms'],
    description: 'Historic church providing spiritual services to the campus community.',
    address: '4455 West Broadway St.',
  }),

  VE: createBuildingInfo('VE', 'Vanier Extension', 'LOY', {
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Classrooms', 'Study Spaces'],
    departments: ['Arts & Science'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators', 'Classrooms'],
    description: 'Extension of the Vanier Library complex.',
  }),

  // Annexes
  BB: createBuildingInfo('BB', 'BB Annex', 'LOY', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),

  BH: createBuildingInfo('BH', 'BH Annex', 'LOY', {
    accessibility: {
      ramps: false,
      elevators: false,
      accessibleWashrooms: false,
      notes: 'Limited accessibility',
    },
    keyServices: ['Support Services'],
    departments: ['Support Services'],
    facilities: ['Washrooms'],
  }),
};

// Combined building information map
export const BUILDING_INFO = {
  ...SGW_BUILDINGS,
  ...LOYOLA_BUILDINGS,
};

// Helper function to get building info by ID
export const getBuildingInfo = (buildingId) => {
  return BUILDING_INFO[buildingId] || null;
};

// Get all building IDs
export const getAllBuildingIds = () => {
  return Object.keys(BUILDING_INFO);
};

// Get buildings by campus
export const getBuildingsByCampus = (campus) => {
  return Object.values(BUILDING_INFO).filter(
    (building) => building.campus === campus
  );
};
