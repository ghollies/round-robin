import { saveTournament, loadTournament, StorageError } from '../storage';
import { createTournament } from '../index';

describe('Storage Basic Tests', () => {
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

  test('should save and load tournament', () => {
    const tournament = createTournament('Test Tournament', 'individual-signup');
    
    saveTournament(tournament);
    const loaded = loadTournament(tournament.id);
    
    expect(loaded).toEqual(tournament);
  });

  test('should return null for non-existent tournament', () => {
    const loaded = loadTournament('non-existent');
    expect(loaded).toBeNull();
  });

  test('StorageError should be defined', () => {
    expect(StorageError).toBeDefined();
    expect(new StorageError('test', 'not_found')).toBeInstanceOf(Error);
  });
});