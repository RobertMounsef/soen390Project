import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';

const BLUE = '#3B82F6';
const GREEN = '#22C55E';
const RED = '#EF4444';

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    maxHeight: '55%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: BLUE,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summaryDuration: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  summaryDistance: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginLeft: 8 },
  errorText: { flex: 1, fontSize: 13, color: '#fecaca' },
  chevron: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  stepList: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  stepRow: { flexDirection: 'row', paddingBottom: 4, minHeight: 56 },
  iconCol: { width: 36, alignItems: 'center', marginRight: 12 },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleDest: { backgroundColor: '#EFF6FF', borderColor: BLUE },
  stepIcon: { fontSize: 15 },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 3,
  },
  stepContent: { flex: 1, paddingTop: 5, paddingBottom: 10 },
  stepInstruction: { fontSize: 14, fontWeight: '500', color: '#1A202C', lineHeight: 20 },
  stepMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  distBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  distBadgeText: { fontSize: 12, fontWeight: '600', color: BLUE },
  stepDur: { fontSize: 12, color: '#718096' },

  stepRowFloorChange: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    marginHorizontal: 2,
    marginBottom: 2,
    paddingHorizontal: 6,
  },
  iconBubbleFloorChange: {
    backgroundColor: '#FED7AA',
    borderColor: '#F97316',
  },
  connectorFloorChange: { backgroundColor: '#F97316', opacity: 0.4 },
  stepInstructionFloorChange: { color: '#C2410C', fontWeight: '700' },
  floorChangeBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFEDD5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  floorChangeBadgeText: { fontSize: 11, fontWeight: '700', color: '#EA580C' },
});

function getStepIcon(instruction = '', isFloorChange = false) {
  if (isFloorChange) {
    const t = instruction.toLowerCase();
    return t.includes('elevator') ? '🛗' : '🪜';
  }
  const t = instruction.toLowerCase();
  if (t.includes('turn left')) return '←';
  if (t.includes('turn right')) return '→';
  if (t.includes('turn around') || t.includes('u-turn')) return '↩';
  if (t.includes('arrive') || t.includes('destination')) return '⚑';
  if (t.includes('start') || t.includes('you are')) return '●';
  return '↑';
}

function DirectionsStepRow({ step, isLast, onFloorChangeTap }) {
  const isFloorChange = !!step.isFloorChange;
  const canTapFloorChange = isFloorChange && !!onFloorChangeTap;

  return (
    <TouchableOpacity
      style={[styles.stepRow, isFloorChange && styles.stepRowFloorChange]}
      onPress={canTapFloorChange ? () => onFloorChangeTap(step.toFloor) : undefined}
      activeOpacity={isFloorChange ? 0.7 : 1}
      testID={isFloorChange ? `floor-change-step-${step.toFloor}` : undefined}
    >
      <View style={styles.iconCol}>
        <View style={[styles.iconBubble, isLast && styles.iconBubbleDest, isFloorChange && styles.iconBubbleFloorChange]}>
          <Text style={styles.stepIcon}>{getStepIcon(step.instruction, isFloorChange)}</Text>
        </View>
        {!isLast && <View style={[styles.connector, isFloorChange && styles.connectorFloorChange]} />}
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepInstruction, isFloorChange && styles.stepInstructionFloorChange]}>{step.instruction}</Text>
        {isFloorChange && (
          <View style={styles.floorChangeBadge}>
            <Text style={styles.floorChangeBadgeText}>
              {step.floorChangeType === 'elevator' ? '🛗 Elevator' : '🪜 Stairs'}
            </Text>
          </View>
        )}
        {!isFloorChange && (step.distance || step.duration) && (
          <View style={styles.stepMeta}>
            {step.distance && (
              <View style={styles.distBadge}>
                <Text style={styles.distBadgeText}>{step.distance}</Text>
              </View>
            )}
            {step.duration && <Text style={styles.stepDur}>{step.duration}</Text>}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const directionStepShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  instruction: PropTypes.string,
  isFloorChange: PropTypes.bool,
  floorChangeType: PropTypes.string,
  toFloor: PropTypes.number,
  distance: PropTypes.string,
  duration: PropTypes.string,
});

DirectionsStepRow.propTypes = {
  step: directionStepShape.isRequired,
  isLast: PropTypes.bool.isRequired,
  onFloorChangeTap: PropTypes.func,
};

export default function IndoorDirectionsPanel({ result, loading, error, onClear, onFloorChangeTap }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!result && !loading && !error) return null;

  return (
    <View style={styles.panel}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed(c => !c)}
        activeOpacity={0.85}
        testID="directions-panel-toggle"
      >
        <View style={styles.dragHandle} />
        {loading && (
          <View style={styles.summaryRow}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Calculating route…</Text>
          </View>
        )}
        {error && !loading && <Text style={styles.errorText}>{error}</Text>}
        {result && !loading && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryDuration}>{result.durationText}</Text>
            </View>
            <Text style={styles.summaryDistance}>{result.distanceText} · Indoor</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.chevron}>{collapsed ? '▲' : '▼'}</Text>
            <TouchableOpacity style={styles.clearBtn} onPress={onClear} testID="indoor-clear-route">
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {!collapsed && result?.steps?.length > 0 && (
        <ScrollView style={styles.stepList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {result.steps.map((step, idx) => (
            <DirectionsStepRow
              key={step.id}
              step={step}
              isLast={idx === result.steps.length - 1}
              onFloorChangeTap={onFloorChangeTap}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

IndoorDirectionsPanel.propTypes = {
  result: PropTypes.shape({
    durationText: PropTypes.string,
    distanceText: PropTypes.string,
    steps: PropTypes.arrayOf(directionStepShape),
  }),
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onClear: PropTypes.func.isRequired,
  onFloorChangeTap: PropTypes.func,
};
