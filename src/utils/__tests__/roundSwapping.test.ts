import { ScheduleManipulator, ScheduleChangeHistory } from '../scheduleManagement';
import { Round, Match } from '../../types/tournament';
import { generateId } from '../index';

// Mock the generateId function
jest.mock('../index', () => ({
  generateId: jest.fn(() => 'mock-id-' + Math.random().toString(36).substr(2, 9))
}));

describe('Round Swapping Functionality', () => {
  let mockRound1: Round;
  let mockRound2: Round;
  let mockRound3: Round;
  let mockMatches: Match[];
  let changeHistory: ScheduleChangeHistory;

  beforeEach(() => {
    // Reset the mock
    (generateId as jest.Mock).mockClear();
    
    changeHistory = new ScheduleChangeHistory();

    // Create mock rounds
    mockRound1 = {
      id: 'round-1',
      tournamentId: 'tournament-1',
      roundNumber: 1,
      status: 'pending',
      matches: []
    };

    mockRound2 = {
      id: 'round-2',
      tournamentId: 'tournament-1',
      roundNumber: 2,
      status: 'pending',
      matches: []
    };

    mockRound3 = {
      id: 'round-3',
      tournamentId: 'tournament-1',
      roundNumber: 3,
      status: 'completed',
      matches: []
    };

    // Create mock matches
    mockMatches = [
      {
        id: 'match-1',
        tournamentId: 'tournament-1',
        roundNumber: 1,
        matchNumber: 1,
        team1Id: 'team-1',
        team2Id: 'team-2',
        courtNumber: 1,
        scheduledTime: new Date('2024-01-01T09:00:00'),
        status: 'scheduled'
      },
      {
        id: 'match-2',
        tournamentId: 'tournament-1',
        roundNumber: 1,
        matchNumber: 2,
        team1Id: 'team-3',
        team2Id: 'team-4',
        courtNumber: 2,
        scheduledTime: new Date('2024-01-01T09:00:00'),
        status: 'scheduled'
      },
      {
        id: 'match-3',
        tournamentId: 'tournament-1',
        roundNumber: 2,
        matchNumber: 3,
        team1Id: 'team-1',
        team2Id: 'team-3',
        courtNumber: 1,
        scheduledTime: new Date('2024-01-01T09:20:00'),
        status: 'scheduled'
      },
      {
        id: 'match-4',
        tournamentId: 'tournament-1',
        roundNumber: 2,
        matchNumber: 4,
        team1Id: 'team-2',
        team2Id: 'team-4',
        courtNumber: 2,
        scheduledTime: new Date('2024-01-01T09:20:00'),
        status: 'scheduled'
      },
      {
        id: 'match-5',
        tournamentId: 'tournament-1',
        roundNumber: 3,
        matchNumber: 5,
        team1Id: 'team-1',
        team2Id: 'team-4',
        courtNumber: 1,
        scheduledTime: new Date('2024-01-01T09:40:00'),
        status: 'completed',
        result: {
          team1Score: 11,
          team2Score: 9,
          winnerId: 'team-1',
          completedAt: new Date('2024-01-01T10:00:00'),
          endReason: 'points'
        }
      }
    ];
  });

  describe('validateRoundSwap', () => {
    it('should validate successful swap of two incomplete rounds', () => {
      const validation = ScheduleManipulator.validateRoundSwap(mockRound1, mockRound2, mockMatches);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should reject swap when first round is completed', () => {
      const validation = ScheduleManipulator.validateRoundSwap(mockRound3, mockRound2, mockMatches);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Round 3 is already completed and cannot be swapped');
    });

    it('should reject swap when second round is completed', () => {
      const validation = ScheduleManipulator.validateRoundSwap(mockRound1, mockRound3, mockMatches);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Round 3 is already completed and cannot be swapped');
    });

    it('should reject swap when first round has completed matches', () => {
      // Add a completed match to round 1
      const matchesWithCompleted = [...mockMatches];
      matchesWithCompleted[0] = { ...matchesWithCompleted[0], status: 'completed' };

      const validation = ScheduleManipulator.validateRoundSwap(mockRound1, mockRound2, matchesWithCompleted);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Round 1 has 1 completed matches and cannot be swapped');
    });

    it('should reject swap when second round has completed matches', () => {
      // Add a completed match to round 2
      const matchesWithCompleted = [...mockMatches];
      matchesWithCompleted[2] = { ...matchesWithCompleted[2], status: 'completed' };

      const validation = ScheduleManipulator.validateRoundSwap(mockRound1, mockRound2, matchesWithCompleted);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Round 2 has 1 completed matches and cannot be swapped');
    });

    it('should warn about different team counts', () => {
      // Create rounds with different team counts
      const round1WithBye = { ...mockRound1, byeTeamId: 'team-5' };
      
      const validation = ScheduleManipulator.validateRoundSwap(round1WithBye, mockRound2, mockMatches);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Round 1 has a bye but Round 2 does not');
    });

    it('should warn about non-adjacent rounds', () => {
      const round4 = { ...mockRound1, roundNumber: 4, id: 'round-4' };
      
      const validation = ScheduleManipulator.validateRoundSwap(mockRound1, round4, mockMatches);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Swapping non-adjacent rounds (3 rounds apart) may affect tournament flow');
    });
  });

  describe('swapRounds', () => {
    it('should successfully swap two incomplete rounds', () => {
      const result = ScheduleManipulator.swapRounds(
        mockRound1,
        mockRound2,
        mockMatches,
        changeHistory,
        20
      );

      // Check that round numbers are swapped
      expect(result.updatedRounds).toHaveLength(2);
      const updatedRound1 = result.updatedRounds.find(r => r.id === 'round-1');
      const updatedRound2 = result.updatedRounds.find(r => r.id === 'round-2');
      
      expect(updatedRound1?.roundNumber).toBe(2);
      expect(updatedRound2?.roundNumber).toBe(1);

      // Check that match round numbers are updated
      const round1Matches = result.updatedMatches.filter(m => m.roundNumber === 2);
      const round2Matches = result.updatedMatches.filter(m => m.roundNumber === 1);
      
      expect(round1Matches).toHaveLength(2); // Originally round 1 matches
      expect(round2Matches).toHaveLength(2); // Originally round 2 matches

      // Check that times are recalculated
      const originalRound1Match = mockMatches.find(m => m.id === 'match-1');
      const updatedRound1Match = result.updatedMatches.find(m => m.id === 'match-1');
      
      expect(updatedRound1Match?.scheduledTime).not.toEqual(originalRound1Match?.scheduledTime);
    });

    it('should throw error when trying to swap completed rounds', () => {
      expect(() => {
        ScheduleManipulator.swapRounds(
          mockRound1,
          mockRound3,
          mockMatches,
          changeHistory,
          20
        );
      }).toThrow('Cannot swap rounds: Round 3 is already completed and cannot be swapped');
    });

    it('should record the change in history', () => {
      ScheduleManipulator.swapRounds(
        mockRound1,
        mockRound2,
        mockMatches,
        changeHistory,
        20
      );

      const history = changeHistory.getHistory();
      expect(history).toHaveLength(1);
      
      const change = history[0];
      expect(change.type).toBe('round-swap');
      expect(change.description).toBe('Swapped Round 1 with Round 2');
      expect(change.oldValue).toEqual({
        round1Number: 1,
        round2Number: 2,
        round1Id: 'round-1',
        round2Id: 'round-2'
      });
      expect(change.newValue).toEqual({
        round1Number: 2,
        round2Number: 1,
        round1Id: 'round-1',
        round2Id: 'round-2'
      });
    });

    it('should preserve match details except round number and time', () => {
      const result = ScheduleManipulator.swapRounds(
        mockRound1,
        mockRound2,
        mockMatches,
        changeHistory,
        20
      );

      const originalMatch = mockMatches.find(m => m.id === 'match-1');
      const updatedMatch = result.updatedMatches.find(m => m.id === 'match-1');

      expect(updatedMatch?.id).toBe(originalMatch?.id);
      expect(updatedMatch?.tournamentId).toBe(originalMatch?.tournamentId);
      expect(updatedMatch?.matchNumber).toBe(originalMatch?.matchNumber);
      expect(updatedMatch?.team1Id).toBe(originalMatch?.team1Id);
      expect(updatedMatch?.team2Id).toBe(originalMatch?.team2Id);
      expect(updatedMatch?.courtNumber).toBe(originalMatch?.courtNumber);
      expect(updatedMatch?.status).toBe(originalMatch?.status);
      
      // Only round number and time should change
      expect(updatedMatch?.roundNumber).not.toBe(originalMatch?.roundNumber);
      expect(updatedMatch?.scheduledTime).not.toEqual(originalMatch?.scheduledTime);
    });

    it('should handle rounds with bye teams', () => {
      const roundWithBye = { ...mockRound1, byeTeamId: 'team-5' };
      
      const result = ScheduleManipulator.swapRounds(
        roundWithBye,
        mockRound2,
        mockMatches,
        changeHistory,
        20
      );

      const updatedRoundWithBye = result.updatedRounds.find(r => r.id === 'round-1');
      expect(updatedRoundWithBye?.byeTeamId).toBe('team-5');
      expect(updatedRoundWithBye?.roundNumber).toBe(2);
    });
  });

  describe('time slot recalculation', () => {
    it('should recalculate time slots based on new round order', () => {
      const result = ScheduleManipulator.swapRounds(
        mockRound1,
        mockRound2,
        mockMatches,
        changeHistory,
        20
      );

      // Round 1 matches should now have round 2's time slots
      const formerRound1Matches = result.updatedMatches.filter(m => 
        ['match-1', 'match-2'].includes(m.id)
      );
      
      // Round 2 matches should now have round 1's time slots
      const formerRound2Matches = result.updatedMatches.filter(m => 
        ['match-3', 'match-4'].includes(m.id)
      );

      // Check that times are different from original
      formerRound1Matches.forEach(match => {
        const originalMatch = mockMatches.find(m => m.id === match.id);
        expect(match.scheduledTime).not.toEqual(originalMatch?.scheduledTime);
      });

      formerRound2Matches.forEach(match => {
        const originalMatch = mockMatches.find(m => m.id === match.id);
        expect(match.scheduledTime).not.toEqual(originalMatch?.scheduledTime);
      });
    });

    it('should maintain time intervals between matches in same round', () => {
      const result = ScheduleManipulator.swapRounds(
        mockRound1,
        mockRound2,
        mockMatches,
        changeHistory,
        20
      );

      // Get matches that were originally in round 1 (now in round 2)
      const formerRound1Matches = result.updatedMatches
        .filter(m => ['match-1', 'match-2'].includes(m.id))
        .sort((a, b) => a.matchNumber - b.matchNumber);

      if (formerRound1Matches.length > 1) {
        const timeDiff = formerRound1Matches[1].scheduledTime.getTime() - 
                        formerRound1Matches[0].scheduledTime.getTime();
        
        // Should have a 2-minute stagger as implemented
        expect(timeDiff).toBe(2 * 60 * 1000); // 2 minutes in milliseconds
      }
    });
  });

  describe('edge cases', () => {
    it('should handle swapping rounds with no matches', () => {
      const emptyRound1 = { ...mockRound1 };
      const emptyRound2 = { ...mockRound2 };
      const emptyMatches: Match[] = [];

      const result = ScheduleManipulator.swapRounds(
        emptyRound1,
        emptyRound2,
        emptyMatches,
        changeHistory,
        20
      );

      expect(result.updatedRounds).toHaveLength(2);
      expect(result.updatedMatches).toHaveLength(0);
      
      const updatedRound1 = result.updatedRounds.find(r => r.id === 'round-1');
      const updatedRound2 = result.updatedRounds.find(r => r.id === 'round-2');
      
      expect(updatedRound1?.roundNumber).toBe(2);
      expect(updatedRound2?.roundNumber).toBe(1);
    });

    it('should handle swapping same round (should be prevented by validation)', () => {
      expect(() => {
        ScheduleManipulator.swapRounds(
          mockRound1,
          mockRound1,
          mockMatches,
          changeHistory,
          20
        );
      }).toThrow(); // Should throw due to validation
    });

    it('should handle matches from other rounds not being affected', () => {
      const result = ScheduleManipulator.swapRounds(
        mockRound1,
        mockRound2,
        mockMatches,
        changeHistory,
        20
      );

      // Round 3 matches should remain unchanged
      const round3Match = result.updatedMatches.find(m => m.id === 'match-5');
      const originalRound3Match = mockMatches.find(m => m.id === 'match-5');

      expect(round3Match).toEqual(originalRound3Match);
    });
  });

  describe('integration with change history', () => {
    it('should allow undo of round swap', () => {
      // Perform the swap
      const swapResult = ScheduleManipulator.swapRounds(
        mockRound1,
        mockRound2,
        mockMatches,
        changeHistory,
        20
      );

      // Get the change from history
      const lastChange = changeHistory.getLastChange();
      expect(lastChange).toBeTruthy();

      // Undo the change
      const undoResult = ScheduleManipulator.undoLastChange(
        lastChange!,
        swapResult.updatedMatches,
        swapResult.updatedRounds
      );

      // Check that rounds are back to original numbers
      const undoneRound1 = undoResult.updatedRounds.find(r => r.id === 'round-1');
      const undoneRound2 = undoResult.updatedRounds.find(r => r.id === 'round-2');

      expect(undoneRound1?.roundNumber).toBe(1);
      expect(undoneRound2?.roundNumber).toBe(2);

      // Check that match round numbers are restored
      const round1Matches = undoResult.updatedMatches.filter(m => m.roundNumber === 1);
      const round2Matches = undoResult.updatedMatches.filter(m => m.roundNumber === 2);

      expect(round1Matches).toHaveLength(2);
      expect(round2Matches).toHaveLength(2);
    });
  });
});