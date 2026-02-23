import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import PropTypes from 'prop-types';

export default function DirectionsPanel({
  distanceText,
  durationText,
  loading,
  error,
  onClear,
  travelMode,
  onModeChange,
  steps = [],
}) {
  const [collapsed, setCollapsed] = useState(true);

  const getSummaryContent = () => {
    if (loading) return <ActivityIndicator size="small" color="#8B1538" style={styles.loader} />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;
    return (
      <View style={styles.summaryInfo}>
        <Text style={styles.summaryDistance}>{distanceText}</Text>
        <Text style={styles.summarySep}> · </Text>
        <Text style={styles.summaryDuration}>{durationText}</Text>
      </View>
    );
  };

  const travelModes = [
    { label: 'Walk', value: 'walking' },
    { label: 'Car', value: 'driving' },
    { label: 'Transit', value: 'transit' },
  ];

  return (
    <View style={[styles.panel, collapsed && styles.collapsedPanel]}>
      {/* Header: summary + expand/collapse + clear */}
      <View style={styles.summaryRow}>
        {getSummaryContent()}

        {/* Toggle collapse button */}
        <TouchableOpacity
          style={styles.collapseBtn}
          onPress={() => setCollapsed(!collapsed)}
        >
          <Text style={styles.collapseText}>{collapsed ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearBtn}
          onPress={onClear}
        >
          <Text style={styles.clearBtnText}>✕ Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Travel mode selection */}
      {!collapsed && (
        <View style={styles.modeRow}>
          {travelModes.map((mode) => {
            const isActive = travelMode === mode.value;
            return (
              <TouchableOpacity
                key={mode.value}
                style={[styles.modeBtn, isActive && styles.modeBtnActive]}
                onPress={() => onModeChange(mode.value)}
              >
                <Text style={[styles.modeBtnText, isActive && styles.modeBtnTextActive]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Steps list */}
      {!collapsed && steps.length > 0 && (
        <ScrollView style={styles.stepList} nestedScrollEnabled={true}>
          {steps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <Text style={styles.stepBullet}>•</Text>
              <View style={styles.stepText}>
                <Text style={styles.stepInstruction}>{step.instruction}</Text>
                {step.distance && step.duration && (
                  <Text style={styles.stepMeta}>
                    {step.distance} · {step.duration}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

DirectionsPanel.propTypes = {
  distanceText: PropTypes.string.isRequired,
  durationText: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onClear: PropTypes.func.isRequired,
  travelMode: PropTypes.oneOf(['walking', 'driving', 'transit']).isRequired,
  onModeChange: PropTypes.func.isRequired,
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      instruction: PropTypes.string.isRequired,
      distance: PropTypes.string,
      duration: PropTypes.string,
    })
  ),
};

DirectionsPanel.defaultProps = {
  error: null,
  steps: [],
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
    maxHeight: '50%',
  },
  collapsedPanel: {
    maxHeight: 60,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  summaryDistance: { fontSize: 16, fontWeight: '700', color: '#1a202c' },
  summarySep: { color: '#718096', fontSize: 14, marginHorizontal: 4 },
  summaryDuration: { fontSize: 14, color: '#4a5568' },
  loader: { flex: 1 },
  errorText: { flex: 1, fontSize: 13, color: '#e53e3e' },
  clearBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#f7fafc', borderWidth: 1, borderColor: '#e2e8f0', marginLeft: 8 },
  clearBtnText: { fontSize: 12, color: '#718096', fontWeight: '600' },

  collapseBtn: { paddingHorizontal: 8 },
  collapseText: { fontSize: 14, color: '#4a5568' },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: { backgroundColor: '#8B1538', borderColor: '#8B1538' },
  modeBtnText: { fontSize: 14, color: '#4a5568', fontWeight: '600' },
  modeBtnTextActive: { color: '#fff', fontWeight: '700' },

  stepList: { marginTop: 8 },
  stepRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0', gap: 8 },
  stepBullet: { color: '#8B1538', fontSize: 16, lineHeight: 20 },
  stepText: { flex: 1 },
  stepInstruction: { fontSize: 13, color: '#1a202c', lineHeight: 18 },
  stepMeta: { fontSize: 12, color: '#718096', marginTop: 2 },
});