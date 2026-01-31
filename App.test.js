import React from 'react'
import { render, screen } from '@testing-library/react-native'
import App from './App'

test('renders campus tabs (SGW and LOYOLA)', () => {
  render(<App />)
  expect(screen.getByRole('tab', { name: /Campus SGW/i })).toBeOnTheScreen()
  expect(screen.getByRole('tab', { name: /Campus LOYOLA/i })).toBeOnTheScreen()
})
