import { Tournament, Participant, Team, Match, Round } from '../types/tournament';
import {
  serializeTournament,
  deserializeTournament,
  serializeMatch,
  deserializeMatch,
  serializeRound,
  deserializeRound,
  serializeArray,
  deserializeArray
} from './index';

// Storage keys
const STORAGE_KEYS = {
  TOURNAMENTS: 'pickleball_tournaments',
  PARTICIPANTS: 'pickleball_participants',
  TEAMS: 'pickleball_teams',
  MATCHES: 'pickleball_matches',
  ROUNDS: 'pickleball_rounds',
  SCHEMA_VERSION: 'pickleball_schema_version'
} as const;

// Current schema version for data migration
const CURRENT_SCHEMA_VERSION = 1;

// Storage error types
export class StorageError extends Error {
  constructor(
    message: string,
    public type: 'quota_exceeded' | 'access_denied' | 'parse_error' | 'not_found' | 'migration_error',
    public details?: any
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// Storage quota check
function checkStorageQuota(): void {
  try {
    const testKey = '__storage_test__';
    const testData = 'x'.repeat(1024); // 1KB test
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
  } catch (error) {
    if (error instanceof DOMException && error.code === 22) {
      throw new StorageError(
        'Storage quota exceeded. Please clear some tournament data.',
        'quota_exceeded',
        error
      );
    }
    throw new StorageError(
      'Storage access denied. Please check browser settings.',
      'access_denied',
      error
    );
  }
}

// Generic storage operations
function saveToStorage<T>(key: string, data: T, serializer?: (item: T) => string): void {
  try {
    checkStorageQuota();
    const serialized = serializer ? serializer(data) : JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Failed to save data to storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'access_denied',
      error
    );
  }
}

function loadFromStorage<T>(key: string, deserializer?: (data: string) => T): T | null {
  try {
    const data = localStorage.getItem(key);
    if (data === null) {
      return null;
    }
    return deserializer ? deserializer(data) : JSON.parse(data);
  } catch (error) {
    throw new StorageError(
      `Failed to parse data from storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'parse_error',
      error
    );
  }
}



// Tournament operations
export function saveTournament(tournament: Tournament): void {
  const tournaments = loadTournaments();
  const existingIndex = tournaments.findIndex(t => t.id === tournament.id);
  
  if (existingIndex >= 0) {
    tournaments[existingIndex] = { ...tournament, updatedAt: new Date() };
  } else {
    tournaments.push(tournament);
  }
  
  saveToStorage(STORAGE_KEYS.TOURNAMENTS, tournaments, (data) => 
    serializeArray(data, serializeTournament)
  );
}

export function loadTournament(id: string): Tournament | null {
  const tournaments = loadTournaments();
  return tournaments.find(t => t.id === id) || null;
}

export function loadTournaments(): Tournament[] {
  const data = loadFromStorage(STORAGE_KEYS.TOURNAMENTS, (data) => 
    deserializeArray(data, deserializeTournament)
  );
  return data || [];
}

export function deleteTournament(id: string): void {
  const tournaments = loadTournaments();
  const filteredTournaments = tournaments.filter(t => t.id !== id);
  
  if (tournaments.length === filteredTournaments.length) {
    throw new StorageError(`Tournament with id ${id} not found`, 'not_found');
  }
  
  saveToStorage(STORAGE_KEYS.TOURNAMENTS, filteredTournaments, (data) => 
    serializeArray(data, serializeTournament)
  );
  
  // Clean up related data
  deleteParticipantsByTournament(id);
  deleteTeamsByTournament(id);
  deleteMatchesByTournament(id);
  deleteRoundsByTournament(id);
}

// Participant operations
export function saveParticipant(participant: Participant): void {
  const participants = loadParticipants();
  const existingIndex = participants.findIndex(p => p.id === participant.id);
  
  if (existingIndex >= 0) {
    participants[existingIndex] = participant;
  } else {
    participants.push(participant);
  }
  
  saveToStorage(STORAGE_KEYS.PARTICIPANTS, participants);
}

export function loadParticipant(id: string): Participant | null {
  const participants = loadParticipants();
  return participants.find(p => p.id === id) || null;
}

export function loadParticipants(): Participant[] {
  return loadFromStorage(STORAGE_KEYS.PARTICIPANTS) || [];
}

export function loadParticipantsByTournament(tournamentId: string): Participant[] {
  const participants = loadParticipants();
  return participants.filter(p => p.tournamentId === tournamentId);
}

export function deleteParticipant(id: string): void {
  const participants = loadParticipants();
  const filteredParticipants = participants.filter(p => p.id !== id);
  
  if (participants.length === filteredParticipants.length) {
    throw new StorageError(`Participant with id ${id} not found`, 'not_found');
  }
  
  saveToStorage(STORAGE_KEYS.PARTICIPANTS, filteredParticipants);
}

export function deleteParticipantsByTournament(tournamentId: string): void {
  const participants = loadParticipants();
  const filteredParticipants = participants.filter(p => p.tournamentId !== tournamentId);
  saveToStorage(STORAGE_KEYS.PARTICIPANTS, filteredParticipants);
}

// Team operations
export function saveTeam(team: Team): void {
  const teams = loadTeams();
  const existingIndex = teams.findIndex(t => t.id === team.id);
  
  if (existingIndex >= 0) {
    teams[existingIndex] = team;
  } else {
    teams.push(team);
  }
  
  saveToStorage(STORAGE_KEYS.TEAMS, teams);
}

export function loadTeam(id: string): Team | null {
  const teams = loadTeams();
  return teams.find(t => t.id === id) || null;
}

export function loadTeams(): Team[] {
  return loadFromStorage(STORAGE_KEYS.TEAMS) || [];
}

export function loadTeamsByTournament(tournamentId: string): Team[] {
  const teams = loadTeams();
  return teams.filter(t => t.tournamentId === tournamentId);
}

export function deleteTeam(id: string): void {
  const teams = loadTeams();
  const filteredTeams = teams.filter(t => t.id !== id);
  
  if (teams.length === filteredTeams.length) {
    throw new StorageError(`Team with id ${id} not found`, 'not_found');
  }
  
  saveToStorage(STORAGE_KEYS.TEAMS, filteredTeams);
}

export function deleteTeamsByTournament(tournamentId: string): void {
  const teams = loadTeams();
  const filteredTeams = teams.filter(t => t.tournamentId !== tournamentId);
  saveToStorage(STORAGE_KEYS.TEAMS, filteredTeams);
}

// Match operations
export function saveMatch(match: Match): void {
  const matches = loadMatches();
  const existingIndex = matches.findIndex(m => m.id === match.id);
  
  if (existingIndex >= 0) {
    matches[existingIndex] = match;
  } else {
    matches.push(match);
  }
  
  saveToStorage(STORAGE_KEYS.MATCHES, matches, (data) => 
    serializeArray(data, serializeMatch)
  );
}

export function loadMatch(id: string): Match | null {
  const matches = loadMatches();
  return matches.find(m => m.id === id) || null;
}

export function loadMatches(): Match[] {
  const data = loadFromStorage(STORAGE_KEYS.MATCHES, (data) => 
    deserializeArray(data, deserializeMatch)
  );
  return data || [];
}

export function loadMatchesByTournament(tournamentId: string): Match[] {
  const matches = loadMatches();
  return matches.filter(m => m.tournamentId === tournamentId);
}

export function updateMatch(matchId: string, result: Match['result']): void {
  const matches = loadMatches();
  const matchIndex = matches.findIndex(m => m.id === matchId);
  
  if (matchIndex === -1) {
    throw new StorageError(`Match with id ${matchId} not found`, 'not_found');
  }
  
  matches[matchIndex] = {
    ...matches[matchIndex],
    ...(result !== undefined && { result }),
    status: 'completed'
  };
  
  saveToStorage(STORAGE_KEYS.MATCHES, matches, (data) => 
    serializeArray(data, serializeMatch)
  );
}

export function deleteMatch(id: string): void {
  const matches = loadMatches();
  const filteredMatches = matches.filter(m => m.id !== id);
  
  if (matches.length === filteredMatches.length) {
    throw new StorageError(`Match with id ${id} not found`, 'not_found');
  }
  
  saveToStorage(STORAGE_KEYS.MATCHES, filteredMatches, (data) => 
    serializeArray(data, serializeMatch)
  );
}

export function deleteMatchesByTournament(tournamentId: string): void {
  const matches = loadMatches();
  const filteredMatches = matches.filter(m => m.tournamentId !== tournamentId);
  saveToStorage(STORAGE_KEYS.MATCHES, filteredMatches, (data) => 
    serializeArray(data, serializeMatch)
  );
}

// Round operations
export function saveRound(round: Round): void {
  const rounds = loadRounds();
  const existingIndex = rounds.findIndex(r => r.id === round.id);
  
  if (existingIndex >= 0) {
    rounds[existingIndex] = round;
  } else {
    rounds.push(round);
  }
  
  saveToStorage(STORAGE_KEYS.ROUNDS, rounds, (data) => 
    serializeArray(data, serializeRound)
  );
}

export function loadRound(id: string): Round | null {
  const rounds = loadRounds();
  return rounds.find(r => r.id === id) || null;
}

export function loadRounds(): Round[] {
  const data = loadFromStorage(STORAGE_KEYS.ROUNDS, (data) => 
    deserializeArray(data, deserializeRound)
  );
  return data || [];
}

export function loadRoundsByTournament(tournamentId: string): Round[] {
  const rounds = loadRounds();
  return rounds.filter(r => r.tournamentId === tournamentId);
}

export function deleteRound(id: string): void {
  const rounds = loadRounds();
  const filteredRounds = rounds.filter(r => r.id !== id);
  
  if (rounds.length === filteredRounds.length) {
    throw new StorageError(`Round with id ${id} not found`, 'not_found');
  }
  
  saveToStorage(STORAGE_KEYS.ROUNDS, filteredRounds, (data) => 
    serializeArray(data, serializeRound)
  );
}

export function deleteRoundsByTournament(tournamentId: string): void {
  const rounds = loadRounds();
  const filteredRounds = rounds.filter(r => r.tournamentId !== tournamentId);
  saveToStorage(STORAGE_KEYS.ROUNDS, filteredRounds, (data) => 
    serializeArray(data, serializeRound)
  );
}

// Standings calculation
export function getStandings(tournamentId: string): Participant[] {
  const participants = loadParticipantsByTournament(tournamentId);
  
  // Sort by games won (descending), then by point differential (descending)
  return participants.sort((a, b) => {
    if (a.statistics.gamesWon !== b.statistics.gamesWon) {
      return b.statistics.gamesWon - a.statistics.gamesWon;
    }
    return b.statistics.pointDifferential - a.statistics.pointDifferential;
  });
}

// Data export/import
export function exportTournament(tournamentId: string): string {
  const tournament = loadTournament(tournamentId);
  if (!tournament) {
    throw new StorageError(`Tournament with id ${tournamentId} not found`, 'not_found');
  }
  
  const participants = loadParticipantsByTournament(tournamentId);
  const teams = loadTeamsByTournament(tournamentId);
  const matches = loadMatchesByTournament(tournamentId);
  const rounds = loadRoundsByTournament(tournamentId);
  
  const exportData = {
    tournament,
    participants,
    teams,
    matches,
    rounds,
    exportedAt: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION
  };
  
  return JSON.stringify(exportData, null, 2);
}

export function importTournament(data: string): string {
  try {
    const importData = JSON.parse(data);
    
    // Validate required fields
    if (!importData.tournament || !importData.participants || !importData.teams || 
        !importData.matches || !importData.rounds) {
      throw new StorageError('Invalid tournament data format', 'parse_error');
    }
    
    // Check schema version and migrate if needed
    if (importData.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      throw new StorageError(
        `Unsupported schema version: ${importData.schemaVersion}. Current version: ${CURRENT_SCHEMA_VERSION}`,
        'migration_error'
      );
    }
    
    // Save all data (deserialize dates properly)
    const tournament = deserializeTournament(JSON.stringify(importData.tournament));
    saveTournament(tournament);
    importData.participants.forEach((p: Participant) => saveParticipant(p));
    importData.teams.forEach((t: Team) => saveTeam(t));
    importData.matches.forEach((m: Match) => {
      const match = deserializeMatch(JSON.stringify(m));
      saveMatch(match);
    });
    importData.rounds.forEach((r: Round) => {
      const round = deserializeRound(JSON.stringify(r));
      saveRound(round);
    });
    
    return importData.tournament.id;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Failed to import tournament data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'parse_error',
      error
    );
  }
}

// Data migration utilities
export function getSchemaVersion(): number {
  const version = loadFromStorage(STORAGE_KEYS.SCHEMA_VERSION);
  return typeof version === 'number' ? version : 0;
}

export function setSchemaVersion(version: number): void {
  saveToStorage(STORAGE_KEYS.SCHEMA_VERSION, version);
}

export function migrateData(): void {
  const currentVersion = getSchemaVersion();
  
  if (currentVersion === CURRENT_SCHEMA_VERSION) {
    return; // No migration needed
  }
  
  try {
    // Future migration logic would go here
    // For now, we just update the schema version
    setSchemaVersion(CURRENT_SCHEMA_VERSION);
  } catch (error) {
    throw new StorageError(
      `Data migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'migration_error',
      error
    );
  }
}

// Storage cleanup utilities
export function clearAllData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    throw new StorageError(
      `Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'access_denied',
      error
    );
  }
}

export function getStorageUsage(): { used: number; available: number } {
  try {
    let used = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        used += data.length;
      }
    });
    
    // Estimate available space (most browsers have ~5-10MB limit)
    const estimated = 5 * 1024 * 1024; // 5MB estimate
    
    return {
      used,
      available: Math.max(0, estimated - used)
    };
  } catch (error) {
    throw new StorageError(
      `Failed to calculate storage usage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'access_denied',
      error
    );
  }
}

// Initialize storage on first use
export function initializeStorage(): void {
  try {
    checkStorageQuota();
    migrateData();
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Failed to initialize storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'access_denied',
      error
    );
  }
}