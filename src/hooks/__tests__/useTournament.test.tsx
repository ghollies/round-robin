import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { TournamentProvider } from '../../contexts/TournamentContext';
import { useTournament } from '../useTournament';
import { Tournament } from '../../types/tournament';
import * as storage from '../../utils/storage';

// Mock the storage module
jest.mock('../../utils/storage');
const mockStorage = storage as jest.Mocked<typeof storage>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TournamentProvider>{children}</TournamentProvider>
);

describe('useTournament', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.initializeStorage.mockImplementation(() => {});
  });

  it('should provide initial state', () => {
    const { result } = renderHook(() => useTournament(), { wrapper });

    expect(result.current.tournament).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should create tournament successfully', async () => {
    mockStorage.saveTournament.mockImplementation(() => {});
    mockStorage.saveParticipant.mockImplementation(() => {});

    const { result } = renderHook(() => useTournament(), { wrapper });

    const tournament: Tournament = {
      id: 'test-tournament',
      name: 'Test Tournament',
      mode: 'individual-signup',
      settings: {
        courtCount: 2,
        matchDuration: 30,
        pointLimit: 11,
        scoringRule: 'win-by-2',
        timeLimit: true,
      },
      status: 'setup',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await act(async () => {
      const tournamentId = await result.current.createTournament(tournament, ['Player 1', 'Player 2']);
      expect(tournamentId).toBe('test-tournament');
    });

    expect(result.current.tournament).toEqual(tournament);
    expect(mockStorage.saveTournament).toHaveBeenCalledWith(tournament);
    expect(mockStorage.saveParticipant).toHaveBeenCalledTimes(2);
  });

  it('should load tournament successfully', async () => {
    const mockTournament: Tournament = {
      id: 'test-tournament',
      name: 'Loaded Tournament',
      mode: 'individual-signup',
      settings: {
        courtCount: 2,
        matchDuration: 30,
        pointLimit: 11,
        scoringRule: 'win-by-2',
        timeLimit: true,
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStorage.loadTournament.mockReturnValue(mockTournament);
    mockStorage.loadParticipantsByTournament.mockReturnValue([]);
    mockStorage.loadTeamsByTournament.mockReturnValue([]);
    mockStorage.loadMatchesByTournament.mockReturnValue([]);
    mockStorage.loadRoundsByTournament.mockReturnValue([]);
    mockStorage.getStandings.mockReturnValue([]);

    const { result } = renderHook(() => useTournament(), { wrapper });

    await act(async () => {
      await result.current.loadTournament('test-tournament');
    });

    expect(result.current.tournament).toEqual(mockTournament);
    expect(mockStorage.loadTournament).toHaveBeenCalledWith('test-tournament');
  });

  it('should update tournament successfully', async () => {
    // First create a tournament
    mockStorage.saveTournament.mockImplementation(() => {});
    mockStorage.saveParticipant.mockImplementation(() => {});

    const { result } = renderHook(() => useTournament(), { wrapper });

    const tournament: Tournament = {
      id: 'test-tournament',
      name: 'Test Tournament',
      mode: 'individual-signup',
      settings: {
        courtCount: 2,
        matchDuration: 30,
        pointLimit: 11,
        scoringRule: 'win-by-2',
        timeLimit: true,
      },
      status: 'setup',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await act(async () => {
      await result.current.createTournament(tournament, ['Player 1']);
    });

    // Now update the tournament
    await act(async () => {
      await result.current.updateTournament({
        name: 'Updated Tournament',
        status: 'active',
      });
    });

    expect(result.current.tournament?.name).toBe('Updated Tournament');
    expect(result.current.tournament?.status).toBe('active');
    expect(mockStorage.saveTournament).toHaveBeenCalledTimes(2);
  });

  it('should check tournament status correctly', async () => {
    mockStorage.saveTournament.mockImplementation(() => {});
    mockStorage.saveParticipant.mockImplementation(() => {});

    const { result } = renderHook(() => useTournament(), { wrapper });

    const tournament: Tournament = {
      id: 'test-tournament',
      name: 'Test Tournament',
      mode: 'individual-signup',
      settings: {
        courtCount: 2,
        matchDuration: 30,
        pointLimit: 11,
        scoringRule: 'win-by-2',
        timeLimit: true,
      },
      status: 'setup',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await act(async () => {
      await result.current.createTournament(tournament, ['Player 1']);
    });

    expect(result.current.isTournamentStatus('setup')).toBe(true);
    expect(result.current.isTournamentStatus('active')).toBe(false);
  });

  it('should get tournament progress', async () => {
    mockStorage.saveTournament.mockImplementation(() => {});
    mockStorage.saveParticipant.mockImplementation(() => {});
    mockStorage.loadTournament.mockReturnValue({
      id: 'test-tournament',
      name: 'Test Tournament',
      mode: 'individual-signup',
      settings: {
        courtCount: 2,
        matchDuration: 30,
        pointLimit: 11,
        scoringRule: 'win-by-2',
        timeLimit: true,
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockStorage.loadParticipantsByTournament.mockReturnValue([]);
    mockStorage.loadTeamsByTournament.mockReturnValue([]);
    mockStorage.loadMatchesByTournament.mockReturnValue([
      {
        id: 'match-1',
        tournamentId: 'test-tournament',
        roundNumber: 1,
        matchNumber: 1,
        team1Id: 'team-1',
        team2Id: 'team-2',
        courtNumber: 1,
        scheduledTime: new Date(),
        status: 'completed',
      },
      {
        id: 'match-2',
        tournamentId: 'test-tournament',
        roundNumber: 1,
        matchNumber: 2,
        team1Id: 'team-3',
        team2Id: 'team-4',
        courtNumber: 2,
        scheduledTime: new Date(),
        status: 'scheduled',
      },
    ]);
    mockStorage.loadRoundsByTournament.mockReturnValue([]);
    mockStorage.getStandings.mockReturnValue([]);

    const { result } = renderHook(() => useTournament(), { wrapper });

    await act(async () => {
      await result.current.loadTournament('test-tournament');
    });

    const progress = result.current.getTournamentProgress();
    expect(progress).toEqual({
      totalMatches: 2,
      completedMatches: 1,
      inProgressMatches: 0,
      remainingMatches: 1,
      completionPercentage: 50,
    });
  });

  it('should handle errors properly', async () => {
    const error = new Error('Storage error');
    mockStorage.saveTournament.mockImplementation(() => {
      throw error;
    });

    const { result } = renderHook(() => useTournament(), { wrapper });

    const tournament: Tournament = {
      id: 'test-tournament',
      name: 'Test Tournament',
      mode: 'individual-signup',
      settings: {
        courtCount: 2,
        matchDuration: 30,
        pointLimit: 11,
        scoringRule: 'win-by-2',
        timeLimit: true,
      },
      status: 'setup',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await expect(
      act(async () => {
        await result.current.createTournament(tournament, ['Player 1']);
      })
    ).rejects.toThrow('Storage error');

    expect(result.current.error?.message).toBe('Storage error');
  });
});