import React from 'react';
import { TournamentProvider } from './contexts/TournamentContext';
import { NotificationProvider } from './components/NotificationSystem';
import { ErrorBoundary, TournamentErrorBoundary } from './components/ErrorBoundary';
import { AppContent } from './components/AppContent';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import './App.css';

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to console for debugging
        console.error('App Error Boundary:', error, errorInfo);
        
        // In production, you might want to send this to an error reporting service
        // errorReportingService.captureException(error, { extra: errorInfo });
      }}
    >
      <div className="App">
        {/* Skip Link for Screen Readers */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        
        <NotificationProvider>
          <TournamentErrorBoundary
            onReset={() => {
              // Clear any tournament data and reload
              localStorage.removeItem('currentTournament');
              window.location.reload();
            }}
          >
            <TournamentProvider>
              <AppContent />
              <PerformanceMonitor />
            </TournamentProvider>
          </TournamentErrorBoundary>
        </NotificationProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;
