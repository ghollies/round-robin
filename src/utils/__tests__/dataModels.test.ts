import {
  generateId,
  generateTournamentId,
  generateParticipantId,
  generateTeamId,
  generateMatchId,
  generateRoundId,
  createTournament,
  createParticipant,
  createTeam,
  createMatch,
  createRound,
  serializeTournament,
  deserializeTournament,
  serializeMatch,
  deserializeMatch,
  validateTournament,
  validateParticipant,
  validateTeam,
  validateMatch,
  validateParticipantCount,
  validateUniqueParticipantNames
} from '../index';

describe('ID Generation', () => {
  test('generateId creates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
  });

  test('generateTournamentId has correct prefix', () => {
    const id = generateTournamentId();
    expect(id).toMatch(/^tournament-/);
  });

  test('generateParticipantId has correct prefix', () => {
    const id = generateParticipantId();
    expect(id).toMatch(/^participant-/);
  });

  test('generateTeamId has correct prefix', () => {
    const id = generateTeamId();
    expect(id).toMatch(/^team-/);
  });

  test('generateMatchId has correct prefix', () => {
    const id = generateMatchId();
    expect(id).toMatch(/^match-/);
  });

  test('generateRoundId has correct prefix', () => {
    const id = generateRoundId();
    expect(id).toMatch(/^round-/);
  });
});

describe('Data Model Creation', () => {
  test('createTournament creates valid tournament', () => {
    const tournament = createTournament('Test Tournament', 'pair-signup');
    
    expect(tournament.name).toBe('Test Tournament');
    expect(tournament.mode).toBe('pair-signup');
    expect(tournament.status).toBe('setup');
    expect(tournament.id).toMatch(/^tournament-/);
    expect(tournament.createdAt).toBeInstanceOf(Date);
    expect(tournament.updatedAt).toBeInstanceOf(Date);
    expect(tournament.settings.courtCount).toBe(4);
    expect(tournament.settings.matchDuration).toBe(30);
    expect(tournament.settings.pointLimit).toBe(11);
    expect(tournament.settings.scoringRule).toBe('win-by-2');
    expect(tournament.settings.timeLimit).toBe(true);
  });

  test('createTournament with custom settings', () => {
    const tournament = createTournament('Test Tournament', 'individual-signup', {
      courtCount: 6,
      pointLimit: 15
    });
    
    expect(tournament.settings.courtCount).toBe(6);
    expect(tournament.settings.pointLimit).toBe(15);
    expect(tournament.settings.matchDuration).toBe(30); // default
  });

  test('createParticipant creates valid participant', () => {
    const participant = createParticipant('tournament-123', 'John Doe');
    
    expect(participant.name).toBe('John Doe');
    expect(participant.tournamentId).toBe('tournament-123');
    expect(participant.id).toMatch(/^participant-/);
    expect(participant.statistics.gamesWon).toBe(0);
    expect(participant.statistics.gamesLost).toBe(0);
    expect(participant.statistics.totalPointsScored).toBe(0);
    expect(participant.statistics.totalPointsAllowed).toBe(0);
    expect(participant.statistics.pointDifferential).toBe(0);
  });

  test('createParticipant trims whitespace', () => {
    const participant = createParticipant('tournament-123', '  John Doe  ');
    expect(participant.name).toBe('John Doe');
  });

  test('createTeam creates valid team', () => {
    const team = createTeam('tournament-123', 'player-1', 'player-2', true);
    
    expect(team.tournamentId).toBe('tournament-123');
    expect(team.player1Id).toBe('player-1');
    expect(team.player2Id).toBe('player-2');
    expect(team.isPermanent).toBe(true);
    expect(team.id).toMatch(/^team-/);
  });

  test('createMatch creates valid match', () => {
    const scheduledTime = new Date();
    const match = createMatch('tournament-123', 1, 1, 'team-1', 'team-2', 1, scheduledTime);
    
    expect(match.tournamentId).toBe('tournament-123');
    expect(match.roundNumber).toBe(1);
    expect(match.matchNumber).toBe(1);
    expect(match.team1Id).toBe('team-1');
    expect(match.team2Id).toBe('team-2');
    expect(match.courtNumber).toBe(1);
    expect(match.scheduledTime).toBe(scheduledTime);
    expect(match.status).toBe('scheduled');
    expect(match.id).toMatch(/^match-/);
  });

  test('createRound creates valid round', () => {
    const round = createRound('tournament-123', 1);
    
    expect(round.tournamentId).toBe('tournament-123');
    expect(round.roundNumber).toBe(1);
    expect(round.status).toBe('pending');
    expect(round.matches).toEqual([]);
    expect(round.id).toMatch(/^round-/);
    expect(round.byeTeamId).toBeUndefined();
  });

  test('createRound with bye team', () => {
    const round = createRound('tournament-123', 1, [], 'team-bye');
    
    expect(round.byeTeamId).toBe('team-bye');
  });
});

