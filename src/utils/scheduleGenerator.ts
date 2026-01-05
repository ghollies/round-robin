import { Tournament, Participant, Team, Match, Round } from '../types/tournament';
import { generateIndividualSignupRoundRobin } from './roundRobinAlgorithm';
import { createMatch, createTeam } from './index';

export interface ScheduleSettings {
  startTime: Date;
  courtCount: number;
  matchDuration: number; // minutes
  restPeriod: number; // minutes between matches for same player
  sessionBreakDuration?: number; // minutes for longer breaks between sessions
}

export interface ScheduledMatch extends Match {
  teams: {
    team1: Team;
    team2: Team;
  };
  participants: {
    team1Players: Participant[];
    team2Players: Participant[];
  };
}

export interface ScheduleOptimization {
  totalDuration: number; // minutes
  sessionsCount: number;
  averageRestPeriod: number;
  courtUtilization: number; // percentage
}

export interface GeneratedSchedule {
  rounds: Round[];
  scheduledMatches: ScheduledMatch[];
  optimization: ScheduleOptimization;
  teams: Team[];
}

/**
 * Court assignment tracker to manage court usage and conflicts
 */
export class CourtAssignmentTracker {
  private courtSchedules: Map<number, Date[]>;
  private courtCount: number;
  private matchDuration: number;

  constructor(courtCount: number, matchDuration: number) {
    this.courtCount = courtCount;
    this.matchDuration = matchDuration;
    this.courtSchedules = new Map();
    
    // Initialize court schedules
    for (let i = 1; i <= courtCount; i++) {
      this.courtSchedules.set(i, []);
    }
  }

  /**
   * Find the earliest available court for a match at or after the given time
   */
  findAvailableCourt(earliestTime: Date): { courtNumber: number; assignedTime: Date } {
    let bestCourt = 1;
    let bestTime: Date | null = null;

    for (let courtNumber = 1; courtNumber <= this.courtCount; courtNumber++) {
      const courtSchedule = this.courtSchedules.get(courtNumber)!;
      const availableTime = this.findEarliestAvailableTime(courtSchedule, earliestTime);
      
      if (bestTime === null || availableTime.getTime() < bestTime.getTime()) {
        bestCourt = courtNumber;
        bestTime = availableTime;
      }
    }

    return { courtNumber: bestCourt, assignedTime: bestTime || earliestTime };
  }

  /**
   * Reserve a court at a specific time
   */
  reserveCourt(courtNumber: number, startTime: Date): void {
    const courtSchedule = this.courtSchedules.get(courtNumber);
    if (!courtSchedule) {
      throw new Error(`Court ${courtNumber} does not exist`);
    }

    courtSchedule.push(startTime);
    courtSchedule.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Find the earliest available time on a specific court
   */
  private findEarliestAvailableTime(courtSchedule: Date[], earliestTime: Date): Date {
    if (courtSchedule.length === 0) {
      return earliestTime;
    }

    // Check if we can fit before the first match
    const firstMatch = courtSchedule[0];
    const matchEndTime = new Date(firstMatch.getTime() + this.matchDuration * 60000);
    if (new Date(earliestTime.getTime() + this.matchDuration * 60000) <= firstMatch) {
      return earliestTime;
    }

    // Check gaps between matches
    for (let i = 0; i < courtSchedule.length - 1; i++) {
      const currentMatchEnd = new Date(courtSchedule[i].getTime() + this.matchDuration * 60000);
      const nextMatchStart = courtSchedule[i + 1];
      const gapDuration = nextMatchStart.getTime() - currentMatchEnd.getTime();
      
      if (gapDuration >= this.matchDuration * 60000) {
        const proposedStart = new Date(Math.max(currentMatchEnd.getTime(), earliestTime.getTime()));
        if (new Date(proposedStart.getTime() + this.matchDuration * 60000) <= nextMatchStart) {
          return proposedStart;
        }
      }
    }

    // Schedule after the last match
    const lastMatch = courtSchedule[courtSchedule.length - 1];
    const lastMatchEnd = new Date(lastMatch.getTime() + this.matchDuration * 60000);
    return new Date(Math.max(lastMatchEnd.getTime(), earliestTime.getTime()));
  }

  /**
   * Get court utilization statistics
   */
  getCourtUtilization(totalDuration: number): number {
    let totalMatchTime = 0;
    
    for (const courtSchedule of this.courtSchedules.values()) {
      totalMatchTime += courtSchedule.length * this.matchDuration;
    }
    
    const totalAvailableTime = this.courtCount * totalDuration;
    return totalAvailableTime > 0 ? (totalMatchTime / totalAvailableTime) * 100 : 0;
  }
}

/**
 * Player rest period tracker to ensure adequate rest between matches
 */
export class RestPeriodTracker {
  private playerLastMatchEnd: Map<string, Date>;
  private restPeriod: number;

