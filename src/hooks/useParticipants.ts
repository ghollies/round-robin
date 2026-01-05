import { useCallback, useMemo } from 'react';
import { useTournamentContext } from '../contexts/TournamentContext';
import { Participant } from '../types/tournament';

/**
 * Custom hook for participant operations and data access
 */
export function useParticipants() {
  const {
    state,
    updateParticipant,
  } = useTournamentContext();

  const { participants, currentTournament, loading, error } = state;

  // Get participant by ID
  const getParticipant = useCallback(
    (id: string) => {
      return participants.find(p => p.id === id) || null;
    },
    [participants]
  );

  // Get participant by name
  const getParticipantByName = useCallback(
    (name: string) => {
      return participants.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
    },
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
        statistics: {
          ...participant.statistics,
          ...statsUpdate,
        },
      };

      try {
        await updateParticipant(updatedParticipant);
      } catch (error) {
        throw error;
      }
    },
    [getParticipant, updateParticipant]
  );

  // Get participants sorted by various criteria
  const getSortedParticipants = useCallback(
    (sortBy: 'name' | 'wins' | 'pointDiff' | 'totalPoints' = 'name') => {
      return [...participants].sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'wins':
            return b.statistics.gamesWon - a.statistics.gamesWon;
          case 'pointDiff':
            return b.statistics.pointDifferential - a.statistics.pointDifferential;
          case 'totalPoints':
            return b.statistics.totalPointsScored - a.statistics.totalPointsScored;
          default:
            return 0;
        }
      });
    },
    [participants]
  );

  // Get participant statistics summary
  const getParticipantStats = useCallback(
    (participantId: string) => {
      const participant = getParticipant(participantId);
      if (!participant) {
        return null;
      }

      const { statistics } = participant;
      const totalGames = statistics.gamesWon + statistics.gamesLost;
      const winPercentage = totalGames > 0 ? (statistics.gamesWon / totalGames) * 100 : 0;
      const avgPointsScored = totalGames > 0 ? statistics.totalPointsScored / totalGames : 0;
      const avgPointsAllowed = totalGames > 0 ? statistics.totalPointsAllowed / totalGames : 0;

      return {
        ...statistics,
        totalGames,
        winPercentage,
        avgPointsScored,
        avgPointsAllowed,
      };
    },
    [getParticipant]
  );

  // Get tournament-wide statistics
  const getTournamentStats = useMemo(() => {
    if (participants.length === 0) {
      return null;
    }

    const totalGames = participants.reduce((sum, p) => sum + p.statistics.gamesWon + p.statistics.gamesLost, 0) / 2; // Divide by 2 since each game involves 2 participants
    const totalPoints = participants.reduce((sum, p) => sum + p.statistics.totalPointsScored, 0);
    const avgPointsPerGame = totalGames > 0 ? totalPoints / totalGames : 0;

    const topScorer = participants.reduce((top, p) => 
      p.statistics.totalPointsScored > top.statistics.totalPointsScored ? p : top
    );

    const mostWins = participants.reduce((top, p) => 
      p.statistics.gamesWon > top.statistics.gamesWon ? p : top
    );

    const bestPointDiff = participants.reduce((top, p) => 
      p.statistics.pointDifferential > top.statistics.pointDifferential ? p : top
    );

    return {
      totalParticipants: participants.length,
      totalGames,
      totalPoints,
      avgPointsPerGame,
      topScorer,
      mostWins,
      bestPointDiff,
    };
  }, [participants]);

  // Check if all participants have played minimum games
  const checkMinimumGamesPlayed = useCallback(
    (minimumGames: number = 1) => {
      return participants.every(p => (p.statistics.gamesWon + p.statistics.gamesLost) >= minimumGames);
    },
    [participants]
  );

  // Get participants who haven't played yet
  const getInactiveParticipants = useCallback(() => {
    return participants.filter(p => p.statistics.gamesWon + p.statistics.gamesLost === 0);
  }, [participants]);

  // Get participants with most/least games played
  const getParticipantsByGamesPlayed = useCallback(() => {
    const participantsWithGames = participants.map(p => ({
      ...p,
      totalGames: p.statistics.gamesWon + p.statistics.gamesLost,
    }));

    const maxGames = Math.max(...participantsWithGames.map(p => p.totalGames));
    const minGames = Math.min(...participantsWithGames.map(p => p.totalGames));

    return {
      mostActive: participantsWithGames.filter(p => p.totalGames === maxGames),
      leastActive: participantsWithGames.filter(p => p.totalGames === minGames),
      maxGames,
      minGames,
    };
  }, [participants]);

  return {
    // State
    participants,
    loading,
    error,
    tournamentId: currentTournament?.id || null,
    
    // Single participant operations
    getParticipant,
    getParticipantByName,
    updateParticipantStats,
    getParticipantStats,
    
    // Multiple participants operations
    getSortedParticipants,
    getInactiveParticipants,
    getParticipantsByGamesPlayed,
    
    // Validation and checks
    checkMinimumGamesPlayed,
    
    // Statistics
    getTournamentStats,
  };
}