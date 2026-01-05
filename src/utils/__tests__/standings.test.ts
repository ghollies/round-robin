import {
  calculateParticipantStatistics,
  recalculateAllStatistics,
  getEnhancedStandings,
  updateParticipantStatisticsFromMatch,
  getTournamentWinners,
  isTournamentComplete,
  ParticipantStanding
} from '../standings';
import {
  saveTournament,
  saveParticipant,
  saveTeam,
  saveMatch,
  clearAllData
} from '../storage';
import { createParticipant, generateId } from '../index';
import { Tournament, Team, Match } from '../../types/tournament';

// Test data setup
const createTestTournament = (): Tournament => ({
  id: 'test-tournament',
  name: 'Test Tournament',
  mode: 'individual-signup',
  settings: {
    courtCount: 2,
    matchDuration: 30,
    pointLimit: 11,
    scoringRule: 'win-by-2',
    timeLimit: true
  },
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date()
});

const createTestParticipants = (tournamentId: string) => [
  createParticipant(tournamentId, 'Alice'),
  createParticipant(tournamentId, 'Bob'),
  createParticipant(tournamentId, 'Carol'),
  createParticipant(tournamentId, 'David')
];

const createTestTeams = (tournamentId: string, participants: any[]): Team[] => [
  {
    id: generateId(),
    tournamentId,
    player1Id: participants[0].id,
    player2Id: participants[1].id,
    isPermanent: false
  },
  {
    id: generateId(),
    tournamentId,
    player1Id: participants[2].id,
    player2Id: participants[3].id,
    isPermanent: false
  }
];

