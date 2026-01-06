import { useState, lazy, Suspense } from 'react';
import TournamentSetup from './TournamentSetup';
import TournamentManagement from './TournamentManagement';
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
      <TournamentManagement
        tournament={tournament}
        participants={participants}
        onBack={() => window.location.reload()}
      />
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