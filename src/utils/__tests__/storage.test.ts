import {
  saveTournament,
  loadTournament,
  loadTournaments,
  deleteTournament,
  saveParticipant,
  loadParticipant,
  loadParticipantsByTournament,
  deleteParticipant,
  saveTeam,
  loadTeamsByTournament,
  saveMatch,
  loadMatch,
  loadMatchesByTournament,
  updateMatch,
  saveRound,
  loadRoundsByTournament,
  getStandings,
  exportTournament,
  importTournament,
  getSchemaVersion,
  setSchemaVersion,
  migrateData,
  clearAllData,
  getStorageUsage,
  initializeStorage,
  StorageError
} from '../storage';
import {
  createTournament,
  createParticipant,
  createTeam,
  createMatch,
  createRound
} from '../index';

describe('Storage Service', () => {
  let mockGetItem: jest.SpyInstance;
  let mockSetItem: jest.SpyInstance;
  let mockRemoveItem: jest.SpyInstance;
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    
    mockGetItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      const value = storage[key];
      return value === undefined ? null : value;
    });
    
    mockSetItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      storage[key] = value;
    });
    
    mockRemoveItem = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete storage[key];
    });
  });

  afterEach(() => {
    mockGetItem.mockRestore();
    mockSetItem.mockRestore();
    mockRemoveItem.mockRestore();
  });

  describe('Tournament Operations', () => {
    test('should save and load tournament', () => {
      const testTournament = createTournament('Test Tournament', 'individual-signup');
      
      saveTournament(testTournament);
      const loaded = loadTournament(testTournament.id);
      
      expect(loaded).toEqual(testTournament);
    });

    test('should update existing tournament', () => {
      const testTournament = createTournament('Test Tournament', 'individual-signup');
      const originalUpdatedAt = testTournament.updatedAt.getTime();
      saveTournament(testTournament);
      
      // Create a new tournament object with a different name to trigger update
      const updatedTournament = { ...testTournament, name: 'Updated Tournament' };
      saveTournament(updatedTournament);
      
      const loaded = loadTournament(testTournament.id);
      expect(loaded?.name).toBe('Updated Tournament');
      // The updatedAt should be different (it gets set to new Date() in saveTournament)
      expect(loaded?.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    test('should load all tournaments', () => {
      const tournament1 = createTournament('Tournament 1', 'individual-signup');
      const tournament2 = createTournament('Tournament 2', 'pair-signup');
      
      saveTournament(tournament1);
      saveTournament(tournament2);
      
      const tournaments = loadTournaments();
      expect(tournaments).toHaveLength(2);
      expect(tournaments.map(t => t.name)).toContain('Tournament 1');
      expect(tournaments.map(t => t.name)).toContain('Tournament 2');
    });

    test('should delete tournament and related data', () => {
      const testTournament = createTournament('Test Tournament', 'individual-signup');
      saveTournament(testTournament);
      
      // Add related data
      const participant = createParticipant(testTournament.id, 'Test Player');
      const team = createTeam(testTournament.id, 'player1', 'player2');
      const match = createMatch(testTournament.id, 1, 1, 'team1', 'team2', 1, new Date());
      const round = createRound(testTournament.id, 1, [match]);
      
      saveParticipant(participant);
      saveTeam(team);
      saveMatch(match);
      saveRound(round);
      
      deleteTournament(testTournament.id);
      
      expect(loadTournament(testTournament.id)).toBeNull();
      expect(loadParticipantsByTournament(testTournament.id)).toHaveLength(0);
      expect(loadTeamsByTournament(testTournament.id)).toHaveLength(0);
      expect(loadMatchesByTournament(testTournament.id)).toHaveLength(0);
      expect(loadRoundsByTournament(testTournament.id)).toHaveLength(0);
    });

    test('should throw error when deleting non-existent tournament', () => {
      expect(() => deleteTournament('non-existent')).toThrow(StorageError);
      expect(() => deleteTournament('non-existent')).toThrow('not found');
    });

    test('should return null for non-existent tournament', () => {
      const loaded = loadTournament('non-existent');
      expect(loaded).toBeNull();
    });
  });

  describe('Participant Operations', () => {
    test('should save and load participant', () => {
      const testParticipant = createParticipant('tournament-1', 'Test Player');
      
      saveParticipant(testParticipant);
      const loaded = loadParticipant(testParticipant.id);
      
      expect(loaded).toEqual(testParticipant);
    });

    test('should update existing participant', () => {
      const testParticipant = createParticipant('tournament-1', 'Test Player');
      saveParticipant(testParticipant);
      
      const updatedParticipant = {
        ...testParticipant,
        statistics: { ...testParticipant.statistics, gamesWon: 5 }
      };
      saveParticipant(updatedParticipant);
      
      const loaded = loadParticipant(testParticipant.id);
      expect(loaded?.statistics.gamesWon).toBe(5);
    });

    test('should load participants by tournament', () => {
      const participant1 = createParticipant('tournament-1', 'Player 1');
      const participant2 = createParticipant('tournament-1', 'Player 2');
      const participant3 = createParticipant('tournament-2', 'Player 3');
      
      saveParticipant(participant1);
      saveParticipant(participant2);
      saveParticipant(participant3);
      
      const tournament1Participants = loadParticipantsByTournament('tournament-1');
      expect(tournament1Participants).toHaveLength(2);
      expect(tournament1Participants.map(p => p.name)).toContain('Player 1');
      expect(tournament1Participants.map(p => p.name)).toContain('Player 2');
    });

    test('should delete participant', () => {
      const testParticipant = createParticipant('tournament-1', 'Test Player');
      saveParticipant(testParticipant);
      deleteParticipant(testParticipant.id);
      
      expect(loadParticipant(testParticipant.id)).toBeNull();
    });

    test('should throw error when deleting non-existent participant', () => {
      expect(() => deleteParticipant('non-existent')).toThrow(StorageError);
    });
  });

  describe('Match Operations', () => {
    test('should save and load match', () => {
      const testMatch = createMatch('tournament-1', 1, 1, 'team1', 'team2', 1, new Date());
      
      saveMatch(testMatch);
      const loaded = loadMatch(testMatch.id);
      
      expect(loaded).toEqual(testMatch);
      expect(loaded?.scheduledTime).toBeInstanceOf(Date);
    });

    test('should update match result', () => {
      const testMatch = createMatch('tournament-1', 1, 1, 'team1', 'team2', 1, new Date());
      saveMatch(testMatch);
      
      const result = {
        team1Score: 11,
        team2Score: 9,
        winnerId: 'team1',
        completedAt: new Date(),
        endReason: 'points' as const
      };
      
      updateMatch(testMatch.id, result);
      
      const loaded = loadMatch(testMatch.id);
      expect(loaded?.result).toEqual(result);
      expect(loaded?.status).toBe('completed');
      expect(loaded?.result?.completedAt).toBeInstanceOf(Date);
    });

    test('should throw error when updating non-existent match', () => {
      const result = {
        team1Score: 11,
        team2Score: 9,
        winnerId: 'team1',
        completedAt: new Date(),
        endReason: 'points' as const
      };
      
      expect(() => updateMatch('non-existent', result)).toThrow(StorageError);
    });

    test('should load matches by tournament', () => {
      const match1 = createMatch('tournament-1', 1, 1, 'team1', 'team2', 1, new Date());
      const match2 = createMatch('tournament-1', 1, 2, 'team3', 'team4', 2, new Date());
      const match3 = createMatch('tournament-2', 1, 1, 'team5', 'team6', 1, new Date());
      
      saveMatch(match1);
      saveMatch(match2);
      saveMatch(match3);
      
      const tournament1Matches = loadMatchesByTournament('tournament-1');
      expect(tournament1Matches).toHaveLength(2);
    });
  });

  describe('Standings Calculation', () => {
    test('should calculate standings correctly', () => {
      const participant1 = createParticipant('tournament-1', 'Player 1');
      participant1.statistics.gamesWon = 5;
      participant1.statistics.pointDifferential = 10;
      
      const participant2 = createParticipant('tournament-1', 'Player 2');
      participant2.statistics.gamesWon = 5;
      participant2.statistics.pointDifferential = 15;
      
      const participant3 = createParticipant('tournament-1', 'Player 3');
      participant3.statistics.gamesWon = 3;
      participant3.statistics.pointDifferential = 20;
      
      saveParticipant(participant1);
      saveParticipant(participant2);
      saveParticipant(participant3);
      
      const standings = getStandings('tournament-1');
      
      expect(standings).toHaveLength(3);
      expect(standings[0].name).toBe('Player 2'); // Same wins, better differential
      expect(standings[1].name).toBe('Player 1');
      expect(standings[2].name).toBe('Player 3'); // Fewer wins
    });
  });

  describe('Data Export/Import', () => {
    test('should export tournament data', () => {
      const testTournament = createTournament('Test Tournament', 'individual-signup');
      const testParticipant = createParticipant(testTournament.id, 'Test Player');
      
      saveTournament(testTournament);
      saveParticipant(testParticipant);
      
      const exportData = exportTournament(testTournament.id);
      const parsed = JSON.parse(exportData);
      
      // Check that the tournament data is present (dates will be serialized as strings)
      expect(parsed.tournament.id).toBe(testTournament.id);
      expect(parsed.tournament.name).toBe(testTournament.name);
      expect(parsed.tournament.mode).toBe(testTournament.mode);
      expect(parsed.participants).toHaveLength(1);
      expect(parsed.participants[0]).toEqual(testParticipant);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.schemaVersion).toBe(1);
    });

    test('should import tournament data', () => {
      const testTournament = createTournament('Test Tournament', 'individual-signup');
      const testParticipant = createParticipant(testTournament.id, 'Test Player');
      
      saveTournament(testTournament);
      saveParticipant(testParticipant);
      
      const exportData = exportTournament(testTournament.id);
      
      // Clear storage
      clearAllData();
      
      const importedId = importTournament(exportData);
      
      expect(importedId).toBe(testTournament.id);
      expect(loadTournament(testTournament.id)).toEqual(testTournament);
      expect(loadParticipantsByTournament(testTournament.id)).toHaveLength(1);
    });

    test('should throw error for invalid import data', () => {
      expect(() => importTournament('invalid json')).toThrow(StorageError);
      expect(() => importTournament('{}')).toThrow(StorageError);
    });

    test('should throw error for non-existent tournament export', () => {
      expect(() => exportTournament('non-existent')).toThrow(StorageError);
    });
  });

  describe('Schema Migration', () => {
    test('should get and set schema version', () => {
      expect(getSchemaVersion()).toBe(0);
      
      setSchemaVersion(1);
      expect(getSchemaVersion()).toBe(1);
    });

    test('should migrate data', () => {
      setSchemaVersion(0);
      migrateData();
      expect(getSchemaVersion()).toBe(1);
    });
  });

  describe('Storage Management', () => {
    test('should clear all data', () => {
      const tournament = createTournament('Test', 'individual-signup');
      saveTournament(tournament);
      
      clearAllData();
      
      expect(loadTournaments()).toHaveLength(0);
      expect(getSchemaVersion()).toBe(0);
    });

    test('should calculate storage usage', () => {
      const usage = getStorageUsage();
      
      expect(usage.used).toBeGreaterThanOrEqual(0);
      expect(usage.available).toBeGreaterThan(0);
    });

    test('should initialize storage', () => {
      expect(() => initializeStorage()).not.toThrow();
      expect(getSchemaVersion()).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage quota exceeded', () => {
      mockSetItem.mockImplementation((key: string, value: string) => {
        // Create a proper DOMException with the right properties
        const error = new Error('QuotaExceededError') as any;
        error.name = 'QuotaExceededError';
        error.code = 22;
        // Make it look like a DOMException
        Object.setPrototypeOf(error, DOMException.prototype);
        throw error;
      });

      const tournament = createTournament('Test', 'individual-signup');
      
      expect(() => saveTournament(tournament)).toThrow(StorageError);
      expect(() => saveTournament(tournament)).toThrow('quota exceeded');
    });

    test('should handle localStorage access denied', () => {
      mockSetItem.mockImplementation(() => {
        throw new Error('Access denied');
      });

      const tournament = createTournament('Test', 'individual-signup');
      
      expect(() => saveTournament(tournament)).toThrow(StorageError);
      expect(() => saveTournament(tournament)).toThrow('access denied');
    });

    test('should handle parse errors', () => {
      mockGetItem.mockReturnValue('invalid json');

      expect(() => loadTournaments()).toThrow(StorageError);
      expect(() => loadTournaments()).toThrow('parse');
    });
  });
});