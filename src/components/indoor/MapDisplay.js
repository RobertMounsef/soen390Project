import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Polyline, Circle, Line, SvgXml, G, Text as SvgText } from 'react-native-svg';
import PropTypes from 'prop-types';

const SCREEN_WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  mapAreaWrapper: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mapScrollH: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  mapScrollV: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  mapContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  emptyMap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyMapText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  floorSwitcherBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    gap: 10,
  },
  floorSwitcherLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  floorSwitcherBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#334155',
  },
  floorSwitcherBtnActive: {
    backgroundColor: '#3B82F6',
  },
  floorSwitcherText: { fontSize: 13, fontWeight: '700', color: '#CBD5E1' },
  floorSwitcherTextActive: { color: '#FFFFFF' },
});

function PathOverlay({ pathPoints, originNode, destNode, userNode, viewBoxSize, currentGraph, accessibleOnly }) {
  if (!viewBoxSize) return null;

  const { width: vw, height: vh } = viewBoxSize;
  const strokeW = Math.max(3, vw * 0.009);
  const markerR = Math.max(10, vw * 0.022);
  const strokeM = Math.max(2, vw * 0.005);

  const polyPoints = pathPoints && pathPoints.length > 1
    ? pathPoints.map(p => `${p.x},${p.y}`).join(' ')
    : null;

  const facilityMarkers = currentGraph?.nodes
    ? Object.values(currentGraph.nodes)
      .filter(node => {
        const type = (node.type || '').toLowerCase();
        const label = (node.label || '').toLowerCase();
        const isElevator = type === 'elevator_door';
        const isWashroom = (type === 'room' || type === 'washroom') && label.includes('washroom');
        const isStairs = type === 'stair_landing';
        if (accessibleOnly && node.accessible === false) return false;
        return isElevator || isWashroom || isStairs;
      })
      .map(node => {
        const type = (node.type || '').toLowerCase();
        const isElevator = type === 'elevator_door';
        const isStairs = type === 'stair_landing';
        let fill = '#06B6D4';
        let icon = '🚻';
        if (isElevator) { fill = '#8B5CF6'; icon = '🛗'; }
        else if (isStairs) { fill = '#F59E0B'; icon = '𓊍'; }
        return (
          <G key={node.id} testID={`facility-icon-${node.id}`}>
            <Circle
              cx={node.x} cy={node.y}
              r={markerR * 1.2}
              fill={fill}
              stroke="#fff"
              strokeWidth={strokeM * 0.6}
            />
            <SvgText
              x={node.x} y={node.y + markerR * 0.4}
              fontSize={markerR * 1.3}
              fill="#fff"
              textAnchor="middle"
            >
              {icon}
            </SvgText>
          </G>
        );
      })
    : [];

  return (
    <Svg
      style={StyleSheet.absoluteFillObject}
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      testID="indoor-path-overlay"
    >
      {facilityMarkers}
      {polyPoints && (
        <Polyline
          points={polyPoints}
          stroke="#3B82F6"
          strokeWidth={strokeW}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
          testID="indoor-path-line"
        />
      )}
      {originNode && (
        <G testID="indoor-origin-marker">
          <Circle cx={originNode.x} cy={originNode.y} r={markerR + strokeM} fill="rgba(255,255,255,0.7)" />
          <Circle cx={originNode.x} cy={originNode.y} r={markerR} fill="#22C55E" stroke="#fff" strokeWidth={strokeM} />
          <Line x1={originNode.x} y1={originNode.y - markerR} x2={originNode.x} y2={originNode.y - markerR * 2.2} stroke="#22C55E" strokeWidth={strokeW * 0.7} strokeLinecap="round" />
        </G>
      )}
      {destNode && (
        <G testID="indoor-dest-marker">
          <Circle cx={destNode.x} cy={destNode.y} r={markerR + strokeM} fill="rgba(255,255,255,0.7)" />
          <Circle cx={destNode.x} cy={destNode.y} r={markerR} fill="#EF4444" stroke="#fff" strokeWidth={strokeM} />
          <Line x1={destNode.x} y1={destNode.y - markerR} x2={destNode.x} y2={destNode.y - markerR * 2.2} stroke="#EF4444" strokeWidth={strokeW * 0.7} strokeLinecap="round" />
        </G>
      )}
      {userNode && (
        <>
          <Circle cx={userNode.x} cy={userNode.y} r={markerR * 1.6} fill="rgba(59,130,246,0.15)" />
          <Circle cx={userNode.x} cy={userNode.y} r={markerR} fill="#3B82F6" stroke="#fff" strokeWidth={strokeM} />
          <Circle cx={userNode.x} cy={userNode.y} r={markerR * 0.45} fill="#fff" />
        </>
      )}
    </Svg>
  );
}

