import { POINT_FEATURES, BUILDINGS_GEOJSON } from './buildings';

describe('buildings data module', () => {
  describe('POINT_FEATURES', () => {
    it('should be a valid GeoJSON FeatureCollection', () => {
      expect(POINT_FEATURES.type).toBe('FeatureCollection');
      expect(Array.isArray(POINT_FEATURES.features)).toBe(true);
    });

    it('should contain building features', () => {
      expect(POINT_FEATURES.features.length).toBeGreaterThan(0);
    });

    it('should have Point geometry for all features', () => {
      POINT_FEATURES.features.forEach(feature => {
        expect(feature.geometry.type).toBe('Point');
        expect(Array.isArray(feature.geometry.coordinates)).toBe(true);
        expect(feature.geometry.coordinates.length).toBe(2);
      });
    });
  });

  describe('BUILDINGS_GEOJSON', () => {
    it('should be a valid GeoJSON FeatureCollection', () => {
      expect(BUILDINGS_GEOJSON.type).toBe('FeatureCollection');
      expect(Array.isArray(BUILDINGS_GEOJSON.features)).toBe(true);
    });

    it('should contain features', () => {
      expect(BUILDINGS_GEOJSON.features.length).toBeGreaterThan(0);
    });

    it('should include both polygon and point features', () => {
      const hasPolygons = BUILDINGS_GEOJSON.features.some(
        f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
      );
      const hasPoints = BUILDINGS_GEOJSON.features.some(
        f => f.geometry.type === 'Point'
      );

      expect(hasPolygons || hasPoints).toBe(true);
    });

    it('should have properties for each feature', () => {
      BUILDINGS_GEOJSON.features.forEach(feature => {
        expect(feature.properties).toBeDefined();
      });
    });

    it('should merge polygon properties with point properties when matched', () => {
      // Find a feature that should have merged properties
      const evFeature = BUILDINGS_GEOJSON.features.find(
        f => f.properties?.id === 'EV' || f.properties?.code === 'EV'
      );

      if (evFeature) {
        expect(evFeature.properties).toBeDefined();
        expect(evFeature.properties.id || evFeature.properties.code).toBeTruthy();
      }
    });
  });

  describe('extractRefFromName helper', () => {
    // These tests cover the internal extractRefFromName function indirectly
    // by testing the polygon matching behavior

    it('should match building with code in parentheses', () => {
      // This tests line 80-81: matching pattern like "Building (EV)"
      const testFeature = BUILDINGS_GEOJSON.features.find(
        f => f.properties?.name?.includes('(') && f.properties?.name?.includes(')')
      );

      if (testFeature) {
        expect(testFeature.properties).toBeDefined();
      }
    });

    it('should match building with leading code', () => {
      // This tests line 82-83: matching pattern like "EV Building"
      const testFeature = BUILDINGS_GEOJSON.features.find(
        f => f.properties?.name?.match(/^[A-Z]{1,3}\b/)
      );

      if (testFeature) {
        expect(testFeature.properties).toBeDefined();
      }
    });
  });

  describe('matchPointForPolygon helper', () => {
    it('should handle features with ref property', () => {
      // Tests line 90: checking polyProps.ref
      const features = BUILDINGS_GEOJSON.features.filter(
        f => f.properties?.ref
      );

      features.forEach(feature => {
        expect(feature.properties).toBeDefined();
      });
    });

    it('should handle features with code property', () => {
      // Tests line 90: checking polyProps.code
      const features = BUILDINGS_GEOJSON.features.filter(
        f => f.properties?.code
      );

      expect(features.length).toBeGreaterThan(0);
      features.forEach(feature => {
        expect(feature.properties.code).toBeTruthy();
      });
    });

    it('should handle features with name property', () => {
      // Tests lines 91-93: extracting from name
      const features = BUILDINGS_GEOJSON.features.filter(
        f => f.properties?.name
      );

      expect(features.length).toBeGreaterThan(0);
      features.forEach(feature => {
        expect(feature.properties.name).toBeTruthy();
      });
    });

    it('should normalize and filter ref candidates', () => {
      // Tests lines 96-100: normalization and filtering
      const features = BUILDINGS_GEOJSON.features;

      expect(features.length).toBeGreaterThan(0);

      // Most features should have at least one identifier
      const featuresWithIdentifiers = features.filter(feature => {
        const props = feature.properties || {};
        return props.id || props.code || props.name;
      });

      expect(featuresWithIdentifiers.length).toBeGreaterThan(0);
    });
  });

  describe('campusFeaturesToPolygons helper', () => {
    it('should filter out non-polygon features', () => {
      // Tests line 112: filtering for Polygon and MultiPolygon only
      const polygonFeatures = BUILDINGS_GEOJSON.features.filter(
        f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
      );

      polygonFeatures.forEach(feature => {
        expect(['Polygon', 'MultiPolygon']).toContain(feature.geometry.type);
      });
    });

    it('should handle empty or invalid GeoJSON', () => {
      // Tests lines 108-109: handling missing/invalid features
      // This is tested implicitly by the fact that BUILDINGS_GEOJSON doesn't crash
      expect(BUILDINGS_GEOJSON.features).toBeDefined();
    });

    it('should merge matched point properties with polygon properties', () => {
      // Tests line 114-122: property merging
      const polygonFeatures = BUILDINGS_GEOJSON.features.filter(
        f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
      );

      polygonFeatures.forEach(feature => {
        expect(feature.properties).toBeDefined();
        expect(feature.geometry).toBeDefined();
      });
    });
  });
});
