import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders pickleball tournament scheduler heading', () => {
  render(<App />);
  const headingElement = screen.getByRole('heading', { name: /Pickleball Tournament Scheduler/i });
  expect(headingElement).toBeInTheDocument();
});

test('renders welcome message', () => {
  render(<App />);
  const welcomeMessage = screen.getByText(/Welcome to the Pickleball Tournament Scheduler/i);
  expect(welcomeMessage).toBeInTheDocument();
});
