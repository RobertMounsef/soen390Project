/**
 * Wrapper that uses useCalendarAuth and renders CalendarConnectionModal.
 * Loaded lazily from MapScreen so calendar native modules (expo-auth-session,
 * expo-secure-store, expo-web-browser) are not required at app startup (e.g. e2e).
 */
import React from 'react';
import useCalendarAuth from '../hooks/useCalendarAuth';
import CalendarConnectionModal from '../components/CalendarConnectionModal';

export default function CalendarConnectionFeature({ visible, onClose }) {
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
    />
  );
}
