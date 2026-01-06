import { useCallback, useMemo } from 'react';
import { useTournamentContext } from '../contexts/TournamentContext';
import { Tournament } from '../types/tournament';

/**
 * Simplified hook for tournament operations
 */
export function useTournament() {
  const {
    state,
    loadTournament,
    saveTournament,
    createTournament,
    deleteTournament,
    resetTournament,
    clearError,
  } = useTournamentContext();

  const { currentTournament, matches, loading, error } = state;

  // Create tournament and return ID
  const handleCreateTournament = useCallback(
    async (tournament: Tournament, participantNames: string[]) => {
      await createTournament(tournament, participantNames);
      return tournament.id;
    },
    [createTournament]
  );

  // Update tournament settings
  const updateTournament = useCallback(
    async (updates: Partial<Tournament>) => {
      if (!currentTournament) {
        throw new Error('No tournament loaded');
      }

      const updatedTournament: Tournament = {
        ...currentTournament,
        ...updates,
        updatedAt: new Date(),
      };

      await saveTournament(updatedTournament);
    },
    [currentTournament, saveTournament]
  );

  // Delete tournament with fallback to current
  const deleteTournamentById = useCallback(
    async (id?: string) => {
      const tournamentId = id || currentTournament?.id;
      if (!tournamentId) {
        throw new Error('No tournament to delete');
      }
      await deleteTournament(tournamentId);
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

  // Memoized tournament progress
  const progress = useMemo(() => {
    if (!currentTournament || !matches.length) return null;

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
  }, [currentTournament, matches]);

  // Get tournament progress (for backward compatibility)
  const getTournamentProgress = useCallback(() => progress, [progress]);

  return {
    // State
    tournament: currentTournament,
    loading,
    error,
    progress,
    
    // Operations
    createTournament: handleCreateTournament,
    loadTournament,
    updateTournament,
    deleteTournament: deleteTournamentById,
    resetTournament,
    clearError,
    
    // Utilities (for backward compatibility)
    isTournamentStatus,
    getTournamentProgress,
  };
}