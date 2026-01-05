import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleDisplay from '../ScheduleDisplay';
import { GeneratedSchedule, ScheduledMatch } from '../../utils/scheduleGenerator';
import { Participant } from '../../types/tournament';

// Mock the external dependencies
jest.mock('jspdf', () => jest.fn());
jest.mock('html2canvas', () => jest.fn());

// Mock window.alert
global.alert = jest.fn();

describe('ScheduleDisplay - Basic Functionality', () => {
  const mockParticipants: Participant[] = [
    {
      id: 'p1',
      tournamentId: 't1',
      name: 'Alice Johnson',
      statistics: {
        gamesWon: 0,
        gamesLost: 0,
        totalPointsScored: 0,
        totalPointsAllowed: 0,
        pointDifferential: 0,
      },
    },
    {
      id: 'p2',
      tournamentId: 't1',
      name: 'Bob Smith',
      statistics: {
        gamesWon: 0,
        gamesLost: 0,
        totalPointsScored: 0,
        totalPointsAllowed: 0,
        pointDifferential: 0,
      },
    },
    {
      id: 'p3',
      tournamentId: 't1',
      name: 'Carol Davis',
      statistics: {
        gamesWon: 0,
        gamesLost: 0,
        totalPointsScored: 0,
        totalPointsAllowed: 0,
        pointDifferential: 0,
      },
    },
    {
      id: 'p4',
      tournamentId: 't1',
      name: 'David Wilson',
      statistics: {
        gamesWon: 0,
        gamesLost: 0,
        totalPointsScored: 0,
        totalPointsAllowed: 0,
        pointDifferential: 0,
      },
    },
  ];

  const mockScheduledMatch: ScheduledMatch = {
    id: 'm1',
    tournamentId: 't1',
    roundNumber: 1,
    matchNumber: 1,
    team1Id: 'team1',
    team2Id: 'team2',
    courtNumber: 1,
    scheduledTime: new Date('2024-01-15T09:00:00'),
    status: 'scheduled',
    teams: {
      team1: {
        id: 'team1',
        tournamentId: 't1',
        player1Id: 'p1',
        player2Id: 'p2',
        isPermanent: false,
      },
      team2: {
        id: 'team2',
        tournamentId: 't1',
        player1Id: 'p3',
        player2Id: 'p4',
        isPermanent: false,
      },
    },
    participants: {
      team1Players: [mockParticipants[0], mockParticipants[1]],
      team2Players: [mockParticipants[2], mockParticipants[3]],
    },
  };

  const mockSchedule: GeneratedSchedule = {
    rounds: [
      {
        id: 'r1',
        tournamentId: 't1',
        roundNumber: 1,
        status: 'pending',
        matches: [
          {
            id: 'm1',
            tournamentId: 't1',
            roundNumber: 1,
            matchNumber: 1,
            team1Id: 'team1',
            team2Id: 'team2',
            courtNumber: 1,
            scheduledTime: new Date('2024-01-15T09:00:00'),
            status: 'scheduled',
          },
        ],
      },
    ],
    scheduledMatches: [mockScheduledMatch],
    optimization: {
      totalDuration: 120,
      sessionsCount: 1,
      averageRestPeriod: 15,
      courtUtilization: 75.5,
    },
    teams: [
      {
        id: 'team1',
        tournamentId: 't1',
        player1Id: 'p1',
        player2Id: 'p2',
        isPermanent: false,
      },
      {
        id: 'team2',
        tournamentId: 't1',
        player1Id: 'p3',
        player2Id: 'p4',
        isPermanent: false,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders schedule display with header', () => {
      render(<ScheduleDisplay schedule={mockSchedule} participants={mockParticipants} />);
      expect(screen.getByText('Tournament Schedule')).toBeInTheDocument();
    });

    it('renders schedule statistics', () => {
      render(<ScheduleDisplay schedule={mockSchedule} participants={mockParticipants} />);
      
      expect(screen.getByText('Total Matches:')).toBeInTheDocument();
      expect(screen.getByText('Rounds:')).toBeInTheDocument();
      expect(screen.getByText('Duration:')).toBeInTheDocument();
      expect(screen.getByText('2h 0m')).toBeInTheDocument();
      expect(screen.getByText('Court Usage:')).toBeInTheDocument();
      expect(screen.getByText('75.5%')).toBeInTheDocument();
    });

    it('renders schedule controls with view selector', () => {
      render(<ScheduleDisplay schedule={mockSchedule} participants={mockParticipants} />);
      
      expect(screen.getByLabelText('View:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Chronological')).toBeInTheDocument();
    });

    it('renders match information', () => {
      render(<ScheduleDisplay schedule={mockSchedule} participants={mockParticipants} />);
      
      expect(screen.getByText('Match 1')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson / Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Carol Davis / David Wilson')).toBeInTheDocument();
      expect(screen.getByText('VS')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<ScheduleDisplay schedule={mockSchedule} participants={mockParticipants} />);
      
      expect(screen.getByText('Print Schedule')).toBeInTheDocument();
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    });
  });

  describe('View Switching', () => {
    it('switches to by-player view and shows player selector', () => {
      render(<ScheduleDisplay schedule={mockSchedule} participants={mockParticipants} />);

      const viewSelect = screen.getByLabelText('View:');
      fireEvent.change(viewSelect, { target: { value: 'by-player' } });

      expect(screen.getByLabelText('Player:')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    it('switches to by-court view and shows court selector', () => {
      render(<ScheduleDisplay schedule={mockSchedule} participants={mockParticipants} />);

      const viewSelect = screen.getByLabelText('View:');
      fireEvent.change(viewSelect, { target: { value: 'by-court' } });

      expect(screen.getByLabelText('Court:')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('filters matches by selected player', () => {
      render(<ScheduleDisplay schedule={mockSchedule} participants={mockParticipants} />);

      // Switch to by-player view
      const viewSelect = screen.getByLabelText('View:');
      fireEvent.change(viewSelect, { target: { value: 'by-player' } });

      // Select Alice Johnson
      const playerSelect = screen.getByLabelText('Player:');
      fireEvent.change(playerSelect, { target: { value: 'p1' } });

      expect(screen.getByText('Match 1')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson / Bob Smith')).toBeInTheDocument();
    });

    it('filters matches by selected court', () => {
      render(<ScheduleDisplay schedule={mockSchedule} participants={mockParticipants} />);

      // Switch to by-court view
      const viewSelect = screen.getByLabelText('View:');
      fireEvent.change(viewSelect, { target: { value: 'by-court' } });

      // Select court 1
      const courtSelect = screen.getByLabelText('Court:');
      fireEvent.change(courtSelect, { target: { value: '1' } });

      expect(screen.getByText('Match 1')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays no matches message when no matches are found', () => {
      const emptySchedule = {
        ...mockSchedule,
        scheduledMatches: [],
      };

      render(<ScheduleDisplay schedule={emptySchedule} participants={mockParticipants} />);

      expect(screen.getByText('No matches found for the selected criteria.')).toBeInTheDocument();
    });
  });

  describe('Match Results Display', () => {
    it('displays match results when available', () => {
      const scheduleWithResults = {
        ...mockSchedule,
        scheduledMatches: [
          {
            ...mockScheduledMatch,
            result: {
              team1Score: 11,
              team2Score: 8,
              winnerId: 'team1',
              completedAt: new Date(),
              endReason: 'points' as const,
            },
          },
        ],
      };

      render(<ScheduleDisplay schedule={scheduleWithResults} participants={mockParticipants} />);

      expect(screen.getByText('11 - 8')).toBeInTheDocument();
      expect(screen.getByText('Winner: Alice Johnson / Bob Smith')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('formats match times correctly', () => {
      render(<ScheduleDisplay schedule={mockSchedule} participants={mockParticipants} />);

      // Should display time range (9:00 AM - 9:30 AM for 30-minute match)
      expect(screen.getByText(/9:00 AM - 9:30 AM/)).toBeInTheDocument();
    });
  });
});