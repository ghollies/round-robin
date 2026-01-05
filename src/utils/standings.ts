import { Participant, Match, Team } from '../types/tournament';
import { loadParticipantsByTournament, loadMatchesByTournament, loadTeamsByTournament, saveParticipant } from './storage';

// Extended participant interface for standings display
export interface ParticipantStanding extends Participant {
  rank: number;
  gamesPlayed: number;
  winPercentage: number;
  averagePointsScored: number;
  averagePointsAllowed: number;
  isWinner?: boolean;
}

// Statistics calculation for individual participants
export function calculateParticipantStatistics(
  participantId: string,
  matches: Match[],
  teams: Team[]
): Participant['statistics'] {
  const stats = {
    gamesWon: 0,
    gamesLost: 0,
    totalPointsScored: 0,
    totalPointsAllowed: 0,
    pointDifferential: 0
  };

  // Find all matches where this participant played
  const participantMatches = matches.filter(match => {
    if (match.status !== 'completed' || !match.result) return false;
    
    const team1 = teams.find(t => t.id === match.team1Id);
    const team2 = teams.find(t => t.id === match.team2Id);
    
    return (team1 && (team1.player1Id === participantId || team1.player2Id === participantId)) ||
           (team2 && (team2.player1Id === participantId || team2.player2Id === participantId));
  });

  participantMatches.forEach(match => {
    if (!match.result) return;

    const team1 = teams.find(t => t.id === match.team1Id);
    const team2 = teams.find(t => t.id === match.team2Id);
    
    const isOnTeam1 = team1 && (team1.player1Id === participantId || team1.player2Id === participantId);
    const isOnTeam2 = team2 && (team2.player1Id === participantId || team2.player2Id === participantId);
    
    if (isOnTeam1) {
      const isWinner = match.result.winnerId === match.team1Id;
      stats.gamesWon += isWinner ? 1 : 0;
      stats.gamesLost += isWinner ? 0 : 1;
      stats.totalPointsScored += match.result.team1Score;
      stats.totalPointsAllowed += match.result.team2Score;
    } else if (isOnTeam2) {
      const isWinner = match.result.winnerId === match.team2Id;
      stats.gamesWon += isWinner ? 1 : 0;
      stats.gamesLost += isWinner ? 0 : 1;
      stats.totalPointsScored += match.result.team2Score;
      stats.totalPointsAllowed += match.result.team1Score;
    }
  });

  stats.pointDifferential = stats.totalPointsScored - stats.totalPointsAllowed;
  return stats;
}

// Recalculate all participant statistics from match results
export function recalculateAllStatistics(tournamentId: string): void {
  const participants = loadParticipantsByTournament(tournamentId);
  const matches = loadMatchesByTournament(tournamentId);
  const teams = loadTeamsByTournament(tournamentId);

  participants.forEach(participant => {
    const updatedStats = calculateParticipantStatistics(participant.id, matches, teams);
    const updatedParticipant = {
      ...participant,
      statistics: updatedStats
    };
    saveParticipant(updatedParticipant);
  });
}

// Get current standings with enhanced information
export function getEnhancedStandings(tournamentId: string): ParticipantStanding[] {
  const participants = loadParticipantsByTournament(tournamentId);
  
  // Calculate enhanced statistics
  const standings: ParticipantStanding[] = participants.map(participant => {
    const gamesPlayed = participant.statistics.gamesWon + participant.statistics.gamesLost;
    const winPercentage = gamesPlayed > 0 ? (participant.statistics.gamesWon / gamesPlayed) * 100 : 0;
    const averagePointsScored = gamesPlayed > 0 ? participant.statistics.totalPointsScored / gamesPlayed : 0;
    const averagePointsAllowed = gamesPlayed > 0 ? participant.statistics.totalPointsAllowed / gamesPlayed : 0;

    return {
      ...participant,
      rank: 0, // Will be set after sorting
      gamesPlayed,
      winPercentage,
      averagePointsScored,
      averagePointsAllowed
    };
  });

  // Sort by games won (descending), then by point differential (descending)
  standings.sort((a, b) => {
    if (a.statistics.gamesWon !== b.statistics.gamesWon) {
      return b.statistics.gamesWon - a.statistics.gamesWon;
    }
    return b.statistics.pointDifferential - a.statistics.pointDifferential;
  });

  // Assign ranks and identify winners (handle ties)
  standings.forEach((standing, index) => {
    standing.rank = index + 1;
    // A participant is a winner if they're tied for first place and have played games
    standing.isWinner = index === 0 && standing.gamesPlayed > 0;
  });

  // Handle ties for first place - all participants with same stats as first place are winners
  if (standings.length > 1) {
    const firstPlace = standings[0];
    standings.forEach(standing => {
      if (standing.statistics.gamesWon === firstPlace.statistics.gamesWon &&
          standing.statistics.pointDifferential === firstPlace.statistics.pointDifferential &&
          standing.gamesPlayed > 0) {
        standing.isWinner = true;
      }
    });
  }

  return standings;
}

