import { useMemo, useCallback } from 'react';
import { useTournamentContext } from '../contexts/TournamentContext';
import { Tournament, Participant, Match, Round } from '../types/tournament';
import { performanceMonitor } from '../utils/performance';

// Optimized hook for tournament operations with memoization
export function useOptimizedTournament() {
  const context = useTournamentContext();
  
  // Memoized selectors to avoid unnecessary recalculations
  const tournament = useMemo(() => context.state.currentTournament, [context.state.currentTournament]);
  const participants = useMemo(() => context.state.participants, [context.state.participants]);
  const matches = useMemo(() => context.state.matches, [context.state.matches]);
  const rounds = useMemo(() => context.state.rounds, [context.state.rounds]);
  const standings = useMemo(() => context.state.standings, [context.state.standings]);
  const loading = useMemo(() => context.state.loading, [context.state.loading]);
  const error = useMemo(() => context.state.error, [context.state.error]);

  // Memoized derived data
  const tournamentStats = useMemo(() => {
    if (!tournament || !participants.length) return null;
    
    return performanceMonitor.measure('calculate-tournament-stats', () => {
      const totalMatches = matches.length;
      const completedMatches = matches.filter(m => m.status === 'completed').length;
      const inProgressMatches = matches.filter(m => m.status === 'in-progress').length;
      const scheduledMatches = matches.filter(m => m.status === 'scheduled').length;
      
      const completionPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
      
      return {
        totalMatches,
        completedMatches,
        inProgressMatches,
        scheduledMatches,
        completionPercentage,
        totalParticipants: participants.length,
        totalRounds: rounds.length,
      };
    });
  }, [tournament, participants, matches, rounds]);

  // Memoized active matches (matches that are currently in progress or scheduled soon)
  const activeMatches = useMemo(() => {
    if (!matches.length) return [];
    
    return performanceMonitor.measure('filter-active-matches', () => {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      return matches.filter(match => 
        match.status === 'in-progress' || 
        (match.status === 'scheduled' && match.scheduledTime <= oneHourFromNow)
      ).sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
    });
  }, [matches]);

  // Memoized participant lookup map for performance
  const participantMap = useMemo(() => {
    return new Map(participants.map(p => [p.id, p]));
  }, [participants]);

  // Memoized match lookup map for performance
  const matchMap = useMemo(() => {
    return new Map(matches.map(m => [m.id, m]));
  }, [matches]);

  // Optimized operations with performance monitoring
  const createTournament = useCallback(async (tournament: Tournament, participantNames: string[]) => {
    return performanceMonitor.measureAsync('create-tournament', async () => {
      return context.createTournament(tournament, participantNames);
    }, { participantCount: participantNames.length });
  }, [context.createTournament]);

  const updateMatchResult = useCallback(async (matchId: string, result: NonNullable<Match['result']>) => {
    return performanceMonitor.measureAsync('update-match-result', async () => {
      return context.updateMatchResult(matchId, result);
    }, { matchId });
  }, [context.updateMatchResult]);

  const rescheduleMatch = useCallback(async (matchId: string, newTime: Date, newCourt: number) => {
    return performanceMonitor.measureAsync('reschedule-match', async () => {
      return context.rescheduleMatch(matchId, newTime, newCourt);
    }, { matchId });
  }, [context.rescheduleMatch]);

  const refreshStandings = useCallback(async () => {
    return performanceMonitor.measureAsync('refresh-standings', async () => {
      return context.refreshStandings();
    });
  }, [context.refreshStandings]);

  // Utility functions with memoization
  const getParticipantById = useCallback((id: string): Participant | undefined => {
    return participantMap.get(id);
  }, [participantMap]);

  const getMatchById = useCallback((id: string): Match | undefined => {
    return matchMap.get(id);
  }, [matchMap]);

  const getMatchesForParticipant = useCallback((participantId: string): Match[] => {
    return performanceMonitor.measure('get-participant-matches', () => {
      return matches.filter(match => {
        // This would need to be implemented based on your team structure
        // For now, returning empty array as placeholder
        return false;
      });
    }, { participantId });
  }, [matches]);

  const getUpcomingMatches = useCallback((limit: number = 5): Match[] => {
    return performanceMonitor.measure('get-upcoming-matches', () => {
      const now = new Date();
      return matches
        .filter(match => match.status === 'scheduled' && match.scheduledTime > now)
        .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
        .slice(0, limit);
    }, { limit });
  }, [matches]);

  return {
    // State
    tournament,
    participants,
    matches,
    rounds,
    standings,
    loading,
    error,
    
    // Derived data
    tournamentStats,
    activeMatches,
    
    // Lookup maps
    participantMap,
    matchMap,
    
    // Operations
    createTournament,
    updateMatchResult,
    rescheduleMatch,
    refreshStandings,
    clearError: context.clearError,
    resetTournament: context.resetTournament,
    
    // Utility functions
    getParticipantById,
    getMatchById,
    getMatchesForParticipant,
    getUpcomingMatches,
  };
}

