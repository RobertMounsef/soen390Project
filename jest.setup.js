// Jest setup file to handle React Native Testing Library compatibility
import '@testing-library/react-native/extend-expect';

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
