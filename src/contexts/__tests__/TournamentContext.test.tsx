import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { TournamentProvider, useTournamentContext } from '../TournamentContext';
import { Tournament, Participant } from '../../types/tournament';
import * as storage from '../../utils/storage';

// Mock the storage module
jest.mock('../../utils/storage');
const mockStorage = storage as jest.Mocked<typeof storage>;

// Test component that uses the context
function TestComponent() {
  const {
    state,
    createTournament,
    loadTournament,
    updateParticipant,
    updateMatchResult,
    clearError,
  } = useTournamentContext();

  return (
    <div>
      <div data-testid="loading">{state.loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error">{state.error?.message || 'no-error'}</div>
      <div data-testid="tournament">{state.currentTournament?.name || 'no-tournament'}</div>
      <div data-testid="participants-count">{state.participants.length}</div>
      
      <button
        data-testid="create-tournament"
        onClick={() => {
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
          createTournament(tournament, ['Player 1', 'Player 2']);
        }}
      >
        Create Tournament
      </button>
      
      <button
        data-testid="load-tournament"
        onClick={() => loadTournament('test-tournament')}
      >
        Load Tournament
      </button>
      
      <button
        data-testid="update-participant"
        onClick={() => {
          if (state.participants.length > 0) {
            const participant = state.participants[0];
            updateParticipant({
              ...participant,
              statistics: {
                ...participant.statistics,
                gamesWon: 5,
              },
            });
          }
        }}
      >
        Update Participant
      </button>
      
      <button
        data-testid="clear-error"
        onClick={clearError}
      >
        Clear Error
      </button>
    </div>
  );
}

describe('TournamentContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.initializeStorage.mockImplementation(() => {});
  });

  it('should provide initial state', () => {
    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('tournament')).toHaveTextContent('no-tournament');
    expect(screen.getByTestId('participants-count')).toHaveTextContent('0');
  });

  it('should initialize storage on mount', () => {
    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    expect(mockStorage.initializeStorage).toHaveBeenCalledTimes(1);
  });

  it('should handle storage initialization error', () => {
    const error = new Error('Storage initialization failed');
    mockStorage.initializeStorage.mockImplementation(() => {
      throw error;
    });

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    expect(screen.getByTestId('error')).toHaveTextContent('Storage initialization failed');
  });

  it('should create tournament successfully', async () => {
    mockStorage.saveTournament.mockImplementation(() => {});
    mockStorage.saveParticipant.mockImplementation(() => {});

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    act(() => {
      screen.getByTestId('create-tournament').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('tournament')).toHaveTextContent('Test Tournament');
      expect(screen.getByTestId('participants-count')).toHaveTextContent('2');
    });

    expect(mockStorage.saveTournament).toHaveBeenCalledTimes(1);
    expect(mockStorage.saveParticipant).toHaveBeenCalledTimes(2);
  });

  it('should handle tournament creation error', async () => {
    const error = new Error('Failed to save tournament');
    mockStorage.saveTournament.mockImplementation(() => {
      throw error;
    });

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    act(() => {
      screen.getByTestId('create-tournament').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to save tournament');
    });
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

    const mockParticipants: Participant[] = [
      {
        id: 'participant-1',
        tournamentId: 'test-tournament',
        name: 'Player 1',
        statistics: {
          gamesWon: 0,
          gamesLost: 0,
          totalPointsScored: 0,
          totalPointsAllowed: 0,
          pointDifferential: 0,
        },
      },
    ];

    mockStorage.loadTournament.mockReturnValue(mockTournament);
    mockStorage.loadParticipantsByTournament.mockReturnValue(mockParticipants);
    mockStorage.loadTeamsByTournament.mockReturnValue([]);
    mockStorage.loadMatchesByTournament.mockReturnValue([]);
    mockStorage.loadRoundsByTournament.mockReturnValue([]);
    mockStorage.getStandings.mockReturnValue(mockParticipants);

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    act(() => {
      screen.getByTestId('load-tournament').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('tournament')).toHaveTextContent('Loaded Tournament');
      expect(screen.getByTestId('participants-count')).toHaveTextContent('1');
    });
  });

  it('should handle load tournament error', async () => {
    mockStorage.loadTournament.mockReturnValue(null);

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    act(() => {
      screen.getByTestId('load-tournament').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Tournament with id test-tournament not found');
    });
  });

  it('should update participant with optimistic updates', async () => {
    // First create a tournament with participants
    mockStorage.saveTournament.mockImplementation(() => {});
    mockStorage.saveParticipant.mockImplementation(() => {});
    mockStorage.getStandings.mockReturnValue([]);

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    // Create tournament first
    act(() => {
      screen.getByTestId('create-tournament').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('participants-count')).toHaveTextContent('2');
    });

    // Now update participant
    act(() => {
      screen.getByTestId('update-participant').click();
    });

    await waitFor(() => {
      expect(mockStorage.saveParticipant).toHaveBeenCalled();
      expect(mockStorage.getStandings).toHaveBeenCalled();
    });
  });

  it('should handle participant update error with rollback', async () => {
    // First create a tournament with participants
    mockStorage.saveTournament.mockImplementation(() => {});
    mockStorage.saveParticipant.mockImplementation(() => {});

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    // Create tournament first
    act(() => {
      screen.getByTestId('create-tournament').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('participants-count')).toHaveTextContent('2');
    });

    // Mock error on participant update
    const error = new Error('Failed to update participant');
    mockStorage.saveParticipant.mockImplementation(() => {
      throw error;
    });

    act(() => {
      screen.getByTestId('update-participant').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to update participant');
    });
  });

  it('should clear error', () => {
    mockStorage.initializeStorage.mockImplementation(() => {
      throw new Error('Test error');
    });

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    expect(screen.getByTestId('error')).toHaveTextContent('Test error');

    act(() => {
      screen.getByTestId('clear-error').click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTournamentContext must be used within a TournamentProvider');

    consoleSpy.mockRestore();
  });
});