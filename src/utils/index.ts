import { Tournament, Participant, Team, Match, Round } from '../types/tournament';

// ID Generation utilities
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function generateTournamentId(): string {
  return `tournament-${generateId()}`;
}

export function generateParticipantId(): string {
  return `participant-${generateId()}`;
}

export function generateTeamId(): string {
  return `team-${generateId()}`;
}

export function generateMatchId(): string {
  return `match-${generateId()}`;
}

export function generateRoundId(): string {
  return `round-${generateId()}`;
}

// Data serialization utilities
export function serializeTournament(tournament: Tournament): string {
  const serializable = {
    ...tournament,
    createdAt: tournament.createdAt.toISOString(),
    updatedAt: tournament.updatedAt.toISOString()
  };
  return JSON.stringify(serializable);
}

export function deserializeTournament(data: string): Tournament {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt)
  };
}

export function serializeMatch(match: Match): string {
  const serializable = {
    ...match,
    scheduledTime: match.scheduledTime.toISOString(),
    result: match.result ? {
      ...match.result,
      completedAt: match.result.completedAt.toISOString()
    } : undefined
  };
  return JSON.stringify(serializable);
}

export function deserializeMatch(data: string): Match {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    scheduledTime: new Date(parsed.scheduledTime),
    result: parsed.result ? {
      ...parsed.result,
      completedAt: new Date(parsed.result.completedAt)
    } : undefined
  };
}

export function serializeMatches(matches: Match[]): string {
  const serializable = matches.map(match => ({
    ...match,
    scheduledTime: match.scheduledTime.toISOString(),
    result: match.result ? {
      ...match.result,
      completedAt: match.result.completedAt.toISOString()
    } : undefined
  }));
  return JSON.stringify(serializable);
}

export function deserializeMatches(data: string): Match[] {
  const parsed = JSON.parse(data);
  return parsed.map((match: any) => ({
    ...match,
    scheduledTime: new Date(match.scheduledTime),
    result: match.result ? {
      ...match.result,
      completedAt: new Date(match.result.completedAt)
    } : undefined
  }));
}

export function serializeRound(round: Round): string {
  const serializable = {
    ...round,
    matches: round.matches.map(match => ({
      ...match,
      scheduledTime: match.scheduledTime.toISOString(),
      result: match.result ? {
        ...match.result,
        completedAt: match.result.completedAt.toISOString()
      } : undefined
    }))
  };
  return JSON.stringify(serializable);
}

export function deserializeRound(data: string): Round {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    matches: parsed.matches.map((match: any) => ({
      ...match,
      scheduledTime: new Date(match.scheduledTime),
      result: match.result ? {
        ...match.result,
        completedAt: new Date(match.result.completedAt)
      } : undefined
    }))
  };
}

// Generic serialization for arrays
export function serializeArray<T>(items: T[], serializer: (item: T) => string): string {
  return JSON.stringify(items.map(item => JSON.parse(serializer(item))));
}

export function deserializeArray<T>(data: string, deserializer: (data: string) => T): T[] {
  const parsed = JSON.parse(data);
  return parsed.map((item: any) => deserializer(JSON.stringify(item)));
}

// Utility functions for data manipulation
export function createDefaultParticipantStatistics() {
  return {
    gamesWon: 0,
    gamesLost: 0,
    totalPointsScored: 0,
    totalPointsAllowed: 0,
    pointDifferential: 0
  };
}

export function createDefaultTournamentSettings() {
  return {
    courtCount: 4,
    matchDuration: 30,
    pointLimit: 11,
    scoringRule: 'win-by-2' as const,
    timeLimit: true
  };
}

// Helper function to create new tournament
export function createTournament(
  name: string,
  mode: 'pair-signup' | 'individual-signup',
  settings?: Partial<Tournament['settings']>
): Tournament {
  const now = new Date();
  return {
    id: generateTournamentId(),
    name,
    mode,
    settings: {
      ...createDefaultTournamentSettings(),
      ...settings
    },
    status: 'setup',
    createdAt: now,
    updatedAt: now
  };
}

// Helper function to create new participant
export function createParticipant(tournamentId: string, name: string): Participant {
  return {
    id: generateParticipantId(),
    tournamentId,
    name: name.trim(),
    statistics: createDefaultParticipantStatistics()
  };
}

// Helper function to create new team
export function createTeam(
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

// Helper function to create new match
export function createMatch(
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

// Helper function to create new round
export function createRound(
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

// Re-export validation functions
export * from './validation';