// Update participant statistics after a match result
export function updateParticipantStatisticsFromMatch(
  match: Match,
  teams: Team[]
): void {
  if (match.status !== 'completed' || !match.result) return;

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);

  if (!team1 || !team2) return;

  // Get all participants involved in the match
  const participantIds = [team1.player1Id, team1.player2Id, team2.player1Id, team2.player2Id];
  const participants = loadParticipantsByTournament(match.tournamentId);
  
  participantIds.forEach(participantId => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    const isOnTeam1 = team1.player1Id === participantId || team1.player2Id === participantId;
    const isWinner = match.result!.winnerId === (isOnTeam1 ? match.team1Id : match.team2Id);
    
    const pointsScored = isOnTeam1 ? match.result!.team1Score : match.result!.team2Score;
    const pointsAllowed = isOnTeam1 ? match.result!.team2Score : match.result!.team1Score;

    // Update statistics
    participant.statistics.gamesWon += isWinner ? 1 : 0;
    participant.statistics.gamesLost += isWinner ? 0 : 1;
    participant.statistics.totalPointsScored += pointsScored;
    participant.statistics.totalPointsAllowed += pointsAllowed;
    participant.statistics.pointDifferential = 
      participant.statistics.totalPointsScored - participant.statistics.totalPointsAllowed;

    saveParticipant(participant);
  });
}

// Get tournament winner(s)
export function getTournamentWinners(tournamentId: string): ParticipantStanding[] {
  const standings = getEnhancedStandings(tournamentId);
  
  if (standings.length === 0) return [];
  
  const topStanding = standings[0];
  
  // Find all participants tied for first place
  return standings.filter(standing => 
    standing.statistics.gamesWon === topStanding.statistics.gamesWon &&
    standing.statistics.pointDifferential === topStanding.statistics.pointDifferential
  );
}

// Check if tournament is complete (all matches played)
export function isTournamentComplete(tournamentId: string): boolean {
  const matches = loadMatchesByTournament(tournamentId);
  return matches.length > 0 && matches.every(match => match.status === 'completed');
}

// Get live standings update summary
export interface StandingsUpdate {
  participantId: string;
  participantName: string;
  previousRank: number;
  newRank: number;
  rankChange: number;
  newStats: Participant['statistics'];
}

export function getStandingsUpdatesAfterMatch(
  tournamentId: string,
  matchId: string
): StandingsUpdate[] {
  // Get standings before the match (by temporarily removing the match result)
  const matches = loadMatchesByTournament(tournamentId);
  const targetMatch = matches.find(m => m.id === matchId);
  
  if (!targetMatch || !targetMatch.result) return [];

  // Calculate previous standings (this is a simplified approach)
  const currentStandings = getEnhancedStandings(tournamentId);
  
  // For now, return current standings with rank changes
  // In a full implementation, you'd calculate the previous state
  return currentStandings.map(standing => ({
    participantId: standing.id,
    participantName: standing.name,
    previousRank: standing.rank, // Simplified - would need actual previous rank
    newRank: standing.rank,
    rankChange: 0, // Simplified - would calculate actual change
    newStats: standing.statistics
  }));
}