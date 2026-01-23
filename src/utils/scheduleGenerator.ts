import { Tournament, Participant, Team, Match, Round } from '../types/tournament';
import { generateIndividualSignupRoundRobin } from './roundRobinAlgorithm';

export interface ScheduleSettings {
  startTime: Date;
  courtCount: number;
  matchDuration: number; // minutes
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
}

/**
 * Player availability tracker to prevent scheduling conflicts
 */
export class PlayerAvailabilityTracker {
  private playerSchedules: Map<string, Date[]>;
  private matchDuration: number;

  constructor(matchDuration: number) {
    this.matchDuration = matchDuration;
    this.playerSchedules = new Map();
  }

  /**
   * Check if all players are available at the given time
   */
  arePlayersAvailable(playerIds: string[], proposedTime: Date): boolean {
    const proposedEndTime = new Date(proposedTime.getTime() + this.matchDuration * 60000);
    
    for (const playerId of playerIds) {
      const playerSchedule = this.playerSchedules.get(playerId) || [];
      
      // Check if this time conflicts with any existing matches for this player
      for (const existingMatchTime of playerSchedule) {
        const existingEndTime = new Date(existingMatchTime.getTime() + this.matchDuration * 60000);
        
        // Check for overlap: new match starts before existing ends AND new match ends after existing starts
        const hasOverlap = proposedTime < existingEndTime && proposedEndTime > existingMatchTime;
        if (hasOverlap) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Find the earliest time when all players are available
   */
  getEarliestAvailableTime(playerIds: string[], earliestTime: Date): Date {
    let currentTime = new Date(earliestTime);
    
    // Keep checking until we find a time when all players are available
    while (!this.arePlayersAvailable(playerIds, currentTime)) {
      // Move forward by 15-minute increments to find next available slot
      currentTime = new Date(currentTime.getTime() + 15 * 60000);
    }
    
    return currentTime;
  }

  /**
   * Reserve players for a match at the given time
   */
  reservePlayers(playerIds: string[], matchTime: Date): void {
    for (const playerId of playerIds) {
      if (!this.playerSchedules.has(playerId)) {
        this.playerSchedules.set(playerId, []);
      }
      this.playerSchedules.get(playerId)!.push(matchTime);
    }
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
    const { rounds, teams, isValid, errors } = generateIndividualSignupRoundRobin(
      this.participants,
      this.tournament.id
    );

    if (!isValid) {
      throw new Error(`Failed to generate rounds: ${errors.join(', ')}`);
    }

    // Use the teams created by the round robin algorithm
    const scheduledMatches = this.optimizeSchedule(rounds, teams);

    // Calculate optimization metrics
    const optimization = this.calculateOptimization(scheduledMatches);

    return {
      rounds,
      scheduledMatches,
      optimization,
      teams
    };
  }

  /**
   * Optimize schedule timing and court assignments
   */
  private optimizeSchedule(rounds: Round[], teams: Team[]): ScheduledMatch[] {
    const courtTracker = new CourtAssignmentTracker(
      this.settings.courtCount,
      this.settings.matchDuration
    );
    
    const playerTracker = new PlayerAvailabilityTracker(this.settings.matchDuration);
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
        
        // Find earliest time when all players are available
        const earliestPlayerTime = playerTracker.getEarliestAvailableTime(playerIds, currentTime);
        
        // Find available court at or after the earliest player availability time
        const { courtNumber, assignedTime } = courtTracker.findAvailableCourt(earliestPlayerTime);
        
        // Double-check that all players are still available at the assigned time
        // (court assignment might have pushed the time later)
        const finalTime = playerTracker.arePlayersAvailable(playerIds, assignedTime) 
          ? assignedTime 
          : playerTracker.getEarliestAvailableTime(playerIds, assignedTime);
        
        // If the final time is different from assigned time, we need to find a new court slot
        const finalCourtAssignment = finalTime.getTime() === assignedTime.getTime()
          ? { courtNumber, assignedTime: finalTime }
          : courtTracker.findAvailableCourt(finalTime);
        
        // Reserve the court and players
        courtTracker.reserveCourt(finalCourtAssignment.courtNumber, finalCourtAssignment.assignedTime);
        playerTracker.reservePlayers(playerIds, finalCourtAssignment.assignedTime);
        
        // Create scheduled match
        const scheduledMatch: ScheduledMatch = {
          ...match,
          courtNumber: finalCourtAssignment.courtNumber,
          scheduledTime: finalCourtAssignment.assignedTime,
          teams: { team1, team2 },
          participants: {
            team1Players: this.getPlayersForTeam(team1),
            team2Players: this.getPlayersForTeam(team2)
          }
        };
        
        scheduledMatches.push(scheduledMatch);
        
        // Update current time for next iteration
        if (finalCourtAssignment.assignedTime > currentTime) {
          currentTime = finalCourtAssignment.assignedTime;
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
        sessionsCount: 1
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

    return {
      totalDuration,
      sessionsCount
    };
  }
}

/**
 * Utility function to create default schedule settings
 */
export function createDefaultScheduleSettings(tournament: Tournament): ScheduleSettings {
  const startTime = tournament.settings.startDateTime || tournament.scheduledStartTime || new Date();
  
  // If no tournament start time, default to 30 minutes from now
  if (!tournament.settings.startDateTime && !tournament.scheduledStartTime) {
    startTime.setTime(Date.now() + 30 * 60 * 1000); // 30 minutes from now
  }
  
  // Ensure start time is set to a reasonable hour if it's just a date
  if (startTime.getHours() === 0 && startTime.getMinutes() === 0) {
    startTime.setHours(9, 0, 0, 0); // Default start at 9 AM if no time specified
  }

  return {
    startTime,
    courtCount: tournament.settings.courtCount,
    matchDuration: tournament.settings.matchDuration,
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