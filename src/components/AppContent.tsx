import { useState, lazy, Suspense } from 'react';
import TournamentSetup from './TournamentSetup';
import { PageLoadingState } from './LoadingState';
import { useNotifications } from './NotificationSystem';
import { useTournament, useParticipants } from '../hooks';
import { Tournament } from '../types/tournament';

// Lazy load the demo navigation component
const DemoNavigation = lazy(() => import('./DemoNavigation'));

export function AppContent() {
  const [showDemo, setShowDemo] = useState(false);
  const { tournament, createTournament, loading, error, clearError } = useTournament();
  const { participants } = useParticipants();
  const notifications = useNotifications();

  const handleTournamentCreate = async (newTournament: Tournament, participantNames: string[]) => {
    try {
      await createTournament(newTournament, participantNames);
      // Success notification is handled by the enhanced context
    } catch (error) {
      console.error('Failed to create tournament:', error);
      // Error notification is handled by the enhanced context
    }
  };

  const handleRetryAfterError = () => {
    clearError();
    notifications.showInfo('Retrying', 'Attempting to recover from the error...');
  };

  if (showDemo) {
    return (
      <Suspense fallback={<PageLoadingState message="Loading demo features..." />}>
        <DemoNavigation />
      </Suspense>
    );
  }

  if (loading) {
    return (
      <PageLoadingState message="Loading tournament system..." />
    );
  }

  if (error) {
    return (
      <>
        <header className="App-header">
          <h1>Pickleball Tournament Scheduler</h1>
          <p>Create and manage round-robin doubles tournaments</p>
        </header>
        <main id="main-content" className="container">
          <div className="error-display" role="alert" aria-live="assertive">
            <div className="error-icon" aria-hidden="true">⚠️</div>
            <h2>Something went wrong</h2>
            <p className="error-message">
              {error.message}
            </p>
            <div className="error-actions">
              <button
                onClick={handleRetryAfterError}
                className="btn btn-primary"
                type="button"
                aria-describedby="retry-description"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary"
                type="button"
                aria-describedby="reload-description"
              >
                Reload Page
              </button>
            </div>
            <div className="sr-only">
              <div id="retry-description">Attempt to recover from the current error</div>
              <div id="reload-description">Reload the entire page to start fresh</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (tournament) {
    return (
      <>
        <header className="App-header">
          <h1>Tournament Created Successfully!</h1>
          <p>Your tournament is ready to begin</p>
        </header>
        <main id="main-content" className="container">
          <section className="tournament-summary" aria-labelledby="tournament-details">
            <h2 id="tournament-details">{tournament.name}</h2>
            <dl>
              <dt>Mode:</dt>
              <dd>{tournament.mode}</dd>
              <dt>Participants:</dt>
              <dd>{participants.length}</dd>
              <dt>Courts:</dt>
              <dd>{tournament.settings.courtCount}</dd>
              <dt>Match Duration:</dt>
              <dd>{tournament.settings.matchDuration} minutes</dd>
            </dl>
            
            <div className="participants-list">
              <h3>Participants:</h3>
              <ul role="list">
                {participants.map((participant) => (
                  <li key={participant.id} role="listitem">{participant.name}</li>
                ))}
              </ul>
            </div>
          </section>
          
          <nav className="tournament-actions" aria-label="Tournament actions">
            <button
              onClick={() => setShowDemo(true)}
              className="btn btn-primary"
              type="button"
              aria-describedby="demo-description"
            >
              View Feature Demos
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-secondary"
              type="button"
              aria-describedby="new-tournament-description"
            >
              Create New Tournament
            </button>
            <div className="sr-only">
              <div id="demo-description">Explore interactive demonstrations of tournament features</div>
              <div id="new-tournament-description">Start over and create a new tournament</div>
            </div>
          </nav>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="App-header">
        <h1>Pickleball Tournament Scheduler</h1>
        <p>Create and manage round-robin doubles tournaments with individual player signup</p>
      </header>
      <main id="main-content" className="container">
        <section className="intro-section">
          <nav className="demo-navigation" aria-label="Demo navigation">
            <button
              onClick={() => setShowDemo(true)}
              className="btn btn-outline demo-button"
              type="button"
              aria-describedby="demo-button-description"
            >
              <span aria-hidden="true">🎯</span> View Interactive Demos
            </button>
            <div className="sr-only">
              <div id="demo-button-description">
                Explore interactive demonstrations of tournament scheduling features before creating your own tournament
              </div>
            </div>
          </nav>
        </section>
        
        <section aria-labelledby="tournament-setup-heading">
          <h2 id="tournament-setup-heading" className="sr-only">Tournament Setup</h2>
          <TournamentSetup onTournamentCreate={handleTournamentCreate} />
        </section>
      </main>
    </>
  );
}