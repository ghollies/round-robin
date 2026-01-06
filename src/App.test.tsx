import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock the storage functions to return empty tournaments list
jest.mock('./utils/storage', () => ({
  loadTournaments: jest.fn(() => []),
  loadParticipantsByTournament: jest.fn(() => []),
  initializeStorage: jest.fn(),
  loadTournament: jest.fn(() => null),
  saveTournament: jest.fn(),
  deleteTournament: jest.fn(),
  loadParticipants: jest.fn(() => []),
  loadTeams: jest.fn(() => []),
  loadMatches: jest.fn(() => []),
  loadRounds: jest.fn(() => []),
  getStandings: jest.fn(() => []),
}));

test('renders pickleball tournament scheduler heading', () => {
  render(<App />);
  const headingElement = screen.getByRole('heading', { name: /Pickleball Tournament Scheduler/i });
  expect(headingElement).toBeInTheDocument();
});

test('renders tournament list by default', async () => {
  render(<App />);
  
  // Wait for the tournament list to load
  await waitFor(() => {
    // Should show the tournament list heading
    const listHeading = screen.getByRole('heading', { name: /Your Tournaments/i });
    expect(listHeading).toBeInTheDocument();
  });
  
  // Should show empty state since no tournaments exist
  const emptyStateText = screen.getByText(/No tournaments yet/i);
  expect(emptyStateText).toBeInTheDocument();
  
  // Should show create tournament button
  const createButton = screen.getByText(/Create New Tournament/i);
  expect(createButton).toBeInTheDocument();
});