  constructor(restPeriod: number) {
    this.restPeriod = restPeriod;
    this.playerLastMatchEnd = new Map();
  }

  /**
   * Get the earliest time a player can play their next match
   */
  getEarliestPlayTime(playerId: string, currentTime: Date): Date {
    const lastMatchEnd = this.playerLastMatchEnd.get(playerId);
    if (!lastMatchEnd) {
      return currentTime;
    }

    const earliestNextMatch = new Date(lastMatchEnd.getTime() + this.restPeriod * 60000);
    return new Date(Math.max(earliestNextMatch.getTime(), currentTime.getTime()));
  }

  /**
   * Record when a player's match ends
   */
  recordMatchEnd(playerId: string, matchEndTime: Date): void {
    this.playerLastMatchEnd.set(playerId, matchEndTime);
  }

  /**
   * Get the earliest time all players in a match can play
   */
  getEarliestMatchTime(playerIds: string[], currentTime: Date): Date {
    let earliestTime = currentTime;
    
    for (const playerId of playerIds) {
      const playerEarliestTime = this.getEarliestPlayTime(playerId, currentTime);
      if (playerEarliestTime > earliestTime) {
        earliestTime = playerEarliestTime;
      }
    }
    
    return earliestTime;
  }

  /**
   * Calculate average rest period for all players
   */
  calculateAverageRestPeriod(): number {
    // This would require tracking actual rest periods, for now return configured value
    return this.restPeriod;
  }
}

/**
 * Main schedule generator class
 */
export class ScheduleGenerator {
  private tournament: Tournament;
  private participants: Participant[];
  private settings: ScheduleSettings;

  constructor(tournament: Tournament, participants: Participant[], settings: ScheduleSettings) {
    this.tournament = tournament;
    this.participants = participants;
    this.settings = settings;
  }

  /**
   * Generate complete tournament schedule with optimization
   */
  generateSchedule(): GeneratedSchedule {
    // Generate rounds using the round robin algorithm
    const { rounds, isValid, errors } = generateIndividualSignupRoundRobin(
      this.participants,
      this.tournament.id
    );

    if (!isValid) {
      throw new Error(`Failed to generate rounds: ${errors.join(', ')}`);
    }

    // Create teams and assign opponents for individual signup mode
    const { updatedRounds, teams } = this.createTeamsAndOpponents(rounds);

    // Optimize schedule timing and court assignments
    const scheduledMatches = this.optimizeSchedule(updatedRounds, teams);

    // Calculate optimization metrics
    const optimization = this.calculateOptimization(scheduledMatches);

    return {
      rounds: updatedRounds,
      scheduledMatches,
      optimization,
      teams
    };
  }

  /**
   * Create teams and assign opponents for individual signup tournaments
   */
  private createTeamsAndOpponents(rounds: Round[]): { updatedRounds: Round[]; teams: Team[] } {
    const teams: Team[] = [];
    const teamMap = new Map<string, Team>();
    const updatedRounds: Round[] = [];

    for (const round of rounds) {
      const updatedMatches: Match[] = [];
      
      for (const match of round.matches) {
        // For individual signup, we need to create proper teams
        // For now, we'll create teams based on available participants
        // This is a simplified implementation
        
        let team1: Team;
        let team2: Team;
        
        if (teamMap.has(match.team1Id)) {
          team1 = teamMap.get(match.team1Id)!;
        } else {
          // Create team from first two participants (simplified)
          const availableParticipants = this.participants.slice();
          team1 = createTeam(
            this.tournament.id,
            availableParticipants[0]?.id || 'player1',
            availableParticipants[1]?.id || 'player2',
            false
          );
          teams.push(team1);
          teamMap.set(match.team1Id, team1);
        }
        
        if (teamMap.has(match.team2Id)) {
          team2 = teamMap.get(match.team2Id)!;
        } else {
          // Create opponent team from remaining participants (simplified)
          const availableParticipants = this.participants.slice();
          team2 = createTeam(
            this.tournament.id,
            availableParticipants[2]?.id || 'player3',
            availableParticipants[3]?.id || 'player4',
            false
          );
          teams.push(team2);
          teamMap.set(match.team2Id, team2);
        }
        
        const updatedMatch: Match = {
          ...match,
          team1Id: team1.id,
          team2Id: team2.id
        };
        
        updatedMatches.push(updatedMatch);
      }
      
      updatedRounds.push({
        ...round,
        matches: updatedMatches
      });
    }

    return { updatedRounds, teams };
  }



