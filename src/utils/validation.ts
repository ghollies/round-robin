import { Tournament, Participant, Team, Match, Round } from '../types/tournament';

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Field-specific validation result
export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

// Form validation state
export interface FormValidationState {
  [fieldName: string]: FieldValidationResult;
}

// Real-time validation hook result
export interface ValidationHookResult {
  errors: { [fieldName: string]: string };
  warnings: { [fieldName: string]: string };
  isValid: boolean;
  hasWarnings: boolean;
  validateField: (fieldName: string, value: any, context?: any) => FieldValidationResult;
  validateAll: (data: any) => ValidationResult;
  clearFieldError: (fieldName: string) => void;
  clearAllErrors: () => void;
}

// Tournament validation
export function validateTournament(tournament: Partial<Tournament>): ValidationResult {
  const errors: string[] = [];

  if (!tournament.name || tournament.name.trim().length === 0) {
    errors.push('Tournament name is required');
  }

  if (!tournament.mode || !['pair-signup', 'individual-signup'].includes(tournament.mode)) {
    errors.push('Tournament mode must be either "pair-signup" or "individual-signup"');
  }

  if (!tournament.settings) {
    errors.push('Tournament settings are required');
  } else {
    const { courtCount, matchDuration, pointLimit, scoringRule } = tournament.settings;

    if (!courtCount || courtCount < 1 || courtCount > 16) {
      errors.push('Court count must be between 1 and 16');
    }

    if (!matchDuration || matchDuration < 15 || matchDuration > 60) {
      errors.push('Match duration must be between 15 and 60 minutes');
    }

    if (!pointLimit || pointLimit < 1) {
      errors.push('Point limit must be a positive number');
    }

    if (!scoringRule || !['win-by-2', 'first-to-limit'].includes(scoringRule)) {
      errors.push('Scoring rule must be either "win-by-2" or "first-to-limit"');
    }
  }

  if (!tournament.status || !['setup', 'scheduled', 'active', 'completed'].includes(tournament.status)) {
    errors.push('Tournament status must be "setup", "scheduled", "active", or "completed"');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Participant validation
export function validateParticipant(participant: Partial<Participant>): ValidationResult {
  const errors: string[] = [];

  if (!participant.name || participant.name.trim().length === 0) {
    errors.push('Participant name is required');
  }

  if (!participant.tournamentId || participant.tournamentId.trim().length === 0) {
    errors.push('Tournament ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Team validation
export function validateTeam(team: Partial<Team>): ValidationResult {
  const errors: string[] = [];

  if (!team.tournamentId || team.tournamentId.trim().length === 0) {
    errors.push('Tournament ID is required');
  }

  if (!team.player1Id || team.player1Id.trim().length === 0) {
    errors.push('Player 1 ID is required');
  }

  if (!team.player2Id || team.player2Id.trim().length === 0) {
    errors.push('Player 2 ID is required');
  }

  if (team.player1Id === team.player2Id) {
    errors.push('Player 1 and Player 2 must be different');
  }

  if (typeof team.isPermanent !== 'boolean') {
    errors.push('isPermanent must be a boolean value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Match validation
export function validateMatch(match: Partial<Match>): ValidationResult {
  const errors: string[] = [];

  if (!match.tournamentId || match.tournamentId.trim().length === 0) {
    errors.push('Tournament ID is required');
  }

  if (typeof match.roundNumber !== 'number' || match.roundNumber < 1) {
    errors.push('Round number must be a positive number');
  }

  if (typeof match.matchNumber !== 'number' || match.matchNumber < 1) {
    errors.push('Match number must be a positive number');
  }

  if (!match.team1Id || match.team1Id.trim().length === 0) {
    errors.push('Team 1 ID is required');
  }

  if (!match.team2Id || match.team2Id.trim().length === 0) {
    errors.push('Team 2 ID is required');
  }

  if (match.team1Id === match.team2Id) {
    errors.push('Team 1 and Team 2 must be different');
  }

  if (typeof match.courtNumber !== 'number' || match.courtNumber < 1) {
    errors.push('Court number must be a positive number');
  }

  if (!match.scheduledTime || !(match.scheduledTime instanceof Date)) {
    errors.push('Scheduled time must be a valid Date');
  }

  if (!match.status || !['scheduled', 'in-progress', 'completed'].includes(match.status)) {
    errors.push('Match status must be "scheduled", "in-progress", or "completed"');
  }

  // Validate match result if present
  if (match.result) {
    const { team1Score, team2Score, winnerId, completedAt, endReason } = match.result;

    if (typeof team1Score !== 'number' || team1Score < 0) {
      errors.push('Team 1 score must be a non-negative number');
    }

    if (typeof team2Score !== 'number' || team2Score < 0) {
      errors.push('Team 2 score must be a non-negative number');
    }

    if (!winnerId || winnerId.trim().length === 0) {
      errors.push('Winner ID is required when match result is provided');
    }

    if (!completedAt || !(completedAt instanceof Date)) {
      errors.push('Completed at must be a valid Date when match result is provided');
    }

    if (!endReason || !['points', 'time'].includes(endReason)) {
      errors.push('End reason must be either "points" or "time"');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Round validation
export function validateRound(round: Partial<Round>): ValidationResult {
  const errors: string[] = [];

  if (!round.tournamentId || round.tournamentId.trim().length === 0) {
    errors.push('Tournament ID is required');
  }

  if (typeof round.roundNumber !== 'number' || round.roundNumber < 1) {
    errors.push('Round number must be a positive number');
  }

  if (!round.status || !['pending', 'active', 'completed'].includes(round.status)) {
    errors.push('Round status must be "pending", "active", or "completed"');
  }

  if (!Array.isArray(round.matches)) {
    errors.push('Matches must be an array');
  } else {
    // Validate each match in the round
    round.matches.forEach((match, index) => {
      const matchValidation = validateMatch(match);
      if (!matchValidation.isValid) {
        errors.push(`Match ${index + 1}: ${matchValidation.errors.join(', ')}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate participant count based on tournament mode
export function validateParticipantCount(count: number, mode: 'pair-signup' | 'individual-signup'): ValidationResult {
  const errors: string[] = [];

  if (mode === 'pair-signup') {
    if (count < 4 || count > 32) {
      errors.push('Number of teams must be between 4 and 32 for pair signup mode');
    }
  } else if (mode === 'individual-signup') {
    if (count < 4 || count > 32) {
      errors.push('Number of individual players must be between 4 and 32 for individual signup mode');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate for duplicate participant names
export function validateUniqueParticipantNames(participants: Participant[]): ValidationResult {
  const errors: string[] = [];
  const nameMap = new Map<string, number>();

  participants.forEach((participant, index) => {
    const normalizedName = participant.name.trim().toLowerCase();
    if (nameMap.has(normalizedName)) {
      errors.push(`Duplicate participant name "${participant.name}" found at positions ${nameMap.get(normalizedName)! + 1} and ${index + 1}`);
    } else {
      nameMap.set(normalizedName, index);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Score validation for match results
export interface ScoreValidationResult extends ValidationResult {
  winner?: string | undefined;
  endReason?: 'points' | 'time' | undefined;
}

export function validateMatchScore(
  team1Score: number,
  team2Score: number,
  team1Id: string,
  team2Id: string,
  tournament: Tournament,
  endReason: 'points' | 'time' = 'points'
): ScoreValidationResult {
  const errors: string[] = [];
  
  // Basic validation
  if (team1Score < 0 || team2Score < 0) {
    errors.push('Scores cannot be negative');
  }

  if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score)) {
    errors.push('Scores must be whole numbers');
  }

  // If both scores are 0, it's not a valid completed match
  if (team1Score === 0 && team2Score === 0) {
    errors.push('At least one team must have scored points');
  }

  // Determine winner and validate based on tournament rules
  let winner: string | undefined;
  let actualEndReason: 'points' | 'time' = endReason;

  if (errors.length === 0) {
    const { pointLimit, scoringRule } = tournament.settings;
    
    if (scoringRule === 'first-to-limit') {
      // First to reach point limit wins
      if (team1Score >= pointLimit && team1Score > team2Score) {
        winner = team1Id;
        actualEndReason = 'points';
      } else if (team2Score >= pointLimit && team2Score > team1Score) {
        winner = team2Id;
        actualEndReason = 'points';
      } else if (team1Score >= pointLimit && team2Score >= pointLimit && team1Score === team2Score) {
        errors.push('Match cannot end in a tie. Please enter different scores or continue play.');
      } else if (endReason === 'time') {
        // Time limit reached, higher score wins
        if (team1Score > team2Score) {
          winner = team1Id;
        } else if (team2Score > team1Score) {
          winner = team2Id;
        } else {
          errors.push('Match cannot end in a tie. Please enter different scores or continue play.');
        }
      } else {
        errors.push(`Match has not reached the point limit (${pointLimit}) and time limit was not selected`);
      }
    } else if (scoringRule === 'win-by-2') {
      // Must win by 2 points and reach point limit
      const scoreDiff = Math.abs(team1Score - team2Score);
      const maxScore = Math.max(team1Score, team2Score);
      
      if (maxScore >= pointLimit && scoreDiff >= 2) {
        winner = team1Score > team2Score ? team1Id : team2Id;
        actualEndReason = 'points';
      } else if (endReason === 'time') {
        // Time limit reached, higher score wins (even without 2-point margin)
        if (team1Score > team2Score) {
          winner = team1Id;
        } else if (team2Score > team1Score) {
          winner = team2Id;
        } else {
          errors.push('Match cannot end in a tie. Please enter different scores or continue play.');
        }
      } else {
        if (maxScore < pointLimit) {
          errors.push(`Match has not reached the point limit (${pointLimit})`);
        } else if (scoreDiff < 2) {
          errors.push('Match must be won by at least 2 points or select "Time Limit" if time expired');
        }
      }
    }
  }

  return {
    isValid: errors.length === 0 && winner !== undefined,
    errors,
    winner,
    endReason: actualEndReason
  };
}

// Validate win conditions for a match
export function validateWinCondition(
  team1Score: number,
  team2Score: number,
  tournament: Tournament,
  endReason: 'points' | 'time'
): ValidationResult {
  const errors: string[] = [];
  const { pointLimit, scoringRule } = tournament.settings;

  if (endReason === 'points') {
    if (scoringRule === 'first-to-limit') {
      const maxScore = Math.max(team1Score, team2Score);
      if (maxScore < pointLimit) {
        errors.push(`Point limit of ${pointLimit} has not been reached`);
      }
      if (team1Score === team2Score && maxScore >= pointLimit) {
        errors.push('Match cannot end in a tie when reaching point limit');
      }
    } else if (scoringRule === 'win-by-2') {
      const maxScore = Math.max(team1Score, team2Score);
      const scoreDiff = Math.abs(team1Score - team2Score);
      
      if (maxScore < pointLimit) {
        errors.push(`Point limit of ${pointLimit} has not been reached`);
      }
      if (scoreDiff < 2 && maxScore >= pointLimit) {
        errors.push('Match must be won by at least 2 points');
      }
    }
  } else if (endReason === 'time') {
    if (team1Score === team2Score) {
      errors.push('Match cannot end in a tie even with time limit');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Enhanced field validation functions
export function validateTournamentName(name: string): FieldValidationResult {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return { isValid: false, error: 'Tournament name is required' };
  }
  
  if (trimmedName.length < 3) {
    return { isValid: false, error: 'Tournament name must be at least 3 characters long' };
  }
  
  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Tournament name must be less than 100 characters' };
  }
  
  // Check for potentially problematic characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(trimmedName)) {
    return { isValid: false, error: 'Tournament name contains invalid characters' };
  }
  
  return { isValid: true };
}

export function validateParticipantName(name: string, existingNames: string[] = [], mode: 'pair-signup' | 'individual-signup' = 'individual-signup'): FieldValidationResult {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return { isValid: false, error: 'Player name is required' };
  }
  
  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Player name must be at least 2 characters long' };
  }
  
  if (trimmedName.length > 50) {
    return { isValid: false, error: 'Player name must be less than 50 characters' };
  }
  
  // Check for duplicate names (case-insensitive)
  const normalizedName = trimmedName.toLowerCase();
  const isDuplicate = existingNames.some(existing => 
    existing.trim().toLowerCase() === normalizedName
  );
  
  if (isDuplicate) {
    return { isValid: false, error: 'This name is already taken' };
  }
  
  // Check for potentially problematic characters
  // Allow "/" for pair signup mode (team names like "Smith/Johnson")
  const invalidChars = mode === 'pair-signup' 
    ? /[<>:"\\|?*@#$%^&*()+={}[\]]/
    : /[<>:"/\\|?*@#$%^&*()+={}[\]]/;
  
  if (invalidChars.test(trimmedName)) {
    return { isValid: false, error: 'Player name contains invalid characters' };
  }
  
  // Warning for very short names
  if (trimmedName.length === 2) {
    return { 
      isValid: true, 
      warning: 'Very short name - consider using a longer name for clarity' 
    };
  }
  
  return { isValid: true };
}

export function validateCourtCount(count: number, participantCount?: number): FieldValidationResult {
  if (!Number.isInteger(count) || count < 1) {
    return { isValid: false, error: 'Number of courts must be a positive whole number' };
  }
  
  if (count > 16) {
    return { isValid: false, error: 'Maximum of 16 courts is supported' };
  }
  
  // Warning if too many courts for participant count
  if (participantCount && count > Math.floor(participantCount / 4)) {
    const recommendedCourts = Math.max(1, Math.floor(participantCount / 4));
    return { 
      isValid: true, 
      warning: `Consider ${recommendedCourts} court${recommendedCourts === 1 ? '' : 's'} for ${participantCount} players to optimize scheduling` 
    };
  }
  
  return { isValid: true };
}

export function validateMatchDuration(duration: number): FieldValidationResult {
  if (!Number.isInteger(duration) || duration < 15) {
    return { isValid: false, error: 'Match duration must be at least 15 minutes' };
  }
  
  if (duration > 60) {
    return { isValid: false, error: 'Match duration cannot exceed 60 minutes' };
  }
  
  // Warning for very short or long durations
  if (duration < 20) {
    return { 
      isValid: true, 
      warning: 'Very short matches may not allow for proper gameplay' 
    };
  }
  
  if (duration > 45) {
    return { 
      isValid: true, 
      warning: 'Long matches may extend tournament duration significantly' 
    };
  }
  
  return { isValid: true };
}

export function validatePointLimit(limit: number): FieldValidationResult {
  if (!Number.isInteger(limit) || limit < 1) {
    return { isValid: false, error: 'Point limit must be a positive whole number' };
  }
  
  if (limit > 50) {
    return { isValid: false, error: 'Point limit cannot exceed 50 points' };
  }
  
  // Warning for unusual point limits
  const commonLimits = [11, 15, 21];
  if (!commonLimits.includes(limit)) {
    return { 
      isValid: true, 
      warning: 'Common point limits are 11, 15, or 21 points' 
    };
  }
  
  return { isValid: true };
}

export function validateScore(score: number, pointLimit: number): FieldValidationResult {
  if (!Number.isInteger(score) || score < 0) {
    return { isValid: false, error: 'Score must be a non-negative whole number' };
  }
  
  // Allow scores to exceed point limit for win-by-2 scenarios
  if (score > pointLimit + 10) {
    return { isValid: false, error: 'Score seems unusually high for this tournament' };
  }
  
  return { isValid: true };
}

export function validateStartDateTime(startDateTime?: Date): FieldValidationResult {
  if (!startDateTime) {
    // Optional field - return valid if not provided
    return { isValid: true };
  }
  
  if (!(startDateTime instanceof Date) || isNaN(startDateTime.getTime())) {
    return { isValid: false, error: 'Start date/time must be a valid date' };
  }
  
  const now = new Date();
  const minStartTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
  
  if (startDateTime < minStartTime) {
    return { isValid: false, error: 'Tournament start time must be at least 5 minutes in the future' };
  }
  
  // Warning for tournaments scheduled very far in the future
  const maxReasonableTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
  if (startDateTime > maxReasonableTime) {
    return { 
      isValid: true, 
      warning: 'Tournament is scheduled more than a year in the future' 
    };
  }
  
  // Warning for tournaments scheduled very soon
  const soonTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
  if (startDateTime < soonTime) {
    return { 
      isValid: true, 
      warning: 'Tournament is scheduled to start very soon - ensure participants have enough notice' 
    };
  }
  
  return { isValid: true };
}

// Storage validation functions
export function validateStorageQuota(): FieldValidationResult {
  try {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      return { isValid: false, error: 'Local storage is not supported in this browser' };
    }
    
    // Test storage availability
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    
    // Estimate storage usage (rough approximation)
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    // Warn if approaching storage limits (rough estimate of 5MB limit)
    const estimatedLimitBytes = 5 * 1024 * 1024; // 5MB
    const usagePercentage = (totalSize / estimatedLimitBytes) * 100;
    
    if (usagePercentage > 80) {
      return { 
        isValid: true, 
        warning: 'Local storage is nearly full. Consider clearing old tournament data.' 
      };
    }
    
    if (usagePercentage > 90) {
      return { 
        isValid: false, 
        error: 'Local storage is full. Please clear some data before continuing.' 
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Unable to access local storage. It may be disabled or full.' 
    };
  }
}

// Comprehensive form validation
export function createFormValidator<T extends Record<string, any>>(
  validationRules: { [K in keyof T]?: (value: T[K], context?: T) => FieldValidationResult }
) {
  return {
    validateField: (fieldName: keyof T, value: T[keyof T], context?: T): FieldValidationResult => {
      const validator = validationRules[fieldName];
      if (!validator) {
        return { isValid: true };
      }
      return validator(value, context);
    },
    
    validateAll: (data: T): ValidationResult => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      for (const [fieldName, validator] of Object.entries(validationRules)) {
        if (validator && typeof validator === 'function') {
          const result = validator(data[fieldName as keyof T], data);
          if (!result.isValid && result.error) {
            errors.push(`${String(fieldName)}: ${result.error}`);
          }
          if (result.warning) {
            warnings.push(`${String(fieldName)}: ${result.warning}`);
          }
        }
      }
      
      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
      };
      
      if (warnings.length > 0) {
        result.warnings = warnings;
      }
      
      return result;
    }
  };
}

// Tournament setup form validation rules
export const tournamentSetupValidationRules = {
  name: (name: string) => validateTournamentName(name),
  participantCount: (count: number, context?: any) => {
    const mode = context?.mode || 'individual-signup';
    return validateParticipantCount(count, mode);
  },
  courtCount: (count: number, context?: any) => 
    validateCourtCount(count, context?.participantCount),
  matchDuration: (duration: number) => validateMatchDuration(duration),
  pointLimit: (limit: number) => validatePointLimit(limit),
  startDateTime: (startDateTime?: Date) => validateStartDateTime(startDateTime),
};

// Participant entry validation rules
export const participantValidationRules = {
  name: (name: string, context?: { existingNames?: string[] }) => 
    validateParticipantName(name, context?.existingNames || []),
};

// Score entry validation rules
export const scoreValidationRules = {
  team1Score: (score: number, context?: { pointLimit?: number }) => 
    validateScore(score, context?.pointLimit || 11),
  team2Score: (score: number, context?: { pointLimit?: number }) => 
    validateScore(score, context?.pointLimit || 11),
};