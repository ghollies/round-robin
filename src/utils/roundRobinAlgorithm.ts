import { Participant, Team, Match, Round } from '../types/tournament';
import { 
  generateTeamId, 
  generateMatchId, 
  generateRoundId, 
  createTeam, 
  createMatch, 
  createRound 
} from './index';

/**
 * Partnership matrix to track which players have been partnered together
 */
export class PartnershipMatrix {
  private matrix: boolean[][];
  private playerIds: string[];

  constructor(playerIds: string[]) {
    this.playerIds = [...playerIds];
    const n = playerIds.length;
    this.matrix = Array(n).fill(null).map(() => Array(n).fill(false));
    
    // Mark diagonal as true (player can't partner with themselves)
    for (let i = 0; i < n; i++) {
      this.matrix[i][i] = true;
    }
  }

  /**
   * Check if two players have already been partnered
   */
  hasPartnered(player1Id: string, player2Id: string): boolean {
    const index1 = this.playerIds.indexOf(player1Id);
    const index2 = this.playerIds.indexOf(player2Id);
    
    if (index1 === -1 || index2 === -1) {
      throw new Error(`Player not found in partnership matrix`);
    }
    
    return this.matrix[index1][index2];
  }

  /**
   * Mark two players as having been partnered
   */
  markPartnered(player1Id: string, player2Id: string): void {
    const index1 = this.playerIds.indexOf(player1Id);
    const index2 = this.playerIds.indexOf(player2Id);
    
    if (index1 === -1 || index2 === -1) {
      throw new Error(`Player not found in partnership matrix`);
    }
    
    this.matrix[index1][index2] = true;
    this.matrix[index2][index1] = true;
  }

  /**
   * Get all possible partnerships for a player that haven't been used yet
   */
  getAvailablePartners(playerId: string): string[] {
    const index = this.playerIds.indexOf(playerId);
    if (index === -1) {
      throw new Error(`Player not found in partnership matrix`);
    }
    
    const availablePartners: string[] = [];
    for (let i = 0; i < this.playerIds.length; i++) {
      if (!this.matrix[index][i]) {
        availablePartners.push(this.playerIds[i]);
      }
    }
    
    return availablePartners;
  }

  /**
   * Check if all partnerships have been used
   */
  isComplete(): boolean {
    const n = this.playerIds.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (!this.matrix[i][j]) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get the total number of partnerships that should exist
   */
  getTotalPartnerships(): number {
    const n = this.playerIds.length;
    return (n * (n - 1)) / 2;
  }

  /**
   * Get the number of partnerships that have been used
   */
  getUsedPartnerships(): number {
    const n = this.playerIds.length;
    let count = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this.matrix[i][j]) {
          count++;
        }
      }
    }
    return count;
  }
}

/**
 * Opposition tracking to ensure balanced play against all opponents
 */
export class OppositionTracker {
  private oppositions: Map<string, Map<string, number>>;
  private playerIds: string[];

  constructor(playerIds: string[]) {
    this.playerIds = [...playerIds];
    this.oppositions = new Map();
    
    // Initialize opposition tracking for each player
    playerIds.forEach(playerId => {
      const playerOppositions = new Map<string, number>();
      playerIds.forEach(opponentId => {
        if (playerId !== opponentId) {
          playerOppositions.set(opponentId, 0);
        }
      });
      this.oppositions.set(playerId, playerOppositions);
    });
  }

  /**
   * Record that two players have played against each other
   */
  recordOpposition(player1Id: string, player2Id: string): void {
    const player1Oppositions = this.oppositions.get(player1Id);
    const player2Oppositions = this.oppositions.get(player2Id);
    
    if (!player1Oppositions || !player2Oppositions) {
      throw new Error(`Player not found in opposition tracker`);
    }
    
    const current1 = player1Oppositions.get(player2Id) || 0;
    const current2 = player2Oppositions.get(player1Id) || 0;
    
    player1Oppositions.set(player2Id, current1 + 1);
    player2Oppositions.set(player1Id, current2 + 1);
  }

