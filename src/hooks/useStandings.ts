import { useCallback, useMemo } from 'react';
import { useTournamentContext } from '../contexts/TournamentContext';
import { Participant } from '../types/tournament';

/**
 * Simplified hook for standings operations
 */
export function useStandings() {
  const { state, refreshStandings } = useTournamentContext();
  const { standings, matches, loading, error } = state;

  // Get participant's current rank
  const getParticipantRank = useCallback(
    (participantId: string) => {
      const index = standings.findIndex(p => p.id === participantId);
      return index >= 0 ? index + 1 : null;
    },
    [standings]
  );

  // Get top performers
  const getTopPerformers = useCallback(
    (count: number = 3) => standings.slice(0, count),
    [standings]
  );

  // Memoized detailed standings with calculated fields
  const detailedStandings = useMemo(() => {
    return standings.map((participant, index) => {
      const totalGames = participant.statistics.gamesWon + participant.statistics.gamesLost;
      const winPercentage = totalGames > 0 ? (participant.statistics.gamesWon / totalGames) * 100 : 0;

      return {
        rank: index + 1,
        participant,
        totalGames,
        winPercentage,
        ...participant.statistics,
      };
    });
  }, [standings]);

  // Memoized tournament winner check
  const tournamentWinner = useMemo(() => {
    if (!standings.length) return null;

    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    
    // Tournament not completed
    if (totalMatches === 0 || completedMatches < totalMatches) {
      return null;
    }

    const winner = standings[0];
    const runnerUp = standings[1];

    // Check for tie
    if (runnerUp && 
        winner.statistics.gamesWon === runnerUp.statistics.gamesWon &&
        winner.statistics.pointDifferential === runnerUp.statistics.pointDifferential) {
      return { type: 'tie' as const, winner, runnerUp };
    }

    return { type: 'clear' as const, winner, runnerUp };
  }, [standings, matches]);

  // Memoized standings summary
  const summary = useMemo(() => {
    if (!standings.length) return null;

    const totalGames = standings.reduce((sum, p) => sum + p.statistics.gamesWon + p.statistics.gamesLost, 0) / 2;
    const totalPoints = standings.reduce((sum, p) => sum + p.statistics.totalPointsScored, 0);
    const completedMatches = matches.filter(m => m.status === 'completed').length;

    return {
      totalParticipants: standings.length,
      totalGames,
      totalPoints,
      tournamentProgress: matches.length > 0 ? (completedMatches / matches.length) * 100 : 0,
    };
  }, [standings, matches]);

  return {
    // State
    standings,
    detailedStandings,
    loading,
    error,
    
    // Operations
    refreshStandings,
    getParticipantRank,
    getTopPerformers,
    
    // Analysis
    tournamentWinner,
    summary,
  };
}