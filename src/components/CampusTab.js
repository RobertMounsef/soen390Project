/**
 * ───────────────────────────────────────────────────────────────────────────
 * DESIGN PATTERN: Component Pattern
 * ───────────────────────────────────────────────────────────────────────────
 * Small, reusable presentational component for a campus-switching tab.
 *
 * Key aspects:
 *   • Encapsulation: Owns its own active/inactive styles and renders a
 *     single tab button.
 *   • Clear Interface: Accepts `campus` (shape), `isActive` (bool), and
 *     `onPress` callback.
 *   • Accessibility: Includes `accessibilityRole`, `accessibilityLabel`,
 *     and `accessibilityState` for screen-reader support.
 * ───────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import PropTypes from 'prop-types';

export default function CampusTab({ campus, isActive, onPress }) {
  return (
    <TouchableOpacity
      testID={`campus-tab-${campus.label}`}
      style={[styles.tab, isActive && styles.tabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={`Campus ${campus.label}`}
      accessibilityState={{ selected: isActive }}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {campus.label}
      </Text>
    </TouchableOpacity>
  );
}

CampusTab.propTypes = {
  campus: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onPress: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#edf2f7',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#e53e3e',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  tabTextActive: {
    color: '#fff',
  },
});
