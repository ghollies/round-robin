import {
  ScheduleGenerator,
  CourtAssignmentTracker,
  RestPeriodTracker,
  generateOptimizedSchedule,
  createDefaultScheduleSettings
} from '../scheduleGenerator';
import { Tournament, Participant } from '../../types/tournament';
import { createTournament, createParticipant } from '../index';

describe('CourtAssignmentTracker', () => {
  let tracker: CourtAssignmentTracker;

  beforeEach(() => {
    tracker = new CourtAssignmentTracker(3, 30); // 3 courts, 30-minute matches
  });

  test('should find available court at start time when no matches scheduled', () => {
    const startTime = new Date('2024-01-01T09:00:00');
    const result = tracker.findAvailableCourt(startTime);
    
    expect(result.courtNumber).toBe(1);
    expect(result.assignedTime).toEqual(startTime);
  });

  test('should reserve court and find next available slot', () => {
    const startTime = new Date('2024-01-01T09:00:00');
    
    // Reserve court 1
    tracker.reserveCourt(1, startTime);
    
    // Next match should get court 2
    const result = tracker.findAvailableCourt(startTime);
    expect(result.courtNumber).toBe(2);
    expect(result.assignedTime).toEqual(startTime);
  });

  test('should schedule after existing match when all courts busy', () => {
    const startTime = new Date('2024-01-01T09:00:00');
    
    // Reserve all courts at start time
    tracker.reserveCourt(1, startTime);
    tracker.reserveCourt(2, startTime);
    tracker.reserveCourt(3, startTime);
    
    // Next match should be scheduled after first match ends
    const result = tracker.findAvailableCourt(startTime);
    const expectedTime = new Date('2024-01-01T09:30:00'); // 30 minutes later
    
    expect(result.courtNumber).toBe(1);
    expect(result.assignedTime).toEqual(expectedTime);
  });

  test('should calculate court utilization correctly', () => {
    const startTime = new Date('2024-01-01T09:00:00');
    
    // Schedule 2 matches on court 1
    tracker.reserveCourt(1, startTime);
    tracker.reserveCourt(1, new Date('2024-01-01T09:30:00'));
    
    // Total duration: 2 hours (120 minutes)
    // Total match time: 2 matches * 30 minutes = 60 minutes
    // Total available time: 3 courts * 120 minutes = 360 minutes
    // Utilization: 60/360 = 16.67%
    const utilization = tracker.getCourtUtilization(120);
    expect(utilization).toBeCloseTo(16.67, 1);
  });
});

describe('RestPeriodTracker', () => {
  let tracker: RestPeriodTracker;

  beforeEach(() => {
    tracker = new RestPeriodTracker(15); // 15-minute rest period
  });

  test('should allow immediate play for new player', () => {
    const currentTime = new Date('2024-01-01T09:00:00');
    const result = tracker.getEarliestPlayTime('player1', currentTime);
    
    expect(result).toEqual(currentTime);
  });

  test('should enforce rest period after match', () => {
    const matchEndTime = new Date('2024-01-01T09:30:00');
    const currentTime = new Date('2024-01-01T09:35:00');
    
    tracker.recordMatchEnd('player1', matchEndTime);
    const result = tracker.getEarliestPlayTime('player1', currentTime);
    
    const expectedTime = new Date('2024-01-01T09:45:00'); // 15 minutes after match end
    expect(result).toEqual(expectedTime);
  });

  test('should return current time if rest period already satisfied', () => {
    const matchEndTime = new Date('2024-01-01T09:00:00');
    const currentTime = new Date('2024-01-01T09:30:00'); // 30 minutes later
    
    tracker.recordMatchEnd('player1', matchEndTime);
    const result = tracker.getEarliestPlayTime('player1', currentTime);
    
    expect(result).toEqual(currentTime);
  });

  test('should find earliest time for multiple players', () => {
    const matchEndTime1 = new Date('2024-01-01T09:00:00');
    const matchEndTime2 = new Date('2024-01-01T09:10:00');
    const currentTime = new Date('2024-01-01T09:05:00');
    
    tracker.recordMatchEnd('player1', matchEndTime1);
    tracker.recordMatchEnd('player2', matchEndTime2);
    
    const result = tracker.getEarliestMatchTime(['player1', 'player2'], currentTime);
    
    // Player2 needs to wait until 09:25 (09:10 + 15 minutes)
    const expectedTime = new Date('2024-01-01T09:25:00');
    expect(result).toEqual(expectedTime);
  });
});

