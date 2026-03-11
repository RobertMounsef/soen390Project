/**
 * Wrapper that uses useCalendarAuth and renders CalendarConnectionModal.
 * Loaded lazily from MapScreen so calendar native modules (expo-auth-session,
 * expo-secure-store, expo-web-browser) are not required at app startup (e.g. e2e).
 */
import React from 'react';
import PropTypes from 'prop-types';
import useCalendarAuth from '../hooks/useCalendarAuth';
import CalendarConnectionModal from '../components/CalendarConnectionModal';

export default function CalendarConnectionFeature({ visible, onClose, nextClass, onGetDirections, onRetry }) {
  const calendarAuth = useCalendarAuth();
  return (
    <CalendarConnectionModal
      visible={visible}
      onClose={onClose}
      status={calendarAuth.status}
      isConnected={calendarAuth.isConnected}
      errorMessage={calendarAuth.errorMessage}
      onConnect={calendarAuth.connect}
      onDisconnect={calendarAuth.disconnect}
      isReady={calendarAuth.isReady}
      calendars={calendarAuth.calendars}
      selectedCalendarIds={calendarAuth.selectedCalendarIds}
      calendarsLoading={calendarAuth.calendarsLoading}
      calendarsError={calendarAuth.calendarsError}
      onToggleCalendar={calendarAuth.toggleCalendarSelection}
      // Reloading the calendar list also re-triggers next-class detection because
      // the user may have toggled calendar selection, which changes which events
      // are fetched. The two actions are intentionally coupled here.
      onReloadCalendars={() => {
        calendarAuth.reloadCalendars();
        if (onRetry) {
          onRetry();
        }
      }}
      nextClass={nextClass}
      onGetDirections={onGetDirections}
      onRetry={onRetry}
    />
  );
}

CalendarConnectionFeature.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  nextClass: PropTypes.object,
  onGetDirections: PropTypes.func,
  onRetry: PropTypes.func,
};

CalendarConnectionFeature.defaultProps = {
  nextClass: null,
  onGetDirections: null,
  onRetry: null,
};
