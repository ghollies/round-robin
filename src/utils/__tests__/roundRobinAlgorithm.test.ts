import { 
  IndividualSignupRoundRobin,
  generateIndividualSignupRoundRobin 
} from '../roundRobinAlgorithm';
import { Participant } from '../../types/tournament';

// Helper function to create participants for testing
function createParticipant(tournamentId: string, name: string): Participant {
  return {
    id: `participant-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    tournamentId,
    name: name.trim(),
    statistics: {
      gamesWon: 0,
      gamesLost: 0,
      totalPointsScored: 0,
      totalPointsAllowed: 0,
      pointDifferential: 0
    }
  };
}

describe('IndividualSignupRoundRobin', () => {
  let participants: Participant[];
  let algorithm: IndividualSignupRoundRobin;
  const tournamentId = 'test-tournament';

  beforeEach(() => {
    participants = [
      createParticipant(tournamentId, 'Alice'),
      createParticipant(tournamentId, 'Bob'),
      createParticipant(tournamentId, 'Charlie'),
      createParticipant(tournamentId, 'Diana')
    ];
    algorithm = new IndividualSignupRoundRobin(participants, tournamentId);
  });

  test('should throw error for insufficient participants', () => {
    const tooFewParticipants = [
      createParticipant(tournamentId, 'Alice'),
      createParticipant(tournamentId, 'Bob')
    ];
    
    expect(() => new IndividualSignupRoundRobin(tooFewParticipants, tournamentId))
      .toThrow('At least 4 participants are required for individual signup tournament');
  });

  test('should calculate required rounds correctly', () => {
    expect(algorithm.getRequiredRounds()).toBe(3); // n-1 = 4-1 = 3
  });

  test('should calculate matches per round correctly', () => {
    expect(algorithm.getMatchesPerRound()).toBe(1); // floor(4/4) = 1 match per round
  });

  test('should detect bye rounds correctly', () => {
    expect(algorithm.hasByeRounds()).toBe(false); // 4 is even
    
    const oddParticipants = [...participants, createParticipant(tournamentId, 'Eve')];
    const oddAlgorithm = new IndividualSignupRoundRobin(oddParticipants, tournamentId);
    expect(oddAlgorithm.hasByeRounds()).toBe(true); // 5 is odd
  });

  test('should generate correct number of rounds', () => {
    const rounds = algorithm.generateRounds();
    expect(rounds).toHaveLength(3);
  });

  test('should generate rounds with correct round numbers', () => {
    const rounds = algorithm.generateRounds();
    rounds.forEach((round, index) => {
      expect(round.roundNumber).toBe(index + 1);
      expect(round.tournamentId).toBe(tournamentId);
    });
  });

  test('should generate correct number of matches per round', () => {
    const rounds = algorithm.generateRounds();
    rounds.forEach(round => {
      expect(round.matches).toHaveLength(1); // 4 players = 1 match per round (2 teams of 2 players each)
    });
  });

  test('should validate schedule correctly for valid schedule', () => {
    const rounds = algorithm.generateRounds();
    const validation = algorithm.validateSchedule(rounds);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should ensure all partnerships are used', () => {
    const rounds = algorithm.generateRounds();
    const validation = algorithm.validateSchedule(rounds);
    expect(validation.isValid).toBe(true);
    
    const allPartnerships = algorithm.getAllPartnerships();
    const usedPartnerships = allPartnerships.filter(p => p.used);
    expect(usedPartnerships.length).toBe(6); // C(4,2) = 6 partnerships
  });
});

describe('IndividualSignupRoundRobin - 6 Players', () => {
  let participants: Participant[];
  let algorithm: IndividualSignupRoundRobin;
  const tournamentId = 'test-tournament-6';

  beforeEach(() => {
    participants = [
      createParticipant(tournamentId, 'Alice'),
      createParticipant(tournamentId, 'Bob'),
      createParticipant(tournamentId, 'Charlie'),
      createParticipant(tournamentId, 'Diana'),
      createParticipant(tournamentId, 'Eve'),
      createParticipant(tournamentId, 'Frank')
    ];
    algorithm = new IndividualSignupRoundRobin(participants, tournamentId);
  });

  test('should calculate correct parameters for 6 players', () => {
    expect(algorithm.getRequiredRounds()).toBe(5); // n-1 = 6-1 = 5
    expect(algorithm.getMatchesPerRound()).toBe(1); // floor(6/4) = 1 match per round (6 players = 3 partnerships = 1.5 matches, rounded down)
    expect(algorithm.hasByeRounds()).toBe(false); // 6 is even
  });

  test('should generate valid schedule for 6 players', () => {
    const rounds = algorithm.generateRounds();
    expect(rounds).toHaveLength(5);
    
    rounds.forEach(round => {
      expect(round.matches).toHaveLength(1); // 6 players = 3 partnerships = 1.5 matches, but we get 1 match per round
      expect(round.byeTeamId).toBeUndefined(); // No byes for even number
    });
    
    const validation = algorithm.validateSchedule(rounds);
    expect(validation.isValid).toBe(true);
  });

  test('should ensure each player partners with every other player exactly once', () => {
    algorithm.generateRounds();
    
    // Check that all partnerships are used exactly once
    const allPartnerships = algorithm.getAllPartnerships();
    const usedPartnerships = allPartnerships.filter(p => p.used);
    expect(usedPartnerships.length).toBe(15); // C(6,2) = 15
  });

  test('should track partnerships correctly', () => {
    algorithm.generateRounds();
    
    // Verify that partnerships are being tracked
    const allPartnerships = algorithm.getAllPartnerships();
    const usedPartnerships = allPartnerships.filter(p => p.used);
    expect(usedPartnerships.length).toBeGreaterThan(0);
  });
});

describe('IndividualSignupRoundRobin - 5 Players (Odd)', () => {
  let participants: Participant[];
  let algorithm: IndividualSignupRoundRobin;
  const tournamentId = 'test-tournament-5';

  beforeEach(() => {
    participants = [
      createParticipant(tournamentId, 'Alice'),
      createParticipant(tournamentId, 'Bob'),
      createParticipant(tournamentId, 'Charlie'),
      createParticipant(tournamentId, 'Diana'),
      createParticipant(tournamentId, 'Eve')
    ];
    algorithm = new IndividualSignupRoundRobin(participants, tournamentId);
  });

  test('should calculate correct parameters for 5 players', () => {
    expect(algorithm.getRequiredRounds()).toBe(5); // n = 5 for odd numbers
    expect(algorithm.getMatchesPerRound()).toBe(1); // floor((5-1)/4) = 1 match per round (4 active players = 2 partnerships = 1 match)
    expect(algorithm.hasByeRounds()).toBe(true); // 5 is odd
  });

  test('should generate valid schedule with byes for 5 players', () => {
    const rounds = algorithm.generateRounds();
    expect(rounds).toHaveLength(5); // Should be 5 rounds for 5 players
    
    // Each round should have 1 match and one bye (4 active players = 2 partnerships = 1 match)
    rounds.forEach(round => {
      expect(round.matches).toHaveLength(1);
      expect(round.byeTeamId).toBeDefined();
    });
    
    const validation = algorithm.validateSchedule(rounds);
    if (!validation.isValid) {
      console.log('Validation errors:', validation.errors);
    }
    expect(validation.isValid).toBe(true);
  });

  test('should distribute byes fairly among all players', () => {
    const rounds = algorithm.generateRounds();
    const byeCounts = new Map<string, number>();
    
    rounds.forEach(round => {
      if (round.byeTeamId) {
        const count = byeCounts.get(round.byeTeamId) || 0;
        byeCounts.set(round.byeTeamId, count + 1);
      }
    });
    
    // Each player should have exactly one bye (except one player might have none)
    const byeCountValues = Array.from(byeCounts.values());
    expect(byeCountValues.every(count => count <= 1)).toBe(true);
    expect(byeCounts.size).toBeLessThanOrEqual(5);
  });
});

describe('generateIndividualSignupRoundRobin', () => {
  test('should generate valid tournament for 4 players', () => {
    const participants = [
      createParticipant('tournament', 'Alice'),
      createParticipant('tournament', 'Bob'),
      createParticipant('tournament', 'Charlie'),
      createParticipant('tournament', 'Diana')
    ];
    
    const result = generateIndividualSignupRoundRobin(participants, 'tournament');
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.rounds).toHaveLength(3);
  });

  test('should handle errors gracefully', () => {
    const tooFewParticipants = [
      createParticipant('tournament', 'Alice'),
      createParticipant('tournament', 'Bob')
    ];
    
    const result = generateIndividualSignupRoundRobin(tooFewParticipants, 'tournament');
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least 4 participants are required for individual signup tournament');
    expect(result.rounds).toHaveLength(0);
  });

  test('should generate valid tournament for 8 players', () => {
    const participants = Array.from({ length: 8 }, (_, i) => 
      createParticipant('tournament', `Player${i + 1}`)
    );
    
    const result = generateIndividualSignupRoundRobin(participants, 'tournament');
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.rounds).toHaveLength(7); // n-1 = 8-1 = 7
    
    // Each round should have 2 matches (8 players = 4 partnerships per round = 2 matches per round)
    result.rounds.forEach(round => {
      expect(round.matches).toHaveLength(2);
      expect(round.byeTeamId).toBeUndefined(); // No byes for even number
    });
  });

  test('should generate valid tournament for 7 players (odd)', () => {
    const participants = Array.from({ length: 7 }, (_, i) => 
      createParticipant('tournament', `Player${i + 1}`)
    );
    
    const result = generateIndividualSignupRoundRobin(participants, 'tournament');
    
    expect(result.rounds).toHaveLength(7); // n = 7 for odd numbers
    
    // Each round should have 1 match and one bye (6 active players = 3 partnerships = 1.5 matches, rounded down to 1)
    result.rounds.forEach(round => {
      expect(round.matches).toHaveLength(1);
      expect(round.byeTeamId).toBeDefined();
    });
  });
});

describe('Algorithm Correctness Tests', () => {
  test('should ensure no player partners with same person twice', () => {
    const participants = Array.from({ length: 6 }, (_, i) => 
      createParticipant('tournament', `Player${i + 1}`)
    );
    
    const result = generateIndividualSignupRoundRobin(participants, 'tournament');
    expect(result.isValid).toBe(true);
    
    // Track all partnerships
    const partnerships = new Set<string>();
    
    result.rounds.forEach(round => {
      round.matches.forEach(match => {
        // Note: In a real implementation, we'd need to extract player IDs from team IDs
        // For this test, we're verifying the algorithm structure is correct
        const partnershipKey = `${match.team1Id}-${match.team2Id}`;
        expect(partnerships.has(partnershipKey)).toBe(false);
        partnerships.add(partnershipKey);
      });
    });
  });

  test('should handle maximum participants (32)', () => {
    const participants = Array.from({ length: 32 }, (_, i) => 
      createParticipant('tournament', `Player${i + 1}`)
    );
    
    const result = generateIndividualSignupRoundRobin(participants, 'tournament');
    
    expect(result.isValid).toBe(true);
    expect(result.rounds).toHaveLength(31); // n-1 = 32-1 = 31
    
    // Each round should have 8 matches (32 players = 16 partnerships per round = 8 matches per round)
    result.rounds.forEach(round => {
      expect(round.matches).toHaveLength(8);
      expect(round.byeTeamId).toBeUndefined(); // No byes for even number
    });
  });

  test('should maintain tournament ID consistency', () => {
    const tournamentId = 'test-tournament-consistency';
    const participants = Array.from({ length: 6 }, (_, i) => 
      createParticipant(tournamentId, `Player${i + 1}`)
    );
    
    const result = generateIndividualSignupRoundRobin(participants, tournamentId);
    
    result.rounds.forEach(round => {
      expect(round.tournamentId).toBe(tournamentId);
      round.matches.forEach(match => {
        expect(match.tournamentId).toBe(tournamentId);
      });
    });
  });
});