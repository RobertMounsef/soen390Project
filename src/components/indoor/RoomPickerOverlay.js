import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, SectionList, Platform } from 'react-native';
import PropTypes from 'prop-types';

const BLUE = '#3B82F6';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.6)',
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '800', color: '#64748B' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A', padding: 0 },
  clearSearch: { fontSize: 14, color: '#94A3B8', fontWeight: '700' },
  floorChipSection: {
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  floorChipHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  floorChipScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
    alignItems: 'center',
  },
  floorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  floorChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  floorChipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  floorChipTextActive: { color: '#FFFFFF' },
  sectionHeader: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeaderText: { fontSize: 12, fontWeight: '800', color: '#475569', letterSpacing: 0.3 },
  list: { flexGrow: 1 },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemActive: { backgroundColor: '#EFF6FF' },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemText: { fontSize: 15, fontWeight: '500', color: '#334155' },
  itemTextActive: { color: BLUE, fontWeight: '700' },
  limitedBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  limitedBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  emptyRow: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94A3B8' },
  floorBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  floorBadgeText: { fontSize: 11, fontWeight: '700', color: BLUE },
});

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
    for (const r of rooms) {
      if (r.floor != null && !Number.isNaN(Number(r.floor))) s.add(Number(r.floor));
    }
    return [...s].sort((a, b) => a - b);
  }, [rooms]);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    if (floorChips.length <= 1) {
      setFloorFilter(null);
    } else if (defaultFloorFilter != null && floorChips.includes(Number(defaultFloorFilter))) {
      setFloorFilter(Number(defaultFloorFilter));
    } else {
      setFloorFilter(null);
    }
  }, [visible, defaultFloorFilter, floorChips]);

  const normalise = s => String(s || '').toLowerCase().replaceAll('-', '');

  const sections = useMemo(() => {
    const q = normalise(search);
    const matches = (r) => {
      if (!q) return true;
      if (normalise(r.label).includes(q)) return true;
      if (r.id && normalise(r.id).includes(q)) return true;
      return false;
    };

    let pool = rooms.filter(matches);
    if (floorFilter != null) pool = pool.filter((r) => Number(r.floor) === floorFilter);

    if (floorFilter != null) return [{ title: null, data: pool }];

    const byFloor = {};
    for (const r of pool) {
      const f = r.floor == null ? '—' : String(r.floor);
      if (!byFloor[f]) byFloor[f] = [];
      byFloor[f].push(r);
    }
    const keys = Object.keys(byFloor).sort((a, b) => {
      if (a === '—') return 1;
      if (b === '—') return -1;
      return Number(a) - Number(b);
    });
    return keys.map((f) => ({
      title: f === '—' ? 'Other' : `Floor ${f}`,
      data: byFloor[f].sort((a, b) => (a.label || '').localeCompare(b.label || '')),
    })).filter((sec) => sec.data.length > 0);
  }, [rooms, search, floorFilter]);

  const renderItem = ({ item: r }) => (
    <TouchableOpacity
      style={[styles.item, selectedId === r.id && styles.itemActive]}
      onPress={() => onSelect(r.id)}
      testID={`room-option-${r.id}`}
    >
      <View style={styles.itemRow}>
        <Text style={[styles.itemText, selectedId === r.id && styles.itemTextActive]}>
          {r.label}
        </Text>
        {floorChips.length <= 1 && r.floor != null && (
          <View style={styles.floorBadge}>
            <Text style={styles.floorBadgeText}>Floor {r.floor}</Text>
          </View>
        )}
        {!r.accessible && (
          <View style={styles.limitedBadge}>
            <Text style={styles.limitedBadgeText}>Limited access</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="picker-close">
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {floorChips.length > 1 && (
          <View style={styles.floorChipSection}>
            <Text style={styles.floorChipHint}>Jump to floor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.floorChipScroll}>
              <TouchableOpacity
                style={[styles.floorChip, floorFilter === null && styles.floorChipActive]}
                onPress={() => setFloorFilter(null)}
                testID="picker-floor-all"
              >
                <Text style={[styles.floorChipText, floorFilter === null && styles.floorChipTextActive]}>All</Text>
              </TouchableOpacity>
              {floorChips.map((f) => (
                <TouchableOpacity
                  key={`pf-${f}`}
                  style={[styles.floorChip, floorFilter === f && styles.floorChipActive]}
                  onPress={() => setFloorFilter(f)}
                  testID={`picker-floor-${f}`}
                >
                  <Text style={[styles.floorChipText, floorFilter === f && styles.floorChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, code, or floor number…"
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} testID="search-clear-btn">
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.item, !selectedId && styles.itemActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.itemText, !selectedId && styles.itemTextActive]}>— None —</Text>
        </TouchableOpacity>

        <SectionList
          style={styles.list}
          sections={sections}
          keyExtractor={(r) => r.id}
          keyboardShouldPersistTaps="handled"
          renderItem={renderItem}
          renderSectionHeader={({ section: { title: secTitle } }) =>
            secTitle ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{secTitle}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>
                {search.length > 0 ? `No rooms match "${search}"` : 'No rooms on this floor'}
              </Text>
            </View>
          }
          stickySectionHeadersEnabled={false}
        />
      </View>
    </View>
  );
}

RoomPickerOverlay.propTypes = {
  visible: PropTypes.bool.isRequired,
  rooms: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  selectedId: PropTypes.string,
  defaultFloorFilter: PropTypes.number,
};
