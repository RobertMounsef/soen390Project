import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

const BLUE = '#3B82F6';

const styles = StyleSheet.create({
  pickerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginRight: 10,
    width: 58,
  },
  chipScroll: { paddingRight: 16, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },
});

export default function BuildingFloorSelectors({
  buildings,
  selectedBuilding,
  selectedFloor,
  availableOptions,
  onBuildingSelect,
  onFloorSelect,
}) {
  return (
    <>
      <View style={styles.pickerSection}>
        <Text style={styles.sectionLabel}>Building:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {buildings.map((b) => (
            <TouchableOpacity
              key={`bld-${b}`}
              style={[styles.chip, selectedBuilding === b && styles.chipActive]}
              onPress={() => onBuildingSelect(b)}
              testID={`building-chip-${b}`}
            >
              <Text style={[styles.chipText, selectedBuilding === b && styles.chipTextActive]}>
                {b}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.pickerSection}>
        <Text style={styles.sectionLabel}>Floor:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {(availableOptions[selectedBuilding] || []).map((f) => {
            const isActive = String(f) === String(selectedFloor);
            return (
              <TouchableOpacity
                key={`fl-${f}`}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => onFloorSelect(f)}
                testID={`floor-chip-${f}`}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

BuildingFloorSelectors.propTypes = {
  buildings: PropTypes.array.isRequired,
  selectedBuilding: PropTypes.string,
  selectedFloor: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  availableOptions: PropTypes.object.isRequired,
  onBuildingSelect: PropTypes.func.isRequired,
  onFloorSelect: PropTypes.func.isRequired,
};