// Hook for optimized standings with caching
export function useOptimizedStandings() {
  const { standings, tournament, loading } = useOptimizedTournament();
  
  // Memoized standings with additional calculations
  const enhancedStandings = useMemo(() => {
    if (!standings.length) return [];
    
    return performanceMonitor.measure('enhance-standings', () => {
      return standings.map((participant, index) => {
        const gamesPlayed = participant.statistics.gamesWon + participant.statistics.gamesLost;
        const winPercentage = gamesPlayed > 0 ? (participant.statistics.gamesWon / gamesPlayed) * 100 : 0;
        const averagePointsScored = gamesPlayed > 0 ? participant.statistics.totalPointsScored / gamesPlayed : 0;
        const averagePointsAllowed = gamesPlayed > 0 ? participant.statistics.totalPointsAllowed / gamesPlayed : 0;
        
        return {
          ...participant,
          rank: index + 1,
          gamesPlayed,
          winPercentage,
          averagePointsScored,
          averagePointsAllowed,
          isWinner: index === 0 && gamesPlayed > 0,
        };
      });
    });
  }, [standings]);

  // Memoized top performers
  const topPerformers = useMemo(() => {
    return enhancedStandings.slice(0, 3);
  }, [enhancedStandings]);

  // Memoized statistics summary
  const statisticsSummary = useMemo(() => {
    if (!enhancedStandings.length) return null;
    
    return performanceMonitor.measure('calculate-stats-summary', () => {
      const totalGames = enhancedStandings.reduce((sum, p) => sum + p.gamesPlayed, 0);
      const totalPoints = enhancedStandings.reduce((sum, p) => sum + p.statistics.totalPointsScored, 0);
      const averageGamesPerPlayer = totalGames / enhancedStandings.length;
      const averagePointsPerGame = totalGames > 0 ? totalPoints / totalGames : 0;
      
      return {
        totalGames,
        totalPoints,
        averageGamesPerPlayer,
        averagePointsPerGame,
        participantCount: enhancedStandings.length,
      };
    });
  }, [enhancedStandings]);

  return {
    standings: enhancedStandings,
    topPerformers,
    statisticsSummary,
    loading,
    tournament,
  };
}

// Hook for optimized match operations
export function useOptimizedMatches() {
  const { matches, tournament, updateMatchResult, rescheduleMatch } = useOptimizedTournament();
  
  // Memoized matches by status
  const matchesByStatus = useMemo(() => {
    return performanceMonitor.measure('group-matches-by-status', () => {
      return {
        scheduled: matches.filter(m => m.status === 'scheduled'),
        inProgress: matches.filter(m => m.status === 'in-progress'),
        completed: matches.filter(m => m.status === 'completed'),
      };
    });
  }, [matches]);

  // Memoized matches by round
  const matchesByRound = useMemo(() => {
    return performanceMonitor.measure('group-matches-by-round', () => {
      const grouped = new Map<number, Match[]>();
      matches.forEach(match => {
        if (!grouped.has(match.roundNumber)) {
          grouped.set(match.roundNumber, []);
        }
        grouped.get(match.roundNumber)!.push(match);
      });
      return grouped;
    });
  }, [matches]);

  // Memoized matches by court
  const matchesByCourt = useMemo(() => {
    return performanceMonitor.measure('group-matches-by-court', () => {
      const grouped = new Map<number, Match[]>();
      matches.forEach(match => {
        if (!grouped.has(match.courtNumber)) {
          grouped.set(match.courtNumber, []);
        }
        grouped.get(match.courtNumber)!.push(match);
      });
      return grouped;
    });
  }, [matches]);

  return {
    matches,
    matchesByStatus,
    matchesByRound,
    matchesByCourt,
    updateMatchResult,
    rescheduleMatch,
    tournament,
  };
}