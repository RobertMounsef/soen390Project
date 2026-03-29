import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Polyline, Circle, Line, SvgXml, G, Text as SvgText } from 'react-native-svg';
import PropTypes from 'prop-types';

const SCREEN_WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  mapAreaWrapper: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Slightly lighter, cleaner background
    overflow: 'hidden',
  },
  mapScrollH: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  mapScrollV: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  mapContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 16, // Softer corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyMap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyMapText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  
  // Floor Switcher Aesthetics
  floorSwitcherBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A', // Darker slate
    gap: 12,
  },
  floorSwitcherLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  floorSwitcherBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  floorSwitcherBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  floorSwitcherText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  floorSwitcherTextActive: { color: '#60A5FA' },
});

function PathOverlay({ pathPoints, originNode, destNode, userNode, viewBoxSize, currentGraph, accessibleOnly, displayFloor }) {
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
        const isCorrectFloor = node.floor == null || node.floor === displayFloor;
        if (!isCorrectFloor) return false;

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
        else if (isStairs) { fill = '#F59E0B'; icon = '🪜'; }
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

const pointShape = PropTypes.shape({
  id: PropTypes.string,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
});

const mapNodeShape = PropTypes.shape({
  id: PropTypes.string,
  x: PropTypes.number,
  y: PropTypes.number,
  floor: PropTypes.number,
  type: PropTypes.string,
  label: PropTypes.string,
  accessible: PropTypes.bool,
});

PathOverlay.propTypes = {
  pathPoints: PropTypes.arrayOf(pointShape).isRequired,
  originNode: mapNodeShape,
  destNode: mapNodeShape,
  userNode: mapNodeShape,
  viewBoxSize: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }),
  currentGraph: PropTypes.shape({
    nodes: PropTypes.objectOf(mapNodeShape),
  }),
  accessibleOnly: PropTypes.bool,
  displayFloor: PropTypes.number,
};

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

FloorSwitcherBar.propTypes = {
  routeFloors: PropTypes.arrayOf(PropTypes.number),
  displayFloor: PropTypes.number,
  onFloorSwitch: PropTypes.func,
  isMultiFloor: PropTypes.bool,
};

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
  const hScrollRef = useRef(null);
  const vScrollRef = useRef(null);

  // Auto-Focus Logic
  useEffect(() => {
    // Focus on destination if it's on the displayed floor, or origin otherwise.
    let targetNode = null;
    if (showDestMarker && destNode) {
      targetNode = destNode;
    } else if (showOriginMarker && originNode) {
      targetNode = originNode;
    }
    
    if (targetNode && viewBoxSize && hScrollRef.current && vScrollRef.current) {
      const containerW = SCREEN_WIDTH * 0.85;
      const containerH = containerW / mapAspectRatio;
      
      const scaleX = containerW / viewBoxSize.width;
      const scaleY = containerH / viewBoxSize.height;

      const targetX = targetNode.x * scaleX;
      const targetY = targetNode.y * scaleY;

      // Calculate centering offsets
      // ScrollView measures its content relative to its top-left.
      // We want the targetX/Y to be in the center of the SCREEN viewport.
      // But the ScrollView itself might be smaller than SCREEN_WIDTH.
      
      const viewportW = SCREEN_WIDTH; // approximation
      const viewportH = 400; // approximation of map area height

      const scrollX = Math.max(0, targetX - viewportW / 2 + (viewportW - containerW) / 2);
      const scrollY = Math.max(0, targetY - viewportH / 2);

      setTimeout(() => {
        hScrollRef.current?.scrollTo({ x: scrollX, animated: true });
        vScrollRef.current?.scrollTo({ y: scrollY, animated: true });
      }, 100);
    }
  }, [originNode, destNode, showOriginMarker, showDestMarker, mapAspectRatio, viewBoxSize]);

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
          ref={hScrollRef}
          style={{ flex: 1 }}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mapScrollH}
          bounces={false}
          maximumZoomScale={3}
          minimumZoomScale={1}
          bouncesZoom
        >
          <ScrollView
            ref={vScrollRef}
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
                displayFloor={displayFloor}
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
  currentGraph: PropTypes.shape({
    nodes: PropTypes.objectOf(mapNodeShape),
    svgString: PropTypes.string,
    image: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  }),
  mapAspectRatio: PropTypes.number.isRequired,
  pathPoints: PropTypes.arrayOf(pointShape).isRequired,
  showOriginMarker: PropTypes.bool.isRequired,
  originNode: mapNodeShape,
  showDestMarker: PropTypes.bool.isRequired,
  destNode: mapNodeShape,
  userPositionNode: mapNodeShape,
  viewBoxSize: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  accessibleOnly: PropTypes.bool,
  displayFloor: PropTypes.number,
  onFloorSwitch: PropTypes.func,
  isMultiFloor: PropTypes.bool,
  routeFloors: PropTypes.arrayOf(PropTypes.number),
};
