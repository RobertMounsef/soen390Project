import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import PropTypes from 'prop-types';

export default function DirectionsPanel({
  distanceText,
  durationText,
  loading,
  error,
  onClear,
}) {
  const getSummaryContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color="#8B1538" style={styles.loader} />;
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    return (
      <View style={styles.summaryInfo}>
        <Text style={styles.summaryDistance}>{distanceText}</Text>
        <Text style={styles.summarySep}> · </Text>
        <Text style={styles.summaryDuration}>{durationText}</Text>
      </View>
    );
  };

  return (
    <View style={styles.panel}>
      {/* Summary row */}
      <View style={styles.summaryRow}>
        {getSummaryContent()}

        <TouchableOpacity
          style={styles.clearBtn}
          onPress={onClear}
          testID="Clear route"
          accessibilityRole="button"
          accessibilityLabel="Clear route"
        >
          <Text style={styles.clearBtnText}>✕ Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

DirectionsPanel.propTypes = {
  distanceText: PropTypes.string.isRequired,
  durationText: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onClear: PropTypes.func.isRequired,
};

DirectionsPanel.defaultProps = {
  error: null,
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    gap: 8,
  },
  collapseBtn: {
    paddingHorizontal: 4,
  },
  chevron: {
    fontSize: 14,
    color: '#4a5568',
  },
  summaryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDistance: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a202c',
  },
  summarySep: {
    color: '#718096',
    fontSize: 14,
  },
  summaryDuration: {
    fontSize: 14,
    color: '#4a5568',
  },
  loader: {
    flex: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#e53e3e',
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clearBtnText: {
    fontSize: 12,
    color: '#718096',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#8B1538',
    borderColor: '#8B1538',
  },
  modeBtnText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  stepList: {
    maxHeight: 220,
    marginTop: 10,
  },
  stepRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  stepBullet: {
    color: '#8B1538',
    fontSize: 16,
    lineHeight: 20,
  },
  stepText: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 13,
    color: '#1a202c',
    lineHeight: 18,
  },
  stepMeta: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
});
