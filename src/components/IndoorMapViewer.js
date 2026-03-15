import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { getAvailableFloors, getFloorGraph } from '../floor_plans/waypoints/waypointsIndex';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function IndoorMapViewer({ visible, onClose, initialBuildingId }) {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const [roomPickerVisible, setRoomPickerVisible] = useState(false);

  // Parse available floors on mount
  const availableOptions = useMemo(() => {
    const floors = getAvailableFloors();
    const map = {};
    floors.forEach(({ building, floor }) => {
      if (!map[building]) map[building] = [];
      if (typeof floor === 'number' && !Number.isNaN(floor)) {
        map[building].push(floor);
      }
    });
    // Sort floors
    Object.keys(map).forEach(b => {
      map[b].sort((a, b) => a - b);
    });
    return map;
  }, []);

  const buildings = Object.keys(availableOptions);

  // Initialize from initialBuildingId (e.g., 'H', 'CC', 'VE')
  // We need to match the initialBuildingId properly, e.g. "H-1" might be building "H".
  // Note: getBuildingInfo returns code like "H", "CC", "VE".
  useEffect(() => {
    if (visible && availableOptions) {
      // Find a matching building (try exact first, then partial)
      let initialBldg = buildings[0]; // default
      if (initialBuildingId) {
        // e.g., if initialBuildingId is "H-8" or "H", try to find "H"
        const exactMatch = buildings.find(b => initialBuildingId.toUpperCase().startsWith(b));
        if (exactMatch) initialBldg = exactMatch;
      }
      setSelectedBuilding(initialBldg);
      if (initialBldg && availableOptions[initialBldg]?.length > 0) {
        setSelectedFloor(availableOptions[initialBldg][0]);
      }
      setSelectedRoomId(null);
      setRoomPickerVisible(false);
    }
  }, [visible, initialBuildingId]);

  // Handle building change
  const handleBuildingChange = (b) => {
    setSelectedBuilding(b);
    if (availableOptions[b]?.length > 0) {
      setSelectedFloor(availableOptions[b][0]);
    } else {
      setSelectedFloor(null);
    }
    setSelectedRoomId(null);
  };

  // Handle floor change
  const handleFloorChange = (f) => {
    setSelectedFloor(f);
    setSelectedRoomId(null);
  };

  const currentGraph = useMemo(() => {
    if (!selectedBuilding || selectedFloor === null) return null;
    return getFloorGraph(selectedBuilding, selectedFloor);
  }, [selectedBuilding, selectedFloor]);

  const currentImage = currentGraph?.image ?? null;

  // Extract rooms from graph
  const rooms = useMemo(() => {
    if (!currentGraph?.nodes) return [];
    return Object.entries(currentGraph.nodes)
      .filter(([id, data]) => data.type === 'room')
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [currentGraph]);

  const selectedRoomData = useMemo(() => {
    if (!selectedRoomId) return null;
    return rooms.find(r => r.id === selectedRoomId);
  }, [selectedRoomId, rooms]);

  // Parse viewBox to calculate absolute positions
  const viewBoxSize = useMemo(() => {
    if (!currentGraph?.viewBox) return { width: 1024, height: 1024 };
    const parts = currentGraph.viewBox.split(' ').map(Number);
    if (parts.length === 4) {
      return { width: parts[2], height: parts[3] };
    }
    return { width: 1024, height: 1024 };
  }, [currentGraph]);

  const mapAspectRatio = viewBoxSize.width / viewBoxSize.height;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Indoor Maps</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Building Selection */}
            <View style={styles.pickerSection}>
              <Text style={styles.sectionLabel}>Building:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {buildings.map(b => (
                  <TouchableOpacity
                    key={'bld-' + b}
                    style={[styles.chip, selectedBuilding === b && styles.chipActive]}
                    onPress={() => handleBuildingChange(b)}
                  >
                    <Text style={[styles.chipText, selectedBuilding === b && styles.chipTextActive]}>
                      {b} Building
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Floor Selection */}
            {selectedBuilding && (
              <View style={styles.pickerSection}>
                <Text style={styles.sectionLabel}>Floor:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                  {availableOptions[selectedBuilding]?.map(f => (
                    <TouchableOpacity
                      key={'flr-' + f}
                      style={[styles.chip, selectedFloor === f && styles.chipActive]}
                      onPress={() => handleFloorChange(f)}
                    >
                      <Text style={[styles.chipText, selectedFloor === f && styles.chipTextActive]}>
                        Floor {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Room Selection Toggle */}
            <View style={styles.roomSelectContainer}>
              <TouchableOpacity
                style={styles.roomDropdownToggle}
                onPress={() => setRoomPickerVisible(!roomPickerVisible)}
              >
                <Text style={styles.roomDropdownText}>
                  {selectedRoomData ? selectedRoomData.label : 'Select a Room (Optional)'}
                </Text>
                <Text style={styles.roomDropdownIcon}>{roomPickerVisible ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            </View>

            {/* Expanded Room List */}
            {roomPickerVisible && (
              <View style={styles.roomListWrapper}>
                <ScrollView style={styles.roomList} nestedScrollEnabled={true}>
                  <TouchableOpacity
                    style={[styles.roomListItem, !selectedRoomId && styles.roomListItemActive]}
                    onPress={() => {
                      setSelectedRoomId(null);
                      setRoomPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.roomListItemText, !selectedRoomId && styles.roomListItemTextActive]}>None</Text>
                  </TouchableOpacity>
                  {rooms.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.roomListItem, selectedRoomId === r.id && styles.roomListItemActive]}
                      onPress={() => {
                        setSelectedRoomId(r.id);
                        setRoomPickerVisible(false);
                      }}
                    >
                      <Text style={[styles.roomListItemText, selectedRoomId === r.id && styles.roomListItemTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Map Area */}
            <View style={styles.mapAreaWrapper}>
              {currentImage ? (
                // No zooming; just allow panning if ever needed
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mapScrollH}
                  bounces={false}
                >
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.mapScrollV}
                    bounces={false}
                  >
                    <View
                      style={[
                        styles.mapContainer,
                        { aspectRatio: mapAspectRatio, width: SCREEN_WIDTH }
                      ]}
                    >
                      <Image
                        source={currentImage}
                        testID="indoor-map-image"
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                      />

                      {/* Marker Overlay */}
                      {selectedRoomData && (
                        <View
                          testID="indoor-map-marker"
                          style={[
                            styles.markerContainer,
                            {
                              left: `${(selectedRoomData.x / viewBoxSize.width) * 100}%`,
                              top: `${(selectedRoomData.y / viewBoxSize.height) * 100}%`,
                            }
                          ]}
                        >
                          <View style={styles.markerInner}>
                            <View style={styles.markerDot} />
                            <View style={styles.markerTail} />
                          </View>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                </ScrollView>
              ) : (
                <View style={styles.emptyMap}>
                  <Text style={styles.emptyMapText}>Waiting for floor plan...</Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

IndoorMapViewer.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialBuildingId: PropTypes.string,
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)', // Darker, sleeker overlay
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 50 : 30, // More top breathing room
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Sleek off-white for main bg
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#64748B',
  },
  pickerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginRight: 10,
    width: 70,
  },
  chipScroll: {
    paddingRight: 24,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#3B82F6', // Vibrant blue
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  roomSelectContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  roomDropdownToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  roomDropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  roomDropdownIcon: {
    fontSize: 14,
    color: '#94A3B8',
  },
  roomListWrapper: {
    maxHeight: 250,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  roomList: {
    flexGrow: 1,
  },
  roomListItem: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  roomListItemActive: {
    backgroundColor: '#EFF6FF',
  },
  roomListItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
  },
  roomListItemTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  mapAreaWrapper: {
    flex: 1,
    backgroundColor: '#E2E8F0', // Slightly darker bg for contrast with the white map
    overflow: 'hidden',
  },
  mapScrollH: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  mapScrollV: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  mapContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  markerContainer: {
    position: 'absolute',
    transform: [{ translateX: -12 }, { translateY: -30 }], // Center pin exactly over coordinate (24/2 width, 30 height)
    alignItems: 'center',
    zIndex: 100,
  },
  markerInner: {
    width: 24,
    height: 30,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  markerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6', // vibrant blue
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 2,
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#3B82F6',
    marginTop: -4,
    zIndex: 1,
  },
  markerTooltip: {
    position: 'absolute',
    top: -45,
    backgroundColor: '#1E293B', // Slate 800
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  markerTooltipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  emptyMapText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '600',
  },
});
