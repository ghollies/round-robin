import React, { useState } from 'react';
import ScoreEntry from './ScoreEntry';
import { Match, Tournament, Team, Participant } from '../types/tournament';
import { createTournament, createMatch, createTeam, createParticipant } from '../utils';

const ScoreEntryDemo: React.FC = () => {
  const [showScoreEntry, setShowScoreEntry] = useState(false);

  // Create demo data
  const tournament: Tournament = createTournament('Demo Tournament', 'individual-signup', {
    courtCount: 4,
    matchDuration: 30,
    pointLimit: 11,
    scoringRule: 'win-by-2',
    timeLimit: true
  });

  const participants: Participant[] = [
    createParticipant(tournament.id, 'Alice Smith'),
    createParticipant(tournament.id, 'Bob Johnson'),
    createParticipant(tournament.id, 'Carol Davis'),
    createParticipant(tournament.id, 'David Wilson')
  ];

  const team1: Team = createTeam(tournament.id, participants[0].id, participants[1].id, false);
  const team2: Team = createTeam(tournament.id, participants[2].id, participants[3].id, false);

  const match: Match = createMatch(
    tournament.id,
    1,
    1,
    team1.id,
    team2.id,
    1,
    new Date()
  );

  const handleMatchUpdate = (updatedMatch: Match) => {
    // Handle match update - could save to storage or update state
    setShowScoreEntry(false);
  };

  const handleClose = () => {
    setShowScoreEntry(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Score Entry Demo</h1>
      <p>This demo shows the score entry component for recording match results.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Match Details:</h3>
        <p>Round {match.roundNumber}, Match {match.matchNumber}</p>
        <p>Court {match.courtNumber}</p>
        <p>Teams: {team1.player1Id} & {team1.player2Id} vs {team2.player1Id} & {team2.player2Id}</p>
      </div>

      <button 
        onClick={() => setShowScoreEntry(true)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Enter Score
      </button>

      {showScoreEntry && (
        <ScoreEntry
          match={match}
          tournament={tournament}
          onMatchUpdate={handleMatchUpdate}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default ScoreEntryDemo;