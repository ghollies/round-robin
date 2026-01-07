import { Participant, Match, Team } from '../types/tournament';
import { loadParticipantsByTournament, loadMatchesByTournament, loadTeamsByTournament, saveParticipant } from './storage';
import { performanceMonitor } from './performance';

// Cache for expensive calculations
const calculationCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash: string;
}

// Generate hash for cache key
function generateHash(data: any): string {
  return JSON.stringify(data);
}

// Get from cache with TTL check
function getFromCache<T>(key: string, dataHash: string): T | null {
  const entry = calculationCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL || entry.hash !== dataHash) {
    calculationCache.delete(key);
    return null;
  }
  
  return entry.data;
}

// Set cache entry
function setCache<T>(key: string, data: T, dataHash: string): void {
  calculationCache.set(key, {
    data,
    timestamp: Date.now(),
    hash: dataHash,
  });
}

// Clear cache for tournament
function clearTournamentCache(tournamentId: string): void {
  const keysToDelete = Array.from(calculationCache.keys()).filter(key => 
    key.includes(tournamentId)
  );
  keysToDelete.forEach(key => calculationCache.delete(key));
}

// Extended participant interface for standings display
export interface ParticipantStanding extends Participant {
  rank: number;
  gamesPlayed: number;
  winPercentage: number;
  averagePointsScored: number;
  averagePointsAllowed: number;
  isWinner?: boolean;
}

// Statistics calculation for individual participants (with caching)
export function calculateParticipantStatistics(
  participantId: string,
  matches: Match[],
  teams: Team[]
): Participant['statistics'] {
  return performanceMonitor.measure(
    'calculateParticipantStatistics',
    () => {
      // Create cache key
      const cacheKey = `participant-stats-${participantId}`;
      const dataHash = generateHash({ participantId, matches, teams });
      
      // Check cache first
      const cached = getFromCache<Participant['statistics']>(cacheKey, dataHash);
      if (cached) {
        return cached;
      }

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
      
      // Cache the result
      setCache(cacheKey, stats, dataHash);
      
      return stats;
    },
    { participantId, matchCount: matches.length, teamCount: teams.length }
  );
}

// Recalculate all participant statistics from match results
export function recalculateAllStatistics(tournamentId: string): void {
  // Clear cache for this tournament since all statistics will change
  clearTournamentCache(tournamentId);
  
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

// Get current standings with enhanced information (with caching)
export function getEnhancedStandings(tournamentId: string): ParticipantStanding[] {
  return performanceMonitor.measure(
    'getEnhancedStandings',
    () => {
      // Create cache key
      const cacheKey = `enhanced-standings-${tournamentId}`;
      const participants = loadParticipantsByTournament(tournamentId);
      const dataHash = generateHash({ tournamentId, participants });
      
      // Check cache first
      const cached = getFromCache<ParticipantStanding[]>(cacheKey, dataHash);
      if (cached) {
        return cached;
      }

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

      // Cache the result
      setCache(cacheKey, standings, dataHash);

      return standings;
    },
    { tournamentId, participantCount: loadParticipantsByTournament(tournamentId).length }
  );
}

// Update participant statistics after a match result
export function updateParticipantStatisticsFromMatch(
  match: Match,
  teams: Team[]
): void {
  if (match.status !== 'completed' || !match.result) return;

  // Clear cache for this tournament since statistics will change
  clearTournamentCache(match.tournamentId);

  // Instead of trying to track incremental changes, recalculate all statistics
  // This ensures accuracy when match results are edited/updated
  recalculateAllStatistics(match.tournamentId);
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

// Cache management functions
export function clearStandingsCache(tournamentId?: string): void {
  if (tournamentId) {
    clearTournamentCache(tournamentId);
  } else {
    calculationCache.clear();
  }
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: calculationCache.size,
    keys: Array.from(calculationCache.keys())
  };
}