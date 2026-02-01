import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import App from './App'

test('renders campus tabs (SGW and LOYOLA)', () => {
  render(<App />)
  
  // Check that both campus tabs are rendered using testID
  expect(screen.getByTestId('campus-tab-SGW')).toBeOnTheScreen()
  expect(screen.getByTestId('campus-tab-LOYOLA')).toBeOnTheScreen()
  
  // Also verify the text content is displayed
  expect(screen.getByText('SGW')).toBeOnTheScreen()
  expect(screen.getByText('LOYOLA')).toBeOnTheScreen()
})

test('switches campus when tab is pressed', () => {
  render(<App />)
  
  // Initially SGW should be active (first tab)
  const sgwTab = screen.getByTestId('campus-tab-SGW')
  const loyolaTab = screen.getByTestId('campus-tab-LOYOLA')
  
  // Press LOYOLA tab
  fireEvent.press(loyolaTab)
  
  // Both tabs should still be visible
  expect(screen.getByText('SGW')).toBeOnTheScreen()
  expect(screen.getByText('LOYOLA')).toBeOnTheScreen()
})
