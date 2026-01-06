import { Participant, Team, Match, Round } from '../types/tournament';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate a unique team ID
 */
function generateTeamId(): string {
  return `team-${generateId()}`;
}

/**
 * Generate a unique match ID
 */
function generateMatchId(): string {
  return `match-${generateId()}`;
}

/**
 * Generate a unique round ID
 */
function generateRoundId(): string {
  return `round-${generateId()}`;
}

/**
 * Create a new team
 */
function createTeam(
  tournamentId: string,
  player1Id: string,
  player2Id: string,
  isPermanent: boolean = false
): Team {
  return {
    id: generateTeamId(),
    tournamentId,
    player1Id,
    player2Id,
    isPermanent
  };
}

/**
 * Create a new match
 */
function createMatch(
  tournamentId: string,
  roundNumber: number,
  matchNumber: number,
  team1Id: string,
  team2Id: string,
  courtNumber: number,
  scheduledTime: Date
): Match {
  return {
    id: generateMatchId(),
    tournamentId,
    roundNumber,
    matchNumber,
    team1Id,
    team2Id,
    courtNumber,
    scheduledTime,
    status: 'scheduled'
  };
}

/**
 * Create a new round
 */
function createRound(
  tournamentId: string,
  roundNumber: number,
  matches: Match[] = [],
  byeTeamId?: string
): Round {
  const round: Round = {
    id: generateRoundId(),
    tournamentId,
    roundNumber,
    status: 'pending',
    matches
  };
  
  if (byeTeamId !== undefined) {
    round.byeTeamId = byeTeamId;
  }
  
  return round;
}

/**
 * Partnership representation
 */
interface Partnership {
  player1: Participant;
  player2: Participant;
  used: boolean;
}

/**
 * Round robin algorithm for individual signup tournaments
 */
export class IndividualSignupRoundRobin {
  private participants: Participant[];
  private allPartnerships: Partnership[];
  private tournamentId: string;

  constructor(participants: Participant[], tournamentId: string) {
    if (participants.length < 4) {
      throw new Error('At least 4 participants are required for individual signup tournament');
    }
    
    this.participants = [...participants];
    this.tournamentId = tournamentId;
    this.allPartnerships = this.generateAllPartnerships();
  }