describe('Standings Utilities', () => {
  beforeEach(() => {
    clearAllData();
  });

  describe('calculateParticipantStatistics', () => {
    test('should calculate correct statistics for a participant', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);
      const teams = createTestTeams(tournament.id, participants);

      const match: Match = {
        id: generateId(),
        tournamentId: tournament.id,
        roundNumber: 1,
        matchNumber: 1,
        team1Id: teams[0].id,
        team2Id: teams[1].id,
        courtNumber: 1,
        scheduledTime: new Date(),
        status: 'completed',
        result: {
          team1Score: 11,
          team2Score: 8,
          winnerId: teams[0].id,
          completedAt: new Date(),
          endReason: 'points'
        }
      };

      const stats = calculateParticipantStatistics(participants[0].id, [match], teams);

      expect(stats.gamesWon).toBe(1);
      expect(stats.gamesLost).toBe(0);
      expect(stats.totalPointsScored).toBe(11);
      expect(stats.totalPointsAllowed).toBe(8);
      expect(stats.pointDifferential).toBe(3);
    });

    test('should handle multiple matches for a participant', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);
      const teams = createTestTeams(tournament.id, participants);

      const matches: Match[] = [
        {
          id: generateId(),
          tournamentId: tournament.id,
          roundNumber: 1,
          matchNumber: 1,
          team1Id: teams[0].id,
          team2Id: teams[1].id,
          courtNumber: 1,
          scheduledTime: new Date(),
          status: 'completed',
          result: {
            team1Score: 11,
            team2Score: 8,
            winnerId: teams[0].id,
            completedAt: new Date(),
            endReason: 'points'
          }
        },
        {
          id: generateId(),
          tournamentId: tournament.id,
          roundNumber: 2,
          matchNumber: 1,
          team1Id: teams[1].id,
          team2Id: teams[0].id,
          courtNumber: 1,
          scheduledTime: new Date(),
          status: 'completed',
          result: {
            team1Score: 9,
            team2Score: 11,
            winnerId: teams[0].id,
            completedAt: new Date(),
            endReason: 'points'
          }
        }
      ];

      const stats = calculateParticipantStatistics(participants[0].id, matches, teams);

      expect(stats.gamesWon).toBe(2);
      expect(stats.gamesLost).toBe(0);
      expect(stats.totalPointsScored).toBe(22); // 11 + 11
      expect(stats.totalPointsAllowed).toBe(17); // 8 + 9
      expect(stats.pointDifferential).toBe(5);
    });

    test('should ignore incomplete matches', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);
      const teams = createTestTeams(tournament.id, participants);

      const matches: Match[] = [
        {
          id: generateId(),
          tournamentId: tournament.id,
          roundNumber: 1,
          matchNumber: 1,
          team1Id: teams[0].id,
          team2Id: teams[1].id,
          courtNumber: 1,
          scheduledTime: new Date(),
          status: 'scheduled', // Not completed
          result: undefined
        }
      ];

      const stats = calculateParticipantStatistics(participants[0].id, matches, teams);

      expect(stats.gamesWon).toBe(0);
      expect(stats.gamesLost).toBe(0);
      expect(stats.totalPointsScored).toBe(0);
      expect(stats.totalPointsAllowed).toBe(0);
      expect(stats.pointDifferential).toBe(0);
    });
  });

  describe('getEnhancedStandings', () => {
    test('should return enhanced standings with calculated fields', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);

      // Set up some statistics
      participants[0].statistics = { gamesWon: 3, gamesLost: 1, totalPointsScored: 44, totalPointsAllowed: 32, pointDifferential: 12 };
      participants[1].statistics = { gamesWon: 2, gamesLost: 2, totalPointsScored: 40, totalPointsAllowed: 40, pointDifferential: 0 };
      participants[2].statistics = { gamesWon: 2, gamesLost: 2, totalPointsScored: 38, totalPointsAllowed: 42, pointDifferential: -4 };
      participants[3].statistics = { gamesWon: 1, gamesLost: 3, totalPointsScored: 30, totalPointsAllowed: 38, pointDifferential: -8 };

      saveTournament(tournament);
      participants.forEach(p => saveParticipant(p));

      const standings = getEnhancedStandings(tournament.id);

      expect(standings).toHaveLength(4);
      
      // Check sorting (by games won, then by point differential)
      expect(standings[0].name).toBe('Alice'); // 3 wins, +12 differential
      expect(standings[1].name).toBe('Bob');   // 2 wins, 0 differential
      expect(standings[2].name).toBe('Carol'); // 2 wins, -4 differential
      expect(standings[3].name).toBe('David'); // 1 win, -8 differential

      // Check calculated fields
      expect(standings[0].rank).toBe(1);
      expect(standings[0].gamesPlayed).toBe(4);
      expect(standings[0].winPercentage).toBe(75);
      expect(standings[0].averagePointsScored).toBe(11);
      expect(standings[0].averagePointsAllowed).toBe(8);
      expect(standings[0].isWinner).toBe(true);

      expect(standings[1].rank).toBe(2);
      expect(standings[1].winPercentage).toBe(50);
      expect(standings[1].isWinner).toBe(false);
    });

    test('should handle participants with no games played', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);

      saveTournament(tournament);
      participants.forEach(p => saveParticipant(p));

      const standings = getEnhancedStandings(tournament.id);

      expect(standings).toHaveLength(4);
      standings.forEach(standing => {
        expect(standing.gamesPlayed).toBe(0);
        expect(standing.winPercentage).toBe(0);
        expect(standing.averagePointsScored).toBe(0);
        expect(standing.averagePointsAllowed).toBe(0);
        expect(standing.isWinner).toBe(false);
      });
    });
  });

  describe('updateParticipantStatisticsFromMatch', () => {
    test('should update statistics for all participants in a match', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);
      const teams = createTestTeams(tournament.id, participants);

      saveTournament(tournament);
      participants.forEach(p => saveParticipant(p));
      teams.forEach(t => saveTeam(t));

      const match: Match = {
        id: generateId(),
        tournamentId: tournament.id,
        roundNumber: 1,
        matchNumber: 1,
        team1Id: teams[0].id,
        team2Id: teams[1].id,
        courtNumber: 1,
        scheduledTime: new Date(),
        status: 'completed',
        result: {
          team1Score: 11,
          team2Score: 8,
          winnerId: teams[0].id,
          completedAt: new Date(),
          endReason: 'points'
        }
      };

      updateParticipantStatisticsFromMatch(match, teams);

      const standings = getEnhancedStandings(tournament.id);

      // Team 1 players (Alice, Bob) should have wins
      const alice = standings.find(s => s.name === 'Alice')!;
      const bob = standings.find(s => s.name === 'Bob')!;
      expect(alice.statistics.gamesWon).toBe(1);
      expect(alice.statistics.gamesLost).toBe(0);
      expect(alice.statistics.totalPointsScored).toBe(11);
      expect(alice.statistics.totalPointsAllowed).toBe(8);
      expect(bob.statistics.gamesWon).toBe(1);
      expect(bob.statistics.gamesLost).toBe(0);

      // Team 2 players (Carol, David) should have losses
      const carol = standings.find(s => s.name === 'Carol')!;
      const david = standings.find(s => s.name === 'David')!;
      expect(carol.statistics.gamesWon).toBe(0);
      expect(carol.statistics.gamesLost).toBe(1);
      expect(carol.statistics.totalPointsScored).toBe(8);
      expect(carol.statistics.totalPointsAllowed).toBe(11);
      expect(david.statistics.gamesWon).toBe(0);
      expect(david.statistics.gamesLost).toBe(1);
    });

    test('should not update statistics for incomplete matches', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);
      const teams = createTestTeams(tournament.id, participants);

      saveTournament(tournament);
      participants.forEach(p => saveParticipant(p));
      teams.forEach(t => saveTeam(t));

      const match: Match = {
        id: generateId(),
        tournamentId: tournament.id,
        roundNumber: 1,
        matchNumber: 1,
        team1Id: teams[0].id,
        team2Id: teams[1].id,
        courtNumber: 1,
        scheduledTime: new Date(),
        status: 'scheduled',
        result: undefined
      };

      updateParticipantStatisticsFromMatch(match, teams);

      const standings = getEnhancedStandings(tournament.id);
      standings.forEach(standing => {
        expect(standing.statistics.gamesWon).toBe(0);
        expect(standing.statistics.gamesLost).toBe(0);
      });
    });
  });

  describe('getTournamentWinners', () => {
    test('should return single winner', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);

      participants[0].statistics = { gamesWon: 3, gamesLost: 1, totalPointsScored: 44, totalPointsAllowed: 32, pointDifferential: 12 };
      participants[1].statistics = { gamesWon: 2, gamesLost: 2, totalPointsScored: 40, totalPointsAllowed: 40, pointDifferential: 0 };
      participants[2].statistics = { gamesWon: 2, gamesLost: 2, totalPointsScored: 38, totalPointsAllowed: 42, pointDifferential: -4 };
      participants[3].statistics = { gamesWon: 1, gamesLost: 3, totalPointsScored: 30, totalPointsAllowed: 38, pointDifferential: -8 };

      saveTournament(tournament);
      participants.forEach(p => saveParticipant(p));

      const winners = getTournamentWinners(tournament.id);

      expect(winners).toHaveLength(1);
      expect(winners[0].name).toBe('Alice');
      expect(winners[0].isWinner).toBe(true);
    });

    test('should return multiple winners in case of tie', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);

      // Create a tie scenario
      participants[0].statistics = { gamesWon: 3, gamesLost: 1, totalPointsScored: 44, totalPointsAllowed: 32, pointDifferential: 12 };
      participants[1].statistics = { gamesWon: 3, gamesLost: 1, totalPointsScored: 44, totalPointsAllowed: 32, pointDifferential: 12 };
      participants[2].statistics = { gamesWon: 2, gamesLost: 2, totalPointsScored: 38, totalPointsAllowed: 42, pointDifferential: -4 };
      participants[3].statistics = { gamesWon: 1, gamesLost: 3, totalPointsScored: 30, totalPointsAllowed: 38, pointDifferential: -8 };

      saveTournament(tournament);
      participants.forEach(p => saveParticipant(p));

      const winners = getTournamentWinners(tournament.id);

      expect(winners).toHaveLength(2);
      expect(winners.map(w => w.name).sort()).toEqual(['Alice', 'Bob']);
      winners.forEach(winner => {
        expect(winner.isWinner).toBe(true);
      });
    });

    test('should return empty array for tournament with no participants', () => {
      const tournament = createTestTournament();
      saveTournament(tournament);

      const winners = getTournamentWinners(tournament.id);

      expect(winners).toHaveLength(0);
    });
  });

  describe('isTournamentComplete', () => {
    test('should return true when all matches are completed', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);
      const teams = createTestTeams(tournament.id, participants);

      const matches: Match[] = [
        {
          id: generateId(),
          tournamentId: tournament.id,
          roundNumber: 1,
          matchNumber: 1,
          team1Id: teams[0].id,
          team2Id: teams[1].id,
          courtNumber: 1,
          scheduledTime: new Date(),
          status: 'completed',
          result: {
            team1Score: 11,
            team2Score: 8,
            winnerId: teams[0].id,
            completedAt: new Date(),
            endReason: 'points'
          }
        }
      ];

      saveTournament(tournament);
      matches.forEach(m => saveMatch(m));

      const isComplete = isTournamentComplete(tournament.id);

      expect(isComplete).toBe(true);
    });

    test('should return false when some matches are not completed', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);
      const teams = createTestTeams(tournament.id, participants);

      const matches: Match[] = [
        {
          id: generateId(),
          tournamentId: tournament.id,
          roundNumber: 1,
          matchNumber: 1,
          team1Id: teams[0].id,
          team2Id: teams[1].id,
          courtNumber: 1,
          scheduledTime: new Date(),
          status: 'completed',
          result: {
            team1Score: 11,
            team2Score: 8,
            winnerId: teams[0].id,
            completedAt: new Date(),
            endReason: 'points'
          }
        },
        {
          id: generateId(),
          tournamentId: tournament.id,
          roundNumber: 2,
          matchNumber: 1,
          team1Id: teams[0].id,
          team2Id: teams[1].id,
          courtNumber: 1,
          scheduledTime: new Date(),
          status: 'scheduled',
          result: undefined
        }
      ];

      saveTournament(tournament);
      matches.forEach(m => saveMatch(m));

      const isComplete = isTournamentComplete(tournament.id);

      expect(isComplete).toBe(false);
    });

    test('should return false for tournament with no matches', () => {
      const tournament = createTestTournament();
      saveTournament(tournament);

      const isComplete = isTournamentComplete(tournament.id);

      expect(isComplete).toBe(false);
    });
  });

  describe('recalculateAllStatistics', () => {
    test('should recalculate statistics for all participants', () => {
      const tournament = createTestTournament();
      const participants = createTestParticipants(tournament.id);
      const teams = createTestTeams(tournament.id, participants);

      // Set incorrect initial statistics
      participants.forEach(p => {
        p.statistics = { gamesWon: 10, gamesLost: 10, totalPointsScored: 100, totalPointsAllowed: 100, pointDifferential: 0 };
      });

      const match: Match = {
        id: generateId(),
        tournamentId: tournament.id,
        roundNumber: 1,
        matchNumber: 1,
        team1Id: teams[0].id,
        team2Id: teams[1].id,
        courtNumber: 1,
        scheduledTime: new Date(),
        status: 'completed',
        result: {
          team1Score: 11,
          team2Score: 8,
          winnerId: teams[0].id,
          completedAt: new Date(),
          endReason: 'points'
        }
      };

      saveTournament(tournament);
      participants.forEach(p => saveParticipant(p));
      teams.forEach(t => saveTeam(t));
      saveMatch(match);

      // Recalculate statistics
      recalculateAllStatistics(tournament.id);

      const standings = getEnhancedStandings(tournament.id);

      // Check that statistics were recalculated correctly
      const alice = standings.find(s => s.name === 'Alice')!;
      const bob = standings.find(s => s.name === 'Bob')!;
      const carol = standings.find(s => s.name === 'Carol')!;
      const david = standings.find(s => s.name === 'David')!;

      expect(alice.statistics.gamesWon).toBe(1);
      expect(alice.statistics.gamesLost).toBe(0);
      expect(alice.statistics.totalPointsScored).toBe(11);
      expect(alice.statistics.totalPointsAllowed).toBe(8);

      expect(bob.statistics.gamesWon).toBe(1);
      expect(bob.statistics.gamesLost).toBe(0);

      expect(carol.statistics.gamesWon).toBe(0);
      expect(carol.statistics.gamesLost).toBe(1);
      expect(carol.statistics.totalPointsScored).toBe(8);
      expect(carol.statistics.totalPointsAllowed).toBe(11);

      expect(david.statistics.gamesWon).toBe(0);
      expect(david.statistics.gamesLost).toBe(1);
    });
  });
});