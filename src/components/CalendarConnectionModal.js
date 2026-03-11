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

// ─── Helper: renders the content of the Next Class section ───────────────────
// Extracted to avoid a nested ternary and reduce cognitive complexity.
function renderNextClassContent({ nextClass, onClose, onGetDirections, onRetry, styles }) {
  // Still fetching
  if (!nextClass || nextClass.status === 'loading' || nextClass.status === 'idle') {
    return <Text style={styles.nextClassUnknown}>Checking your calendar…</Text>;
  }

  // API / network error
  if (nextClass.status === 'error') {
    return (
      <>
        <Text style={styles.nextClassUnknown}>
          {nextClass.error || 'Could not load calendar events.'}
        </Text>
        {onRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry loading calendar"
            testID="retry-calendar"
          >
            <Text style={styles.retryButtonText}>🔄 Retry</Text>
          </TouchableOpacity>
        )}
      </>
    );
  }

  // Building successfully resolved
  if (nextClass.status === 'resolved' && nextClass.buildingId) {
    const handlePress = () => {
      onClose();
      onGetDirections?.();
    };
    return (
      <>
        <Text style={styles.nextClassEvent} numberOfLines={1}>
          {nextClass.event?.summary ?? 'Class'}
          {nextClass.room ? ` · Room ${nextClass.room}` : ''}
        </Text>
        <Text style={styles.nextClassBuilding}>
          {nextClass.buildingName ?? nextClass.buildingId}
        </Text>
        <TouchableOpacity
          style={styles.getDirectionsButton}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel="Get directions to next class"
          testID="go-to-class-button"
        >
          <Text style={styles.getDirectionsButtonText}>🗺️ Get Directions</Text>
        </TouchableOpacity>
      </>
    );
  }

  // Event found but no recognised building
  if (nextClass.status === 'unresolved') {
    const noLocationMsg = nextClass.event?.summary
      ? `"${nextClass.event.summary}" — no building found.`
      : 'No upcoming events with a Concordia building location.';
    const locationLine = nextClass.event?.location
      ? `📍 Location: ${nextClass.event.location}`
      : '⚠️ No location field set on this event.';
    return (
      <View>
        <Text style={styles.nextClassUnknown}>{noLocationMsg}</Text>
        <Text style={styles.nextClassDebug}>{locationLine}</Text>
      </View>
    );
  }

  return null;
}

export default function CalendarConnectionModal({
  visible,
  onClose,
  status,
  isConnected,
  errorMessage,
  onConnect,
  onDisconnect,
  isReady,
  calendars,
  selectedCalendarIds,
  calendarsLoading,
  calendarsError,
  onToggleCalendar,
  onReloadCalendars,
  nextClass,
  onGetDirections,
  onRetry,
}) {
  const isLoading = status === 'loading';
  const showError = status === 'error' && errorMessage;
  const hasCalendars = Array.isArray(calendars) && calendars.length > 0;

  const renderCalendarRow = (item) => {
    const isSelected = selectedCalendarIds?.includes(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.calendarRow}
        onPress={() => onToggleCalendar?.(item.id)}
        disabled={!onToggleCalendar}
        accessibilityRole="button"
        accessibilityLabel={`Toggle calendar ${item.summary}`}
        testID={`calendar-row-${item.id}`}
      >
        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}
        >
          {isSelected && <Text style={styles.checkboxIcon}>✓</Text>}
        </View>
        <View style={styles.calendarTextContainer}>
          <Text style={styles.calendarName} numberOfLines={1}>
            {item.summary || item.id}
          </Text>
          {item.primary && (
            <Text style={styles.calendarTag}>Primary</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
        <TouchableOpacity activeOpacity={1} onPress={(e) => e?.stopPropagation?.()} style={styles.card} testID="calendar-modal-card">
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

          {/* Next Class section — shown whenever connected */}
          {isConnected && (
            <View style={styles.nextClassSection}>
              <View style={styles.nextClassHeader}>
                <Text style={styles.nextClassTitle}>📅 Next Class</Text>
              </View>
              {renderNextClassContent({ nextClass, onClose, onGetDirections, onRetry, styles })}
            </View>
          )}

          {/* Calendar selection */}
          {isConnected && (
            <View style={styles.calendarSection}>
              <View style={styles.calendarHeaderRow}>
                <Text style={styles.calendarSectionTitle}>Calendars to use</Text>
                {onReloadCalendars && (
                  <TouchableOpacity
                    style={styles.reloadButton}
                    onPress={onReloadCalendars}
                    disabled={calendarsLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Reload calendars"
                    testID="reload-calendars"
                  >
                    <Text style={styles.reloadButtonText}>Refresh</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!!calendarsError && (
                <Text style={styles.calendarErrorText}>{calendarsError}</Text>
              )}

              {calendarsLoading && (
                <View style={styles.calendarLoadingRow}>
                  <ActivityIndicator size="small" color="#8B1538" />
                  <Text style={styles.calendarLoadingText}>Loading calendars…</Text>
                </View>
              )}

              {!calendarsLoading && !hasCalendars && (
                <Text style={styles.calendarEmptyText}>
                  No calendars found for this account.
                </Text>
              )}

              {!calendarsLoading && hasCalendars && (
                <View style={styles.calendarList}>
                  {calendars.map(renderCalendarRow)}
                </View>
              )}

              <Text style={styles.calendarHint}>
                Only events from the calendars selected above will be used for class navigation.
              </Text>
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
  calendars: PropTypes.arrayOf(PropTypes.object),
  selectedCalendarIds: PropTypes.arrayOf(PropTypes.string),
  calendarsLoading: PropTypes.bool,
  calendarsError: PropTypes.string,
  onToggleCalendar: PropTypes.func,
  onReloadCalendars: PropTypes.func,
  nextClass: PropTypes.shape({
    status: PropTypes.string,
    event: PropTypes.object,
    buildingId: PropTypes.string,
    room: PropTypes.string,
    buildingName: PropTypes.string,
    error: PropTypes.string,
  }),
  onGetDirections: PropTypes.func,
  onRetry: PropTypes.func,
};

CalendarConnectionModal.defaultProps = {
  errorMessage: null,
  calendars: [],
  selectedCalendarIds: [],
  calendarsLoading: false,
  calendarsError: null,
  onToggleCalendar: null,
  onReloadCalendars: null,
  nextClass: null,
  onGetDirections: null,
  onRetry: null,
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
    backgroundColor: '#005AB5',
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
    color: '#A32215',
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
    backgroundColor: '#DC3220',
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
  calendarSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2933',
  },
  reloadButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  reloadButtonText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  calendarErrorText: {
    fontSize: 13,
    color: '#A32215',
    marginBottom: 6,
  },
  calendarLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  calendarLoadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  calendarEmptyText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  calendarList: {
    maxHeight: 180,
    marginBottom: 6,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#DC3220',
    borderColor: '#DC3220',
  },
  checkboxIcon: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  calendarName: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  calendarTag: {
    fontSize: 11,
    color: '#005AB5',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '600',
  },
  calendarHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },

  // ─── Next Class Section ───────────────────────────────────────────────────
  nextClassSection: {
    marginTop: 16,
    paddingTop: 14,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  nextClassHeader: {
    marginBottom: 8,
  },
  nextClassTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a202c',
  },
  nextClassEvent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 2,
  },
  nextClassBuilding: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  getDirectionsButton: {
    backgroundColor: '#8B1538',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  getDirectionsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  nextClassUnknown: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  nextClassDebug: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  retryButtonText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
});