import React, { useState } from 'react';
import ScheduleManagement from './ScheduleManagement';
import { Match, Round, ScheduleConflict } from '../types/tournament';

const ScheduleManagementDemo: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([
    {
      id: 'match-1',
      tournamentId: 'tournament-1',
      roundNumber: 1,
      matchNumber: 1,
      team1Id: 'team1',
      team2Id: 'team2',
      courtNumber: 1,
      scheduledTime: new Date('2024-01-01T10:00:00'),
      status: 'scheduled'
    },
    {
      id: 'match-2',
      tournamentId: 'tournament-1',
      roundNumber: 1,
      matchNumber: 2,
      team1Id: 'team3',
      team2Id: 'team4',
      courtNumber: 2,
      scheduledTime: new Date('2024-01-01T10:00:00'),
      status: 'scheduled'
    },
    {
      id: 'match-3',
      tournamentId: 'tournament-1',
      roundNumber: 2,
      matchNumber: 3,
      team1Id: 'team1',
      team2Id: 'team3',
      courtNumber: 1,
      scheduledTime: new Date('2024-01-01T10:30:00'),
      status: 'scheduled'
    }
  ]);

  const [rounds, setRounds] = useState<Round[]>([
    {
      id: 'round-1',
      tournamentId: 'tournament-1',
      roundNumber: 1,
      status: 'pending',
      matches: []
    },
    {
      id: 'round-2',
      tournamentId: 'tournament-1',
      roundNumber: 2,
      status: 'pending',
      matches: []
    }
  ]);

  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);

  const handleMatchesUpdate = (updatedMatches: Match[]) => {
    setMatches(updatedMatches);
    console.log('Matches updated:', updatedMatches);
  };

  const handleRoundsUpdate = (updatedRounds: Round[]) => {
    setRounds(updatedRounds);
    console.log('Rounds updated:', updatedRounds);
  };

  const handleConflictsDetected = (detectedConflicts: ScheduleConflict[]) => {
    setConflicts(detectedConflicts);
    console.log('Conflicts detected:', detectedConflicts);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Schedule Management Demo</h1>
      <p>This demo shows the real-time schedule management functionality:</p>
      <ul>
        <li>Drag and drop matches between courts</li>
        <li>Select multiple matches for bulk operations</li>
        <li>View conflict detection and resolution suggestions</li>
        <li>Undo changes with change history</li>
        <li>Swap round orders for incomplete rounds</li>
      </ul>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>Current Status:</h3>
        <p>Matches: {matches.length}</p>
        <p>Rounds: {rounds.length}</p>
        <p>Conflicts: {conflicts.length}</p>
      </div>

      <ScheduleManagement
        matches={matches}
        rounds={rounds}
        courtCount={3}
        matchDuration={30}
        onMatchesUpdate={handleMatchesUpdate}
        onRoundsUpdate={handleRoundsUpdate}
        onConflictsDetected={handleConflictsDetected}
      />
    </div>
  );
};

export default ScheduleManagementDemo;