import { useCallback, useMemo } from 'react';
import { useTournamentContext } from '../contexts/TournamentContext';
import { Match } from '../types/tournament';

/**
 * Simplified hook for match operations
 */
export function useMatches() {
  const { state, updateMatchResult, rescheduleMatch } = useTournamentContext();
  const { matches, teams, participants, currentTournament, loading, error } = state;

  // Get match by ID
  const getMatch = useCallback(
    (id: string) => matches.find(m => m.id === id) || null,
    [matches]
  );

  // Get match details with team information
  const getMatchDetails = useCallback(
    (matchId: string) => {
      const match = getMatch(matchId);
      if (!match) return null;

      const team1 = teams.find(t => t.id === match.team1Id);
      const team2 = teams.find(t => t.id === match.team2Id);
      if (!team1 || !team2) return null;

      const getPlayerName = (playerId: string) => 
        participants.find(p => p.id === playerId)?.name || 'Unknown';

      return {
        match,
        team1: {
          ...team1,
          name: `${getPlayerName(team1.player1Id)}/${getPlayerName(team1.player2Id)}`,
        },
        team2: {
          ...team2,
          name: `${getPlayerName(team2.player1Id)}/${getPlayerName(team2.player2Id)}`,
        },
      };
    },
    [getMatch, teams, participants]
  );

  // Update match result with validation
  const updateResult = useCallback(
    async (matchId: string, team1Score: number, team2Score: number, endReason: 'points' | 'time') => {
      const match = getMatch(matchId);
      if (!match || !currentTournament) {
        throw new Error('Match or tournament not found');
      }

      // Basic validation
      if (team1Score < 0 || team2Score < 0) {
        throw new Error('Scores cannot be negative');
      }
      if (team1Score === team2Score) {
        throw new Error('Match cannot end in a tie');
      }

      // Tournament rules validation
      const { pointLimit, scoringRule } = currentTournament.settings;
      if (endReason === 'points') {
        const winningScore = Math.max(team1Score, team2Score);
        const losingScore = Math.min(team1Score, team2Score);
        
        if (winningScore < pointLimit) {
          throw new Error(`Winning score must be at least ${pointLimit} points`);
        }
        if (scoringRule === 'win-by-2' && winningScore - losingScore < 2) {
          throw new Error('Must win by at least 2 points');
        }
      }

      const result: NonNullable<Match['result']> = {
        team1Score,
        team2Score,
        winnerId: team1Score > team2Score ? match.team1Id : match.team2Id,
        completedAt: new Date(),
        endReason,
      };

      await updateMatchResult(matchId, result);
    },
    [getMatch, currentTournament, updateMatchResult]
  );

  // Reschedule match with validation
  const reschedule = useCallback(
    async (matchId: string, newTime: Date, newCourt: number) => {
      if (!currentTournament) {
        throw new Error('No tournament loaded');
      }

      // Validate court number
      if (newCourt < 1 || newCourt > currentTournament.settings.courtCount) {
        throw new Error(`Court number must be between 1 and ${currentTournament.settings.courtCount}`);
      }

      // Check for conflicts
      const conflictingMatch = matches.find(m => 
        m.id !== matchId &&
        m.courtNumber === newCourt &&
        Math.abs(m.scheduledTime.getTime() - newTime.getTime()) < 
        currentTournament.settings.matchDuration * 60 * 1000
      );

      if (conflictingMatch) {
        throw new Error(`Court ${newCourt} is already booked at that time`);
      }

      await rescheduleMatch(matchId, newTime, newCourt);
    },
    [currentTournament, matches, rescheduleMatch]
  );

  // Memoized match statistics
  const matchStats = useMemo(() => {
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const inProgressMatches = matches.filter(m => m.status === 'in-progress').length;

    return {
      totalMatches,
      completedMatches,
      inProgressMatches,
      scheduledMatches: totalMatches - completedMatches - inProgressMatches,
      completionPercentage: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
    };
  }, [matches]);

  // Get matches by status
  const getMatchesByStatus = useCallback(
    (status: Match['status']) => matches.filter(m => m.status === status),
    [matches]
  );

  return {
    // State
    matches,
    loading,
    error,
    matchStats,
    
    // Operations
    getMatch,
    getMatchDetails,
    updateResult,
    reschedule,
    getMatchesByStatus,
  };
}