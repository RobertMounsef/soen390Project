import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Modal } from 'react-native';
import PropTypes from 'prop-types';

const BLUE = '#3B82F6';

export default function RoomPickerOverlay({
  visible,
  rooms,
  onSelect,
  onClose,
  title,
  selectedId,
  defaultFloorFilter,
}) {
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState(null);

  const floorChips = useMemo(() => {
    const s = new Set();
    for (const r of rooms) if (r.floor != null) s.add(Number(r.floor));
    return [...s].sort((a, b) => a - b);
  }, [rooms]);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setFloorFilter( (defaultFloorFilter != null && floorChips.includes(Number(defaultFloorFilter))) ? Number(defaultFloorFilter) : null );
  }, [visible, defaultFloorFilter, floorChips]);

  const matches = (r) => {
    const q = search.toLowerCase().replaceAll('-', '');
    if (!q) return true;
    if (r.label.toLowerCase().includes(q)) return true;
    if (r.id.toLowerCase().includes(q)) return true;
    return false;
  };

  const filtered = rooms.filter(matches).filter(r => floorFilter === null || Number(r.floor) === floorFilter);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} testID="picker-close"><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
        </View>

        {floorChips.length > 1 && (
          <ScrollView horizontal style={styles.chipRow}>
            <TouchableOpacity onPress={() => setFloorFilter(null)} testID="picker-floor-all">
              <Text style={[styles.chip, floorFilter === null && styles.chipActive]}>All</Text>
            </TouchableOpacity>
            {floorChips.map(f => (
              <TouchableOpacity key={f} onPress={() => setFloorFilter(f)} testID={`picker-floor-${f}`}>
                <Text style={[styles.chip, floorFilter === f && styles.chipActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            placeholder="Search name, code, or floor number"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} testID="search-clear-btn" style={styles.clearBtn}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={() => onSelect(null)} style={styles.item}><Text>— None —</Text></TouchableOpacity>

        <ScrollView style={styles.list}>
          {filtered.map(r => (
            <TouchableOpacity key={r.id} onPress={() => onSelect(r.id)} style={[styles.item, selectedId === r.id && styles.itemSelected]} testID={`room-option-${r.id}`}>
              <Text style={selectedId === r.id && styles.itemTextSelected}>{r.label}</Text>
              {r.floor != null && <Text style={styles.floorTag}>Floor {r.floor}</Text>}
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && <Text style={styles.empty}>No rooms match</Text>}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 18, fontWeight: 'bold' },
  closeIcon: { fontSize: 20 },
  chipRow: { flexGrow: 0, padding: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, marginRight: 8 },
  chipActive: { backgroundColor: BLUE, color: '#fff', borderColor: BLUE },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' },
  search: { flex: 1, padding: 12 },
  clearBtn: { padding: 12 },
  clearIcon: { color: '#999', fontWeight: 'bold' },
  item: { padding: 16, borderBottomWidth: 1, borderColor: '#f5f5f5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemSelected: { backgroundColor: '#eef2ff' },
  itemTextSelected: { fontWeight: 'bold', color: BLUE },
  floorTag: { fontSize: 12, color: '#666' },
  list: { flex: 1 },
  empty: { padding: 20, textAlign: 'center', color: '#999' },
});

RoomPickerOverlay.propTypes = {
  visible: PropTypes.bool.isRequired,
  rooms: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  selectedId: PropTypes.string,
  defaultFloorFilter: PropTypes.number,
};
