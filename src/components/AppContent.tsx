import React, { useState, useEffect } from 'react';
import TournamentSetup from './TournamentSetup';
import DemoNavigation from './DemoNavigation';
import { useTournament, useParticipants } from '../hooks';
import { Tournament } from '../types/tournament';

export function AppContent() {
  const [showDemo, setShowDemo] = useState(false);
  const { tournament, createTournament, loading, error } = useTournament();
  const { participants } = useParticipants();

  const handleTournamentCreate = async (newTournament: Tournament, participantNames: string[]) => {
    try {
      await createTournament(newTournament, participantNames);
    } catch (error) {
      console.error('Failed to create tournament:', error);
    }
  };

  if (showDemo) {
    return <DemoNavigation />;
  }

  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Loading...</h1>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Error</h1>
          <p style={{ color: '#e74c3c', marginBottom: '20px' }}>
            {error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            Reload Page
          </button>
        </header>
      </div>
    );
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
                {participants.map((participant) => (
                  <li key={participant.id}>{participant.name}</li>
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
              onClick={() => window.location.reload()}
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