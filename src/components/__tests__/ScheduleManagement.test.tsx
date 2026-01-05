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
  },
  TimeSlotManager: {
    findAvailableTimeSlot: jest.fn(() => new Date('2024-01-01T10:30:00'))
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

  const defaultProps = {
    matches: mockMatches,
    rounds: mockRounds,
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
    expect(screen.getByText('Undo Last Change')).toBeInTheDocument();
    expect(screen.getByText('Conflicts (0)')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  test('displays court columns with matches', () => {
    render(<ScheduleManagement {...defaultProps} />);

    // Check for court headers specifically
    expect(screen.getByRole('heading', { name: /Court 1/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Court 2/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Court 3/ })).toBeInTheDocument();

    expect(screen.getByText('Match 1')).toBeInTheDocument();
    expect(screen.getByText('Match 2')).toBeInTheDocument();
  });

  test('displays match time correctly', () => {
    render(<ScheduleManagement {...defaultProps} />);

    // The time should be formatted as "10:00 AM" - use getAllByText since both matches have same time
    expect(screen.getAllByText('10:00 AM')).toHaveLength(2);
  });

  test('shows round information', () => {
    render(<ScheduleManagement {...defaultProps} />);

    // Use getAllByText since both matches are in Round 1
    expect(screen.getAllByText(/Round \d+/)).toHaveLength(2);
  });

  test('handles empty matches and rounds', () => {
    const emptyProps = {
      ...defaultProps,
      matches: [],
      rounds: []
    };

    render(<ScheduleManagement {...emptyProps} />);

    expect(screen.getByText('Schedule Management')).toBeInTheDocument();
    // Use getAllByText since all courts will show "0 matches"
    expect(screen.getAllByText(/Court \d+/)).toHaveLength(3);
    expect(screen.getAllByText('0 matches')).toHaveLength(3);
  });

  test('prevents dragging completed matches', () => {
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

    const matchCard = screen.getByText('Match 1').closest('.match-card');
    expect(matchCard).toHaveAttribute('draggable', 'false');
  });

  test('disables undo button when no changes available', () => {
    render(<ScheduleManagement {...defaultProps} />);

    const undoButton = screen.getByText('Undo Last Change');
    expect(undoButton).toBeDisabled();
  });
});