describe('Data Serialization', () => {
  test('serializeTournament and deserializeTournament', () => {
    const tournament = createTournament('Test Tournament', 'pair-signup');
    const serialized = serializeTournament(tournament);
    const deserialized = deserializeTournament(serialized);
    
    expect(deserialized.id).toBe(tournament.id);
    expect(deserialized.name).toBe(tournament.name);
    expect(deserialized.mode).toBe(tournament.mode);
    expect(deserialized.createdAt).toEqual(tournament.createdAt);
    expect(deserialized.updatedAt).toEqual(tournament.updatedAt);
  });

  test('serializeMatch and deserializeMatch', () => {
    const scheduledTime = new Date();
    const match = createMatch('tournament-123', 1, 1, 'team-1', 'team-2', 1, scheduledTime);
    match.result = {
      team1Score: 11,
      team2Score: 9,
      winnerId: 'team-1',
      completedAt: new Date(),
      endReason: 'points'
    };
    
    const serialized = serializeMatch(match);
    const deserialized = deserializeMatch(serialized);
    
    expect(deserialized.id).toBe(match.id);
    expect(deserialized.scheduledTime).toEqual(match.scheduledTime);
    expect(deserialized.result?.team1Score).toBe(11);
    expect(deserialized.result?.completedAt).toEqual(match.result.completedAt);
  });
});

describe('Tournament Validation', () => {
  test('validates valid tournament', () => {
    const tournament = createTournament('Test Tournament', 'pair-signup');
    const result = validateTournament(tournament);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rejects tournament without name', () => {
    const tournament = createTournament('', 'pair-signup');
    const result = validateTournament(tournament);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Tournament name is required');
  });

  test('rejects tournament with invalid mode', () => {
    const tournament = { ...createTournament('Test', 'pair-signup'), mode: 'invalid' as any };
    const result = validateTournament(tournament);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Tournament mode must be either "pair-signup" or "individual-signup"');
  });

  test('rejects tournament with invalid court count', () => {
    const tournament = createTournament('Test', 'pair-signup', { courtCount: 0 });
    const result = validateTournament(tournament);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Court count must be between 1 and 16');
  });

  test('rejects tournament with invalid match duration', () => {
    const tournament = createTournament('Test', 'pair-signup', { matchDuration: 10 });
    const result = validateTournament(tournament);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Match duration must be between 15 and 60 minutes');
  });
});

describe('Participant Validation', () => {
  test('validates valid participant', () => {
    const participant = createParticipant('tournament-123', 'John Doe');
    const result = validateParticipant(participant);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rejects participant without name', () => {
    const participant = createParticipant('tournament-123', '');
    const result = validateParticipant(participant);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Participant name is required');
  });

  test('rejects participant without tournament ID', () => {
    const participant = { ...createParticipant('tournament-123', 'John'), tournamentId: '' };
    const result = validateParticipant(participant);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Tournament ID is required');
  });
});

describe('Team Validation', () => {
  test('validates valid team', () => {
    const team = createTeam('tournament-123', 'player-1', 'player-2');
    const result = validateTeam(team);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rejects team with same players', () => {
    const team = createTeam('tournament-123', 'player-1', 'player-1');
    const result = validateTeam(team);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Player 1 and Player 2 must be different');
  });

  test('rejects team without player IDs', () => {
    const team = { ...createTeam('tournament-123', 'player-1', 'player-2'), player1Id: '' };
    const result = validateTeam(team);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Player 1 ID is required');
  });
});

describe('Match Validation', () => {
  test('validates valid match', () => {
    const match = createMatch('tournament-123', 1, 1, 'team-1', 'team-2', 1, new Date());
    const result = validateMatch(match);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rejects match with same teams', () => {
    const match = createMatch('tournament-123', 1, 1, 'team-1', 'team-1', 1, new Date());
    const result = validateMatch(match);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Team 1 and Team 2 must be different');
  });

  test('rejects match with invalid round number', () => {
    const match = { ...createMatch('tournament-123', 1, 1, 'team-1', 'team-2', 1, new Date()), roundNumber: 0 };
    const result = validateMatch(match);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Round number must be a positive number');
  });
});

describe('Participant Count Validation', () => {
  test('validates valid participant count for pair signup', () => {
    const result = validateParticipantCount(8, 'pair-signup');
    expect(result.isValid).toBe(true);
  });

  test('rejects too few participants for pair signup', () => {
    const result = validateParticipantCount(2, 'pair-signup');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Number of teams must be between 4 and 32 for pair signup mode');
  });

  test('rejects too many participants for individual signup', () => {
    const result = validateParticipantCount(40, 'individual-signup');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Number of individual players must be between 4 and 32 for individual signup mode');
  });
});

describe('Unique Participant Names Validation', () => {
  test('validates unique participant names', () => {
    const participants = [
      createParticipant('tournament-123', 'John Doe'),
      createParticipant('tournament-123', 'Jane Smith'),
      createParticipant('tournament-123', 'Bob Johnson')
    ];
    
    const result = validateUniqueParticipantNames(participants);
    expect(result.isValid).toBe(true);
  });

  test('rejects duplicate participant names', () => {
    const participants = [
      createParticipant('tournament-123', 'John Doe'),
      createParticipant('tournament-123', 'Jane Smith'),
      createParticipant('tournament-123', 'john doe') // case insensitive duplicate
    ];
    
    const result = validateUniqueParticipantNames(participants);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Duplicate participant name "john doe" found at positions 1 and 3');
  });
});