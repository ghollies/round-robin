import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders pickleball tournament scheduler heading', () => {
  render(<App />);
  const linkElement = screen.getByText(/Pickleball Tournament Scheduler/i);
  expect(linkElement).toBeInTheDocument();
});

test('renders welcome message', () => {
  render(<App />);
  const welcomeMessage = screen.getByText(
    /Welcome to the Pickleball Tournament Scheduler/i
  );
  expect(welcomeMessage).toBeInTheDocument();
});
