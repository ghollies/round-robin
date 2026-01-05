import { Match, Round, ScheduleChange, ScheduleConflict, Participant } from '../types/tournament';
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

  static swapRounds(
    round1: Round,
    round2: Round,
    matches: Match[],
    changeHistory: ScheduleChangeHistory
  ): { updatedRounds: Round[], updatedMatches: Match[] } {
    // Only allow swapping of incomplete rounds
    if (round1.status === 'completed' || round2.status === 'completed') {
      throw new Error('Cannot swap completed rounds');
    }

    const oldValue = {
      round1Number: round1.roundNumber,
      round2Number: round2.roundNumber
    };

    const newValue = {
      round1Number: round2.roundNumber,
      round2Number: round1.roundNumber
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

    // Update match round numbers
    const updatedMatches = matches.map(match => {
      if (match.roundNumber === round1.roundNumber) {
        return { ...match, roundNumber: round2.roundNumber };
      } else if (match.roundNumber === round2.roundNumber) {
        return { ...match, roundNumber: round1.roundNumber };
      }
      return match;
    });

    return {
      updatedRounds: [updatedRound1, updatedRound2],
      updatedMatches
    };
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