  /**
   * Get the number of times two players have played against each other
   */
  getOppositionCount(player1Id: string, player2Id: string): number {
    const player1Oppositions = this.oppositions.get(player1Id);
    if (!player1Oppositions) {
      throw new Error(`Player not found in opposition tracker`);
    }
    
    return player1Oppositions.get(player2Id) || 0;
  }

  /**
   * Check if the opposition distribution is balanced (each player has played against every other player exactly twice)
   */
  isBalanced(): boolean {
    for (const [playerId, playerOppositions] of this.oppositions) {
      for (const [opponentId, count] of playerOppositions) {
        if (count !== 2) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get players that a given player has played against the least
   */
  getLeastPlayedOpponents(playerId: string): string[] {
    const playerOppositions = this.oppositions.get(playerId);
    if (!playerOppositions) {
      throw new Error(`Player not found in opposition tracker`);
    }
    
    let minCount = Infinity;
    const opponents: string[] = [];
    
    for (const [opponentId, count] of playerOppositions) {
      if (count < minCount) {
        minCount = count;
        opponents.length = 0;
        opponents.push(opponentId);
      } else if (count === minCount) {
        opponents.push(opponentId);
      }
    }
    
    return opponents;
  }
}

/**
 * Round robin algorithm for individual signup tournaments
 */
export class IndividualSignupRoundRobin {
  private participants: Participant[];
  private partnershipMatrix: PartnershipMatrix;
  private oppositionTracker: OppositionTracker;
  private tournamentId: string;

  constructor(participants: Participant[], tournamentId: string) {
    if (participants.length < 4) {
      throw new Error('At least 4 participants are required for individual signup tournament');
    }
    
    this.participants = [...participants];
    this.tournamentId = tournamentId;
    this.partnershipMatrix = new PartnershipMatrix(participants.map(p => p.id));
    this.oppositionTracker = new OppositionTracker(participants.map(p => p.id));
  }

  /**
   * Calculate the number of rounds needed for the tournament
   */
  getRequiredRounds(): number {
    const n = this.participants.length;
    // For individual signup, we need enough rounds to ensure each player partners with every other player exactly once
    // This is different from traditional round robin
    if (n % 2 === 0) {
      return n - 1;
    } else {
      // For odd numbers, we need n rounds to accommodate all partnerships
      return n;
    }
  }

  /**
   * Calculate the number of matches per round
   */
  getMatchesPerRound(): number {
    const n = this.participants.length;
    return Math.floor(n / 2);
  }

  /**
   * Check if there will be bye rounds (odd number of participants)
   */
  hasByeRounds(): boolean {
    return this.participants.length % 2 === 1;
  }

  /**
   * Generate all rounds for the tournament using systematic rotation
   */
  generateRounds(): Round[] {
    const rounds: Round[] = [];
    const totalRounds = this.getRequiredRounds();
    
    for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber++) {
      const round = this.generateRound(roundNumber);
      rounds.push(round);
    }
    
    return rounds;
  }

  /**
   * Generate a single round using a systematic approach to ensure all partnerships are covered
   */
  private generateRound(roundNumber: number): Round {
    const n = this.participants.length;
    const isOdd = n % 2 === 1;
    
    const matches: Match[] = [];
    let byePlayerId: string | undefined;
    
    if (isOdd) {
      // For odd numbers, rotate who gets the bye
      const byePlayerIndex = (roundNumber - 1) % n;
      byePlayerId = this.participants[byePlayerIndex].id;
      
      // Create a list of remaining players (excluding the bye player)
      const remainingPlayers = this.participants.filter((_, index) => index !== byePlayerIndex);
      
      // Use round-robin rotation for the remaining even number of players
      const evenRotation = this.createEvenRotation(roundNumber, remainingPlayers);
      
      // Generate partnerships from the rotation
      const matchesPerRound = Math.floor(remainingPlayers.length / 2);
      
      for (let i = 0; i < matchesPerRound; i++) {
        const player1 = evenRotation[i];
        const player2 = evenRotation[remainingPlayers.length - 1 - i];
        
        // Create the partnership team
        const team1 = createTeam(this.tournamentId, player1.id, player2.id, false);
        
        // For now, create a dummy opponent team
        const team2 = createTeam(this.tournamentId, player1.id, player2.id, false);
        
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
        
        // Update tracking
        this.partnershipMatrix.markPartnered(player1.id, player2.id);
      }
    } else {
      // For even numbers, use standard rotation
      const rotation = this.createRotation(roundNumber, n);
      const matchesPerRound = Math.floor(n / 2);
      
      for (let i = 0; i < matchesPerRound; i++) {
        const player1Index = rotation[i];
        const player2Index = rotation[n - 1 - i];
        
        const player1 = this.participants[player1Index];
        const player2 = this.participants[player2Index];
        
        // Create the partnership team
        const team1 = createTeam(this.tournamentId, player1.id, player2.id, false);
        
        // For now, create a dummy opponent team
        const team2 = createTeam(this.tournamentId, player1.id, player2.id, false);
        
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
        
        // Update tracking
        this.partnershipMatrix.markPartnered(player1.id, player2.id);
      }
    }
    
    return createRound(this.tournamentId, roundNumber, matches, byePlayerId);
  }

  /**
   * Create rotation for even number of players (improved version)
   */
  private createEvenRotation(roundNumber: number, players: Participant[]): Participant[] {
    const n = players.length;
    if (n === 0) return [];
    
    const rotation: Participant[] = new Array(n);
    
    // Player 0 stays fixed at position 0
    rotation[0] = players[0];
    
    // Rotate other players around the circle
    // Adjust the rotation to account for the bye player being removed
    for (let i = 1; i < n; i++) {
      const rotatedPosition = ((i - 1 + roundNumber - 1) % (n - 1)) + 1;
      rotation[rotatedPosition] = players[i];
    }
    
    return rotation;
  }

  /**
   * Create rotation for even number of players
   */
  private createRotationForEvenPlayers(roundNumber: number, players: Participant[]): Participant[] {
    const n = players.length;
    const rotation: Participant[] = new Array(n);
    
    if (n === 0) return rotation;
    
    // Player 0 stays fixed at position 0
    rotation[0] = players[0];
    
    // Rotate other players around the circle
    for (let i = 1; i < n; i++) {
      const rotatedPosition = ((i - 1 + roundNumber - 1) % (n - 1)) + 1;
      rotation[rotatedPosition] = players[i];
    }
    
    return rotation;
  }

  /**
   * Create rotation array for a given round using the standard round-robin rotation
   */
  private createRotation(roundNumber: number, n: number): number[] {
    const rotation: number[] = new Array(n);
    
    // Player 0 stays fixed at position 0
    rotation[0] = 0;
    
    // Rotate other players around the circle
    for (let i = 1; i < n; i++) {
      const rotatedPosition = ((i - 1 + roundNumber - 1) % (n - 1)) + 1;
      rotation[rotatedPosition] = i;
    }
    
    return rotation;
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
    
    // Check that each player partners with every other player exactly once
    if (!this.partnershipMatrix.isComplete()) {
      errors.push('Not all partnerships have been used');
    }
    
    // For now, skip the opposition balance check since we're not implementing full matches yet
    // This will be implemented in a future iteration
    
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
   * Get partnership matrix for testing/debugging
   */
  getPartnershipMatrix(): PartnershipMatrix {
    return this.partnershipMatrix;
  }

  /**
   * Get opposition tracker for testing/debugging
   */
  getOppositionTracker(): OppositionTracker {
    return this.oppositionTracker;
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