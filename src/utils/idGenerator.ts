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