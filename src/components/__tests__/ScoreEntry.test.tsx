import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoreEntry from '../ScoreEntry';
import { Match, Tournament, Team, Participant } from '../../types/tournament';
import * as storage from '../../utils/storage';

// Mock the storage module
jest.mock('../../utils/storage', () => ({
  updateMatch: jest.fn(),
  loadTeam: jest.fn(),
  loadParticipantsByTournament: jest.fn(),
  saveParticipant: jest.fn()
}));

const mockStorage = storage as jest.Mocked<typeof storage>;

describe('ScoreEntry Component', () => {
  const mockTournament: Tournament = {
    id: 'tournament-1',
    name: 'Test Tournament',
    mode: 'individual-signup',
    settings: {
      courtCount: 4,
      matchDuration: 30,
      pointLimit: 11,
      scoringRule: 'win-by-2',
      timeLimit: true
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMatch: Match = {
    id: 'match-1',
    tournamentId: 'tournament-1',
    roundNumber: 1,
    matchNumber: 1,
    team1Id: 'team-1',
    team2Id: 'team-2',
    courtNumber: 1,
    scheduledTime: new Date(),
    status: 'scheduled'
  };

  const mockTeam1: Team = {
    id: 'team-1',
    tournamentId: 'tournament-1',
    player1Id: 'player-1',
    player2Id: 'player-2',
    isPermanent: false
  };

  const mockTeam2: Team = {
    id: 'team-2',
    tournamentId: 'tournament-1',
    player1Id: 'player-3',
    player2Id: 'player-4',
    isPermanent: false
  };

  const mockParticipants: Participant[] = [
    {
      id: 'player-1',
      tournamentId: 'tournament-1',
      name: 'Alice Smith',
      statistics: {
        gamesWon: 0,
        gamesLost: 0,
        totalPointsScored: 0,
        totalPointsAllowed: 0,
        pointDifferential: 0
      }
    },
    {
      id: 'player-2',
      tournamentId: 'tournament-1',
      name: 'Bob Johnson',
      statistics: {
        gamesWon: 0,
        gamesLost: 0,
        totalPointsScored: 0,
        totalPointsAllowed: 0,
        pointDifferential: 0
      }
    },
    {
      id: 'player-3',
      tournamentId: 'tournament-1',
      name: 'Carol Davis',
      statistics: {
        gamesWon: 0,
        gamesLost: 0,
        totalPointsScored: 0,
        totalPointsAllowed: 0,
        pointDifferential: 0
      }
    },
    {
      id: 'player-4',
      tournamentId: 'tournament-1',
      name: 'David Wilson',
      statistics: {
        gamesWon: 0,
        gamesLost: 0,
        totalPointsScored: 0,
        totalPointsAllowed: 0,
        pointDifferential: 0
      }
    }
  ];

  const mockOnMatchUpdate = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock participants to fresh state for each test
    const freshParticipants = [
      {
        id: 'player-1',
        tournamentId: 'tournament-1',
        name: 'Alice Smith',
        statistics: {
          gamesWon: 0,
          gamesLost: 0,
          totalPointsScored: 0,
          totalPointsAllowed: 0,
          pointDifferential: 0
        }
      },
      {
        id: 'player-2',
        tournamentId: 'tournament-1',
        name: 'Bob Johnson',
        statistics: {
          gamesWon: 0,
          gamesLost: 0,
          totalPointsScored: 0,
          totalPointsAllowed: 0,
          pointDifferential: 0
        }
      },
      {
        id: 'player-3',
        tournamentId: 'tournament-1',
        name: 'Carol Davis',
        statistics: {
          gamesWon: 0,
          gamesLost: 0,
          totalPointsScored: 0,
          totalPointsAllowed: 0,
          pointDifferential: 0
        }
      },
      {
        id: 'player-4',
        tournamentId: 'tournament-1',
        name: 'David Wilson',
        statistics: {
          gamesWon: 0,
          gamesLost: 0,
          totalPointsScored: 0,
          totalPointsAllowed: 0,
          pointDifferential: 0
        }
      }
    ];
    
    mockStorage.loadTeam.mockImplementation((id: string) => {
      if (id === 'team-1') return mockTeam1;
      if (id === 'team-2') return mockTeam2;
      return null;
    });
    mockStorage.loadParticipantsByTournament.mockReturnValue(freshParticipants);
  });

  const renderScoreEntry = (overrides: Partial<{
    match: Match;
    tournament: Tournament;
  }> = {}) => {
    const props = {
      match: overrides.match || mockMatch,
      tournament: overrides.tournament || mockTournament,
      onMatchUpdate: mockOnMatchUpdate,
      onClose: mockOnClose
    };

    return render(<ScoreEntry {...props} />);
  };

  describe('rendering', () => {
    it('should render the score entry modal', () => {
      renderScoreEntry();
      
      expect(screen.getByText('Enter Match Result')).toBeInTheDocument();
      expect(screen.getByText('Round 1, Match 1')).toBeInTheDocument();
      expect(screen.getByText('Court 1')).toBeInTheDocument();
    });

    it('should display team names correctly', async () => {
      renderScoreEntry();
      
      await waitFor(() => {
        expect(screen.getByText('Alice Smith / Bob Johnson')).toBeInTheDocument();
        expect(screen.getByText('Carol Davis / David Wilson')).toBeInTheDocument();
      });
    });

    it('should display tournament rules', () => {
      renderScoreEntry();
      
      expect(screen.getByText('Point Limit: 11')).toBeInTheDocument();
      expect(screen.getByText('Scoring: Win by 2')).toBeInTheDocument();
      expect(screen.getByText('Time Limit: 30 min')).toBeInTheDocument();
    });

    it('should show end reason options when time limit is enabled', () => {
      renderScoreEntry();
      
      expect(screen.getByText('How did the match end?')).toBeInTheDocument();
      expect(screen.getByLabelText('Reached point limit')).toBeInTheDocument();
      expect(screen.getByLabelText('Time limit expired')).toBeInTheDocument();
    });

    it('should not show end reason options when time limit is disabled', () => {
      const tournamentWithoutTimeLimit: Tournament = {
        ...mockTournament,
        settings: {
          ...mockTournament.settings,
          timeLimit: false
        }
      };

      renderScoreEntry({ tournament: tournamentWithoutTimeLimit });
      
      expect(screen.queryByText('How did the match end?')).not.toBeInTheDocument();
    });
  });

  describe('score input', () => {
    it('should allow entering valid scores', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      const team2Input = screen.getAllByRole('spinbutton')[1];
      
      await user.clear(team1Input);
      await user.type(team1Input, '11');
      await user.clear(team2Input);
      await user.type(team2Input, '9');
      
      expect(team1Input).toHaveValue(11);
      expect(team2Input).toHaveValue(9);
    });

    it('should handle negative input gracefully', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      
      // Test that the component handles negative input by setting it to 0
      fireEvent.change(team1Input, { target: { value: '-5' } });
      
      // The component should have processed the negative value and set it to 0
      expect(team1Input).toHaveValue(0);
    });

    it('should show validation errors for invalid scores', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      const team2Input = screen.getAllByRole('spinbutton')[1];
      
      // Enter scores that don't meet win-by-2 requirement
      await user.clear(team1Input);
      await user.type(team1Input, '11');
      await user.clear(team2Input);
      await user.type(team2Input, '10');
      
      await waitFor(() => {
        expect(screen.getByText(/Match must be won by at least 2 points/)).toBeInTheDocument();
      });
    });

    it('should show winner when valid scores are entered', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      const team2Input = screen.getAllByRole('spinbutton')[1];
      
      await user.clear(team1Input);
      await user.type(team1Input, '11');
      await user.clear(team2Input);
      await user.type(team2Input, '9');
      
      await waitFor(() => {
        expect(screen.getByText('Winner: Alice Smith / Bob Johnson')).toBeInTheDocument();
        expect(screen.getByText('Match ended by: Point limit')).toBeInTheDocument();
      });
    });
  });

  describe('end reason selection', () => {
    it('should allow selecting time limit end reason', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const timeLimitRadio = screen.getByLabelText('Time limit expired');
      await user.click(timeLimitRadio);
      
      expect(timeLimitRadio).toBeChecked();
    });

    it('should validate time limit ending correctly', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      const team2Input = screen.getAllByRole('spinbutton')[1];
      const timeLimitRadio = screen.getByLabelText('Time limit expired');
      
      // Enter scores below point limit
      await user.clear(team1Input);
      await user.type(team1Input, '8');
      await user.clear(team2Input);
      await user.type(team2Input, '6');
      
      // Select time limit
      await user.click(timeLimitRadio);
      
      await waitFor(() => {
        expect(screen.getByText('Winner: Alice Smith / Bob Johnson')).toBeInTheDocument();
        expect(screen.getByText('Match ended by: Time limit')).toBeInTheDocument();
      });
    });

    it('should reject tie scores even with time limit', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      const team2Input = screen.getAllByRole('spinbutton')[1];
      const timeLimitRadio = screen.getByLabelText('Time limit expired');
      
      await user.clear(team1Input);
      await user.type(team1Input, '8');
      await user.clear(team2Input);
      await user.type(team2Input, '8');
      await user.click(timeLimitRadio);
      
      await waitFor(() => {
        expect(screen.getByText(/Match cannot end in a tie/)).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('should submit valid match result', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      const team2Input = screen.getAllByRole('spinbutton')[1];
      const submitButton = screen.getByText('Save Result');
      
      await user.clear(team1Input);
      await user.type(team1Input, '11');
      await user.clear(team2Input);
      await user.type(team2Input, '9');
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
      
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockStorage.updateMatch).toHaveBeenCalledWith('match-1', {
          team1Score: 11,
          team2Score: 9,
          winnerId: 'team-1',
          completedAt: expect.any(Date),
          endReason: 'points'
        });
        expect(mockOnMatchUpdate).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should disable submit button for invalid scores', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      const team2Input = screen.getAllByRole('spinbutton')[1];
      const submitButton = screen.getByText('Save Result');
      
      await user.clear(team1Input);
      await user.type(team1Input, '10');
      await user.clear(team2Input);
      await user.type(team2Input, '9');
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should update participant statistics correctly', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      const team2Input = screen.getAllByRole('spinbutton')[1];
      const submitButton = screen.getByText('Save Result');
      
      await user.clear(team1Input);
      await user.type(team1Input, '11');
      await user.clear(team2Input);
      await user.type(team2Input, '9');
      
      await user.click(submitButton);
      
      await waitFor(() => {
        // Check that saveParticipant was called for all 4 participants
        expect(mockStorage.saveParticipant).toHaveBeenCalledTimes(4);
        
        // Verify that participants were updated (we check the calls were made with participant objects)
        const calls = mockStorage.saveParticipant.mock.calls;
        const updatedParticipants = calls.map(call => call[0]);
        
        // Find the updated participants
        const updatedPlayer1 = updatedParticipants.find(p => p.id === 'player-1');
        const updatedPlayer3 = updatedParticipants.find(p => p.id === 'player-3');
        
        // Verify winner statistics
        expect(updatedPlayer1?.statistics.gamesWon).toBe(1);
        expect(updatedPlayer1?.statistics.totalPointsScored).toBe(11);
        expect(updatedPlayer1?.statistics.totalPointsAllowed).toBe(9);
        
        // Verify loser statistics  
        expect(updatedPlayer3?.statistics.gamesLost).toBe(1);
        expect(updatedPlayer3?.statistics.totalPointsScored).toBe(9);
        expect(updatedPlayer3?.statistics.totalPointsAllowed).toBe(11);
      });
    });
  });

  describe('modal interactions', () => {
    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderScoreEntry();
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('different scoring rules', () => {
    it('should handle first-to-limit scoring rule', async () => {
      const user = userEvent.setup();
      const firstToLimitTournament: Tournament = {
        ...mockTournament,
        settings: {
          ...mockTournament.settings,
          scoringRule: 'first-to-limit'
        }
      };
      
      renderScoreEntry({ tournament: firstToLimitTournament });
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      const team2Input = screen.getAllByRole('spinbutton')[1];
      
      // Score that would be invalid for win-by-2 but valid for first-to-limit
      await user.clear(team1Input);
      await user.type(team1Input, '11');
      await user.clear(team2Input);
      await user.type(team2Input, '10');
      
      await waitFor(() => {
        expect(screen.getByText('Winner: Alice Smith / Bob Johnson')).toBeInTheDocument();
      });
    });

    it('should display correct scoring rule in tournament info', () => {
      const firstToLimitTournament: Tournament = {
        ...mockTournament,
        settings: {
          ...mockTournament.settings,
          scoringRule: 'first-to-limit'
        }
      };
      
      renderScoreEntry({ tournament: firstToLimitTournament });
      
      expect(screen.getByText('Scoring: First to limit')).toBeInTheDocument();
    });
  });

  describe('existing match results', () => {
    it('should pre-populate scores from existing match result', () => {
      const matchWithResult: Match = {
        ...mockMatch,
        status: 'completed',
        result: {
          team1Score: 11,
          team2Score: 8,
          winnerId: 'team-1',
          completedAt: new Date(),
          endReason: 'points'
        }
      };
      
      renderScoreEntry({ match: matchWithResult });
      
      const team1Input = screen.getAllByRole('spinbutton')[0];
      const team2Input = screen.getAllByRole('spinbutton')[1];
      
      expect(team1Input).toHaveValue(11);
      expect(team2Input).toHaveValue(8);
    });
  });
});