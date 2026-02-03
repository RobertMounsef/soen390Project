/**
 * Building footprints for SGW and Loyola campuses.
 * Each building is represented as a Point (we'll use point buffering for visualization).
 * Format: GeoJSON FeatureCollection
 */

import SGW_DATA from './sgw.json';
import LOYOLA_DATA from './loyola.json';

const RAW_POINTS = [
    { type: 'Feature', properties: { id: 'AD', name: 'Administration Building', campus: 'LOY', code: 'AD' }, geometry: { type: 'Point', coordinates: [-73.639834, 45.457984] } },
    { type: 'Feature', properties: { id: 'B', name: 'B Annex', campus: 'SGW', code: 'B' }, geometry: { type: 'Point', coordinates: [-73.579588, 45.497856] } },
    { type: 'Feature', properties: { id: 'BB', name: 'BB-BH Annex', campus: 'LOY', code: 'BB' }, geometry: { type: 'Point', coordinates: [-73.639174, 45.459793] } },
    { type: 'Feature', properties: { id: 'BH', name: 'BB-BH Annex', campus: 'LOY', code: 'BH' }, geometry: { type: 'Point', coordinates: [-73.639152, 45.459819] } },
    { type: 'Feature', properties: { id: 'CC', name: 'Central Building', campus: 'LOY', code: 'CC' }, geometry: { type: 'Point', coordinates: [-73.640300, 45.458204] } },
    { type: 'Feature', properties: { id: 'CI', name: 'CI Annex', campus: 'SGW', code: 'CI' }, geometry: { type: 'Point', coordinates: [-73.579925, 45.497467] } },
    { type: 'Feature', properties: { id: 'CJA', name: 'CJ Building - wing A', campus: 'LOY', code: 'CJA' }, geometry: { type: 'Point', coordinates: [-73.640354, 45.457478] } },
    { type: 'Feature', properties: { id: 'CJN', name: 'CJ Building - wing N', campus: 'LOY', code: 'CJN' }, geometry: { type: 'Point', coordinates: [-73.640354, 45.457478] } },
    { type: 'Feature', properties: { id: 'CJS', name: 'CJ Building - wing S', campus: 'LOY', code: 'CJS' }, geometry: { type: 'Point', coordinates: [-73.640354, 45.457478] } },
    { type: 'Feature', properties: { id: 'CL', name: 'CL Annex', campus: 'SGW', code: 'CL' }, geometry: { type: 'Point', coordinates: [-73.579007, 45.494259] } },
    { type: 'Feature', properties: { id: 'D', name: 'D Annex', campus: 'SGW', code: 'D' }, geometry: { type: 'Point', coordinates: [-73.579409, 45.497827] } },
    { type: 'Feature', properties: { id: 'EN', name: 'EN Annex', campus: 'SGW', code: 'EN' }, geometry: { type: 'Point', coordinates: [-73.579555, 45.496944] } },
    { type: 'Feature', properties: { id: 'ER', name: 'ER Building', campus: 'SGW', code: 'ER' }, geometry: { type: 'Point', coordinates: [-73.579990, 45.496428] } },
    { type: 'Feature', properties: { id: 'EV', name: 'Engineering, Computer Science and Visual Arts Integrated Complex', campus: 'SGW', code: 'EV' }, geometry: { type: 'Point', coordinates: [-73.577997, 45.495376] } },
    { type: 'Feature', properties: { id: 'FA', name: 'FA Annex', campus: 'SGW', code: 'FA' }, geometry: { type: 'Point', coordinates: [-73.579468, 45.496874] } },
    { type: 'Feature', properties: { id: 'FB', name: 'Faubourg Building', campus: 'SGW', code: 'FB' }, geometry: { type: 'Point', coordinates: [-73.577603, 45.494666] } },
    { type: 'Feature', properties: { id: 'FC', name: 'F.C. Smith Building', campus: 'LOY', code: 'FC' }, geometry: { type: 'Point', coordinates: [-73.639287, 45.458493] } },
    { type: 'Feature', properties: { id: 'FG', name: 'Faubourg Ste-Catherine Building', campus: 'SGW', code: 'FG' }, geometry: { type: 'Point', coordinates: [-73.578425, 45.494381] } },
    { type: 'Feature', properties: { id: 'GA', name: 'Grey Nuns Annex', campus: 'SGW', code: 'GA' }, geometry: { type: 'Point', coordinates: [-73.577870, 45.494123] } },
    { type: 'Feature', properties: { id: 'GE', name: 'Centre for Structural and Functional Genomics', campus: 'LOY', code: 'GE' }, geometry: { type: 'Point', coordinates: [-73.640432, 45.457017] } },
    { type: 'Feature', properties: { id: 'GM', name: 'Guy-De Maisonneuve Building', campus: 'SGW', code: 'GM' }, geometry: { type: 'Point', coordinates: [-73.578824, 45.495983] } },
    { type: 'Feature', properties: { id: 'GNA', name: 'Grey Nuns Building - wing A', campus: 'SGW', code: 'GNA' }, geometry: { type: 'Point', coordinates: [-73.577003, 45.493622] } },
    { type: 'Feature', properties: { id: 'GNB', name: 'Grey Nuns Building - wings B, C, D, E, F, G, P', campus: 'SGW', code: 'GNB' }, geometry: { type: 'Point', coordinates: [-73.577003, 45.493622] } },
    { type: 'Feature', properties: { id: 'GNH', name: 'Grey Nuns Building - wings H, I, J, K', campus: 'SGW', code: 'GNH' }, geometry: { type: 'Point', coordinates: [-73.577003, 45.493622] } },
    { type: 'Feature', properties: { id: 'GNL', name: 'Grey Nuns Building - wings L, M, N', campus: 'SGW', code: 'GNL' }, geometry: { type: 'Point', coordinates: [-73.577003, 45.493622] } },
    { type: 'Feature', properties: { id: 'GS', name: 'Guy-Sherbrooke Building', campus: 'SGW', code: 'GS' }, geometry: { type: 'Point', coordinates: [-73.581409, 45.496673] } },
    { type: 'Feature', properties: { id: 'H', name: 'Henry F. Hall Building', campus: 'SGW', code: 'H' }, geometry: { type: 'Point', coordinates: [-73.578800, 45.497092] } },
    { type: 'Feature', properties: { id: 'HA', name: 'Hingston Hall, wing HA', campus: 'LOY', code: 'HA' }, geometry: { type: 'Point', coordinates: [-73.641270, 45.459356] } },
    { type: 'Feature', properties: { id: 'HB', name: 'Hingston Hall, wing HB', campus: 'LOY', code: 'HB' }, geometry: { type: 'Point', coordinates: [-73.641849, 45.459308] } },
    { type: 'Feature', properties: { id: 'HC', name: 'Hingston Hall, wing HC', campus: 'LOY', code: 'HC' }, geometry: { type: 'Point', coordinates: [-73.642080, 45.459663] } },
    { type: 'Feature', properties: { id: 'HU', name: 'Applied Science Hub', campus: 'LOY', code: 'HU' }, geometry: { type: 'Point', coordinates: [-73.641921, 45.458513] } },
    { type: 'Feature', properties: { id: 'JR', name: 'Jesuit Residence', campus: 'LOY', code: 'JR' }, geometry: { type: 'Point', coordinates: [-73.643235, 45.458432] } },
    { type: 'Feature', properties: { id: 'K', name: 'K Annex', campus: 'SGW', code: 'K' }, geometry: { type: 'Point', coordinates: [-73.579531, 45.497777] } },
    { type: 'Feature', properties: { id: 'LS', name: 'Learning Square', campus: 'SGW', code: 'LS' }, geometry: { type: 'Point', coordinates: [-73.579444, 45.496265] } },
    { type: 'Feature', properties: { id: 'LB', name: 'J.W. McConnell Building', campus: 'SGW', code: 'LB' }, geometry: { type: 'Point', coordinates: [-73.578009, 45.497050] } },
    { type: 'Feature', properties: { id: 'LD', name: 'LD Building', campus: 'SGW', code: 'LD' }, geometry: { type: 'Point', coordinates: [-73.577312, 45.496697] } },
    { type: 'Feature', properties: { id: 'M', name: 'M Annex', campus: 'SGW', code: 'M' }, geometry: { type: 'Point', coordinates: [-73.579777, 45.497368] } },
    { type: 'Feature', properties: { id: 'MB', name: 'John Molson Building', campus: 'SGW', code: 'MB' }, geometry: { type: 'Point', coordinates: [-73.579044, 45.495304] } },
    { type: 'Feature', properties: { id: 'MI', name: 'MI Annex', campus: 'SGW', code: 'MI' }, geometry: { type: 'Point', coordinates: [-73.579261, 45.497807] } },
    { type: 'Feature', properties: { id: 'MU', name: 'MU Annex', campus: 'SGW', code: 'MU' }, geometry: { type: 'Point', coordinates: [-73.579506, 45.497963] } },
    { type: 'Feature', properties: { id: 'P', name: 'P Annex', campus: 'SGW', code: 'P' }, geometry: { type: 'Point', coordinates: [-73.579113, 45.496745] } },
    { type: 'Feature', properties: { id: 'PC', name: 'PERFORM centre', campus: 'LOY', code: 'PC' }, geometry: { type: 'Point', coordinates: [-73.637683, 45.457088] } },
    { type: 'Feature', properties: { id: 'PR', name: 'PR Annex', campus: 'SGW', code: 'PR' }, geometry: { type: 'Point', coordinates: [-73.579790, 45.497066] } },
    { type: 'Feature', properties: { id: 'PS', name: 'Physical Services Building', campus: 'LOY', code: 'PS' }, geometry: { type: 'Point', coordinates: [-73.639758, 45.459636] } },
    { type: 'Feature', properties: { id: 'PT', name: 'Oscar Peterson Concert Hall', campus: 'LOY', code: 'PT' }, geometry: { type: 'Point', coordinates: [-73.638941, 45.459308] } },
    { type: 'Feature', properties: { id: 'PY', name: 'Psychology Building', campus: 'LOY', code: 'PY' }, geometry: { type: 'Point', coordinates: [-73.640467, 45.458938] } },
    { type: 'Feature', properties: { id: 'Q', name: 'Q Annex', campus: 'SGW', code: 'Q' }, geometry: { type: 'Point', coordinates: [-73.579094, 45.496648] } },
    { type: 'Feature', properties: { id: 'R', name: 'R Annex', campus: 'SGW', code: 'R' }, geometry: { type: 'Point', coordinates: [-73.579389, 45.496826] } },
    { type: 'Feature', properties: { id: 'RA', name: 'Recreation and Athletics Complex', campus: 'LOY', code: 'RA' }, geometry: { type: 'Point', coordinates: [-73.637610, 45.456774] } },
    { type: 'Feature', properties: { id: 'RF', name: 'Loyola Jesuit Hall and Conference Centre', campus: 'LOY', code: 'RF' }, geometry: { type: 'Point', coordinates: [-73.641028, 45.458489] } },
    { type: 'Feature', properties: { id: 'RR', name: 'RR Annex', campus: 'SGW', code: 'RR' }, geometry: { type: 'Point', coordinates: [-73.579259, 45.496796] } },
    { type: 'Feature', properties: { id: 'S', name: 'S Annex', campus: 'SGW', code: 'S' }, geometry: { type: 'Point', coordinates: [-73.579851, 45.497423] } },
    { type: 'Feature', properties: { id: 'SB', name: 'Samuel Bronfman Building', campus: 'SGW', code: 'SB' }, geometry: { type: 'Point', coordinates: [-73.586090, 45.496600] } },
    { type: 'Feature', properties: { id: 'SC', name: 'Student Centre', campus: 'LOY', code: 'SC' }, geometry: { type: 'Point', coordinates: [-73.639251, 45.459131] } },
    { type: 'Feature', properties: { id: 'SH', name: 'Solar House', campus: 'LOY', code: 'SH' }, geometry: { type: 'Point', coordinates: [-73.642478, 45.459298] } },
    { type: 'Feature', properties: { id: 'SP', name: 'Richard J. Renaud Science Complex', campus: 'LOY', code: 'SP' }, geometry: { type: 'Point', coordinates: [-73.641565, 45.457881] } },
    { type: 'Feature', properties: { id: 'T', name: 'T Annex', campus: 'SGW', code: 'T' }, geometry: { type: 'Point', coordinates: [-73.579270, 45.496710] } },
    { type: 'Feature', properties: { id: 'TA', name: 'Terrebonne Building', campus: 'LOY', code: 'TA' }, geometry: { type: 'Point', coordinates: [-73.640897, 45.459992] } },
    { type: 'Feature', properties: { id: 'TD', name: 'Toronto-Dominion Building', campus: 'SGW', code: 'TD' }, geometry: { type: 'Point', coordinates: [-73.578375, 45.495103] } },
    { type: 'Feature', properties: { id: 'V', name: 'V Annex', campus: 'SGW', code: 'V' }, geometry: { type: 'Point', coordinates: [-73.579907, 45.497101] } },
    { type: 'Feature', properties: { id: 'VA', name: 'Visual Arts Building', campus: 'SGW', code: 'VA' }, geometry: { type: 'Point', coordinates: [-73.573795, 45.495543] } },
    { type: 'Feature', properties: { id: 'VL', name: 'Vanier Library Building', campus: 'LOY', code: 'VL' }, geometry: { type: 'Point', coordinates: [-73.638606, 45.459026] } },
    { type: 'Feature', properties: { id: 'X', name: 'X Annex', campus: 'SGW', code: 'X' }, geometry: { type: 'Point', coordinates: [-73.579593, 45.496940] } },
    { type: 'Feature', properties: { id: 'Z', name: 'Z Annex', campus: 'SGW', code: 'Z' }, geometry: { type: 'Point', coordinates: [-73.579705, 45.496981] } },
  ];