function FloorSwitcherBar({ routeFloors, displayFloor, onFloorSwitch, isMultiFloor }) {
  if (!isMultiFloor || !routeFloors || routeFloors.length <= 1) return null;
  return (
    <View style={styles.floorSwitcherBar}>
      <Text style={styles.floorSwitcherLabel}>Viewing Floor:</Text>
      {routeFloors.map((f) => (
        <TouchableOpacity
          key={`switch-${f}`}
          style={[styles.floorSwitcherBtn, displayFloor === f && styles.floorSwitcherBtnActive]}
          onPress={() => onFloorSwitch(f)}
          testID={`floor-switch-btn-${f}`}
        >
          <Text style={[styles.floorSwitcherText, displayFloor === f && styles.floorSwitcherTextActive]}>{f}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function MapDisplay({
  currentGraph,
  mapAspectRatio,
  pathPoints,
  showOriginMarker,
  originNode,
  showDestMarker,
  destNode,
  userPositionNode,
  viewBoxSize,
  accessibleOnly,
  isMultiFloor,
  routeFloors,
  displayFloor,
  onFloorSwitch,
}) {
  return (
    <View style={styles.mapAreaWrapper}>
      <FloorSwitcherBar
        isMultiFloor={isMultiFloor}
        routeFloors={routeFloors}
        displayFloor={displayFloor}
        onFloorSwitch={onFloorSwitch}
      />
      {(currentGraph?.svgString || currentGraph?.image) ? (
        <ScrollView
          style={{ flex: 1 }}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mapScrollH}
          bounces={false}
          maximumZoomScale={2.5}
          minimumZoomScale={1}
          bouncesZoom
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.mapScrollV}
            bounces={false}
          >
            <View
              style={[
                styles.mapContainer,
                { aspectRatio: mapAspectRatio, width: SCREEN_WIDTH * 0.85 },
              ]}
            >
              {currentGraph.svgString ? (
                <SvgXml xml={currentGraph.svgString} width="100%" height="100%" testID="indoor-map-image" />
              ) : (
                <Image
                  source={currentGraph.image}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  testID="indoor-map-image"
                />
              )}

              <PathOverlay
                pathPoints={pathPoints}
                originNode={showOriginMarker ? originNode : null}
                destNode={showDestMarker ? destNode : null}
                userNode={userPositionNode}
                viewBoxSize={viewBoxSize}
                currentGraph={currentGraph}
                accessibleOnly={accessibleOnly}
              />
            </View>
          </ScrollView>
        </ScrollView>
      ) : (
        <View style={styles.emptyMap}>
          <Text style={styles.emptyMapText}>Waiting for floor plan…</Text>
        </View>
      )}
    </View>
  );
}

MapDisplay.propTypes = {
  currentGraph: PropTypes.object,
  mapAspectRatio: PropTypes.number.isRequired,
  pathPoints: PropTypes.array.isRequired,
  showOriginMarker: PropTypes.bool.isRequired,
  originNode: PropTypes.object,
  showDestMarker: PropTypes.bool.isRequired,
  destNode: PropTypes.object,
  userPositionNode: PropTypes.object,
  viewBoxSize: PropTypes.object.isRequired,
  accessibleOnly: PropTypes.bool,
};
