import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleManagement from '../ScheduleManagement';
import { Match, Round, ScheduleConflict } from '../../types/tournament';

// Mock the schedule management utilities
jest.mock('../../utils/scheduleManagement', () => ({
  ScheduleChangeHistory: jest.fn().mockImplementation(() => ({
    addChange: jest.fn(),
    getHistory: jest.fn(() => []),
    canUndo: jest.fn(() => false),
    getUndoableChange: jest.fn(() => null),
    clear: jest.fn()
  })),
  ConflictDetector: {
    detectConflicts: jest.fn(() => []),
    validateMatchReschedule: jest.fn(() => [])
  },
  ScheduleManipulator: {
    rescheduleMatch: jest.fn(),
    reassignCourt: jest.fn(),
    swapRounds: jest.fn(),
    undoLastChange: jest.fn()
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

    expect(screen.getByText('Court 1')).toBeInTheDocument();
    expect(screen.getByText('Court 2')).toBeInTheDocument();
    expect(screen.getByText('Court 3')).toBeInTheDocument();

    expect(screen.getByText('Match 1')).toBeInTheDocument();
    expect(screen.getByText('Match 2')).toBeInTheDocument();
  });

  test('shows conflicts when detected', () => {
    const conflictsProps = {
      ...defaultProps,
      onConflictsDetected: jest.fn()
    };

    const { rerender } = render(<ScheduleManagement {...conflictsProps} />);

    // Simulate conflicts being detected
    const mockConflicts: ScheduleConflict[] = [
      {
        id: 'conflict-1',
        type: 'court-double-booking',
        severity: 'error',
        message: 'Court 1 has multiple matches at the same time',
        affectedMatches: ['match-1', 'match-2'],
        suggestions: ['Reschedule one match']
      }
    ];

    // Mock the ConflictDetector to return conflicts
    const { ConflictDetector } = require('../../utils/scheduleManagement');
    ConflictDetector.detectConflicts.mockReturnValue(mockConflicts);

    rerender(<ScheduleManagement {...conflictsProps} />);

    expect(screen.getByText('Conflicts (1)')).toBeInTheDocument();
  });

  test('toggles conflicts panel visibility', () => {
    const conflictsProps = {
      ...defaultProps
    };

    render(<ScheduleManagement {...conflictsProps} />);

    const conflictsButton = screen.getByText('Conflicts (0)');
    fireEvent.click(conflictsButton);

    // Since there are no conflicts, the panel shouldn't appear
    expect(screen.queryByText('Schedule Conflicts')).not.toBeInTheDocument();
  });

  test('toggles history panel visibility', () => {
    render(<ScheduleManagement {...defaultProps} />);

    const historyButton = screen.getByText('History');
    fireEvent.click(historyButton);

    expect(screen.getByText('Change History')).toBeInTheDocument();
  });

  test('handles match selection', () => {
    render(<ScheduleManagement {...defaultProps} />);

    const matchCard = screen.getByText('Match 1').closest('.match-card');
    expect(matchCard).toBeInTheDocument();

    fireEvent.click(matchCard!);

    expect(screen.getByText('Selected: 1 matches')).toBeInTheDocument();
  });

  test('handles bulk match rescheduling', async () => {
    render(<ScheduleManagement {...defaultProps} />);

    // Select a match
    const matchCard = screen.getByText('Match 1').closest('.match-card');
    fireEvent.click(matchCard!);

    // Use bulk reschedule
    const courtSelect = screen.getByDisplayValue('Move to court...');
    fireEvent.change(courtSelect, { target: { value: '3' } });

    await waitFor(() => {
      expect(defaultProps.onMatchesUpdate).toHaveBeenCalled();
    });
  });

  test('clears match selection', () => {
    render(<ScheduleManagement {...defaultProps} />);

    // Select a match
    const matchCard = screen.getByText('Match 1').closest('.match-card');
    fireEvent.click(matchCard!);

    expect(screen.getByText('Selected: 1 matches')).toBeInTheDocument();

    // Clear selection
    const clearButton = screen.getByText('Clear Selection');
    fireEvent.click(clearButton);

    expect(screen.queryByText('Selected: 1 matches')).not.toBeInTheDocument();
  });

  test('handles drag and drop operations', () => {
    render(<ScheduleManagement {...defaultProps} />);

    const matchCard = screen.getByText('Match 1').closest('.match-card');
    const courtColumn = screen.getByText('Court 2').closest('.court-column');

    expect(matchCard).toBeInTheDocument();
    expect(courtColumn).toBeInTheDocument();

    // Simulate drag start
    fireEvent.dragStart(matchCard!, {
      dataTransfer: {
        effectAllowed: 'move',
        setData: jest.fn()
      }
    });

    // Simulate drag over
    fireEvent.dragOver(courtColumn!, {
      dataTransfer: {
        dropEffect: 'move'
      }
    });

    // Simulate drop
    fireEvent.drop(courtColumn!, {
      dataTransfer: {
        getData: jest.fn(() => 'match-1')
      }
    });

    // Simulate drag end
    fireEvent.dragEnd(matchCard!);
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

  test('shows undo button state correctly', () => {
    const { ScheduleChangeHistory } = require('../../utils/scheduleManagement');
    const mockHistory = {
      addChange: jest.fn(),
      getHistory: jest.fn(() => []),
      canUndo: jest.fn(() => true),
      getUndoableChange: jest.fn(() => ({ id: 'change-1' })),
      clear: jest.fn()
    };
    ScheduleChangeHistory.mockImplementation(() => mockHistory);

    render(<ScheduleManagement {...defaultProps} />);

    const undoButton = screen.getByText('Undo Last Change');
    expect(undoButton).not.toBeDisabled();
  });

  test('handles undo operation', () => {
    const { ScheduleChangeHistory, ScheduleManipulator } = require('../../utils/scheduleManagement');
    
    const mockChange = {
      id: 'change-1',
      type: 'match-reschedule',
      description: 'Test change',
      oldValue: { courtNumber: 1 },
      newValue: { courtNumber: 2 },
      matchId: 'match-1',
      timestamp: new Date()
    };

    const mockHistory = {
      addChange: jest.fn(),
      getHistory: jest.fn(() => [mockChange]),
      canUndo: jest.fn(() => true),
      getUndoableChange: jest.fn(() => mockChange),
      clear: jest.fn()
    };

    ScheduleChangeHistory.mockImplementation(() => mockHistory);
    ScheduleManipulator.undoLastChange.mockReturnValue({
      updatedMatches: mockMatches,
      updatedRounds: mockRounds
    });

    render(<ScheduleManagement {...defaultProps} />);

    const undoButton = screen.getByText('Undo Last Change');
    fireEvent.click(undoButton);

    expect(ScheduleManipulator.undoLastChange).toHaveBeenCalledWith(
      mockChange,
      mockMatches,
      mockRounds
    );
    expect(defaultProps.onMatchesUpdate).toHaveBeenCalledWith(mockMatches);
    expect(defaultProps.onRoundsUpdate).toHaveBeenCalledWith(mockRounds);
  });

  test('displays match time correctly', () => {
    render(<ScheduleManagement {...defaultProps} />);

    // The time should be formatted as "10:00 AM"
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
  });

  test('shows round information', () => {
    render(<ScheduleManagement {...defaultProps} />);

    expect(screen.getByText('Round 1')).toBeInTheDocument();
  });

  test('handles empty matches and rounds', () => {
    const emptyProps = {
      ...defaultProps,
      matches: [],
      rounds: []
    };

    render(<ScheduleManagement {...emptyProps} />);

    expect(screen.getByText('Schedule Management')).toBeInTheDocument();
    expect(screen.getByText('Court 1')).toBeInTheDocument();
    expect(screen.getByText('0 matches')).toBeInTheDocument();
  });
});