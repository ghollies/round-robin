import { Match, Round } from '../../types/tournament';

import { 
  ScheduleChangeHistory, 
  ConflictDetector, 
  ScheduleManipulator, 
  TimeSlotManager 
} from '../scheduleManagement';

describe('ScheduleChangeHistory', () => {
  let history: ScheduleChangeHistory;

  beforeEach(() => {
    history = new ScheduleChangeHistory();
  });

  test('should add changes to history', () => {
    const change = {
      type: 'match-reschedule' as const,
      description: 'Test change',
      oldValue: { court: 1 },
      newValue: { court: 2 },
      matchId: 'match-1'
    };

    const addedChange = history.addChange(change);

    expect(addedChange.id).toBeDefined();
    expect(typeof addedChange.id).toBe('string');
    expect(addedChange.id.length).toBeGreaterThan(0);
    expect(addedChange.type).toBe('match-reschedule');
    expect(addedChange.description).toBe('Test change');
    expect(addedChange.timestamp).toBeInstanceOf(Date);
  });

  test('should return history in reverse chronological order', () => {
    history.addChange({
      type: 'match-reschedule' as const,
      description: 'First change',
      oldValue: {},
      newValue: {}
    });

    history.addChange({
      type: 'court-reassign' as const,
      description: 'Second change',
      oldValue: {},
      newValue: {}
    });

    const historyList = history.getHistory();
    expect(historyList).toHaveLength(2);
    expect(historyList[0].description).toBe('Second change');
    expect(historyList[1].description).toBe('First change');
  });

  test('should limit history size', () => {
    // Add more than max history size (50)
    for (let i = 0; i < 60; i++) {
      history.addChange({
        type: 'match-reschedule' as const,
        description: `Change ${i}`,
        oldValue: {},
        newValue: {}
      });
    }

    const historyList = history.getHistory();
    expect(historyList).toHaveLength(50);
  });

  test('should identify undoable changes', () => {
    expect(history.canUndo()).toBe(false);

    history.addChange({
      type: 'match-reschedule' as const,
      description: 'Test change',
      oldValue: {},
      newValue: {}
    });

    expect(history.canUndo()).toBe(true);
    expect(history.getUndoableChange()).toBeTruthy();
  });

  test('should clear history', () => {
    history.addChange({
      type: 'match-reschedule' as const,
      description: 'Test change',
      oldValue: {},
      newValue: {}
    });

    expect(history.getHistory()).toHaveLength(1);
    
    history.clear();
    
    expect(history.getHistory()).toHaveLength(0);
    expect(history.canUndo()).toBe(false);
  });
});

describe('ConflictDetector', () => {
  const createMatch = (
    id: string,
    courtNumber: number,
    scheduledTime: Date,
    team1Id: string = 'team1',
    team2Id: string = 'team2'
  ): Match => ({
    id,
    tournamentId: 'tournament-1',
    roundNumber: 1,
    matchNumber: 1,
    team1Id,
    team2Id,
    courtNumber,
    scheduledTime,
    status: 'scheduled'
  });

  test('should detect court double-booking conflicts', () => {
    const baseTime = new Date('2024-01-01T10:00:00');
    const matches: Match[] = [
      createMatch('match-1', 1, baseTime, 'team1', 'team2'),
      createMatch('match-2', 1, baseTime, 'team3', 'team4') // Same court, same time, different teams
    ];

    const conflicts = ConflictDetector.detectConflicts(matches, []);

    expect(conflicts.length).toBeGreaterThan(0);
    const courtConflict = conflicts.find(c => c.type === 'court-double-booking');
    expect(courtConflict).toBeTruthy();
    expect(courtConflict?.severity).toBe('error');
    expect(courtConflict?.affectedMatches).toEqual(['match-1', 'match-2']);
  });

  test('should detect player overlap conflicts', () => {
    const baseTime = new Date('2024-01-01T10:00:00');
    const matches: Match[] = [
      createMatch('match-1', 1, baseTime, 'team1', 'team2'),
      createMatch('match-2', 2, baseTime, 'team1', 'team3') // Same team1, same time
    ];

    const conflicts = ConflictDetector.detectConflicts(matches, []);

    expect(conflicts.length).toBeGreaterThan(0);
    const playerConflict = conflicts.find(c => c.type === 'player-overlap');
    expect(playerConflict).toBeTruthy();
    expect(playerConflict?.severity).toBe('error');
  });

  test('should not detect conflicts for different time slots', () => {
    const baseTime = new Date('2024-01-01T10:00:00');
    const laterTime = new Date('2024-01-01T11:00:00');
    const matches: Match[] = [
      createMatch('match-1', 1, baseTime),
      createMatch('match-2', 1, laterTime) // Same court, different time
    ];

    const conflicts = ConflictDetector.detectConflicts(matches, []);

    expect(conflicts).toHaveLength(0);
  });

  test('should validate match reschedule', () => {
    const baseTime = new Date('2024-01-01T10:00:00');
    const newTime = new Date('2024-01-01T11:00:00'); // Different time, 1 hour later
    
    const match = createMatch('match-1', 1, baseTime, 'team1', 'team2');
    const existingMatches = [
      createMatch('match-2', 3, newTime, 'team3', 'team4') // Different court (3), different time, different teams
    ];

    const conflicts = ConflictDetector.validateMatchReschedule(
      match,
      newTime,
      2, // Moving to court 2, which is different from existing match on court 3
      existingMatches
    );

    expect(conflicts).toHaveLength(0);
  });

  test('should detect conflicts in match reschedule validation', () => {
    const baseTime = new Date('2024-01-01T10:00:00');
    const conflictTime = new Date('2024-01-01T10:00:00');
    
    const match = createMatch('match-1', 1, baseTime);
    const existingMatches = [
      createMatch('match-2', 2, conflictTime) // Same court and time as target
    ];

    const conflicts = ConflictDetector.validateMatchReschedule(
      match,
      conflictTime,
      2, // Same court as existing match
      existingMatches
    );

    expect(conflicts.length).toBeGreaterThan(0);
    const courtConflict = conflicts.find(c => c.type === 'court-double-booking');
    expect(courtConflict).toBeTruthy();
  });
});

