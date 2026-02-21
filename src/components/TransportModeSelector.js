// src/components/TransportModeSelector.js

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
/**
 * TransportModeSelector
 *
 * UI component that allows the user to select a transportation mode
 * (Walk, Car, or Transit).
 *
 * Props:
 * - value: currently selected mode ('walk' | 'drive' | 'transit')
 * - onChange: callback triggered when the user selects a different mode
 */
export default function TransportModeSelector({ value, onChange }) {
    // Available transportation modes
    const modes = [
        { id: 'walk', label: 'Walk' },
        { id: 'drive', label: 'Car' },
        { id: 'transit', label: 'Transit' },
        { id: 'shuttle', label: 'Shuttle' },
    ];

    return (
        <View style={styles.row}>
            {modes.map((m) => {
                // Check if the current mode is selected
                const selected = value === m.id;

                return (
                    <TouchableOpacity
                        key={m.id}
                        onPress={() => onChange(m.id)}
                        style={[styles.btn, selected && styles.btnSelected]}
                        accessibilityRole="button"
                        accessibilityLabel={`mode-${m.id}`}
                    >
                        <Text style={[styles.text, selected && styles.textSelected]}>
                            {m.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

/**
 * Component styles
 */
const styles = StyleSheet.create({
    // Container for the mode buttons
    row: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        marginBottom: 12,
    },

    // Default button style
    btn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        backgroundColor: 'white',
    },

    // Style applied to the selected mode
    btnSelected: {
        backgroundColor: '#8B1538',
        borderColor: '#8B1538',
    },

    // Button text style
    text: {
        fontSize: 14,
        color: '#333',
    },

    // Text style for the selected mode
    textSelected: {
        color: 'white',
        fontWeight: '600',
    },
});
TransportModeSelector.propTypes = {
  value: PropTypes.oneOf(['walk', 'drive', 'transit', 'shuttle']).isRequired,
  onChange: PropTypes.func.isRequired,
};
