import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Dimensions,
  Image,
  Linking,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.45;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

export default function BuildingInfoPopup({ visible, buildingInfo, onClose }) {
  // FIX: Animate height instead of top. Start at 0 (hidden).
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const isClosing = useRef(false);

  // Animate in when visible becomes true
  useEffect(() => {
    if (visible) {
      setIsExpanded(false);
      isClosing.current = false;
      // Animate from 0 to Collapsed Height
      Animated.spring(animatedHeight, {
        toValue: COLLAPSED_HEIGHT,
        useNativeDriver: false, // Height animation requires false, but works well for this
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible]);

  const toggleExpand = () => {
    if (isExpanded) {
      // Collapse
      setIsExpanded(false);
      Animated.spring(animatedHeight, {
        toValue: COLLAPSED_HEIGHT,
        useNativeDriver: false,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Expand
      setIsExpanded(true);
      Animated.spring(animatedHeight, {
        toValue: EXPANDED_HEIGHT,
        useNativeDriver: false,
        tension: 65,
        friction: 11,
      }).start();
    }
  };

  const animateClose = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    
    // Shrink to 0 height
    Animated.timing(animatedHeight, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      onClose();
    });
  };

  if (!buildingInfo || !visible) return null;
  const { name, code, accessibility, keyServices, departments, facilities } = buildingInfo;

  const openBuildingDetails = () => {
    const buildingCode = (code || '').toLowerCase();
    Linking.openURL(`https://www.concordia.ca/maps/buildings/${buildingCode}.html`);
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={animateClose}
      />
        
        {/* FIX: Position absolute bottom: 0, and use animated height */}
        <Animated.View
          style={[
            styles.panel,
            { 
              height: animatedHeight, 
              bottom: 0, // Pin to bottom
              top: undefined // Remove top positioning
            },
          ]}
        >
          <TouchableOpacity 
            style={styles.handleArea} 
            onPress={toggleExpand}
            activeOpacity={0.7}
          >
            <View style={styles.handle} />
            <Text style={styles.handleHint}>
              {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
            </Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>{name}</Text>
            <TouchableOpacity onPress={animateClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Accessibility */}
            {accessibility && (accessibility.ramps || accessibility.elevators || accessibility.notes) && (
              <Section icon={require('../../assets/images/wheelchair.png')} title="Accessibility">
                <Text style={styles.text}>{accessibility.notes || 'Ramp & elevators available'}</Text>
              </Section>
            )}

            {/* Key Services */}
            {keyServices?.length > 0 && (
              <Section icon={require('../../assets/images/info.png')} title="Key Services">
                {keyServices.map((item, i) => <Text key={i} style={styles.listItem}>• {item}</Text>)}
              </Section>
            )}

            {/* Departments */}
            {departments?.length > 0 && (
              <Section icon={require('../../assets/images/people.png')} title="Departments">
                {departments.map((item, i) => <Text key={i} style={styles.listItem}>• {item}</Text>)}
              </Section>
            )}

            {/* Facilities */}
            {facilities?.length > 0 && (
              <Section icon={require('../../assets/images/home.png')} title="Facilities">
                {facilities.map((item, i) => <Text key={i} style={styles.listItem}>• {item}</Text>)}
              </Section>
            )}
          </ScrollView>

          {/* Footer now stays pinned to the bottom of the visible area */}
          <SafeAreaView style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={openBuildingDetails} activeOpacity={0.8}>
              <Text style={styles.buttonText}>More Details</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
    </View>
  );
}

function Section({ icon, title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.iconCircle}>
          <Image source={icon} style={styles.icon} resizeMode="contain" />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Removed 'top' and 'height' from here as they are handled inline
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 2,
    overflow: 'hidden', // Ensures content doesn't bleed out during animation
  },
  handleArea: { paddingVertical: 10, alignItems: 'center' },
  handle: { width: 36, height: 4, backgroundColor: '#d1d5db', borderRadius: 2 },
  handleHint: { marginTop: 4, fontSize: 11, color: '#9ca3af' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', flex: 1 },
  closeButton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  closeText: { fontSize: 16, color: '#6b7280', fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20 },
  contentContainer: { flexGrow: 1, paddingBottom: 20 },
  section: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  icon: { width: 14, height: 14, tintColor: '#6b7280' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  text: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  listItem: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginLeft: 4 },
  footer: { paddingHorizontal: 20, paddingVertical: 16 },
  button: {
    backgroundColor: '#2563eb', flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  buttonArrow: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 },
});