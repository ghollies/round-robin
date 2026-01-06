import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TournamentList from '../TournamentList';
import { NotificationProvider } from '../NotificationSystem';
import * as storage from '../../utils/storage';

// Mock the storage functions
jest.mock('../../utils/storage', () => ({
  loadTournaments: jest.fn(),
  loadParticipantsByTournament: jest.fn(),
  deleteTournament: jest.fn(),
}));

const mockStorage = storage as jest.Mocked<typeof storage>;

// Mock tournament data
const mockTournaments = [
  {
    id: 'tournament-1',
    name: 'Spring Championship',
    mode: 'individual-signup' as const,
    settings: {
      courtCount: 4,
      matchDuration: 20,
      pointLimit: 11,
      scoringRule: 'win-by-2' as const,
      timeLimit: false,
    },
    status: 'active' as const,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'tournament-2',
    name: 'Summer League',
    mode: 'pair-signup' as const,
    settings: {
      courtCount: 2,
      matchDuration: 15,
      pointLimit: 15,
      scoringRule: 'first-to-limit' as const,
      timeLimit: true,
    },
    status: 'setup' as const,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
];

const mockParticipants = [
  { id: 'p1', tournamentId: 'tournament-1', name: 'Player 1', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p2', tournamentId: 'tournament-1', name: 'Player 2', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
];

const renderTournamentList = (props = {}) => {
  const defaultProps = {
    onTournamentSelect: jest.fn(),
    onCreateNew: jest.fn(),
    ...props,
  };

  return render(
    <NotificationProvider>
      <TournamentList {...defaultProps} />
    </NotificationProvider>
  );
};

describe('TournamentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.loadTournaments.mockReturnValue(mockTournaments);
    mockStorage.loadParticipantsByTournament.mockReturnValue(mockParticipants);
  });

  it('renders tournament list with tournaments', async () => {
    renderTournamentList();

    await waitFor(() => {
      expect(screen.getByText('Your Tournaments')).toBeInTheDocument();
      expect(screen.getByText('Spring Championship')).toBeInTheDocument();
      expect(screen.getByText('Summer League')).toBeInTheDocument();
    });
  });

  it('shows empty state when no tournaments exist', async () => {
    mockStorage.loadTournaments.mockReturnValue([]);

    renderTournamentList();

    await waitFor(() => {
      expect(screen.getByText('No tournaments yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first pickleball tournament to get started!')).toBeInTheDocument();
    });
  });

  it('calls onCreateNew when create button is clicked', async () => {
    const onCreateNew = jest.fn();
    renderTournamentList({ onCreateNew });

    await waitFor(() => {
      expect(screen.getByText('+ Create New Tournament')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Create New Tournament'));
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('calls onTournamentSelect when manage button is clicked', async () => {
    const onTournamentSelect = jest.fn();
    renderTournamentList({ onTournamentSelect });

    await waitFor(() => {
      expect(screen.getByText('Manage Tournament')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Manage Tournament'));
    
    // Expect the enhanced tournament object with stats
    expect(onTournamentSelect).toHaveBeenCalledWith({
      ...mockTournaments[0],
      participantCount: 2,
      completedMatches: 0,
      totalMatches: 0
    });
  });

  it('filters tournaments by search term', async () => {
    renderTournamentList();

    await waitFor(() => {
      expect(screen.getByText('Spring Championship')).toBeInTheDocument();
      expect(screen.getByText('Summer League')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search tournaments...');
    fireEvent.change(searchInput, { target: { value: 'Spring' } });

    expect(screen.getByText('Spring Championship')).toBeInTheDocument();
    expect(screen.queryByText('Summer League')).not.toBeInTheDocument();
  });

  it('filters tournaments by status', async () => {
    renderTournamentList();

    await waitFor(() => {
      expect(screen.getByText('Spring Championship')).toBeInTheDocument();
      expect(screen.getByText('Summer League')).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue('All Tournaments');
    fireEvent.change(statusFilter, { target: { value: 'active' } });

    expect(screen.getByText('Spring Championship')).toBeInTheDocument();
    expect(screen.queryByText('Summer League')).not.toBeInTheDocument();
  });

  it('shows delete confirmation modal', async () => {
    renderTournamentList();

    await waitFor(() => {
      expect(screen.getAllByText('Delete')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Delete')[0]);

    expect(screen.getAllByText('Delete Tournament')[0]).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this tournament? This action cannot be undone.')).toBeInTheDocument();
  });

  it('deletes tournament when confirmed', async () => {
    renderTournamentList();

    await waitFor(() => {
      expect(screen.getAllByText('Delete')[0]).toBeInTheDocument();
    });

    // Click delete button
    fireEvent.click(screen.getAllByText('Delete')[0]);

    // Confirm deletion - use getAllByText to get the button, not the heading
    fireEvent.click(screen.getAllByText('Delete Tournament')[1]);

    expect(mockStorage.deleteTournament).toHaveBeenCalledWith('tournament-1');
  });

  it('displays correct status badges', async () => {
    renderTournamentList();

    await waitFor(() => {
      // Use more specific selectors to avoid conflicts with filter options
      expect(screen.getByText('Spring Championship').closest('.tournament-card')).toHaveTextContent('Active');
      expect(screen.getByText('Summer League').closest('.tournament-card')).toHaveTextContent('Setup');
    });
  });

  it('displays tournament details correctly', async () => {
    renderTournamentList();

    await waitFor(() => {
      expect(screen.getByText('Individual Signup')).toBeInTheDocument();
      expect(screen.getByText('Pair Signup')).toBeInTheDocument();
      expect(screen.getAllByText('2')[0]).toBeInTheDocument(); // participant count
    });
  });
});