  /**
   * Generate all possible partnerships between players
   */
  private generateAllPartnerships(): Partnership[] {
    const partnerships: Partnership[] = [];
    const n = this.participants.length;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        partnerships.push({
          player1: this.participants[i],
          player2: this.participants[j],
          used: false
        });
      }
    }
    
    return partnerships;
  }

  /**
   * Calculate the number of rounds needed for the tournament
   */
  getRequiredRounds(): number {
    const n = this.participants.length;
    // For individual signup, we need enough rounds to use all partnerships
    // The formula is (n-1) for even n, and n for odd n
    if (n % 2 === 0) {
      return n - 1;
    } else {
      return n;
    }
  }

  /**
   * Calculate the number of matches per round
   */
  getMatchesPerRound(): number {
    const n = this.participants.length;
    if (n % 2 === 0) {
      return Math.floor(n / 4); // Each match has 4 players, so floor(n/4) matches per round
    } else {
      return Math.floor((n - 1) / 4); // One player sits out, so floor((n-1)/4) matches
    }
  }

  /**
   * Check if there will be bye rounds (odd number of participants)
   */
  hasByeRounds(): boolean {
    return this.participants.length % 2 === 1;
  }

  /**
   * Generate all rounds for the tournament
   */
  generateRounds(): Round[] {
    const rounds: Round[] = [];
    const n = this.participants.length;
    const totalRounds = this.getRequiredRounds();
    
    // Organize all partnerships into rounds systematically
    const roundPartnerships = this.organizePartnershipsIntoRounds();
    
    for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber++) {
      const partnerships = roundPartnerships[roundNumber - 1] || [];
      const round = this.createRoundFromPartnerships(roundNumber, partnerships);
      rounds.push(round);
    }
    
    return rounds;
  }

  /**
   * Organize all partnerships into rounds systematically
   */
  private organizePartnershipsIntoRounds(): Partnership[][] {
    const n = this.participants.length;
    const totalRounds = this.getRequiredRounds();
    const roundPartnerships: Partnership[][] = Array(totalRounds).fill(null).map(() => []);
    
    // For individual signup tournaments, we need to ensure each player partners with every other player exactly once
    // Use a more systematic approach based on round-robin scheduling
    
    if (n % 2 === 0) {
      // Even number of players - use standard round-robin rotation
      return this.organizeEvenPlayerPartnerships(totalRounds);
    } else {
      // Odd number of players - handle with byes
      return this.organizeOddPlayerPartnerships(totalRounds);
    }
  }

  /**
   * Organize partnerships for even number of players
   */
  private organizeEvenPlayerPartnerships(totalRounds: number): Partnership[][] {
    const n = this.participants.length;
    const roundPartnerships: Partnership[][] = Array(totalRounds).fill(null).map(() => []);
    
    // Use the standard round-robin algorithm adapted for partnerships
    // Each round, we generate n/2 partnerships using rotation
    
    for (let roundNumber = 0; roundNumber < totalRounds; roundNumber++) {
      const roundPartnershipsList: Partnership[] = [];
      
      // Create rotation for this round
      const rotation: number[] = new Array(n);
      rotation[0] = 0; // Player 0 stays fixed
      
      for (let i = 1; i < n; i++) {
        rotation[i] = ((i - 1 + roundNumber) % (n - 1)) + 1;
      }
      
      // Create partnerships by pairing players from opposite ends
      for (let i = 0; i < n / 2; i++) {
        const player1Index = rotation[i];
        const player2Index = rotation[n - 1 - i];
        
        const player1 = this.participants[player1Index];
        const player2 = this.participants[player2Index];
        
        // Find the partnership
        const partnership = this.allPartnerships.find(p => 
          (p.player1.id === player1.id && p.player2.id === player2.id) ||
          (p.player1.id === player2.id && p.player2.id === player1.id)
        );
        
        if (partnership) {
          roundPartnershipsList.push(partnership);
          partnership.used = true;
        }
      }
      
      roundPartnerships[roundNumber] = roundPartnershipsList;
    }
    
    return roundPartnerships;
  }

  /**
   * Organize partnerships for odd number of players
   */
  private organizeOddPlayerPartnerships(totalRounds: number): Partnership[][] {
    const n = this.participants.length;
    const roundPartnerships: Partnership[][] = Array(totalRounds).fill(null).map(() => []);
    
    // For odd numbers, use a systematic round-robin approach
    // Each round should have exactly 2 partnerships (1 match) with 1 bye player
    
    for (let roundNumber = 0; roundNumber < totalRounds; roundNumber++) {
      const roundPartnershipsList: Partnership[] = [];
      
      // Determine who has the bye this round
      const byePlayerIndex = roundNumber % n;
      const byePlayer = this.participants[byePlayerIndex];
      const activePlayers = this.participants.filter((_, index) => index !== byePlayerIndex);
      
      // Use round-robin rotation for the 4 active players
      const activeN = activePlayers.length; // Should be 4 for 5 players
      
      if (activeN === 4) {
        // Use standard round-robin rotation for 4 players
        const rotation: number[] = new Array(activeN);
        rotation[0] = 0; // First active player stays fixed
        
        for (let i = 1; i < activeN; i++) {
          rotation[i] = ((i - 1 + roundNumber) % (activeN - 1)) + 1;
        }
        
        // Create 2 partnerships from the 4 active players
        // Pair players from opposite ends of the rotation
        for (let i = 0; i < activeN / 2; i++) {
          const player1Index = rotation[i];
          const player2Index = rotation[activeN - 1 - i];
          
          const player1 = activePlayers[player1Index];
          const player2 = activePlayers[player2Index];
          
          // Find the partnership
          const partnership = this.allPartnerships.find(p => 
            (p.player1.id === player1.id && p.player2.id === player2.id) ||
            (p.player1.id === player2.id && p.player2.id === player1.id)
          );
          
          if (partnership && !partnership.used) {
            roundPartnershipsList.push(partnership);
            partnership.used = true;
          } else {
            console.log(`Round ${roundNumber + 1}: Partnership ${player1.name}-${player2.name} ${partnership ? 'already used' : 'not found'}`);
          }
        }
      } else {
        // Fallback for other odd numbers
        const usedPlayersThisRound = new Set<string>();
        
        // Find partnerships for this round where no player is used twice
        for (const partnership of this.allPartnerships) {
          if (!partnership.used && 
              !usedPlayersThisRound.has(partnership.player1.id) && 
              !usedPlayersThisRound.has(partnership.player2.id) &&
              // Ensure both players are active (not the bye player)
              partnership.player1.id !== byePlayer.id &&
              partnership.player2.id !== byePlayer.id) {
            
            roundPartnershipsList.push(partnership);
            usedPlayersThisRound.add(partnership.player1.id);
            usedPlayersThisRound.add(partnership.player2.id);
            partnership.used = true;
            
            // Stop when we have enough partnerships for this round
            const partnershipsNeeded = Math.floor(activeN / 2);
            if (roundPartnershipsList.length >= partnershipsNeeded) {
              break;
            }
          }
        }
      }
      
      roundPartnerships[roundNumber] = roundPartnershipsList;
    }
    
    return roundPartnerships;
  }

  /**
   * Create a round from a list of partnerships
   */
  private createRoundFromPartnerships(roundNumber: number, partnerships: Partnership[]): Round {
    const n = this.participants.length;
    const matches: Match[] = [];
    let byePlayerId: string | undefined;
    
    // Handle bye for odd number of players
    if (n % 2 === 1) {
      byePlayerId = this.participants[(roundNumber - 1) % n].id;
    }
    
    // Create matches from partnerships (every 2 partnerships = 1 match)
    for (let i = 0; i < partnerships.length; i += 2) {
      if (partnerships[i] && partnerships[i + 1]) {
        const partnership1 = partnerships[i];
        const partnership2 = partnerships[i + 1];
        
        // Create teams
        const team1 = createTeam(this.tournamentId, partnership1.player1.id, partnership1.player2.id, false);
        const team2 = createTeam(this.tournamentId, partnership2.player1.id, partnership2.player2.id, false);
        
        const match = createMatch(
          this.tournamentId,
          roundNumber,
          matches.length + 1,
          team1.id,
          team2.id,
          1,
          new Date()
        );
        
        matches.push(match);
      }
    }
    
    return createRound(this.tournamentId, roundNumber, matches, byePlayerId);
  }



  /**
   * Validate that the generated schedule meets all requirements
   */
  validateSchedule(rounds: Round[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check round count
    const expectedRounds = this.getRequiredRounds();
    if (rounds.length !== expectedRounds) {
      errors.push(`Expected ${expectedRounds} rounds, but got ${rounds.length}`);
    }
    
    // Check that all partnerships have been used
    const unusedPartnerships = this.allPartnerships.filter(p => !p.used);
    if (unusedPartnerships.length > 0) {
      errors.push(`Not all partnerships have been used: ${unusedPartnerships.length} partnerships remaining`);
    }
    
    // Check that no player has more than one bye
    const byeCounts = new Map<string, number>();
    rounds.forEach(round => {
      if (round.byeTeamId) {
        const count = byeCounts.get(round.byeTeamId) || 0;
        byeCounts.set(round.byeTeamId, count + 1);
      }
    });
    
    for (const [playerId, count] of byeCounts) {
      if (count > 1) {
        errors.push(`Player ${playerId} has more than one bye`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all partnerships for testing/debugging
   */
  getAllPartnerships(): Partnership[] {
    return this.allPartnerships;
  }

  /**
   * Get unused partnerships for testing/debugging
   */
  getUnusedPartnerships(): Partnership[] {
    return this.allPartnerships.filter(p => !p.used);
  }
}

/**
 * Main function to generate individual signup round robin tournament
 */
export function generateIndividualSignupRoundRobin(
  participants: Participant[],
  tournamentId: string
): { rounds: Round[]; isValid: boolean; errors: string[] } {
  try {
    const algorithm = new IndividualSignupRoundRobin(participants, tournamentId);
    const rounds = algorithm.generateRounds();
    const validation = algorithm.validateSchedule(rounds);
    
    return {
      rounds,
      isValid: validation.isValid,
      errors: validation.errors
    };
  } catch (error) {
    return {
      rounds: [],
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };
  }
}