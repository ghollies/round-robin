import React, { useState } from 'react';
import { TournamentSetup } from './components';
import { Tournament } from './types/tournament';
import './App.css';

function App() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);

  const handleTournamentCreate = (newTournament: Tournament, participantNames: string[]) => {
    setTournament(newTournament);
    setParticipants(participantNames);
  };

  if (tournament) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Tournament Created Successfully!</h1>
          <div className="tournament-summary">
            <h2>{tournament.name}</h2>
            <p>Mode: {tournament.mode}</p>
            <p>Participants: {participants.length}</p>
            <p>Courts: {tournament.settings.courtCount}</p>
            <p>Match Duration: {tournament.settings.matchDuration} minutes</p>
            <div className="participants-list">
              <h3>Participants:</h3>
              <ul>
                {participants.map((name, index) => (
                  <li key={index}>{name}</li>
                ))}
              </ul>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Pickleball Tournament Scheduler</h1>
      </header>
      <main>
        <TournamentSetup onTournamentCreate={handleTournamentCreate} />
      </main>
    </div>
  );
}

export default App;
