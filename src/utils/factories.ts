import { Tournament, Participant, Team, Match, Round } from '../types/tournament';
import { generateTournamentId, generateParticipantId, generateTeamId, generateMatchId, generateRoundId } from './idGenerator';

// Factory functions for creating data models
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
    matchDuration: 20,
    pointLimit: 11,
    scoringRule: 'win-by-2' as const,
    timeLimit: true
  };
}

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

export function createParticipant(tournamentId: string, name: string): Participant {
  return {
    id: generateParticipantId(),
    tournamentId,
    name: name.trim(),
    statistics: createDefaultParticipantStatistics()
  };
}

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