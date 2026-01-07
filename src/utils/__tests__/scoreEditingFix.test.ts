import { 
  updateParticipantStatisticsFromMatch, 
  recalculateAllStatistics,
  getEnhancedStandings 
} from '../standings';
import { 
  saveTournament, 
  saveParticipant, 
  saveTeam, 
  saveMatch, 
  updateMatch,
  loadParticipantsByTournament 
} from '../storage';
import { Tournament, Participant, Team, Match } from '../../types/tournament';

describe('Score Editing Fix', () => {
  const tournamentId = 'test-tournament-score-edit';
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Create test tournament
    const tournament: Tournament = {
      id: tournamentId,
      name: 'Test Tournament',
      settings: {
        courtCount: 2,
        matchDuration: 30,
        pointLimit: 11,
        scoringRule: 'first-to-limit',
        timeLimit: false
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    saveTournament(tournament);
    
    // Create test participants
    const participants: Participant[] = [
      {
        id: 'p1',
        tournamentId,
        name: 'Player 1',
        statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
      },
      {
        id: 'p2',
        tournamentId,
        name: 'Player 2',
        statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
      },
      {
        id: 'p3',
        tournamentId,
        name: 'Player 3',
        statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
      },
      {
        id: 'p4',
        tournamentId,
        name: 'Player 4',
        statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 }
      }
    ];
    participants.forEach(saveParticipant);
    
    // Create test teams
    const teams: Team[] = [
      {
        id: 'team1',
        tournamentId,
        player1Id: 'p1',
        player2Id: 'p2',
        isPermanent: false
      },
      {
        id: 'team2',
        tournamentId,
        player1Id: 'p3',
        player2Id: 'p4',
        isPermanent: false
      }
    ];
    teams.forEach(saveTeam);
    
    // Create test match
    const match: Match = {
      id: 'match1',
      tournamentId,
      roundNumber: 1,
      matchNumber: 1,
      team1Id: 'team1',
      team2Id: 'team2',
      courtNumber: 1,
      scheduledTime: new Date(),
      status: 'scheduled'
    };
    saveMatch(match);
  });

  it('should correctly update statistics when match result is edited', () => {
    // Initial match result
    const initialResult: Match['result'] = {
      team1Score: 11,
      team2Score: 8,
      winnerId: 'team1',
      completedAt: new Date(),
      endReason: 'points'
    };
    
    // Update match with initial result
    updateMatch('match1', initialResult);
    
    // Update statistics for the match
    const teams = [
      { id: 'team1', tournamentId, player1Id: 'p1', player2Id: 'p2', isPermanent: false },
      { id: 'team2', tournamentId, player1Id: 'p3', player2Id: 'p4', isPermanent: false }
    ];
    
    const completedMatch: Match = {
      id: 'match1',
      tournamentId,
      roundNumber: 1,
      matchNumber: 1,
      team1Id: 'team1',
      team2Id: 'team2',
      courtNumber: 1,
      scheduledTime: new Date(),
      status: 'completed',
      result: initialResult
    };
    
    updateParticipantStatisticsFromMatch(completedMatch, teams);
    
    // Check initial statistics
    let participants = loadParticipantsByTournament(tournamentId);
    let p1 = participants.find(p => p.id === 'p1')!;
    let p2 = participants.find(p => p.id === 'p2')!;
    let p3 = participants.find(p => p.id === 'p3')!;
    let p4 = participants.find(p => p.id === 'p4')!;
    
    // Team 1 (p1, p2) won 11-8
    expect(p1.statistics.gamesWon).toBe(1);
    expect(p1.statistics.gamesLost).toBe(0);
    expect(p1.statistics.totalPointsScored).toBe(11);
    expect(p1.statistics.totalPointsAllowed).toBe(8);
    expect(p1.statistics.pointDifferential).toBe(3);
    
    expect(p2.statistics.gamesWon).toBe(1);
    expect(p2.statistics.gamesLost).toBe(0);
    expect(p2.statistics.totalPointsScored).toBe(11);
    expect(p2.statistics.totalPointsAllowed).toBe(8);
    expect(p2.statistics.pointDifferential).toBe(3);
    
    // Team 2 (p3, p4) lost 8-11
    expect(p3.statistics.gamesWon).toBe(0);
    expect(p3.statistics.gamesLost).toBe(1);
    expect(p3.statistics.totalPointsScored).toBe(8);
    expect(p3.statistics.totalPointsAllowed).toBe(11);
    expect(p3.statistics.pointDifferential).toBe(-3);
    
    expect(p4.statistics.gamesWon).toBe(0);
    expect(p4.statistics.gamesLost).toBe(1);
    expect(p4.statistics.totalPointsScored).toBe(8);
    expect(p4.statistics.totalPointsAllowed).toBe(11);
    expect(p4.statistics.pointDifferential).toBe(-3);
    
    // Now edit the match result (score correction)
    const editedResult: Match['result'] = {
      team1Score: 9,
      team2Score: 11,
      winnerId: 'team2', // Team 2 actually won
      completedAt: new Date(),
      endReason: 'points'
    };
    
    // Update match with edited result
    updateMatch('match1', editedResult);
    
    // Update statistics for the edited match
    const editedMatch: Match = {
      ...completedMatch,
      result: editedResult
    };
    
    updateParticipantStatisticsFromMatch(editedMatch, teams);
    
    // Check that statistics are correctly updated (not duplicated)
    participants = loadParticipantsByTournament(tournamentId);
    p1 = participants.find(p => p.id === 'p1')!;
    p2 = participants.find(p => p.id === 'p2')!;
    p3 = participants.find(p => p.id === 'p3')!;
    p4 = participants.find(p => p.id === 'p4')!;
    
    // Team 1 (p1, p2) now lost 9-11
    expect(p1.statistics.gamesWon).toBe(0);
    expect(p1.statistics.gamesLost).toBe(1);
    expect(p1.statistics.totalPointsScored).toBe(9);
    expect(p1.statistics.totalPointsAllowed).toBe(11);
    expect(p1.statistics.pointDifferential).toBe(-2);
    
    expect(p2.statistics.gamesWon).toBe(0);
    expect(p2.statistics.gamesLost).toBe(1);
    expect(p2.statistics.totalPointsScored).toBe(9);
    expect(p2.statistics.totalPointsAllowed).toBe(11);
    expect(p2.statistics.pointDifferential).toBe(-2);
    
    // Team 2 (p3, p4) now won 11-9
    expect(p3.statistics.gamesWon).toBe(1);
    expect(p3.statistics.gamesLost).toBe(0);
    expect(p3.statistics.totalPointsScored).toBe(11);
    expect(p3.statistics.totalPointsAllowed).toBe(9);
    expect(p3.statistics.pointDifferential).toBe(2);
    
    expect(p4.statistics.gamesWon).toBe(1);
    expect(p4.statistics.gamesLost).toBe(0);
    expect(p4.statistics.totalPointsScored).toBe(11);
    expect(p4.statistics.totalPointsAllowed).toBe(9);
    expect(p4.statistics.pointDifferential).toBe(2);
  });

  it('should handle multiple match edits correctly', () => {
    // Create multiple matches and edit them multiple times
    const teams = [
      { id: 'team1', tournamentId, player1Id: 'p1', player2Id: 'p2', isPermanent: false },
      { id: 'team2', tournamentId, player1Id: 'p3', player2Id: 'p4', isPermanent: false }
    ];
    
    // First result
    updateMatch('match1', {
      team1Score: 11,
      team2Score: 5,
      winnerId: 'team1',
      completedAt: new Date(),
      endReason: 'points'
    });
    
    updateParticipantStatisticsFromMatch({
      id: 'match1',
      tournamentId,
      roundNumber: 1,
      matchNumber: 1,
      team1Id: 'team1',
      team2Id: 'team2',
      courtNumber: 1,
      scheduledTime: new Date(),
      status: 'completed',
      result: {
        team1Score: 11,
        team2Score: 5,
        winnerId: 'team1',
        completedAt: new Date(),
        endReason: 'points'
      }
    }, teams);
    
    // Edit 1: Change score
    updateMatch('match1', {
      team1Score: 8,
      team2Score: 11,
      winnerId: 'team2',
      completedAt: new Date(),
      endReason: 'points'
    });
    
    updateParticipantStatisticsFromMatch({
      id: 'match1',
      tournamentId,
      roundNumber: 1,
      matchNumber: 1,
      team1Id: 'team1',
      team2Id: 'team2',
      courtNumber: 1,
      scheduledTime: new Date(),
      status: 'completed',
      result: {
        team1Score: 8,
        team2Score: 11,
        winnerId: 'team2',
        completedAt: new Date(),
        endReason: 'points'
      }
    }, teams);
    
    // Edit 2: Change score again
    updateMatch('match1', {
      team1Score: 11,
      team2Score: 9,
      winnerId: 'team1',
      completedAt: new Date(),
      endReason: 'points'
    });
    
    updateParticipantStatisticsFromMatch({
      id: 'match1',
      tournamentId,
      roundNumber: 1,
      matchNumber: 1,
      team1Id: 'team1',
      team2Id: 'team2',
      courtNumber: 1,
      scheduledTime: new Date(),
      status: 'completed',
      result: {
        team1Score: 11,
        team2Score: 9,
        winnerId: 'team1',
        completedAt: new Date(),
        endReason: 'points'
      }
    }, teams);
    
    // Final check - should reflect only the last edit
    const participants = loadParticipantsByTournament(tournamentId);
    const p1 = participants.find(p => p.id === 'p1')!;
    const p3 = participants.find(p => p.id === 'p3')!;
    
    // Each player should have played exactly 1 game
    expect(p1.statistics.gamesWon + p1.statistics.gamesLost).toBe(1);
    expect(p3.statistics.gamesWon + p3.statistics.gamesLost).toBe(1);
    
    // Final result: Team 1 won 11-9
    expect(p1.statistics.gamesWon).toBe(1);
    expect(p1.statistics.totalPointsScored).toBe(11);
    expect(p1.statistics.totalPointsAllowed).toBe(9);
    
    expect(p3.statistics.gamesLost).toBe(1);
    expect(p3.statistics.totalPointsScored).toBe(9);
    expect(p3.statistics.totalPointsAllowed).toBe(11);
  });

  it('should maintain correct standings after score edits', () => {
    const teams = [
      { id: 'team1', tournamentId, player1Id: 'p1', player2Id: 'p2', isPermanent: false },
      { id: 'team2', tournamentId, player1Id: 'p3', player2Id: 'p4', isPermanent: false }
    ];
    
    // Initial result: Team 1 wins
    updateMatch('match1', {
      team1Score: 11,
      team2Score: 8,
      winnerId: 'team1',
      completedAt: new Date(),
      endReason: 'points'
    });
    
    updateParticipantStatisticsFromMatch({
      id: 'match1',
      tournamentId,
      roundNumber: 1,
      matchNumber: 1,
      team1Id: 'team1',
      team2Id: 'team2',
      courtNumber: 1,
      scheduledTime: new Date(),
      status: 'completed',
      result: {
        team1Score: 11,
        team2Score: 8,
        winnerId: 'team1',
        completedAt: new Date(),
        endReason: 'points'
      }
    }, teams);
    
    // Check initial standings
    let standings = getEnhancedStandings(tournamentId);
    expect(standings[0].name).toBe('Player 1'); // p1 should be first (winner)
    expect(standings[0].statistics.gamesWon).toBe(1);
    
    // Edit result: Team 2 wins instead
    updateMatch('match1', {
      team1Score: 8,
      team2Score: 11,
      winnerId: 'team2',
      completedAt: new Date(),
      endReason: 'points'
    });
    
    updateParticipantStatisticsFromMatch({
      id: 'match1',
      tournamentId,
      roundNumber: 1,
      matchNumber: 1,
      team1Id: 'team1',
      team2Id: 'team2',
      courtNumber: 1,
      scheduledTime: new Date(),
      status: 'completed',
      result: {
        team1Score: 8,
        team2Score: 11,
        winnerId: 'team2',
        completedAt: new Date(),
        endReason: 'points'
      }
    }, teams);
    
    // Check updated standings
    standings = getEnhancedStandings(tournamentId);
    expect(standings[0].name).toBe('Player 3'); // p3 should now be first (winner)
    expect(standings[0].statistics.gamesWon).toBe(1);
    expect(standings[0].statistics.gamesLost).toBe(0);
    
    // p1 should now be lower in standings
    const p1Standing = standings.find(s => s.name === 'Player 1')!;
    expect(p1Standing.statistics.gamesWon).toBe(0);
    expect(p1Standing.statistics.gamesLost).toBe(1);
  });
});