import React, { useState, useEffect } from 'react';
import { Tournament, Participant } from '../types/tournament';
import { useTournament, useParticipants } from '../hooks';
import { generateOptimizedSchedule, GeneratedSchedule, ScheduledMatch } from '../utils/scheduleGenerator';
import ScheduleDisplay from './ScheduleDisplay';
import ScheduleManagement from './ScheduleManagement';
import ScoreEntry from './ScoreEntry';
import { StandingsDashboard } from './StandingsDashboard';
import { exportTournament } from '../utils/storage';
import './TournamentManagement.css';

interface TournamentManagementProps {
  tournament: Tournament;
  participants: Participant[];
  onBack: () => void;
}

type ManagementView = 'overview' | 'schedule' | 'manage' | 'scoring' | 'standings';

export const TournamentManagement: React.FC<TournamentManagementProps> = ({
  tournament,
  participants,
  onBack
}) => {
  const [currentView, setCurrentView] = useState<ManagementView>('overview');
  const [schedule, setSchedule] = useState<GeneratedSchedule | null>(null);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const generateSchedule = async () => {
    setIsGeneratingSchedule(true);
    setScheduleError(null);
    
    try {
      const generatedSchedule = generateOptimizedSchedule(tournament, participants, {
        startTime: new Date(Date.now() + 60000), // Start in 1 minute
        restPeriod: 15
      });
      setSchedule(generatedSchedule);
      setCurrentView('schedule');
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : 'Failed to generate schedule');
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const handleExportTournament = () => {
    try {
      const exportData = exportTournament(tournament.id);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tournament.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const renderNavigation = () => (
    <nav className="tournament-nav">
      <button
        onClick={onBack}
        className="btn btn-secondary back-btn"
      >
        ← Back to Home
      </button>
      
      <div className="nav-buttons">
        <button
          onClick={() => setCurrentView('overview')}
          className={`nav-btn ${currentView === 'overview' ? 'active' : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => setCurrentView('schedule')}
          className={`nav-btn ${currentView === 'schedule' ? 'active' : ''}`}
          disabled={!schedule}
        >
          Schedule
        </button>
        <button
          onClick={() => setCurrentView('manage')}
          className={`nav-btn ${currentView === 'manage' ? 'active' : ''}`}
          disabled={!schedule}
        >
          Manage
        </button>
        <button
          onClick={() => setCurrentView('scoring')}
          className={`nav-btn ${currentView === 'scoring' ? 'active' : ''}`}
          disabled={!schedule}
        >
          Scoring
        </button>
        <button
          onClick={() => setCurrentView('standings')}
          className={`nav-btn ${currentView === 'standings' ? 'active' : ''}`}
        >
          Standings
        </button>
      </div>
    </nav>
  );

  const renderOverview = () => (
    <div className="tournament-overview">
      <header className="tournament-header">
        <h1>{tournament.name}</h1>
        <div className="tournament-actions">
          <button
            onClick={handleExportTournament}
            className="btn btn-outline"
          >
            Export Tournament
          </button>
        </div>
      </header>

      <div className="tournament-details">
        <div className="details-grid">
          <div className="detail-card">
            <h3>Tournament Settings</h3>
            <dl>
              <dt>Mode:</dt>
              <dd>{tournament.mode === 'individual-signup' ? 'Individual Signup' : 'Pair Signup'}</dd>
              <dt>Participants:</dt>
              <dd>{participants.length}</dd>
              <dt>Courts:</dt>
              <dd>{tournament.settings.courtCount}</dd>
              <dt>Match Duration:</dt>
              <dd>{tournament.settings.matchDuration} minutes</dd>
              <dt>Point Limit:</dt>
              <dd>{tournament.settings.pointLimit} points</dd>
              <dt>Scoring Rule:</dt>
              <dd>{tournament.settings.scoringRule === 'win-by-2' ? 'Win by 2' : 'First to Limit'}</dd>
            </dl>
          </div>

          <div className="detail-card">
            <h3>Participants</h3>
            <div className="participants-list">
              {participants.map((participant, index) => (
                <div key={participant.id} className="participant-item">
                  {index + 1}. {participant.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="schedule-section">
          {!schedule ? (
            <div className="schedule-prompt">
              <h3>Ready to Generate Schedule</h3>
              <p>Generate the tournament schedule to begin managing matches and tracking scores.</p>
              
              {scheduleError && (
                <div className="error-message">
                  Error: {scheduleError}
                </div>
              )}
              
              <button
                onClick={generateSchedule}
                disabled={isGeneratingSchedule}
                className="btn btn-primary btn-large"
              >
                {isGeneratingSchedule ? 'Generating Schedule...' : 'Generate Tournament Schedule'}
              </button>
            </div>
          ) : (
            <div className="schedule-ready">
              <h3>Schedule Generated ✓</h3>
              <div className="schedule-stats">
                <div className="stat">
                  <strong>{schedule.scheduledMatches.length}</strong>
                  <span>Total Matches</span>
                </div>
                <div className="stat">
                  <strong>{schedule.rounds.length}</strong>
                  <span>Rounds</span>
                </div>
                <div className="stat">
                  <strong>{Math.floor(schedule.optimization.totalDuration / 60)}h {schedule.optimization.totalDuration % 60}m</strong>
                  <span>Estimated Duration</span>
                </div>
                <div className="stat">
                  <strong>{schedule.optimization.courtUtilization.toFixed(1)}%</strong>
                  <span>Court Utilization</span>
                </div>
              </div>
              <button
                onClick={() => setCurrentView('schedule')}
                className="btn btn-primary"
              >
                View Schedule
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return renderOverview();
      
      case 'schedule':
        return schedule ? (
          <ScheduleDisplay 
            schedule={schedule} 
            participants={participants}
          />
        ) : (
          <div className="no-schedule">
            <p>No schedule generated yet. Go to Overview to generate one.</p>
          </div>
        );
      
      case 'manage':
        return schedule ? (
          <ScheduleManagement
            matches={schedule.scheduledMatches.map(sm => {
              const { teams, participants, ...matchData } = sm;
              return matchData;
            })}
            rounds={schedule.rounds}
            courtCount={tournament.settings.courtCount}
            matchDuration={tournament.settings.matchDuration}
            onMatchesUpdate={(matches) => {
              // Convert back to ScheduledMatch format
              const updatedScheduledMatches = matches.map(match => {
                const originalScheduledMatch = schedule.scheduledMatches.find(sm => sm.id === match.id);
                return originalScheduledMatch ? {
                  ...originalScheduledMatch,
                  ...match
                } : match as ScheduledMatch;
              });
              setSchedule(prev => prev ? { ...prev, scheduledMatches: updatedScheduledMatches } : null);
            }}
            onRoundsUpdate={(rounds) => {
              setSchedule(prev => prev ? { ...prev, rounds } : null);
            }}
            onConflictsDetected={(conflicts) => {
              console.log('Conflicts detected:', conflicts);
            }}
          />
        ) : (
          <div className="no-schedule">
            <p>No schedule generated yet. Go to Overview to generate one.</p>
          </div>
        );
      
      case 'scoring':
        return (
          <div className="scoring-section">
            <h2>Score Entry</h2>
            <p>Select a match from the schedule to enter scores.</p>
            {/* TODO: Integrate with match selection from schedule */}
          </div>
        );
      
      case 'standings':
        return (
          <StandingsDashboard 
            tournament={tournament}
            onRefresh={() => {
              // Refresh standings data
              console.log('Refreshing standings...');
            }}
          />
        );
      
      default:
        return renderOverview();
    }
  };

  return (
    <div className="tournament-management">
      {renderNavigation()}
      <main className="tournament-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default TournamentManagement;