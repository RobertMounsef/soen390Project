/**
 * Modal for Google Calendar connection: status, Connect / Disconnect, and error display.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import PropTypes from 'prop-types';

export default function CalendarConnectionModal({
  visible,
  onClose,
  status,
  isConnected,
  errorMessage,
  onConnect,
  onDisconnect,
  isReady,
}) {
  const isLoading = status === 'loading';
  const showError = status === 'error' && errorMessage;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="calendar-connection-modal"
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel="Close calendar connection"
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e && e.stopPropagation && e.stopPropagation()} style={styles.card} testID="calendar-modal-card">
          <View style={styles.header}>
            <Text style={styles.title}>Google Calendar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="calendar-modal-close" accessibilityLabel="Close">
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {!isReady && (
            <Text style={styles.hint}>
              Add EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID to your .env to enable calendar connection.
            </Text>
          )}

          {/* Connection status */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Calendar connected' : 'Calendar not connected'}
            </Text>
          </View>

          {showError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {isLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#8B1538" />
              <Text style={styles.loadingText}>Please wait…</Text>
            </View>
          )}

          <View style={styles.actions}>
            {isConnected ? (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={onDisconnect}
                disabled={isLoading}
                testID="calendar-disconnect"
                accessibilityRole="button"
                accessibilityLabel="Disconnect calendar"
              >
                <Text style={styles.buttonSecondaryText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={onConnect}
                disabled={isLoading || !isReady}
                testID="calendar-connect"
                accessibilityRole="button"
                accessibilityLabel="Connect Google Calendar"
              >
                <Text style={styles.buttonPrimaryText}>Connect Google Calendar</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

CalendarConnectionModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  status: PropTypes.oneOf(['idle', 'loading', 'connected', 'error']).isRequired,
  isConnected: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
  onConnect: PropTypes.func.isRequired,
  onDisconnect: PropTypes.func.isRequired,
  isReady: PropTypes.bool.isRequired,
};

CalendarConnectionModal.defaultProps = {
  errorMessage: null,
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#cbd5e1',
    marginRight: 10,
  },
  statusDotConnected: {
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  actions: {
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#8B1538',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  buttonSecondaryText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
});
