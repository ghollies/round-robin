import { useCallback } from 'react';
import { useTournamentContext } from '../contexts/TournamentContext';
import { Tournament } from '../types/tournament';

/**
 * Custom hook for tournament operations
 */
export function useTournament() {
  const {
    state,
    loadTournament,
    saveTournament,
    createTournament,
    deleteTournament,
    resetTournament,
  } = useTournamentContext();

  const { currentTournament, loading, error } = state;

  // Create a new tournament with participants
  const handleCreateTournament = useCallback(
    async (tournament: Tournament, participantNames: string[]) => {
      try {
        await createTournament(tournament, participantNames);
        return tournament.id;
      } catch (error) {
        throw error;
      }
    },
    [createTournament]
  );

  // Load an existing tournament
  const handleLoadTournament = useCallback(
    async (id: string) => {
      try {
        await loadTournament(id);
      } catch (error) {
        throw error;
      }
    },
    [loadTournament]
  );

  // Update tournament settings
  const handleUpdateTournament = useCallback(
    async (updates: Partial<Tournament>) => {
      if (!currentTournament) {
        throw new Error('No tournament loaded');
      }

      const updatedTournament: Tournament = {
        ...currentTournament,
        ...updates,
        updatedAt: new Date(),
      };

      try {
        await saveTournament(updatedTournament);
      } catch (error) {
        throw error;
      }
    },
    [currentTournament, saveTournament]
  );

  // Delete the current tournament
  const handleDeleteTournament = useCallback(
    async (id?: string) => {
      const tournamentId = id || currentTournament?.id;
      if (!tournamentId) {
        throw new Error('No tournament to delete');
      }

      try {
        await deleteTournament(tournamentId);
      } catch (error) {
        throw error;
      }
    },
    [currentTournament, deleteTournament]
  );

  // Check if tournament is in a specific status
  const isTournamentStatus = useCallback(
    (status: Tournament['status']) => {
      return currentTournament?.status === status;
    },
    [currentTournament]
  );

  // Get tournament progress information
  const getTournamentProgress = useCallback(() => {
    if (!currentTournament) {
      return null;
    }

    const { matches } = state;
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const inProgressMatches = matches.filter(m => m.status === 'in-progress').length;

    return {
      totalMatches,
      completedMatches,
      inProgressMatches,
      remainingMatches: totalMatches - completedMatches - inProgressMatches,
      completionPercentage: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
    };
  }, [currentTournament, state.matches]);

  return {
    // State
    tournament: currentTournament,
    loading,
    error,
    
    // Operations
    createTournament: handleCreateTournament,
    loadTournament: handleLoadTournament,
    updateTournament: handleUpdateTournament,
    deleteTournament: handleDeleteTournament,
    resetTournament,
    
    // Utilities
    isTournamentStatus,
    getTournamentProgress,
  };
}