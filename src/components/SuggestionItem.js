/**
 * ───────────────────────────────────────────────────────────────────────────
 * DESIGN PATTERN: Component Pattern
 * ───────────────────────────────────────────────────────────────────────────
 * Small, reusable presentational component for displaying a single building
 * suggestion inside a search-results dropdown.
 *
 * Key aspects:
 *   • Encapsulation: Owns its own styles and renders a single suggestion row.
 *   • Clear Interface: Accepts `building` (shape) and `onPress` callback.
 *   • Reusability: Can be used in any search context that needs to list
 *     buildings by name and code.
 * ───────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import PropTypes from 'prop-types';

export default function SuggestionItem({ building, onPress }) {
  return (
    <TouchableOpacity
      style={styles.suggestionItem}
      testID={`suggestion-${building.code}`}
      onPress={onPress}
    >
      <Text style={styles.suggestionText}>
        {building.name} ({building.code})
      </Text>
    </TouchableOpacity>
  );
}

SuggestionItem.propTypes = {
  building: PropTypes.shape({
    id: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  onPress: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#2d3748',
  },
});
