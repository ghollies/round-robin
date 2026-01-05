import React, { useState } from 'react';
import { TournamentSetup } from './components';
import { DemoNavigation } from './components/DemoNavigation';
import { Tournament } from './types/tournament';
import './App.css';

function App() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [showDemo, setShowDemo] = useState(false);

  const handleTournamentCreate = (newTournament: Tournament, participantNames: string[]) => {
    setTournament(newTournament);
    setParticipants(participantNames);
  };

  if (showDemo) {
    return <DemoNavigation />;
  }

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
          <div style={{ marginTop: '30px' }}>
            <button
              onClick={() => setShowDemo(true)}
              style={{
                background: '#3498db',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                marginRight: '15px'
              }}
            >
              View Feature Demos
            </button>
            <button
              onClick={() => {
                setTournament(null);
                setParticipants([]);
              }}
              style={{
                background: '#95a5a6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              Create New Tournament
            </button>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Pickleball Tournament Scheduler</h1>
        <p style={{ fontSize: '1.1rem', color: '#7f8c8d', marginBottom: '30px' }}>
          Create and manage round-robin doubles tournaments with individual player signup
        </p>
      </header>
      <main>
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={() => setShowDemo(true)}
            style={{
              background: '#f39c12',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(243, 156, 18, 0.3)'
            }}
          >
            🎯 View Interactive Demos
          </button>
        </div>
        <TournamentSetup onTournamentCreate={handleTournamentCreate} />
      </main>
    </div>
  );
}

export default App;