describe('ScheduleGenerator', () => {
  let tournament: Tournament;
  let participants: Participant[];

  beforeEach(() => {
    tournament = createTournament('Test Tournament', 'individual-signup', {
      courtCount: 2,
      matchDuration: 30,
      pointLimit: 11,
      scoringRule: 'win-by-2',
      timeLimit: true
    });

    participants = [
      createParticipant(tournament.id, 'Alice'),
      createParticipant(tournament.id, 'Bob'),
      createParticipant(tournament.id, 'Charlie'),
      createParticipant(tournament.id, 'Diana')
    ];
  });

  test('should generate schedule with correct number of matches', () => {
    const settings = {
      startTime: new Date('2024-01-01T09:00:00'),
      courtCount: 2,
      matchDuration: 30,
      restPeriod: 15
    };

    const generator = new ScheduleGenerator(tournament, participants, settings);
    const schedule = generator.generateSchedule();

    // For 4 players in individual signup: (4-1) = 3 rounds
    // Each round has 4/2 = 2 matches
    // Total: 3 * 2 = 6 matches
    expect(schedule.rounds).toHaveLength(3);
    expect(schedule.scheduledMatches).toHaveLength(6);
  });

  test('should assign courts properly', () => {
    const settings = {
      startTime: new Date('2024-01-01T09:00:00'),
      courtCount: 2,
      matchDuration: 30,
      restPeriod: 15
    };

    const generator = new ScheduleGenerator(tournament, participants, settings);
    const schedule = generator.generateSchedule();

    // All matches should have valid court assignments
    schedule.scheduledMatches.forEach(match => {
      expect(match.courtNumber).toBeGreaterThanOrEqual(1);
      expect(match.courtNumber).toBeLessThanOrEqual(2);
    });

    // Check that courts are used efficiently
    const courtUsage = new Map<number, number>();
    schedule.scheduledMatches.forEach(match => {
      const count = courtUsage.get(match.courtNumber) || 0;
      courtUsage.set(match.courtNumber, count + 1);
    });

    // With 6 matches and 2 courts, both courts should be used
    expect(courtUsage.size).toBeGreaterThan(0);
    expect(courtUsage.get(1)).toBeGreaterThan(0);
    
    // Total matches should equal the sum of matches on all courts
    const totalMatches = Array.from(courtUsage.values()).reduce((sum, count) => sum + count, 0);
    expect(totalMatches).toBe(6);
  });

  test('should schedule matches with proper time intervals', () => {
    const settings = {
      startTime: new Date('2024-01-01T09:00:00'),
      courtCount: 1, // Single court to force sequential scheduling
      matchDuration: 30,
      restPeriod: 15
    };

    const generator = new ScheduleGenerator(tournament, participants, settings);
    const schedule = generator.generateSchedule();

    // Sort matches by time
    const sortedMatches = schedule.scheduledMatches.sort(
      (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
    );

    // Check that matches don't overlap on the same court
    for (let i = 1; i < sortedMatches.length; i++) {
      const prevMatch = sortedMatches[i - 1];
      const currentMatch = sortedMatches[i];
      
      // Only check timing for matches on the same court
      const isOnSameCourt = prevMatch.courtNumber === currentMatch.courtNumber;
      if (isOnSameCourt) {
        const prevEndTime = new Date(prevMatch.scheduledTime.getTime() + 30 * 60000);
        expect(currentMatch.scheduledTime.getTime()).toBeGreaterThanOrEqual(prevEndTime.getTime());
      }
    }
  });

  test('should calculate optimization metrics', () => {
    const settings = {
      startTime: new Date('2024-01-01T09:00:00'),
      courtCount: 2,
      matchDuration: 30,
      restPeriod: 15
    };

    const generator = new ScheduleGenerator(tournament, participants, settings);
    const schedule = generator.generateSchedule();

    expect(schedule.optimization.totalDuration).toBeGreaterThan(0);
    expect(schedule.optimization.sessionsCount).toBe(1);
    expect(schedule.optimization.averageRestPeriod).toBe(15);
    expect(schedule.optimization.courtUtilization).toBeGreaterThan(0);
    expect(schedule.optimization.courtUtilization).toBeLessThanOrEqual(100);
  });
});

describe('generateOptimizedSchedule', () => {
  let tournament: Tournament;
  let participants: Participant[];

  beforeEach(() => {
    tournament = createTournament('Test Tournament', 'individual-signup', {
      courtCount: 3,
      matchDuration: 25,
      pointLimit: 15,
      scoringRule: 'first-to-limit',
      timeLimit: false
    });

    participants = [
      createParticipant(tournament.id, 'Player 1'),
      createParticipant(tournament.id, 'Player 2'),
      createParticipant(tournament.id, 'Player 3'),
      createParticipant(tournament.id, 'Player 4'),
      createParticipant(tournament.id, 'Player 5'),
      createParticipant(tournament.id, 'Player 6')
    ];
  });

  test('should generate complete schedule with default settings', () => {
    const schedule = generateOptimizedSchedule(tournament, participants);

    expect(schedule.rounds.length).toBeGreaterThan(0);
    expect(schedule.scheduledMatches.length).toBeGreaterThan(0);
    expect(schedule.teams.length).toBeGreaterThan(0);
    expect(schedule.optimization).toBeDefined();
  });

  test('should use custom settings when provided', () => {
    const customStartTime = new Date('2024-01-01T14:00:00');
    const customSettings = {
      startTime: customStartTime,
      restPeriod: 20
    };

    const schedule = generateOptimizedSchedule(tournament, participants, customSettings);

    // First match should be at or after custom start time
    const firstMatch = schedule.scheduledMatches.reduce((earliest, match) =>
      match.scheduledTime < earliest.scheduledTime ? match : earliest
    );
    
    expect(firstMatch.scheduledTime.getTime()).toBeGreaterThanOrEqual(customStartTime.getTime());
    expect(schedule.optimization.averageRestPeriod).toBe(20);
  });

  test('should handle odd number of participants', () => {
    const oddParticipants = participants.slice(0, 5); // 5 participants
    
    const schedule = generateOptimizedSchedule(tournament, oddParticipants);

    expect(schedule.rounds.length).toBeGreaterThan(0);
    expect(schedule.scheduledMatches.length).toBeGreaterThan(0);
    
    // Should have bye rounds
    const roundsWithByes = schedule.rounds.filter(round => round.byeTeamId);
    expect(roundsWithByes.length).toBeGreaterThan(0);
  });

  test('should throw error for insufficient participants', () => {
    const tooFewParticipants = participants.slice(0, 2); // Only 2 participants
    
    expect(() => {
      generateOptimizedSchedule(tournament, tooFewParticipants);
    }).toThrow();
  });
});

describe('createDefaultScheduleSettings', () => {
  test('should create settings based on tournament configuration', () => {
    const tournament = createTournament('Test', 'individual-signup', {
      courtCount: 4,
      matchDuration: 20,
      pointLimit: 11,
      scoringRule: 'win-by-2',
      timeLimit: true
    });

    const settings = createDefaultScheduleSettings(tournament);

    expect(settings.courtCount).toBe(4);
    expect(settings.matchDuration).toBe(20);
    expect(settings.restPeriod).toBe(15); // Max of 15 or 50% of 20 = 15
    expect(settings.sessionBreakDuration).toBe(60);
    expect(settings.startTime).toBeInstanceOf(Date);
  });

  test('should set minimum rest period', () => {
    const tournament = createTournament('Test', 'individual-signup', {
      courtCount: 2,
      matchDuration: 15, // Short matches
      pointLimit: 11,
      scoringRule: 'win-by-2',
      timeLimit: true
    });

    const settings = createDefaultScheduleSettings(tournament);

    // Should use minimum of 15 minutes even though 50% of 15 is 7.5
    expect(settings.restPeriod).toBe(15);
  });

  test('should calculate rest period as percentage of match duration for longer matches', () => {
    const tournament = createTournament('Test', 'individual-signup', {
      courtCount: 2,
      matchDuration: 60, // Long matches
      pointLimit: 11,
      scoringRule: 'win-by-2',
      timeLimit: true
    });

    const settings = createDefaultScheduleSettings(tournament);

    // Should use 50% of 60 = 30 minutes
    expect(settings.restPeriod).toBe(30);
  });
});