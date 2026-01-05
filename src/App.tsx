import React from 'react';
import { TournamentProvider } from './contexts/TournamentContext';
import { AppContent } from './components/AppContent';
import './App.css';

function App() {
  return (
    <TournamentProvider>
      <AppContent />
    </TournamentProvider>
  );
}

export default App;
