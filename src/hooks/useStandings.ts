import { useCallback, useMemo } from 'react';
import { useTournamentContext } from '../contexts/TournamentContext';
import { Participant } from '../types/tournament';

/**
 * Custom hook for standings operations and data access
 */
export function useStandings() {
  const {
    state,
    refreshStandings,
  } = useTournamentContext();

  const { standings, participants, matches, currentTournament, loading, error } = state;

  // Get current standings (already sorted)
  const getCurrentStandings = useCallback(() => {
    return standings;
  }, [standings]);

  // Get standings with additional calculated fields
  const getDetailedStandings = useMemo(() => {
    return standings.map((participant, index) => {
      const totalGames = participant.statistics.gamesWon + participant.statistics.gamesLost;
      const winPercentage = totalGames > 0 ? (participant.statistics.gamesWon / totalGames) * 100 : 0;
      const avgPointsScored = totalGames > 0 ? participant.statistics.totalPointsScored / totalGames : 0;
      const avgPointsAllowed = totalGames > 0 ? participant.statistics.totalPointsAllowed / totalGames : 0;

      return {
        rank: index + 1,
        participant,
        totalGames,
        winPercentage,
        avgPointsScored,
        avgPointsAllowed,
        ...participant.statistics,
      };
    });
  }, [standings]);

  // Get participant's current rank
  const getParticipantRank = useCallback(
    (participantId: string) => {
      const index = standings.findIndex(p => p.id === participantId);
      return index >= 0 ? index + 1 : null;
    },
    [standings]
  );

  // Get participants by rank range
  const getParticipantsByRankRange = useCallback(
    (startRank: number, endRank: number) => {
      return standings.slice(startRank - 1, endRank);
    },
    [standings]
  );

  // Get top performers
  const getTopPerformers = useCallback(
    (count: number = 3) => {
      return standings.slice(0, count);
    },
    [standings]
  );

  // Get bottom performers
  const getBottomPerformers = useCallback(
    (count: number = 3) => {
      return standings.slice(-count).reverse();
    },
    [standings]
  );

  // Get participants tied for a specific rank
  const getTiedParticipants = useCallback(
    (rank: number) => {
      if (rank < 1 || rank > standings.length) {
        return [];
      }

      const targetParticipant = standings[rank - 1];
      const { gamesWon, pointDifferential } = targetParticipant.statistics;

      return standings.filter(p => 
        p.statistics.gamesWon === gamesWon && 
        p.statistics.pointDifferential === pointDifferential
      );
    },
    [standings]
  );

  // Calculate standings changes (requires previous standings to compare)
  const calculateStandingsChanges = useCallback(
    (previousStandings: Participant[]) => {
      return standings.map((currentParticipant, currentIndex) => {
        const previousIndex = previousStandings.findIndex(p => p.id === currentParticipant.id);
        const previousRank = previousIndex >= 0 ? previousIndex + 1 : null;
        const currentRank = currentIndex + 1;
        
        let change: 'up' | 'down' | 'same' | 'new' = 'new';
        let rankChange = 0;

        if (previousRank !== null) {
          if (currentRank < previousRank) {
            change = 'up';
            rankChange = previousRank - currentRank;
          } else if (currentRank > previousRank) {
            change = 'down';
            rankChange = currentRank - previousRank;
          } else {
            change = 'same';
          }
        }

        return {
          participant: currentParticipant,
          currentRank,
          previousRank,
          change,
          rankChange,
        };
      });
    },
    [standings]
  );

  // Get tournament leaders in various categories
  const getTournamentLeaders = useMemo(() => {
    if (participants.length === 0) {
      return null;
    }

    const mostWins = participants.reduce((leader, p) => 
      p.statistics.gamesWon > leader.statistics.gamesWon ? p : leader
    );

    const bestPointDiff = participants.reduce((leader, p) => 
      p.statistics.pointDifferential > leader.statistics.pointDifferential ? p : leader
    );

    const mostPointsScored = participants.reduce((leader, p) => 
      p.statistics.totalPointsScored > leader.statistics.totalPointsScored ? p : leader
    );

    const fewestPointsAllowed = participants.reduce((leader, p) => 
      p.statistics.totalPointsAllowed < leader.statistics.totalPointsAllowed ? p : leader
    );

    const mostGamesPlayed = participants.reduce((leader, p) => {
      const pGames = p.statistics.gamesWon + p.statistics.gamesLost;
      const leaderGames = leader.statistics.gamesWon + leader.statistics.gamesLost;
      return pGames > leaderGames ? p : leader;
    });

    const bestWinPercentage = participants
      .filter(p => (p.statistics.gamesWon + p.statistics.gamesLost) > 0)
      .reduce((leader, p) => {
        const pTotal = p.statistics.gamesWon + p.statistics.gamesLost;
        const leaderTotal = leader.statistics.gamesWon + leader.statistics.gamesLost;
        const pPercentage = p.statistics.gamesWon / pTotal;
        const leaderPercentage = leader.statistics.gamesWon / leaderTotal;
        return pPercentage > leaderPercentage ? p : leader;
      });

    return {
      mostWins,
      bestPointDiff,
      mostPointsScored,
      fewestPointsAllowed,
      mostGamesPlayed,
      bestWinPercentage,
    };
  }, [participants]);

  // Check if tournament has a clear winner
  const getTournamentWinner = useCallback(() => {
    if (standings.length === 0) {
      return null;
    }

    // Check if tournament is completed
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    
    if (totalMatches === 0 || completedMatches < totalMatches) {
      return null; // Tournament not completed
    }

    const winner = standings[0];
    const runnerUp = standings[1];

    // Check if there's a tie for first place
    if (runnerUp && 
        winner.statistics.gamesWon === runnerUp.statistics.gamesWon &&
        winner.statistics.pointDifferential === runnerUp.statistics.pointDifferential) {
      return {
        type: 'tie' as const,
        winners: getTiedParticipants(1),
      };
    }

    return {
      type: 'clear' as const,
      winner,
      runnerUp,
    };
  }, [standings, matches, getTiedParticipants]);

  // Get standings summary statistics
  const getStandingsSummary = useMemo(() => {
    if (standings.length === 0) {
      return null;
    }

    const totalParticipants = standings.length;
    const totalGames = standings.reduce((sum, p) => sum + p.statistics.gamesWon + p.statistics.gamesLost, 0) / 2;
    const totalPoints = standings.reduce((sum, p) => sum + p.statistics.totalPointsScored, 0);
    
    const avgGamesPerParticipant = totalParticipants > 0 ? (totalGames * 2) / totalParticipants : 0;
    const avgPointsPerParticipant = totalParticipants > 0 ? totalPoints / totalParticipants : 0;
    const avgPointsPerGame = totalGames > 0 ? totalPoints / totalGames : 0;

    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const tournamentProgress = matches.length > 0 ? (completedMatches / matches.length) * 100 : 0;

    return {
      totalParticipants,
      totalGames,
      totalPoints,
      avgGamesPerParticipant,
      avgPointsPerParticipant,
      avgPointsPerGame,
      tournamentProgress,
    };
  }, [standings, matches]);

  // Refresh standings manually
  const handleRefreshStandings = useCallback(async () => {
    try {
      await refreshStandings();
    } catch (error) {
      throw error;
    }
  }, [refreshStandings]);

  return {
    // State
    standings,
    loading,
    error,
    
    // Basic standings operations
    getCurrentStandings,
    getDetailedStandings,
    refreshStandings: handleRefreshStandings,
    
    // Rank operations
    getParticipantRank,
    getParticipantsByRankRange,
    getTopPerformers,
    getBottomPerformers,
    getTiedParticipants,
    
    // Analysis operations
    calculateStandingsChanges,
    getTournamentLeaders,
    getTournamentWinner,
    getStandingsSummary,
  };
}