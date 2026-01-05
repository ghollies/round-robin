import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders pickleball tournament scheduler heading', () => {
  render(<App />);
  const headingElement = screen.getByRole('heading', { name: /Pickleball Tournament Scheduler/i });
  expect(headingElement).toBeInTheDocument();
});

test('renders tournament setup form', () => {
  render(<App />);
  const setupHeading = screen.getByRole('heading', { name: /Tournament Setup/i });
  expect(setupHeading).toBeInTheDocument();
  
  const configureText = screen.getByText(/Configure your pickleball tournament parameters/i);
  expect(configureText).toBeInTheDocument();
});
