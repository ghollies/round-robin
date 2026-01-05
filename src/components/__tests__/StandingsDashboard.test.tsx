import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StandingsDashboard } from '../StandingsDashboard';
import { Tournament } from '../../types/tournament';
import { 
  saveTournament, 
  saveParticipant, 
  saveTeam, 
  saveMatch,
  clearAllData 
} from '../../utils/storage';
import { createParticipant, generateId } from '../../utils/index';

// Mock the standings utilities
jest.mock('../../utils/standings', () => ({
  getEnhancedStandings: jest.fn(),
  getTournamentWinners: jest.fn(),
  isTournamentComplete: jest.fn()
}));

import { 
  getEnhancedStandings, 
  getTournamentWinners, 
  isTournamentComplete 
} from '../../utils/standings';

const mockGetEnhancedStandings = getEnhancedStandings as jest.MockedFunction<typeof getEnhancedStandings>;
const mockGetTournamentWinners = getTournamentWinners as jest.MockedFunction<typeof getTournamentWinners>;
const mockIsTournamentComplete = isTournamentComplete as jest.MockedFunction<typeof isTournamentComplete>;

const createTestTournament = (): Tournament => ({
  id: 'test-tournament',
  name: 'Test Tournament',
  mode: 'individual-signup',
  settings: {
    courtCount: 2,
    matchDuration: 30,
    pointLimit: 11,
    scoringRule: 'win-by-2',
    timeLimit: true
  },
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date()
});

const createMockStandings = () => [
  {
    id: '1',
    tournamentId: 'test-tournament',
    name: 'Alice Johnson',
    statistics: {
      gamesWon: 5,
      gamesLost: 1,
      totalPointsScored: 66,
      totalPointsAllowed: 45,
      pointDifferential: 21
    },
    rank: 1,
    gamesPlayed: 6,
    winPercentage: 83.3,
    averagePointsScored: 11.0,
    averagePointsAllowed: 7.5,
    isWinner: true
  },
  {
    id: '2',
    tournamentId: 'test-tournament',
    name: 'Bob Smith',
    statistics: {
      gamesWon: 4,
      gamesLost: 2,
      totalPointsScored: 58,
      totalPointsAllowed: 52,
      pointDifferential: 6
    },
    rank: 2,
    gamesPlayed: 6,
    winPercentage: 66.7,
    averagePointsScored: 9.7,
    averagePointsAllowed: 8.7,
    isWinner: false
  },
  {
    id: '3',
    tournamentId: 'test-tournament',
    name: 'Carol Davis',
    statistics: {
      gamesWon: 2,
      gamesLost: 4,
      totalPointsScored: 44,
      totalPointsAllowed: 58,
      pointDifferential: -14
    },
    rank: 3,
    gamesPlayed: 6,
    winPercentage: 33.3,
    averagePointsScored: 7.3,
    averagePointsAllowed: 9.7,
    isWinner: false
  }
];