  /**
   * Optimize schedule timing and court assignments
   */
  private optimizeSchedule(rounds: Round[], teams: Team[]): ScheduledMatch[] {
    const courtTracker = new CourtAssignmentTracker(
      this.settings.courtCount,
      this.settings.matchDuration
    );
    
    const restTracker = new RestPeriodTracker(this.settings.restPeriod);
    const scheduledMatches: ScheduledMatch[] = [];
    let currentTime = new Date(this.settings.startTime);

    for (const round of rounds) {
      for (const match of round.matches) {
        const team1 = teams.find(t => t.id === match.team1Id);
        const team2 = teams.find(t => t.id === match.team2Id);
        
        if (!team1 || !team2) {
          throw new Error(`Teams not found for match ${match.id}`);
        }

        // Get all player IDs involved in this match
        const playerIds = [team1.player1Id, team1.player2Id, team2.player1Id, team2.player2Id];
        
        // Find earliest time all players can play
        const earliestMatchTime = restTracker.getEarliestMatchTime(playerIds, currentTime);
        
        // Find available court
        const { courtNumber, assignedTime } = courtTracker.findAvailableCourt(earliestMatchTime);
        
        // Reserve the court
        courtTracker.reserveCourt(courtNumber, assignedTime);
        
        // Create scheduled match
        const scheduledMatch: ScheduledMatch = {
          ...match,
          courtNumber,
          scheduledTime: assignedTime,
          teams: { team1, team2 },
          participants: {
            team1Players: this.getPlayersForTeam(team1),
            team2Players: this.getPlayersForTeam(team2)
          }
        };
        
        scheduledMatches.push(scheduledMatch);
        
        // Update rest tracker
        const matchEndTime = new Date(assignedTime.getTime() + this.settings.matchDuration * 60000);
        playerIds.forEach(playerId => {
          restTracker.recordMatchEnd(playerId, matchEndTime);
        });
        
        // Update current time for next iteration
        if (assignedTime > currentTime) {
          currentTime = assignedTime;
        }
      }
    }

    return scheduledMatches;
  }

  /**
   * Get participant objects for a team
   */
  private getPlayersForTeam(team: Team): Participant[] {
    const player1 = this.participants.find(p => p.id === team.player1Id);
    const player2 = this.participants.find(p => p.id === team.player2Id);
    
    return [player1, player2].filter(p => p !== undefined) as Participant[];
  }

  /**
   * Calculate optimization metrics
   */
  private calculateOptimization(scheduledMatches: ScheduledMatch[]): ScheduleOptimization {
    if (scheduledMatches.length === 0) {
      return {
        totalDuration: 0,
        sessionsCount: 1,
        averageRestPeriod: this.settings.restPeriod,
        courtUtilization: 0
      };
    }

    // Calculate total duration
    const startTime = this.settings.startTime;
    const lastMatch = scheduledMatches.reduce((latest, match) => 
      match.scheduledTime > latest.scheduledTime ? match : latest
    );
    const endTime = new Date(lastMatch.scheduledTime.getTime() + this.settings.matchDuration * 60000);
    const totalDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

    // Calculate sessions (simplified - assume one session for now)
    const sessionsCount = 1;

    // Calculate court utilization
    const totalMatchTime = scheduledMatches.length * this.settings.matchDuration;
    const totalAvailableTime = this.settings.courtCount * totalDuration;
    const courtUtilization = totalAvailableTime > 0 ? (totalMatchTime / totalAvailableTime) * 100 : 0;

    return {
      totalDuration,
      sessionsCount,
      averageRestPeriod: this.settings.restPeriod,
      courtUtilization
    };
  }
}

/**
 * Utility function to create default schedule settings
 */
export function createDefaultScheduleSettings(tournament: Tournament): ScheduleSettings {
  const startTime = new Date();
  startTime.setHours(9, 0, 0, 0); // Default start at 9 AM

  return {
    startTime,
    courtCount: tournament.settings.courtCount,
    matchDuration: tournament.settings.matchDuration,
    restPeriod: Math.max(15, Math.floor(tournament.settings.matchDuration * 0.5)), // At least 15 min or 50% of match duration
    sessionBreakDuration: 60 // 1 hour break between sessions
  };
}

/**
 * Main function to generate optimized tournament schedule
 */
export function generateOptimizedSchedule(
  tournament: Tournament,
  participants: Participant[],
  settings?: Partial<ScheduleSettings>
): GeneratedSchedule {
  const defaultSettings = createDefaultScheduleSettings(tournament);
  const finalSettings = { ...defaultSettings, ...settings };
  
  const generator = new ScheduleGenerator(tournament, participants, finalSettings);
  return generator.generateSchedule();
}