describe('ScheduleManipulator', () => {
  let changeHistory: ScheduleChangeHistory;

  beforeEach(() => {
    changeHistory = new ScheduleChangeHistory();
  });

  const createMatch = (id: string, courtNumber: number, scheduledTime: Date): Match => ({
    id,
    tournamentId: 'tournament-1',
    roundNumber: 1,
    matchNumber: 1,
    team1Id: 'team1',
    team2Id: 'team2',
    courtNumber,
    scheduledTime,
    status: 'scheduled'
  });

  const createRound = (id: string, roundNumber: number, status: 'pending' | 'active' | 'completed' = 'pending'): Round => ({
    id,
    tournamentId: 'tournament-1',
    roundNumber,
    status,
    matches: []
  });

  test('should reschedule match and record change', () => {
    const originalTime = new Date('2024-01-01T10:00:00');
    const newTime = new Date('2024-01-01T11:00:00');
    const match = createMatch('match-1', 1, originalTime);

    const updatedMatch = ScheduleManipulator.rescheduleMatch(
      match,
      newTime,
      2,
      changeHistory
    );

    expect(updatedMatch.scheduledTime).toEqual(newTime);
    expect(updatedMatch.courtNumber).toBe(2);
    expect(changeHistory.getHistory()).toHaveLength(1);
    
    const change = changeHistory.getHistory()[0];
    expect(change.type).toBe('match-reschedule');
    expect(change.matchId).toBe('match-1');
  });

  test('should reassign court and record change', () => {
    const match = createMatch('match-1', 1, new Date());

    const updatedMatch = ScheduleManipulator.reassignCourt(
      match,
      3,
      changeHistory
    );

    expect(updatedMatch.courtNumber).toBe(3);
    expect(changeHistory.getHistory()).toHaveLength(1);
    
    const change = changeHistory.getHistory()[0];
    expect(change.type).toBe('court-reassign');
    expect(change.matchId).toBe('match-1');
  });

  test('should swap rounds and update matches', () => {
    const round1 = createRound('round-1', 1);
    const round2 = createRound('round-2', 2);
    const matches = [
      { ...createMatch('match-1', 1, new Date()), roundNumber: 1 },
      { ...createMatch('match-2', 2, new Date()), roundNumber: 2 }
    ];

    const result = ScheduleManipulator.swapRounds(
      round1,
      round2,
      matches,
      changeHistory
    );

    expect(result.updatedRounds).toHaveLength(2);
    expect(result.updatedRounds[0].roundNumber).toBe(2); // round1 now has round2's number
    expect(result.updatedRounds[1].roundNumber).toBe(1); // round2 now has round1's number

    expect(result.updatedMatches[0].roundNumber).toBe(2); // match from round 1 now in round 2
    expect(result.updatedMatches[1].roundNumber).toBe(1); // match from round 2 now in round 1

    expect(changeHistory.getHistory()).toHaveLength(1);
    const change = changeHistory.getHistory()[0];
    expect(change.type).toBe('round-swap');
  });

  test('should not allow swapping completed rounds', () => {
    const round1 = createRound('round-1', 1, 'completed');
    const round2 = createRound('round-2', 2);

    expect(() => {
      ScheduleManipulator.swapRounds(round1, round2, [], changeHistory);
    }).toThrow('Cannot swap completed rounds');
  });

  test('should undo match reschedule', () => {
    const originalTime = new Date('2024-01-01T10:00:00');
    const newTime = new Date('2024-01-01T11:00:00');
    const match = createMatch('match-1', 1, originalTime);

    // Make a change
    ScheduleManipulator.rescheduleMatch(match, newTime, 2, changeHistory);
    const change = changeHistory.getHistory()[0];

    // Create updated match list
    const updatedMatch = { ...match, scheduledTime: newTime, courtNumber: 2 };
    const matches = [updatedMatch];

    // Undo the change
    const result = ScheduleManipulator.undoLastChange(change, matches, []);

    expect(result.updatedMatches[0].scheduledTime).toEqual(originalTime);
    expect(result.updatedMatches[0].courtNumber).toBe(1);
  });

  test('should undo round swap', () => {
    const round1 = createRound('round-1', 1);
    const round2 = createRound('round-2', 2);
    const matches = [
      { ...createMatch('match-1', 1, new Date()), roundNumber: 1 },
      { ...createMatch('match-2', 2, new Date()), roundNumber: 2 }
    ];

    // Make the swap
    const swapResult = ScheduleManipulator.swapRounds(round1, round2, matches, changeHistory);
    const change = changeHistory.getHistory()[0];

    // Undo the swap
    const undoResult = ScheduleManipulator.undoLastChange(
      change,
      swapResult.updatedMatches,
      swapResult.updatedRounds
    );

    // Should be back to original state
    expect(undoResult.updatedMatches[0].roundNumber).toBe(1);
    expect(undoResult.updatedMatches[1].roundNumber).toBe(2);
  });
});