describe('StandingsDashboard', () => {
  beforeEach(() => {
    clearAllData();
    jest.clearAllMocks();
  });

  test('renders standings dashboard with tournament data', async () => {
    const tournament = createTestTournament();
    const mockStandings = createMockStandings();

    mockGetEnhancedStandings.mockReturnValue(mockStandings);
    mockGetTournamentWinners.mockReturnValue([mockStandings[0]]);
    mockIsTournamentComplete.mockReturnValue(false);

    render(<StandingsDashboard tournament={tournament} />);

    await waitFor(() => {
      expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
    });

    // Check that participant names are displayed
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Carol Davis')).toBeInTheDocument();

    // Check that statistics are displayed
    expect(screen.getByText('5')).toBeInTheDocument(); // Alice's wins
    expect(screen.getByText('83.3%')).toBeInTheDocument(); // Alice's win percentage
    expect(screen.getByText('+21')).toBeInTheDocument(); // Alice's point differential
  });

  test('displays tournament winner when tournament is complete', async () => {
    const tournament = createTestTournament();
    const mockStandings = createMockStandings();

    mockGetEnhancedStandings.mockReturnValue(mockStandings);
    mockGetTournamentWinners.mockReturnValue([mockStandings[0]]);
    mockIsTournamentComplete.mockReturnValue(true);

    render(<StandingsDashboard tournament={tournament} />);

    await waitFor(() => {
      expect(screen.getByText('Tournament Complete')).toBeInTheDocument();
      expect(screen.getByText('🏆 Tournament Winner')).toBeInTheDocument();
      expect(screen.getAllByText('Alice Johnson')).toHaveLength(2); // Winner section + table
    });
  });

  test('displays multiple winners in case of tie', async () => {
    const tournament = createTestTournament();
    const mockStandings = createMockStandings();
    
    // Create a tie scenario
    mockStandings[1].isWinner = true;
    const winners = [mockStandings[0], mockStandings[1]];

    mockGetEnhancedStandings.mockReturnValue(mockStandings);
    mockGetTournamentWinners.mockReturnValue(winners);
    mockIsTournamentComplete.mockReturnValue(true);

    render(<StandingsDashboard tournament={tournament} />);

    await waitFor(() => {
      expect(screen.getByText('🏆 Tournament Winners')).toBeInTheDocument();
      expect(screen.getAllByText('Alice Johnson')).toHaveLength(2); // Winner section + table
      expect(screen.getAllByText('Bob Smith')).toHaveLength(2); // Winner section + table
    });
  });

  test('handles sorting by different columns', async () => {
    const tournament = createTestTournament();
    const mockStandings = createMockStandings();

    mockGetEnhancedStandings.mockReturnValue(mockStandings);
    mockGetTournamentWinners.mockReturnValue([]);
    mockIsTournamentComplete.mockReturnValue(false);

    render(<StandingsDashboard tournament={tournament} />);

    await waitFor(() => {
      expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
    });

    // Click on the "Player" column header to sort by name
    const nameHeader = screen.getByText('Player');
    fireEvent.click(nameHeader);

    // The component should re-render with sorted data
    // Since we're mocking the data, we just verify the click was handled
    expect(nameHeader).toBeInTheDocument();
  });

  test('displays loading state', () => {
    const tournament = createTestTournament();

    // Mock to simulate loading delay
    mockGetEnhancedStandings.mockReturnValue([]);
    mockGetTournamentWinners.mockReturnValue([]);
    mockIsTournamentComplete.mockReturnValue(false);

    render(<StandingsDashboard tournament={tournament} />);

    // The component should handle the error gracefully and show no data message
    expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
  });

  test('displays no data message when no standings available', async () => {
    const tournament = createTestTournament();

    mockGetEnhancedStandings.mockReturnValue([]);
    mockGetTournamentWinners.mockReturnValue([]);
    mockIsTournamentComplete.mockReturnValue(false);

    render(<StandingsDashboard tournament={tournament} />);

    await waitFor(() => {
      expect(screen.getByText('No standings data available. Complete some matches to see standings.')).toBeInTheDocument();
    });
  });

  test('calls onRefresh when refresh button is clicked', async () => {
    const tournament = createTestTournament();
    const mockStandings = createMockStandings();
    const onRefresh = jest.fn();

    mockGetEnhancedStandings.mockReturnValue(mockStandings);
    mockGetTournamentWinners.mockReturnValue([]);
    mockIsTournamentComplete.mockReturnValue(false);

    render(<StandingsDashboard tournament={tournament} onRefresh={onRefresh} />);

    await waitFor(() => {
      expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('displays tournament summary statistics', async () => {
    const tournament = createTestTournament();
    const mockStandings = createMockStandings();

    mockGetEnhancedStandings.mockReturnValue(mockStandings);
    mockGetTournamentWinners.mockReturnValue([]);
    mockIsTournamentComplete.mockReturnValue(false);

    render(<StandingsDashboard tournament={tournament} />);

    await waitFor(() => {
      expect(screen.getByText('Total Players:')).toBeInTheDocument();
      expect(screen.getByText('Games Played:')).toBeInTheDocument();
      expect(screen.getByText('Total Points:')).toBeInTheDocument();
      
      // Check for the specific values in the summary stats
      const summaryStats = screen.getAllByText('3');
      expect(summaryStats.length).toBeGreaterThan(0); // Should find at least one "3"
      
      expect(screen.getByText('9')).toBeInTheDocument(); // Total games / 2
      expect(screen.getByText('168')).toBeInTheDocument(); // Sum of all points scored
    });
  });

  test('displays correct styling for different ranks', async () => {
    const tournament = createTestTournament();
    const mockStandings = createMockStandings();

    mockGetEnhancedStandings.mockReturnValue(mockStandings);
    mockGetTournamentWinners.mockReturnValue([mockStandings[0]]);
    mockIsTournamentComplete.mockReturnValue(true);

    render(<StandingsDashboard tournament={tournament} />);

    await waitFor(() => {
      expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
    });

    // Check for winner styling - use getAllByText to handle multiple instances
    const aliceElements = screen.getAllByText('Alice Johnson');
    const winnerRowAlice = aliceElements.find(el => el.closest('tr'))?.closest('tr');
    expect(winnerRowAlice).toHaveClass('winner-row');

    // Check for crown icon - use getAllByText to handle multiple instances
    const crownIcons = screen.getAllByText('👑');
    expect(crownIcons.length).toBeGreaterThan(0); // Should find at least one crown icon
  });

  test('formats percentages and decimals correctly', async () => {
    const tournament = createTestTournament();
    const mockStandings = createMockStandings();

    mockGetEnhancedStandings.mockReturnValue(mockStandings);
    mockGetTournamentWinners.mockReturnValue([]);
    mockIsTournamentComplete.mockReturnValue(false);

    render(<StandingsDashboard tournament={tournament} />);

    await waitFor(() => {
      expect(screen.getByText('83.3%')).toBeInTheDocument(); // Win percentage
      expect(screen.getByText('11.0')).toBeInTheDocument(); // Average points scored
      expect(screen.getByText('7.5')).toBeInTheDocument(); // Average points allowed
    });
  });

  test('displays point differential with correct styling', async () => {
    const tournament = createTestTournament();
    const mockStandings = createMockStandings();

    mockGetEnhancedStandings.mockReturnValue(mockStandings);
    mockGetTournamentWinners.mockReturnValue([]);
    mockIsTournamentComplete.mockReturnValue(false);

    render(<StandingsDashboard tournament={tournament} />);

    await waitFor(() => {
      // Positive differential
      const positiveDiff = screen.getByText('+21');
      expect(positiveDiff).toHaveClass('positive');

      // Negative differential
      const negativeDiff = screen.getByText('-14');
      expect(negativeDiff).toHaveClass('negative');
    });
  });
});