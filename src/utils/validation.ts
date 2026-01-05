import { Tournament, Participant, Team, Match, Round } from '../types/tournament';

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
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

  if (!tournament.status || !['setup', 'active', 'completed'].includes(tournament.status)) {
    errors.push('Tournament status must be "setup", "active", or "completed"');
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