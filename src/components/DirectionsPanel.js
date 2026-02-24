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

// ─── Direction icon helper ────────────────────────────────────────────────────
// Parses the step instruction string and returns a matching arrow/icon.
function getDirectionIcon(instruction = '') {
  const t = instruction.toLowerCase();
  if (t.includes('turn left') || t.includes('left')) return '←';
  if (t.includes('turn right') || t.includes('right')) return '→';
  if (t.includes('slight left') || t.includes('keep left')) return '↖';
  if (t.includes('slight right') || t.includes('keep right')) return '↗';
  if (t.includes('u-turn') || t.includes('uturn')) return '↩';
  if (t.includes('roundabout') || t.includes('exit')) return '↻';
  if (t.includes('merge')) return '⤵';
  if (t.includes('arrive') || t.includes('destination')) return '⚑';
  if (t.includes('ferry')) return '⛴';
  if (t.includes('transit') || t.includes('bus') || t.includes('subway') || t.includes('train')) return '🚌';
  return '↑'; // default: go straight
}

// Travel modes with icons
const TRAVEL_MODES = [
  { label: 'Walk', value: 'walking', icon: '🚶' },
  { label: 'Drive', value: 'driving', icon: '🚗' },
  { label: 'Transit', value: 'transit', icon: '🚌' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function DirectionsPanel({
  distanceText,
  durationText,
  loading,
  error,
  onClear,
  travelMode,
  onModeChange,
  steps = [],
  // Lifted state — parent can optionally control collapsed/expand
  collapsed: collapsedProp,
  onToggleCollapse,
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(true);

  const isControlled = collapsedProp !== undefined && onToggleCollapse !== undefined;
  const collapsed = isControlled ? collapsedProp : internalCollapsed;
  const toggleCollapsed = isControlled
    ? onToggleCollapse
    : () => setInternalCollapsed((prev) => !prev);

  // ── Header summary content ──────────────────────────────────────────────
  const renderSummary = () => {
    if (loading) {
      return (
        <View style={styles.summaryInfo}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.summaryLoadingText}>Calculating route…</Text>
        </View>
      );
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    return (
      <View style={styles.summaryInfo}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryDuration}>{durationText}</Text>
          <Text style={styles.summaryDistance}>{distanceText}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.panel, collapsed && styles.collapsedPanel]}>

      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleCollapsed}
        activeOpacity={0.85}
      >
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        <View style={styles.headerInner}>
          {renderSummary()}

          <View style={styles.headerActions}>
            <Text style={styles.chevron}>{collapsed ? '▲' : '▼'}</Text>
            <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Expanded content ───────────────────────────────────────────── */}
      {!collapsed && (
        <>
          {/* Travel mode selector */}
          <View style={styles.modeRow}>
            {TRAVEL_MODES.map((mode) => {
              const isActive = travelMode === mode.value;
              return (
                <TouchableOpacity
                  key={mode.value}
                  style={[styles.modeBtn, isActive && styles.modeBtnActive]}
                  onPress={() => onModeChange(mode.value)}
                >
                  <Text style={styles.modeIcon}>{mode.icon}</Text>
                  <Text style={[styles.modeBtnText, isActive && styles.modeBtnTextActive]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Step-by-step list */}
          {steps.length > 0 && (
            <ScrollView
              style={styles.stepList}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                return (
                  <View key={idx} style={[styles.stepRow, isLast && styles.stepRowLast]}>
                    {/* Left: icon + connector line */}
                    <View style={styles.stepIconCol}>
                      <View style={[styles.iconBubble, isLast && styles.iconBubbleLast]}>
                        <Text style={styles.directionIcon}>
                          {getDirectionIcon(step.instruction)}
                        </Text>
                      </View>
                      {!isLast && <View style={styles.connector} />}
                    </View>

                    {/* Right: instruction + meta */}
                    <View style={styles.stepContent}>
                      <Text style={styles.stepInstruction}>{step.instruction}</Text>
                      {(step.distance || step.duration) && (
                        <View style={styles.stepMeta}>
                          {step.distance && (
                            <View style={styles.distanceBadge}>
                              <Text style={styles.distanceBadgeText}>{step.distance}</Text>
                            </View>
                          )}
                          {step.duration && (
                            <Text style={styles.stepDuration}>{step.duration}</Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </>
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
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
};

DirectionsPanel.defaultProps = {
  error: null,
  steps: [],
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const BRAND = '#8B1538';
const BRAND_DARK = '#6d1030';

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
    maxHeight: '55%',
    overflow: 'hidden',
  },
  collapsedPanel: {
    maxHeight: 90,
  },

  // ── Header ──
  header: {
    backgroundColor: BRAND,
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
    marginBottom: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryBlock: {
    flexDirection: 'column',
  },
  summaryDuration: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  summaryDistance: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  summaryLoadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginLeft: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#fecaca',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },

  // ── Travel mode selector ──
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modeBtnActive: {
    backgroundColor: '#fff5f7',
    borderColor: BRAND,
  },
  modeIcon: { fontSize: 15 },
  modeBtnText: {
    fontSize: 13,
    color: '#4a5568',
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: BRAND_DARK,
    fontWeight: '700',
  },

  // ── Step list ──
  stepList: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    paddingBottom: 4,
    minHeight: 60,
  },
  stepRowLast: {
    minHeight: 44,
  },

  // Left column: icon + vertical connector
  stepIconCol: {
    width: 36,
    alignItems: 'center',
    marginRight: 12,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleLast: {
    backgroundColor: '#fff5f7',
    borderColor: BRAND,
  },
  directionIcon: {
    fontSize: 16,
    color: '#1a202c',
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: '#e2e8f0',
    marginVertical: 3,
  },

  // Right column: text
  stepContent: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 10,
  },
  stepInstruction: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a202c',
    lineHeight: 20,
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  distanceBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  distanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
  },
  stepDuration: {
    fontSize: 12,
    color: '#718096',
  },
});