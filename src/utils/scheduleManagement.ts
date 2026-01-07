import { Match, Round, ScheduleChange, ScheduleConflict } from '../types/tournament';
import { generateId } from './index';

// Change history management
export class ScheduleChangeHistory {
  private changes: ScheduleChange[] = [];
  private maxHistorySize = 50;

  addChange(change: Omit<ScheduleChange, 'id' | 'timestamp'>): ScheduleChange {
    const newChange: ScheduleChange = {
      ...change,
      id: generateId(),
      timestamp: new Date()
    };

    this.changes.unshift(newChange);
    
    // Limit history size
    if (this.changes.length > this.maxHistorySize) {
      this.changes = this.changes.slice(0, this.maxHistorySize);
    }

    return newChange;
  }

  getHistory(): ScheduleChange[] {
    return [...this.changes];
  }

  getLastChange(): ScheduleChange | null {
    return this.changes[0] || null;
  }

  canUndo(): boolean {
    return this.changes.length > 0;
  }

  getUndoableChange(): ScheduleChange | null {
    return this.changes.find(change => 
      change.type === 'match-reschedule' || 
      change.type === 'court-reassign' || 
      change.type === 'round-swap'
    ) || null;
  }

  clear(): void {
    this.changes = [];
  }
}

// Conflict detection utilities
export class ConflictDetector {
  static detectConflicts(matches: Match[], rounds: Round[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    // Check for court double-booking
    conflicts.push(...this.detectCourtConflicts(matches));
    
    // Check for player time conflicts
    conflicts.push(...this.detectPlayerConflicts(matches));
    
    // Check for round timing issues
    conflicts.push(...this.detectRoundConflicts(matches, rounds));

    return conflicts;
  }

  private static detectCourtConflicts(matches: Match[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const courtSchedule = new Map<string, Match[]>();

    // Group matches by court and time
    matches.forEach(match => {
      const timeSlot = this.getTimeSlot(match.scheduledTime);
      const key = `${match.courtNumber}-${timeSlot}`;
      
      if (!courtSchedule.has(key)) {
        courtSchedule.set(key, []);
      }
      courtSchedule.get(key)!.push(match);
    });

    // Find conflicts
    courtSchedule.forEach((matchesInSlot, key) => {
      if (matchesInSlot.length > 1) {
        const [courtNumber] = key.split('-');
        conflicts.push({
          id: generateId(),
          type: 'court-double-booking',
          severity: 'error',
          message: `Court ${courtNumber} has multiple matches scheduled at the same time`,
          affectedMatches: matchesInSlot.map(m => m.id),
          suggestions: [
            'Reschedule one of the matches to a different time',
            'Assign one of the matches to a different court',
            'Adjust match duration to prevent overlap'
          ]
        });
      }
    });

    return conflicts;
  }

  private static detectPlayerConflicts(matches: Match[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const playerSchedule = new Map<string, Match[]>();

    // Group matches by player and time
    matches.forEach(match => {
      const timeSlot = this.getTimeSlot(match.scheduledTime);
      
      // Check all players in the match
      [match.team1Id, match.team2Id].forEach(teamId => {
        const key = `${teamId}-${timeSlot}`;
        
        if (!playerSchedule.has(key)) {
          playerSchedule.set(key, []);
        }
        playerSchedule.get(key)!.push(match);
      });
    });

    // Find conflicts
    playerSchedule.forEach((matchesInSlot, key) => {
      if (matchesInSlot.length > 1) {
        const [teamId] = key.split('-');
        conflicts.push({
          id: generateId(),
          type: 'player-overlap',
          severity: 'error',
          message: `Team ${teamId} is scheduled for multiple matches at the same time`,
          affectedMatches: matchesInSlot.map(m => m.id),
          suggestions: [
            'Reschedule one of the matches to a different time',
            'Ensure adequate rest time between consecutive matches'
          ]
        });
      }
    });

    return conflicts;
  }

  private static detectRoundConflicts(matches: Match[], rounds: Round[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    // Check for round timing issues
    rounds.forEach(round => {
      const roundMatches = matches.filter(m => m.roundNumber === round.roundNumber);
      
      if (roundMatches.length === 0) return;

      // Check if all matches in a round have reasonable time gaps
      const sortedMatches = roundMatches.sort((a, b) => 
        a.scheduledTime.getTime() - b.scheduledTime.getTime()
      );

      for (let i = 1; i < sortedMatches.length; i++) {
        const prevMatch = sortedMatches[i - 1];
        const currentMatch = sortedMatches[i];
        const timeDiff = currentMatch.scheduledTime.getTime() - prevMatch.scheduledTime.getTime();
        
        // If matches are less than 5 minutes apart, it might be a conflict
        if (timeDiff < 5 * 60 * 1000 && prevMatch.courtNumber === currentMatch.courtNumber) {
          conflicts.push({
            id: generateId(),
            type: 'time-conflict',
            severity: 'warning',
            message: `Matches in Round ${round.roundNumber} have insufficient time gap`,
            affectedMatches: [prevMatch.id, currentMatch.id],
            suggestions: [
              'Increase time gap between consecutive matches',
              'Assign matches to different courts'
            ]
          });
        }
      }
    });

    return conflicts;
  }

  private static getTimeSlot(date: Date): string {
    // Round to nearest 15-minute interval for conflict detection
    const minutes = Math.floor(date.getMinutes() / 15) * 15;
    const roundedDate = new Date(date);
    roundedDate.setMinutes(minutes, 0, 0);
    return roundedDate.toISOString();
  }

  static validateMatchReschedule(
    match: Match, 
    newTime: Date, 
    newCourt: number, 
    allMatches: Match[]
  ): ScheduleConflict[] {
    // Create a temporary match with new values
    const tempMatch: Match = {
      ...match,
      scheduledTime: newTime,
      courtNumber: newCourt
    };

    // Get all other matches (excluding the one being moved)
    const otherMatches = allMatches.filter(m => m.id !== match.id);
    
    // Check for conflicts with the new position
    return this.detectConflicts([...otherMatches, tempMatch], []);
  }
}

// Schedule manipulation utilities
export class ScheduleManipulator {
  static rescheduleMatch(
    match: Match,
    newTime: Date,
    newCourt: number,
    changeHistory: ScheduleChangeHistory
  ): Match {
    const oldValue = {
      scheduledTime: match.scheduledTime,
      courtNumber: match.courtNumber
    };

    const newValue = {
      scheduledTime: newTime,
      courtNumber: newCourt
    };

    // Record the change
    changeHistory.addChange({
      type: 'match-reschedule',
      description: `Rescheduled Match ${match.matchNumber} from Court ${match.courtNumber} at ${match.scheduledTime.toLocaleTimeString()} to Court ${newCourt} at ${newTime.toLocaleTimeString()}`,
      oldValue,
      newValue,
      matchId: match.id
    });

    // Return updated match
    return {
      ...match,
      scheduledTime: newTime,
      courtNumber: newCourt
    };
  }

  static reassignCourt(
    match: Match,
    newCourt: number,
    changeHistory: ScheduleChangeHistory
  ): Match {
    const oldValue = { courtNumber: match.courtNumber };
    const newValue = { courtNumber: newCourt };

    // Record the change
    changeHistory.addChange({
      type: 'court-reassign',
      description: `Reassigned Match ${match.matchNumber} from Court ${match.courtNumber} to Court ${newCourt}`,
      oldValue,
      newValue,
      matchId: match.id
    });

    // Return updated match
    return {
      ...match,
      courtNumber: newCourt
    };
  }

  static validateRoundSwap(round1: Round, round2: Round, matches: Match[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if trying to swap the same round
    if (round1.id === round2.id) {
      errors.push('Cannot swap a round with itself');
    }

    // Check if rounds are incomplete
    if (round1.status === 'completed') {
      errors.push(`Round ${round1.roundNumber} is already completed and cannot be swapped`);
    }
    if (round2.status === 'completed') {
      errors.push(`Round ${round2.roundNumber} is already completed and cannot be swapped`);
    }

    // Check if any matches in the rounds are completed
    const round1Matches = matches.filter(m => m.roundNumber === round1.roundNumber);
    const round2Matches = matches.filter(m => m.roundNumber === round2.roundNumber);

    const round1CompletedMatches = round1Matches.filter(m => m.status === 'completed');
    const round2CompletedMatches = round2Matches.filter(m => m.status === 'completed');

    if (round1CompletedMatches.length > 0) {
      errors.push(`Round ${round1.roundNumber} has ${round1CompletedMatches.length} completed matches and cannot be swapped`);
    }
    if (round2CompletedMatches.length > 0) {
      errors.push(`Round ${round2.roundNumber} has ${round2CompletedMatches.length} completed matches and cannot be swapped`);
    }

    // Check team consistency - both rounds should involve the same set of teams
    const round1Teams = new Set([
      ...round1Matches.map(m => m.team1Id),
      ...round1Matches.map(m => m.team2Id)
    ]);
    const round2Teams = new Set([
      ...round2Matches.map(m => m.team1Id),
      ...round2Matches.map(m => m.team2Id)
    ]);

    // For individual signup tournaments, team consistency is more complex
    // We need to ensure the swap maintains the partnership rotation integrity
    if (round1Teams.size !== round2Teams.size) {
      warnings.push(`Rounds have different numbers of participating teams (${round1Teams.size} vs ${round2Teams.size})`);
    }

    // Check for bye consistency
    if (round1.byeTeamId && !round2.byeTeamId) {
      warnings.push(`Round ${round1.roundNumber} has a bye but Round ${round2.roundNumber} does not`);
    }
    if (!round1.byeTeamId && round2.byeTeamId) {
      warnings.push(`Round ${round2.roundNumber} has a bye but Round ${round1.roundNumber} does not`);
    }

    // Check if rounds are adjacent (swapping adjacent rounds is generally safer)
    const roundDifference = Math.abs(round1.roundNumber - round2.roundNumber);
    if (roundDifference > 2) {
      warnings.push(`Swapping non-adjacent rounds (${roundDifference} rounds apart) may affect tournament flow`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static swapRounds(
    round1: Round,
    round2: Round,
    matches: Match[],
    changeHistory: ScheduleChangeHistory,
    matchDuration: number = 20
  ): { updatedRounds: Round[], updatedMatches: Match[] } {
    // Validate the swap first
    const validation = this.validateRoundSwap(round1, round2, matches);
    if (!validation.isValid) {
      throw new Error(`Cannot swap rounds: ${validation.errors.join(', ')}`);
    }

    const oldValue = {
      round1Number: round1.roundNumber,
      round2Number: round2.roundNumber,
      round1Id: round1.id,
      round2Id: round2.id
    };

    const newValue = {
      round1Number: round2.roundNumber,
      round2Number: round1.roundNumber,
      round1Id: round1.id,
      round2Id: round2.id
    };

    // Record the change
    changeHistory.addChange({
      type: 'round-swap',
      description: `Swapped Round ${round1.roundNumber} with Round ${round2.roundNumber}`,
      oldValue,
      newValue,
      roundId: round1.id
    });

    // Update round numbers
    const updatedRound1 = { ...round1, roundNumber: round2.roundNumber };
    const updatedRound2 = { ...round2, roundNumber: round1.roundNumber };

    // Get all matches for both rounds
    const round1Matches = matches.filter(m => m.roundNumber === round1.roundNumber);
    const round2Matches = matches.filter(m => m.roundNumber === round2.roundNumber);

    // Recalculate time slots based on new round order
    const { updatedRound1Matches, updatedRound2Matches } = this.recalculateTimeSlots(
      round1Matches,
      round2Matches,
      round2.roundNumber, // round1 is taking round2's position
      round1.roundNumber, // round2 is taking round1's position
      matchDuration
    );

    // Update all matches with new round numbers and times
    const updatedMatches = matches.map(match => {
      if (match.roundNumber === round1.roundNumber) {
        const updatedMatch = updatedRound1Matches.find(m => m.id === match.id);
        return updatedMatch || { ...match, roundNumber: round2.roundNumber };
      } else if (match.roundNumber === round2.roundNumber) {
        const updatedMatch = updatedRound2Matches.find(m => m.id === match.id);
        return updatedMatch || { ...match, roundNumber: round1.roundNumber };
      }
      return match;
    });

    return {
      updatedRounds: [updatedRound1, updatedRound2],
      updatedMatches
    };
  }

  static swapRoundsWithCourtRebalancing(
    round1: Round,
    round2: Round,
    matches: Match[],
    changeHistory: ScheduleChangeHistory,
    matchDuration: number = 20,
    courtCount: number
  ): { updatedRounds: Round[], updatedMatches: Match[] } {
    // Validate the swap first
    const validation = this.validateRoundSwap(round1, round2, matches);
    if (!validation.isValid) {
      throw new Error(`Cannot swap rounds: ${validation.errors.join(', ')}`);
    }

    const oldValue = {
      round1Number: round1.roundNumber,
      round2Number: round2.roundNumber,
      round1Id: round1.id,
      round2Id: round2.id
    };

    const newValue = {
      round1Number: round2.roundNumber,
      round2Number: round1.roundNumber,
      round1Id: round1.id,
      round2Id: round2.id
    };

    // Record the change
    changeHistory.addChange({
      type: 'round-swap',
      description: `Swapped Round ${round1.roundNumber} with Round ${round2.roundNumber} with court rebalancing`,
      oldValue,
      newValue,
      roundId: round1.id
    });

    // Update round numbers
    const updatedRound1 = { ...round1, roundNumber: round2.roundNumber };
    const updatedRound2 = { ...round2, roundNumber: round1.roundNumber };

    // Get all matches for both rounds
    const round1Matches = matches.filter(m => m.roundNumber === round1.roundNumber);
    const round2Matches = matches.filter(m => m.roundNumber === round2.roundNumber);

    // Recalculate time slots and rebalance courts
    const { updatedRound1Matches, updatedRound2Matches } = this.recalculateTimeSlotsWithCourtRebalancing(
      round1Matches,
      round2Matches,
      round2.roundNumber, // round1 is taking round2's position
      round1.roundNumber, // round2 is taking round1's position
      matchDuration,
      courtCount
    );

    // Update all matches with new round numbers, times, and court assignments
    const updatedMatches = matches.map(match => {
      if (match.roundNumber === round1.roundNumber) {
        const updatedMatch = updatedRound1Matches.find(m => m.id === match.id);
        return updatedMatch || { ...match, roundNumber: round2.roundNumber };
      } else if (match.roundNumber === round2.roundNumber) {
        const updatedMatch = updatedRound2Matches.find(m => m.id === match.id);
        return updatedMatch || { ...match, roundNumber: round1.roundNumber };
      }
      return match;
    });

    return {
      updatedRounds: [updatedRound1, updatedRound2],
      updatedMatches
    };
  }

  private static recalculateTimeSlotsWithCourtRebalancing(
    round1Matches: Match[],
    round2Matches: Match[],
    newRound1Number: number,
    newRound2Number: number,
    matchDuration: number,
    courtCount: number
  ): { updatedRound1Matches: Match[], updatedRound2Matches: Match[] } {
    // Calculate base time for each round based on round number
    const baseTime = new Date();
    baseTime.setHours(9, 0, 0, 0); // Start at 9 AM

    const round1BaseTime = new Date(baseTime.getTime() + (newRound1Number - 1) * matchDuration * 60000);
    const round2BaseTime = new Date(baseTime.getTime() + (newRound2Number - 1) * matchDuration * 60000);

    // Rebalance courts for round 1 matches
    const updatedRound1Matches = this.rebalanceMatchesAcrossCourts(
      round1Matches,
      newRound1Number,
      round1BaseTime,
      courtCount,
      matchDuration
    );

    // Rebalance courts for round 2 matches
    const updatedRound2Matches = this.rebalanceMatchesAcrossCourts(
      round2Matches,
      newRound2Number,
      round2BaseTime,
      courtCount,
      matchDuration
    );

    return { updatedRound1Matches, updatedRound2Matches };
  }

  private static rebalanceMatchesAcrossCourts(
    matches: Match[],
    roundNumber: number,
    baseTime: Date,
    courtCount: number,
    matchDuration: number
  ): Match[] {
    if (matches.length === 0) return [];

    // Sort matches by their original match number to maintain consistency
    const sortedMatches = [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
    
    // Calculate how many matches can run simultaneously (one per court)
    const matchesPerTimeSlot = Math.min(courtCount, sortedMatches.length);
    
    // Calculate number of time slots needed
    const timeSlots = Math.ceil(sortedMatches.length / matchesPerTimeSlot);
    
    return sortedMatches.map((match, index) => {
      // Determine which time slot this match belongs to
      const timeSlotIndex = Math.floor(index / matchesPerTimeSlot);
      
      // Determine which court within that time slot
      const courtIndex = index % matchesPerTimeSlot;
      const courtNumber = courtIndex + 1;
      
      // Calculate the scheduled time for this time slot
      const scheduledTime = new Date(baseTime.getTime() + timeSlotIndex * matchDuration * 60000);
      
      return {
        ...match,
        roundNumber,
        courtNumber,
        scheduledTime
      };
    });
  }

  private static recalculateTimeSlots(
    round1Matches: Match[],
    round2Matches: Match[],
    newRound1Number: number,
    newRound2Number: number,
    matchDuration: number
  ): { updatedRound1Matches: Match[], updatedRound2Matches: Match[] } {
    // Calculate base time for each round based on round number
    // Assuming rounds start at specific intervals
    const baseTime = new Date();
    baseTime.setHours(9, 0, 0, 0); // Start at 9 AM

    const round1BaseTime = new Date(baseTime.getTime() + (newRound1Number - 1) * matchDuration * 60000);
    const round2BaseTime = new Date(baseTime.getTime() + (newRound2Number - 1) * matchDuration * 60000);

    // Update round 1 matches with new times and round number
    const updatedRound1Matches = round1Matches.map((match, index) => ({
      ...match,
      roundNumber: newRound1Number,
      scheduledTime: new Date(round1BaseTime.getTime() + (index * 2 * 60000)) // 2-minute stagger
    }));

    // Update round 2 matches with new times and round number
    const updatedRound2Matches = round2Matches.map((match, index) => ({
      ...match,
      roundNumber: newRound2Number,
      scheduledTime: new Date(round2BaseTime.getTime() + (index * 2 * 60000)) // 2-minute stagger
    }));

    return { updatedRound1Matches, updatedRound2Matches };
  }

  static undoLastChange(
    change: ScheduleChange,
    matches: Match[],
    rounds: Round[]
  ): { updatedMatches: Match[], updatedRounds: Round[] } {
    switch (change.type) {
      case 'match-reschedule':
      case 'court-reassign':
        if (!change.matchId) {
          throw new Error('Match ID required for undo operation');
        }

        const updatedMatches = matches.map(match => {
          if (match.id === change.matchId) {
            return {
              ...match,
              ...change.oldValue
            };
          }
          return match;
        });

        return { updatedMatches, updatedRounds: rounds };

      case 'round-swap':
        if (!change.roundId) {
          throw new Error('Round ID required for undo operation');
        }

        // Find the rounds that were swapped
        const round1 = rounds.find(r => r.id === change.roundId);
        if (!round1) {
          throw new Error('Round not found for undo operation');
        }

        // Swap back to original numbers
        const updatedRounds = rounds.map(round => {
          if (round.roundNumber === change.newValue.round1Number) {
            return { ...round, roundNumber: change.oldValue.round1Number };
          } else if (round.roundNumber === change.newValue.round2Number) {
            return { ...round, roundNumber: change.oldValue.round2Number };
          }
          return round;
        });

        // Update match round numbers back
        const revertedMatches = matches.map(match => {
          if (match.roundNumber === change.newValue.round1Number) {
            return { ...match, roundNumber: change.oldValue.round1Number };
          } else if (match.roundNumber === change.newValue.round2Number) {
            return { ...match, roundNumber: change.oldValue.round2Number };
          }
          return match;
        });

        return { updatedMatches: revertedMatches, updatedRounds };

      default:
        throw new Error(`Unsupported change type for undo: ${change.type}`);
    }
  }
}

// Time slot utilities
export class TimeSlotManager {
  static generateTimeSlots(
    startTime: Date,
    matchDuration: number,
    courtCount: number,
    totalMatches: number
  ): Date[] {
    const slots: Date[] = [];
    const slotsPerCourt = Math.ceil(totalMatches / courtCount);
    
    for (let i = 0; i < slotsPerCourt; i++) {
      const slotTime = new Date(startTime.getTime() + i * matchDuration * 60000);
      slots.push(slotTime);
    }
    
    return slots;
  }

  static findAvailableTimeSlot(
    courtNumber: number,
    preferredTime: Date,
    matches: Match[],
    matchDuration: number
  ): Date | null {
    const courtMatches = matches.filter(m => m.courtNumber === courtNumber);
    
    // Check if preferred time is available
    if (this.isTimeSlotAvailable(preferredTime, courtMatches, matchDuration)) {
      return preferredTime;
    }

    // Try slots before and after preferred time
    for (let offset = matchDuration; offset <= 4 * matchDuration; offset += matchDuration) {
      // Try earlier slot
      const earlierSlot = new Date(preferredTime.getTime() - offset * 60000);
      if (this.isTimeSlotAvailable(earlierSlot, courtMatches, matchDuration)) {
        return earlierSlot;
      }

      // Try later slot
      const laterSlot = new Date(preferredTime.getTime() + offset * 60000);
      if (this.isTimeSlotAvailable(laterSlot, courtMatches, matchDuration)) {
        return laterSlot;
      }
    }

    return null;
  }

  private static isTimeSlotAvailable(
    time: Date,
    courtMatches: Match[],
    matchDuration: number
  ): boolean {
    const slotEnd = new Date(time.getTime() + matchDuration * 60000);

    return !courtMatches.some(match => {
      const matchEnd = new Date(match.scheduledTime.getTime() + matchDuration * 60000);
      
      // Check for overlap
      return (time < matchEnd && slotEnd > match.scheduledTime);
    });
  }
}