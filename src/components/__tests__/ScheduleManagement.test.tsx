import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleManagement from '../ScheduleManagement';
import { Match, Round } from '../../types/tournament';

// Mock the entire scheduleManagement module to avoid complex class mocking
jest.mock('../../utils/scheduleManagement', () => ({
  ScheduleChangeHistory: function() {
    return {
      addChange: jest.fn(),
      getHistory: jest.fn(() => []),
      canUndo: jest.fn(() => false),
      getUndoableChange: jest.fn(() => null),
      clear: jest.fn()
    };
  },
  ConflictDetector: {
    detectConflicts: jest.fn(() => []), // Always return empty array by default
    validateMatchReschedule: jest.fn(() => [])
  },
  ScheduleManipulator: {
    validateRoundSwap: jest.fn(() => ({
      isValid: true,
      errors: [],
      warnings: []
    })),
    swapRoundsWithCourtRebalancing: jest.fn(() => ({
      updatedRounds: [],
      updatedMatches: []
    })),
    rescheduleMatch: jest.fn((match, newTime, newCourt) => ({
      ...match,
      scheduledTime: newTime,
      courtNumber: newCourt
    })),
    reassignCourt: jest.fn((match, newCourt) => ({
      ...match,
      courtNumber: newCourt
    })),
    swapRounds: jest.fn(() => ({
      updatedRounds: [],
      updatedMatches: []
    })),
    undoLastChange: jest.fn(() => ({
      updatedMatches: [],
      updatedRounds: []
    }))
  }
}));

describe('ScheduleManagement', () => {
  const mockMatches: Match[] = [
    {
      id: 'match-1',
      tournamentId: 'tournament-1',
      roundNumber: 1,
      matchNumber: 1,
      team1Id: 'team1',
      team2Id: 'team2',
      courtNumber: 1,
      scheduledTime: new Date('2024-01-01T10:00:00'),
      status: 'scheduled'
    },
    {
      id: 'match-2',
      tournamentId: 'tournament-1',
      roundNumber: 1,
      matchNumber: 2,
      team1Id: 'team3',
      team2Id: 'team4',
      courtNumber: 2,
      scheduledTime: new Date('2024-01-01T10:00:00'),
      status: 'scheduled'
    }
  ];

  const mockRounds: Round[] = [
    {
      id: 'round-1',
      tournamentId: 'tournament-1',
      roundNumber: 1,
      status: 'pending',
      matches: mockMatches
    }
  ];

  const mockTeams = [
    {
      id: 'team1',
      tournamentId: 'tournament-1',
      player1Id: 'player-1',
      player2Id: 'player-2',
      isPermanent: false
    },
    {
      id: 'team2',
      tournamentId: 'tournament-1',
      player1Id: 'player-3',
      player2Id: 'player-4',
      isPermanent: false
    },
    {
      id: 'team3',
      tournamentId: 'tournament-1',
      player1Id: 'player-5',
      player2Id: 'player-6',
      isPermanent: false
    },
    {
      id: 'team4',
      tournamentId: 'tournament-1',
      player1Id: 'player-7',
      player2Id: 'player-8',
      isPermanent: false
    }
  ];

  const mockParticipants = [
    {
      id: 'player-1',
      tournamentId: 'tournament-1',
      name: 'Alice Smith',
      statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
    },
    {
      id: 'player-2',
      tournamentId: 'tournament-1',
      name: 'Bob Johnson',
      statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
    },
    {
      id: 'player-3',
      tournamentId: 'tournament-1',
      name: 'Charlie Brown',
      statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
    },
    {
      id: 'player-4',
      tournamentId: 'tournament-1',
      name: 'Diana Prince',
      statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
    },
    {
      id: 'player-5',
      tournamentId: 'tournament-1',
      name: 'Eve Wilson',
      statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
    },
    {
      id: 'player-6',
      tournamentId: 'tournament-1',
      name: 'Frank Miller',
      statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
    },
    {
      id: 'player-7',
      tournamentId: 'tournament-1',
      name: 'Grace Lee',
      statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
    },
    {
      id: 'player-8',
      tournamentId: 'tournament-1',
      name: 'Henry Davis',
      statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
    }
  ];

  const defaultProps = {
    matches: mockMatches,
    rounds: mockRounds,
    teams: mockTeams,
    participants: mockParticipants,
    courtCount: 3,
    matchDuration: 30,
    onMatchesUpdate: jest.fn(),
    onRoundsUpdate: jest.fn(),
    onConflictsDetected: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders schedule management interface', () => {
    render(<ScheduleManagement {...defaultProps} />);

    expect(screen.getByText('Schedule Management')).toBeInTheDocument();
    expect(screen.getByText('Tournament Rounds')).toBeInTheDocument();
    expect(screen.getByText('Undo Last Change')).toBeInTheDocument();
    expect(screen.getByText('Conflicts (0)')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  test('displays round information', () => {
    render(<ScheduleManagement {...defaultProps} />);

    // Check for round display
    expect(screen.getByText('Round 1')).toBeInTheDocument();
    expect(screen.getByText('Matches:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 matches in round 1
  });

  test('displays match time correctly in round view', () => {
    render(<ScheduleManagement {...defaultProps} />);

    // The time should be formatted as "10:00 AM" in the round match summaries
    expect(screen.getAllByText('10:00 AM')).toHaveLength(2);
  });

  test('shows round swap controls when there are multiple incomplete rounds', () => {
    const multipleRounds = [
      ...mockRounds,
      {
        id: 'round-2',
        tournamentId: 'tournament-1',
        roundNumber: 2,
        status: 'pending' as const,
        matches: []
      }
    ];

    render(<ScheduleManagement {...defaultProps} rounds={multipleRounds} />);
    
    expect(screen.getByText(/Swap Rounds/)).toBeInTheDocument();
  });

  test('handles empty matches and rounds', () => {
    const emptyProps = {
      ...defaultProps,
      matches: [],
      rounds: []
    };

    render(<ScheduleManagement {...emptyProps} />);

    expect(screen.getByText('Schedule Management')).toBeInTheDocument();
    expect(screen.getByText('Tournament Rounds')).toBeInTheDocument();
  });

  test('shows locked status for rounds with completed matches', () => {
    const completedMatches = [
      {
        ...mockMatches[0],
        status: 'completed' as const
      }
    ];

    const propsWithCompletedMatch = {
      ...defaultProps,
      matches: completedMatches
    };

    render(<ScheduleManagement {...propsWithCompletedMatch} />);

    // Round should show as locked when it has completed matches
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  test('displays player names in round match summaries', () => {
    render(<ScheduleManagement {...defaultProps} />);

    // Check that team names are displayed in the format "Player1/Player2"
    expect(screen.getByText('Alice ../Bob Jo..')).toBeInTheDocument();
    expect(screen.getByText('Charli../Diana ..')).toBeInTheDocument();
    expect(screen.getByText('Eve Wi../Frank ..')).toBeInTheDocument();
    expect(screen.getByText('Grace ../Henry ..')).toBeInTheDocument();
  });

  test('disables undo button when no changes available', () => {
    render(<ScheduleManagement {...defaultProps} />);

    const undoButton = screen.getByText('Undo Last Change');
    expect(undoButton).toBeDisabled();
  });
});