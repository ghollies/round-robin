import { validateMatchScore, validateWinCondition, ScoreValidationResult } from '../validation';
import { Tournament } from '../../types/tournament';

describe('Score Validation', () => {
  const mockTournament: Tournament = {
    id: 'test-tournament',
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

  const team1Id = 'team-1';
  const team2Id = 'team-2';

  describe('validateMatchScore', () => {
    describe('basic validation', () => {
      it('should reject negative scores', () => {
        const result = validateMatchScore(-1, 5, team1Id, team2Id, mockTournament);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Scores cannot be negative');
      });

      it('should reject non-integer scores', () => {
        const result = validateMatchScore(5.5, 3, team1Id, team2Id, mockTournament);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Scores must be whole numbers');
      });

      it('should reject both scores being zero', () => {
        const result = validateMatchScore(0, 0, team1Id, team2Id, mockTournament);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('At least one team must have scored points');
      });
    });

    describe('win-by-2 scoring rule', () => {
      it('should accept valid win-by-2 score (11-9)', () => {
        const result = validateMatchScore(11, 9, team1Id, team2Id, mockTournament);
        expect(result.isValid).toBe(true);
        expect(result.winner).toBe(team1Id);
        expect(result.endReason).toBe('points');
      });

      it('should accept valid win-by-2 score with higher point total (13-11)', () => {
        const result = validateMatchScore(13, 11, team1Id, team2Id, mockTournament);
        expect(result.isValid).toBe(true);
        expect(result.winner).toBe(team1Id);
        expect(result.endReason).toBe('points');
      });

      it('should reject score at point limit without 2-point margin (11-10)', () => {
        const result = validateMatchScore(11, 10, team1Id, team2Id, mockTournament);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Match must be won by at least 2 points or select "Time Limit" if time expired');
      });

      it('should reject score below point limit (10-8)', () => {
        const result = validateMatchScore(10, 8, team1Id, team2Id, mockTournament);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Match has not reached the point limit (11)');
      });

      it('should accept time limit ending with higher score (10-8)', () => {
        const result = validateMatchScore(10, 8, team1Id, team2Id, mockTournament, 'time');
        expect(result.isValid).toBe(true);
        expect(result.winner).toBe(team1Id);
        expect(result.endReason).toBe('time');
      });

      it('should reject time limit ending with tie score', () => {
        const result = validateMatchScore(10, 10, team1Id, team2Id, mockTournament, 'time');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Match cannot end in a tie. Please enter different scores or continue play.');
      });
    });

    describe('first-to-limit scoring rule', () => {
      const firstToLimitTournament: Tournament = {
        ...mockTournament,
        settings: {
          ...mockTournament.settings,
          scoringRule: 'first-to-limit'
        }
      };

      it('should accept valid first-to-limit score (11-8)', () => {
        const result = validateMatchScore(11, 8, team1Id, team2Id, firstToLimitTournament);
        expect(result.isValid).toBe(true);
        expect(result.winner).toBe(team1Id);
        expect(result.endReason).toBe('points');
      });

      it('should accept first-to-limit score with exact point limit (11-10)', () => {
        const result = validateMatchScore(11, 10, team1Id, team2Id, firstToLimitTournament);
        expect(result.isValid).toBe(true);
        expect(result.winner).toBe(team1Id);
        expect(result.endReason).toBe('points');
      });

      it('should reject score below point limit without time limit (10-8)', () => {
        const result = validateMatchScore(10, 8, team1Id, team2Id, firstToLimitTournament);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Match has not reached the point limit (11) and time limit was not selected');
      });

      it('should accept time limit ending below point limit (10-8)', () => {
        const result = validateMatchScore(10, 8, team1Id, team2Id, firstToLimitTournament, 'time');
        expect(result.isValid).toBe(true);
        expect(result.winner).toBe(team1Id);
        expect(result.endReason).toBe('time');
      });

      it('should reject tie at point limit', () => {
        const result = validateMatchScore(11, 11, team1Id, team2Id, firstToLimitTournament);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Match cannot end in a tie. Please enter different scores or continue play.');
      });
    });

    describe('different point limits', () => {
      const highPointTournament: Tournament = {
        ...mockTournament,
        settings: {
          ...mockTournament.settings,
          pointLimit: 21,
          scoringRule: 'win-by-2'
        }
      };

      it('should validate against correct point limit (21)', () => {
        const result = validateMatchScore(21, 19, team1Id, team2Id, highPointTournament);
        expect(result.isValid).toBe(true);
        expect(result.winner).toBe(team1Id);
      });

      it('should reject score below higher point limit (20-18)', () => {
        const result = validateMatchScore(20, 18, team1Id, team2Id, highPointTournament);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Match has not reached the point limit (21)');
      });
    });
  });

  describe('validateWinCondition', () => {
    describe('points end reason', () => {
      it('should validate win-by-2 condition correctly', () => {
        const result = validateWinCondition(11, 9, mockTournament, 'points');
        expect(result.isValid).toBe(true);
      });

      it('should reject insufficient point margin for win-by-2', () => {
        const result = validateWinCondition(11, 10, mockTournament, 'points');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Match must be won by at least 2 points');
      });

      it('should reject score below point limit', () => {
        const result = validateWinCondition(10, 8, mockTournament, 'points');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Point limit of 11 has not been reached');
      });

      it('should reject tie at point limit', () => {
        const result = validateWinCondition(11, 11, mockTournament, 'points');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Match must be won by at least 2 points');
      });
    });

    describe('time end reason', () => {
      it('should accept any score difference when time expires', () => {
        const result = validateWinCondition(8, 7, mockTournament, 'time');
        expect(result.isValid).toBe(true);
      });

      it('should reject tie even with time limit', () => {
        const result = validateWinCondition(10, 10, mockTournament, 'time');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Match cannot end in a tie even with time limit');
      });
    });

    describe('first-to-limit scoring with time', () => {
      const firstToLimitTournament: Tournament = {
        ...mockTournament,
        settings: {
          ...mockTournament.settings,
          scoringRule: 'first-to-limit'
        }
      };

      it('should validate first-to-limit with points end reason', () => {
        const result = validateWinCondition(11, 8, firstToLimitTournament, 'points');
        expect(result.isValid).toBe(true);
      });

      it('should accept any winning score with time end reason', () => {
        const result = validateWinCondition(9, 7, firstToLimitTournament, 'time');
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very high scores correctly', () => {
      const result = validateMatchScore(25, 23, team1Id, team2Id, mockTournament);
      expect(result.isValid).toBe(true);
      expect(result.winner).toBe(team1Id);
    });

    it('should handle single point games', () => {
      const singlePointTournament: Tournament = {
        ...mockTournament,
        settings: {
          ...mockTournament.settings,
          pointLimit: 1,
          scoringRule: 'first-to-limit'
        }
      };

      const result = validateMatchScore(1, 0, team1Id, team2Id, singlePointTournament);
      expect(result.isValid).toBe(true);
      expect(result.winner).toBe(team1Id);
    });

    it('should handle tournaments without time limits', () => {
      const noTimeLimitTournament: Tournament = {
        ...mockTournament,
        settings: {
          ...mockTournament.settings,
          timeLimit: false
        }
      };

      // Should still work with points end reason
      const result = validateMatchScore(11, 9, team1Id, team2Id, noTimeLimitTournament);
      expect(result.isValid).toBe(true);
    });
  });
});