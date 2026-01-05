import { useCallback, useMemo } from 'react';
import { useTournamentContext } from '../contexts/TournamentContext';
import { Match, Round } from '../types/tournament';

/**
 * Custom hook for match operations and data access
 */
export function useMatches() {
  const {
    state,
    updateMatchResult,
    rescheduleMatch,
  } = useTournamentContext();

  const { matches, rounds, teams, participants, currentTournament, loading, error } = state;

  // Get match by ID
  const getMatch = useCallback(
    (id: string) => {
      return matches.find(m => m.id === id) || null;
    },
    [matches]
  );

  // Get matches by round
  const getMatchesByRound = useCallback(
    (roundNumber: number) => {
      return matches.filter(m => m.roundNumber === roundNumber);
    },
    [matches]
  );

  // Get matches by court
  const getMatchesByCourt = useCallback(
    (courtNumber: number) => {
      return matches.filter(m => m.courtNumber === courtNumber);
    },
    [matches]
  );

  // Get matches by status
  const getMatchesByStatus = useCallback(
    (status: Match['status']) => {
      return matches.filter(m => m.status === status);
    },
    [matches]
  );

  // Get matches for a specific participant
  const getParticipantMatches = useCallback(
    (participantId: string) => {
      return matches.filter(match => {
        const team1 = teams.find(t => t.id === match.team1Id);
        const team2 = teams.find(t => t.id === match.team2Id);
        
        return (team1 && (team1.player1Id === participantId || team1.player2Id === participantId)) ||
               (team2 && (team2.player1Id === participantId || team2.player2Id === participantId));
      });
    },
    [matches, teams]
  );

  // Get match details with team and participant information
  const getMatchDetails = useCallback(
    (matchId: string) => {
      const match = getMatch(matchId);
      if (!match) {
        return null;
      }

      const team1 = teams.find(t => t.id === match.team1Id);
      const team2 = teams.find(t => t.id === match.team2Id);

      if (!team1 || !team2) {
        return null;
      }

      const team1Player1 = participants.find(p => p.id === team1.player1Id);
      const team1Player2 = participants.find(p => p.id === team1.player2Id);
      const team2Player1 = participants.find(p => p.id === team2.player1Id);
      const team2Player2 = participants.find(p => p.id === team2.player2Id);

      return {
        match,
        team1: {
          ...team1,
          player1: team1Player1,
          player2: team1Player2,
          name: team1Player1 && team1Player2 ? `${team1Player1.name}/${team1Player2.name}` : 'Unknown Team',
        },
        team2: {
          ...team2,
          player1: team2Player1,
          player2: team2Player2,
          name: team2Player1 && team2Player2 ? `${team2Player1.name}/${team2Player2.name}` : 'Unknown Team',
        },
      };
    },
    [getMatch, teams, participants]
  );

  // Update match result with validation
  const handleUpdateMatchResult = useCallback(
    async (matchId: string, team1Score: number, team2Score: number, endReason: 'points' | 'time') => {
      const match = getMatch(matchId);
      if (!match) {
        throw new Error(`Match with id ${matchId} not found`);
      }

      if (!currentTournament) {
        throw new Error('No tournament loaded');
      }

      // Validate scores
      if (team1Score < 0 || team2Score < 0) {
        throw new Error('Scores cannot be negative');
      }

      // Determine winner
      let winnerId: string;
      if (team1Score > team2Score) {
        winnerId = match.team1Id;
      } else if (team2Score > team1Score) {
        winnerId = match.team2Id;
      } else {
        throw new Error('Match cannot end in a tie');
      }

      // Validate against tournament rules
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

      const result: Match['result'] = {
        team1Score,
        team2Score,
        winnerId,
        completedAt: new Date(),
        endReason,
      };

      try {
        await updateMatchResult(matchId, result);
      } catch (error) {
        throw error;
      }
    },
    [getMatch, currentTournament, updateMatchResult]
  );

  // Reschedule a match
  const handleRescheduleMatch = useCallback(
    async (matchId: string, newTime: Date, newCourt: number) => {
      const match = getMatch(matchId);
      if (!match) {
        throw new Error(`Match with id ${matchId} not found`);
      }

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
        Math.abs(m.scheduledTime.getTime() - newTime.getTime()) < currentTournament.settings.matchDuration * 60 * 1000
      );

      if (conflictingMatch) {
        throw new Error(`Court ${newCourt} is already booked at that time`);
      }

      try {
        await rescheduleMatch(matchId, newTime, newCourt);
      } catch (error) {
        throw error;
      }
    },
    [getMatch, currentTournament, matches, rescheduleMatch]
  );

  // Get match statistics
  const getMatchStats = useMemo(() => {
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const inProgressMatches = matches.filter(m => m.status === 'in-progress').length;
    const scheduledMatches = matches.filter(m => m.status === 'scheduled').length;

    const completedMatchesWithResults = matches.filter(m => m.status === 'completed' && m.result);
    const avgPointsPerMatch = completedMatchesWithResults.length > 0 
      ? completedMatchesWithResults.reduce((sum, m) => sum + (m.result!.team1Score + m.result!.team2Score), 0) / completedMatchesWithResults.length
      : 0;

    const pointsEndedMatches = completedMatchesWithResults.filter(m => m.result!.endReason === 'points').length;
    const timeEndedMatches = completedMatchesWithResults.filter(m => m.result!.endReason === 'time').length;

    return {
      totalMatches,
      completedMatches,
      inProgressMatches,
      scheduledMatches,
      completionPercentage: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
      avgPointsPerMatch,
      pointsEndedMatches,
      timeEndedMatches,
    };
  }, [matches]);

  // Get matches by time slot
  const getMatchesByTimeSlot = useCallback(
    (startTime: Date, endTime: Date) => {
      return matches.filter(match => {
        const matchTime = match.scheduledTime.getTime();
        return matchTime >= startTime.getTime() && matchTime <= endTime.getTime();
      });
    },
    [matches]
  );

  // Get next matches for a participant
  const getNextMatches = useCallback(
    (participantId: string, limit: number = 5) => {
      const participantMatches = getParticipantMatches(participantId);
      const upcomingMatches = participantMatches
        .filter(m => m.status === 'scheduled')
        .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
        .slice(0, limit);

      return upcomingMatches.map(match => getMatchDetails(match.id)).filter(Boolean);
    },
    [getParticipantMatches, getMatchDetails]
  );

  // Check for scheduling conflicts
  const checkSchedulingConflicts = useCallback(() => {
    const conflicts: Array<{
      type: 'court-conflict' | 'participant-conflict';
      matches: string[];
      description: string;
    }> = [];

    // Check for court conflicts
    matches.forEach(match1 => {
      matches.forEach(match2 => {
        if (match1.id !== match2.id && 
            match1.courtNumber === match2.courtNumber &&
            Math.abs(match1.scheduledTime.getTime() - match2.scheduledTime.getTime()) < 
            (currentTournament?.settings.matchDuration || 30) * 60 * 1000) {
          
          conflicts.push({
            type: 'court-conflict',
            matches: [match1.id, match2.id],
            description: `Court ${match1.courtNumber} double-booked`,
          });
        }
      });
    });

    // Check for participant conflicts (same participant in overlapping matches)
    matches.forEach(match1 => {
      const match1Teams = [
        teams.find(t => t.id === match1.team1Id),
        teams.find(t => t.id === match1.team2Id)
      ].filter(Boolean);
      
      const match1Participants = match1Teams.flatMap(team => [team!.player1Id, team!.player2Id]);

      matches.forEach(match2 => {
        if (match1.id !== match2.id &&
            Math.abs(match1.scheduledTime.getTime() - match2.scheduledTime.getTime()) < 
            (currentTournament?.settings.matchDuration || 30) * 60 * 1000) {
          
          const match2Teams = [
            teams.find(t => t.id === match2.team1Id),
            teams.find(t => t.id === match2.team2Id)
          ].filter(Boolean);
          
          const match2Participants = match2Teams.flatMap(team => [team!.player1Id, team!.player2Id]);
          
          const commonParticipants = match1Participants.filter(p => match2Participants.includes(p));
          
          if (commonParticipants.length > 0) {
            conflicts.push({
              type: 'participant-conflict',
              matches: [match1.id, match2.id],
              description: `Participant scheduled for overlapping matches`,
            });
          }
        }
      });
    });

    return conflicts;
  }, [matches, teams, currentTournament]);

  return {
    // State
    matches,
    rounds,
    loading,
    error,
    
    // Single match operations
    getMatch,
    getMatchDetails,
    updateMatchResult: handleUpdateMatchResult,
    rescheduleMatch: handleRescheduleMatch,
    
    // Multiple matches operations
    getMatchesByRound,
    getMatchesByCourt,
    getMatchesByStatus,
    getParticipantMatches,
    getMatchesByTimeSlot,
    getNextMatches,
    
    // Validation and conflicts
    checkSchedulingConflicts,
    
    // Statistics
    getMatchStats,
  };
}