export const POINT_FEATURES = {
  type: 'FeatureCollection',
  features: RAW_POINTS,
};

const extractRefFromName = (name = '') => {
  const paren = name.match(/\(([^)]+)\)/);
  if (paren && paren[1]) return paren[1].trim();
  const leading = name.match(/^\s*([A-Z]{1,3})\b/);
  if (leading) return leading[1].trim();
  return null;
};

const matchPointForPolygon = (polyProps) => {
  const refCandidates = [];
  if (polyProps.ref) refCandidates.push(polyProps.ref);
  if (polyProps.code) refCandidates.push(polyProps.code);
  if (polyProps.name) {
    const fromName = extractRefFromName(polyProps.name);
    if (fromName) refCandidates.push(fromName);
  }
  
  const normalized = refCandidates.map((r) => (typeof r === 'string' ? r.trim() : r)).filter(Boolean);
  
  for (const c of normalized) {
    const match = RAW_POINTS.find(p => {
      const props = p.properties || {};
      return props.code === c || props.id === c;
    });
    if (match) return match;
  }
  return null;
};

const campusFeaturesToPolygons = (campusGeojson = {}) => {
  if (!campusGeojson.features || !Array.isArray(campusGeojson.features)) return [];
  
  return campusGeojson.features
    .filter(f => f && f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'))
    .map(f => {
      const matchedPoint = matchPointForPolygon(f.properties || {});
      return {
        type: 'Feature',
        properties: {
          ...(matchedPoint ? matchedPoint.properties : {}),
          ...f.properties,
        },
        geometry: f.geometry,
      };
    });
};

const SGW_POLYGONS = campusFeaturesToPolygons(SGW_DATA);
const LOYOLA_POLYGONS = campusFeaturesToPolygons(LOYOLA_DATA);

// Combined export
export const BUILDINGS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    ...SGW_POLYGONS,
    ...LOYOLA_POLYGONS,
    ...RAW_POINTS,
  ],
};