describe('TimeSlotManager', () => {
  test('should generate time slots', () => {
    const startTime = new Date('2024-01-01T09:00:00');
    const matchDuration = 30; // minutes
    const courtCount = 2;
    const totalMatches = 6;

    const slots = TimeSlotManager.generateTimeSlots(
      startTime,
      matchDuration,
      courtCount,
      totalMatches
    );

    expect(slots).toHaveLength(3); // 6 matches / 2 courts = 3 slots per court
    expect(slots[0]).toEqual(startTime);
    expect(slots[1]).toEqual(new Date('2024-01-01T09:30:00'));
    expect(slots[2]).toEqual(new Date('2024-01-01T10:00:00'));
  });

  test('should find available time slot', () => {
    const baseTime = new Date('2024-01-01T10:00:00');
    const existingMatches: Match[] = [
      {
        id: 'match-1',
        tournamentId: 'tournament-1',
        roundNumber: 1,
        matchNumber: 1,
        team1Id: 'team1',
        team2Id: 'team2',
        courtNumber: 1,
        scheduledTime: baseTime,
        status: 'scheduled'
      }
    ];

    // Should find the next available slot (30 minutes later)
    const availableSlot = TimeSlotManager.findAvailableTimeSlot(
      1, // same court
      baseTime, // preferred time (occupied)
      existingMatches,
      30 // match duration
    );

    expect(availableSlot).toEqual(new Date('2024-01-01T09:30:00')); // 30 minutes earlier
  });

  test('should return preferred time if available', () => {
    const preferredTime = new Date('2024-01-01T10:00:00');
    const existingMatches: Match[] = []; // No existing matches

    const availableSlot = TimeSlotManager.findAvailableTimeSlot(
      1,
      preferredTime,
      existingMatches,
      30
    );

    expect(availableSlot).toEqual(preferredTime);
  });

  test('should return null if no slots available', () => {
    const baseTime = new Date('2024-01-01T10:00:00');
    const existingMatches: Match[] = [];

    // Fill up all possible slots around the preferred time
    for (let i = -4; i <= 4; i++) {
      const slotTime = new Date(baseTime.getTime() + i * 30 * 60000);
      existingMatches.push({
        id: `match-${i}`,
        tournamentId: 'tournament-1',
        roundNumber: 1,
        matchNumber: 1,
        team1Id: 'team1',
        team2Id: 'team2',
        courtNumber: 1,
        scheduledTime: slotTime,
        status: 'scheduled'
      });
    }

    const availableSlot = TimeSlotManager.findAvailableTimeSlot(
      1,
      baseTime,
      existingMatches,
      30
    );

    expect(availableSlot).toBeNull();
  });
});