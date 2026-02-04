import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  PanResponder,
  Animated,
  Dimensions,
  Image,
  Linking,
} from 'react-native';

/**
 * BuildingInfoPopup Component
 * Bottom sheet modal for building information
 * 
 * Simple design:
 * - translateY controls position (0 = visible, PANEL_HEIGHT = hidden)
 * - Drag up/down moves the sheet
 * - Release snaps to open or closed based on position/velocity
 */

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.45; // Small size (45%)
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85; // Full size (85%)
const EXPAND_THRESHOLD = 50; // Drag up 50px to expand
const CLOSE_THRESHOLD = 100; // Drag down 100px to close

export default function BuildingInfoPopup({ visible, buildingInfo, onClose }) {
  // translateY: 0 = expanded, EXPAND_DIFF = collapsed, EXPANDED_HEIGHT = hidden
  const EXPAND_DIFF = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
  const translateY = useRef(new Animated.Value(EXPANDED_HEIGHT)).current;
  const isExpanded = useRef(false);
  const isClosing = useRef(false);

  // Animate in when visible becomes true
  useEffect(() => {
    if (visible) {
      isExpanded.current = false;
      isClosing.current = false;
      translateY.setValue(EXPANDED_HEIGHT); // Start off-screen
      // Slide up to collapsed position
      Animated.spring(translateY, {
        toValue: EXPAND_DIFF,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible, translateY]);

  // Close animation helper - with guard to prevent double-close
  const animateClose = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    
    Animated.timing(translateY, {
      toValue: EXPANDED_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // PanResponder for drag
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      
      onPanResponderMove: (_, gesture) => {
        const currentBase = isExpanded.current ? 0 : EXPAND_DIFF;
        const newValue = currentBase + gesture.dy;
        // Clamp between 0 (fully expanded) and EXPANDED_HEIGHT (closed)
        const clamped = Math.max(0, Math.min(newValue, EXPANDED_HEIGHT));
        translateY.setValue(clamped);
      },
      
      onPanResponderRelease: (_, gesture) => {
        const currentBase = isExpanded.current ? 0 : EXPAND_DIFF;
        
        // Dragging down - check for close or collapse
        if (gesture.dy > 0) {
          if (gesture.dy > CLOSE_THRESHOLD || gesture.vy > 0.5) {
            // Close if dragged far or fast
            if (!isExpanded.current) {
              animateClose();
            } else {
              // Collapse from expanded
              isExpanded.current = false;
              Animated.spring(translateY, {
                toValue: EXPAND_DIFF,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
              }).start();
            }
          } else {
            // Snap back
            Animated.spring(translateY, {
              toValue: currentBase,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start();
          }
        }
        // Dragging up - expand
        else if (gesture.dy < -EXPAND_THRESHOLD || gesture.vy < -0.3) {
          isExpanded.current = true;
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
        // Small drag, snap back
        else {
          Animated.spring(translateY, {
            toValue: currentBase,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  // Don't render if no building info
  if (!buildingInfo) return null;

  const { name, code, accessibility, keyServices, departments, facilities } = buildingInfo;

  // Open Concordia building page in browser
  const openBuildingDetails = () => {
    const buildingCode = (code || '').toLowerCase();
    const url = `https://www.concordia.ca/maps/buildings/${buildingCode}.html`;
    Linking.openURL(url);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={animateClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop - tap to close */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={animateClose}
        />
        
        {/* Animated Panel */}
        <Animated.View
          style={[
            styles.panel,
            { height: EXPANDED_HEIGHT, transform: [{ translateY }] },
          ]}
        >
          {/* Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{name}</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Accessibility */}
            {accessibility && (accessibility.ramps || accessibility.elevators || accessibility.notes) && (
              <Section
                icon={require('../../assets/images/wheelchair.png')}
                title="Accessibility"
              >
                <Text style={styles.text}>
                  {accessibility.notes || 'Ramp & elevators available'}
                </Text>
              </Section>
            )}

            {/* Key Services */}
            {keyServices && keyServices.length > 0 && (
              <Section
                icon={require('../../assets/images/info.png')}
                title="Key Services"
              >
                {keyServices.map((item, i) => (
                  <Text key={i} style={styles.listItem}>• {item}</Text>
                ))}
              </Section>
            )}

            {/* Departments */}
            {departments && departments.length > 0 && (
              <Section
                icon={require('../../assets/images/people.png')}
                title="Departments"
              >
                {departments.map((item, i) => (
                  <Text key={i} style={styles.listItem}>• {item}</Text>
                ))}
              </Section>
            )}

            {/* Facilities */}
            {facilities && facilities.length > 0 && (
              <Section
                icon={require('../../assets/images/home.png')}
                title="Facilities"
              >
                {facilities.map((item, i) => (
                  <Text key={i} style={styles.listItem}>• {item}</Text>
                ))}
              </Section>
            )}
          </ScrollView>

          {/* Footer */}
          <SafeAreaView style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={openBuildingDetails} activeOpacity={0.8}>
              <Text style={styles.buttonText}>More Details</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Simple section component
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
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleArea: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  icon: {
    width: 14,
    height: 14,
    tintColor: '#6b7280',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  text: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  listItem: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    marginLeft: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonArrow: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
