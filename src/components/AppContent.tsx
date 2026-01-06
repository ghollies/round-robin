import { useState, lazy, Suspense } from 'react';
import TournamentSetup from './TournamentSetup';
import TournamentManagement from './TournamentManagement';
import TournamentList from './TournamentList';
import { PageLoadingState } from './LoadingState';
import { useNotifications } from './NotificationSystem';
import { useTournament, useParticipants } from '../hooks';
import { Tournament } from '../types/tournament';

// Lazy load the demo navigation component
const DemoNavigation = lazy(() => import('./DemoNavigation'));

export function AppContent() {
  const [showDemo, setShowDemo] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const { tournament, createTournament, loadTournament, loading, error, clearError } = useTournament();
  const { participants } = useParticipants();
  const notifications = useNotifications();

  const handleTournamentCreate = async (newTournament: Tournament, participantNames: string[]) => {
    try {
      await createTournament(newTournament, participantNames);
      setShowSetup(false);
      // Success notification is handled by the enhanced context
    } catch (error) {
      console.error('Failed to create tournament:', error);
      // Error notification is handled by the enhanced context
    }
  };

  const handleTournamentSelect = async (selectedTournament: Tournament) => {
    try {
      await loadTournament(selectedTournament.id);
      // Tournament will be loaded and the UI will switch to management view
    } catch (error) {
      console.error('Failed to load tournament:', error);
      notifications.showError('Error', 'Failed to load tournament');
    }
  };

  const handleCreateNew = () => {
    setShowSetup(true);
  };

  const handleBackToList = () => {
    setShowSetup(false);
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

  if (showSetup) {
    return (
      <>
        <header className="App-header">
          <h1>Pickleball Tournament Scheduler</h1>
          <p>Create and manage round-robin doubles tournaments with individual player signup</p>
        </header>
        <main id="main-content" className="container">
          <section aria-labelledby="tournament-setup-heading">
            <h2 id="tournament-setup-heading" className="sr-only">Tournament Setup</h2>
            <TournamentSetup 
              onTournamentCreate={handleTournamentCreate}
              onBack={handleBackToList}
            />
          </section>
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
        <TournamentList
          onTournamentSelect={handleTournamentSelect}
          onCreateNew={handleCreateNew}
        />
      </main>
    </>
  );
}