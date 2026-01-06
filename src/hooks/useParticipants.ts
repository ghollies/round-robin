import { useCallback, useMemo } from 'react';
import { useTournamentContext } from '../contexts/TournamentContext';
import { Participant } from '../types/tournament';

/**
 * Simplified hook for participant operations
 */
export function useParticipants() {
  const { state, updateParticipant } = useTournamentContext();
  const { participants, currentTournament, loading, error } = state;

  // Get participant by ID
  const getParticipant = useCallback(
    (id: string) => participants.find(p => p.id === id) || null,
    [participants]
  );

  // Update participant statistics
  const updateParticipantStats = useCallback(
    async (participantId: string, statsUpdate: Partial<Participant['statistics']>) => {
      const participant = getParticipant(participantId);
      if (!participant) {
        throw new Error(`Participant with id ${participantId} not found`);
      }

      const updatedParticipant: Participant = {
        ...participant,
        statistics: { ...participant.statistics, ...statsUpdate },
      };

      await updateParticipant(updatedParticipant);
    },
    [getParticipant, updateParticipant]
  );

  // Get participants sorted by criteria
  const getSortedParticipants = useCallback(
    (sortBy: 'name' | 'wins' | 'pointDiff' | 'totalPoints' = 'name') => {
      return [...participants].sort((a, b) => {
        switch (sortBy) {
          case 'name': return a.name.localeCompare(b.name);
          case 'wins': return b.statistics.gamesWon - a.statistics.gamesWon;
          case 'pointDiff': return b.statistics.pointDifferential - a.statistics.pointDifferential;
          case 'totalPoints': return b.statistics.totalPointsScored - a.statistics.totalPointsScored;
          default: return 0;
        }
      });
    },
    [participants]
  );

  // Memoized tournament statistics
  const tournamentStats = useMemo(() => {
    if (!participants.length) return null;

    const totalGames = participants.reduce((sum, p) => sum + p.statistics.gamesWon + p.statistics.gamesLost, 0) / 2;
    const totalPoints = participants.reduce((sum, p) => sum + p.statistics.totalPointsScored, 0);

    return {
      totalParticipants: participants.length,
      totalGames,
      totalPoints,
      avgPointsPerGame: totalGames > 0 ? totalPoints / totalGames : 0,
    };
  }, [participants]);

  return {
    // State
    participants,
    loading,
    error,
    tournamentId: currentTournament?.id || null,
    
    // Operations
    getParticipant,
    updateParticipantStats,
    getSortedParticipants,
    
    // Statistics
    tournamentStats,
  };
}