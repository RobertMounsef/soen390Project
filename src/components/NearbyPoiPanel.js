import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PropTypes from 'prop-types';

const POI_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'restaurant', label: 'Food' },
  { value: 'services', label: 'Services' },
];

const POI_COUNT_OPTIONS = [3, 5, 10];
const POI_RANGE_OPTIONS = [100, 250, 500];

function formatPoiCategory(category) {
  switch (category) {
    case 'cafe':
      return 'Cafe';
    case 'restaurant':
      return 'Restaurant';
    case 'services':
      return 'Services';
    default:
      return 'Other';
  }
}

export default function NearbyPoiPanel({
  expanded,
  summaryText,
  hasCoords,
  poiMode,
  poiCount,
  poiRange,
  poiTypeFilter,
  nearbyPoiResults,
  onToggle,
  onModeChange,
  onCountChange,
  onRangeChange,
  onTypeChange,
  onPoiPress,
}) {
  return (
    <View style={styles.poiOverlay}>
      <View style={[styles.poiCard, !expanded && styles.poiCardCollapsed]}>
        <TouchableOpacity
          testID="toggle-poi-filters"
          style={[styles.poiCardHeader, !expanded && styles.poiCardHeaderCollapsed]}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel="Toggle nearby outdoor POIs"
        >
          {expanded ? (
            <>
              <View>
                <Text style={styles.poiCardEyebrow}>Nearby Outdoor POIs</Text>
                <Text style={styles.poiCardTitle}>{summaryText}</Text>
              </View>
              <View style={styles.poiCardHeaderRight}>
                {hasCoords && (
                  <Text style={styles.poiCardMeta}>
                    {poiMode === 'count' ? `Top ${poiCount}` : `Within ${poiRange} m`}
                  </Text>
                )}
                <Text style={styles.poiCardToggle}>Hide</Text>
              </View>
            </>
          ) : (
            <Text style={styles.poiCollapsedLabel}>Nearby</Text>
          )}
        </TouchableOpacity>

        {expanded && (
          <ScrollView
            style={styles.poiExpandedContent}
            contentContainerStyle={styles.poiExpandedContentInner}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={styles.poiToggleRow}>
              <TouchableOpacity
                testID="poi-mode-count"
                style={[styles.poiModeChip, poiMode === 'count' && styles.poiModeChipActive]}
                onPress={() => onModeChange('count')}
              >
                <Text style={[styles.poiModeChipText, poiMode === 'count' && styles.poiModeChipTextActive]}>
                  X nearest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="poi-mode-range"
                style={[styles.poiModeChip, poiMode === 'range' && styles.poiModeChipActive]}
                onPress={() => onModeChange('range')}
              >
                <Text style={[styles.poiModeChipText, poiMode === 'range' && styles.poiModeChipTextActive]}>
                  By range
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.poiOptionRow}>
              {(poiMode === 'count' ? POI_COUNT_OPTIONS : POI_RANGE_OPTIONS).map((value) => {
                const isActive = poiMode === 'count' ? poiCount === value : poiRange === value;
                return (
                  <TouchableOpacity
                    key={`${poiMode}-${value}`}
                    testID={`poi-option-${poiMode}-${value}`}
                    style={[styles.poiOptionChip, isActive && styles.poiOptionChipActive]}
                    onPress={() => {
                      if (poiMode === 'count') onCountChange(value);
                      else onRangeChange(value);
                    }}
                  >
                    <Text style={[styles.poiOptionChipText, isActive && styles.poiOptionChipTextActive]}>
                      {poiMode === 'count' ? `${value}` : `${value} m`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.poiOptionRow}>
              {POI_TYPE_OPTIONS.map((option) => {
                const isActive = poiTypeFilter === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    testID={`poi-type-${option.value}`}
                    style={[styles.poiTypeChip, isActive && styles.poiTypeChipActive]}
                    onPress={() => onTypeChange(option.value)}
                  >
                    <Text style={[styles.poiTypeChipText, isActive && styles.poiTypeChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!hasCoords && (
              <Text style={styles.poiEmptyText}>
                Waiting for your current location to sort nearby results.
              </Text>
            )}

            {hasCoords && nearbyPoiResults.length === 0 && (
              <Text style={styles.poiEmptyText}>
                No matching POIs were found for this campus and filter selection.
              </Text>
            )}

            {hasCoords && nearbyPoiResults.map((poi, index) => (
              <TouchableOpacity
                key={poi.id}
                testID={index === 0 ? 'nearby-poi-first' : `nearby-poi-item-${poi.id}`}
                style={styles.poiListItem}
                onPress={() => onPoiPress(poi.id)}
              >
                <View style={styles.poiListTextWrap}>
                  <Text style={styles.poiListTitle}>{poi.name}</Text>
                  <Text style={styles.poiListSubtitle}>
                    {`${formatPoiCategory(poi.category)} - ${poi.distanceLabel}`}
                  </Text>
                </View>
                <Text style={styles.poiListAction}>Route</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

NearbyPoiPanel.propTypes = {
  expanded: PropTypes.bool.isRequired,
  summaryText: PropTypes.string.isRequired,
  hasCoords: PropTypes.bool.isRequired,
  poiMode: PropTypes.oneOf(['count', 'range']).isRequired,
  poiCount: PropTypes.number.isRequired,
  poiRange: PropTypes.number.isRequired,
  poiTypeFilter: PropTypes.string.isRequired,
  nearbyPoiResults: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      category: PropTypes.string,
      distanceLabel: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onToggle: PropTypes.func.isRequired,
  onModeChange: PropTypes.func.isRequired,
  onCountChange: PropTypes.func.isRequired,
  onRangeChange: PropTypes.func.isRequired,
  onTypeChange: PropTypes.func.isRequired,
  onPoiPress: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  poiCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    width: '100%',
    maxWidth: 560,
    minWidth: 320,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  poiCardCollapsed: {
    width: undefined,
    maxWidth: undefined,
    minWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  poiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  poiCardHeaderCollapsed: {
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#8B1538',
  },
  poiOverlay: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  poiCardHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  poiExpandedContent: {
    maxHeight: 360,
    marginTop: 12,
  },
  poiExpandedContentInner: {
    paddingBottom: 4,
  },
  poiCardEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#8B1538',
  },
  poiCardTitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
    maxWidth: '90%',
  },
  poiCardMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B1538',
  },
  poiCardToggle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#005AB5',
  },
  poiCollapsedLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#fff',
  },
  poiToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  poiModeChip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#edf2f7',
  },
  poiModeChipActive: {
    backgroundColor: '#8B1538',
  },
  poiModeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4a5568',
  },
  poiModeChipTextActive: {
    color: '#fff',
  },
  poiOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  poiOptionChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f8fafc',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e0',
  },
  poiOptionChipActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#e53e3e',
  },
  poiOptionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
  },
  poiOptionChipTextActive: {
    color: '#8B1538',
  },
  poiTypeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f1f5f9',
  },
  poiTypeChipActive: {
    backgroundColor: '#dbeafe',
  },
  poiTypeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  poiTypeChipTextActive: {
    color: '#1d4ed8',
  },
  poiEmptyText: {
    fontSize: 13,
    color: '#64748b',
  },
  poiListItem: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  poiListTextWrap: {
    flex: 1,
  },
  poiListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  poiListSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
  poiListAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B1538',
  },
});
