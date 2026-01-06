import { Tournament, Match, Round } from '../types/tournament';

// Simplified serialization utilities
export function serializeTournament(tournament: Tournament): string {
  return JSON.stringify({
    ...tournament,
    createdAt: tournament.createdAt.toISOString(),
    updatedAt: tournament.updatedAt.toISOString()
  });
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
  return JSON.stringify({
    ...match,
    scheduledTime: match.scheduledTime.toISOString(),
    result: match.result ? {
      ...match.result,
      completedAt: match.result.completedAt.toISOString()
    } : undefined
  });
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
  return JSON.stringify(matches.map(match => JSON.parse(serializeMatch(match))));
}

export function deserializeMatches(data: string): Match[] {
  const parsed = JSON.parse(data);
  return parsed.map((match: any) => deserializeMatch(JSON.stringify(match)));
}

export function serializeRound(round: Round): string {
  return JSON.stringify({
    ...round,
    matches: round.matches.map(match => JSON.parse(serializeMatch(match)))
  });
}

export function deserializeRound(data: string): Round {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    matches: parsed.matches.map((match: any) => deserializeMatch(JSON.stringify(match)))
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