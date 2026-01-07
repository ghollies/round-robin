import React, { useState, useEffect } from 'react';
import { Tournament, Participant } from '../types/tournament';
import { useTournamentContext } from '../contexts/TournamentContext';
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

type ManagementView = 'overview' | 'schedule' | 'manage' | 'standings';

export const TournamentManagement: React.FC<TournamentManagementProps> = ({
  tournament,
  participants,
  onBack
}) => {
  const { state } = useTournamentContext();
  const [currentView, setCurrentView] = useState<ManagementView>('schedule'); // Start with schedule view since it's auto-generated
  const [schedule, setSchedule] = useState<GeneratedSchedule | null>(null);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Check if schedule already exists from context and build GeneratedSchedule object
  useEffect(() => {
    if (state.matches.length > 0 && state.teams.length > 0 && state.rounds.length > 0) {
      // Convert context data to GeneratedSchedule format
      const scheduledMatches: ScheduledMatch[] = state.matches.map(match => {
        const team1 = state.teams.find(t => t.id === match.team1Id);
        const team2 = state.teams.find(t => t.id === match.team2Id);
        
        const team1Players = team1 ? [
          participants.find(p => p.id === team1.player1Id),
          participants.find(p => p.id === team1.player2Id)
        ].filter(Boolean) as Participant[] : [];
        
        const team2Players = team2 ? [
          participants.find(p => p.id === team2.player1Id),
          participants.find(p => p.id === team2.player2Id)
        ].filter(Boolean) as Participant[] : [];

        return {
          ...match,
          teams: {
            team1: team1!,
            team2: team2!
          },
          participants: {
            team1Players,
            team2Players
          }
        };
      });

      // Calculate optimization stats
      const totalDuration = Math.max(...state.matches.map(m => 
        new Date(m.scheduledTime).getTime() + (tournament.settings.matchDuration * 60000)
      )) - Math.min(...state.matches.map(m => new Date(m.scheduledTime).getTime()));
      
      const optimization = {
        totalDuration: Math.floor(totalDuration / 60000), // Convert to minutes
        sessionsCount: 1
      };

      const generatedSchedule: GeneratedSchedule = {
        rounds: state.rounds,
        scheduledMatches,
        optimization,
        teams: state.teams
      };

      setSchedule(generatedSchedule);
    }
  }, [state.matches, state.teams, state.rounds, participants, tournament.settings.matchDuration]);

  const regenerateSchedule = async () => {
    setIsGeneratingSchedule(true);
    setScheduleError(null);
    
    try {
      const generatedSchedule = generateOptimizedSchedule(tournament, participants, {
        startTime: new Date(Date.now() + 60000) // Start in 1 minute
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
            <div className="schedule-loading">
              <h3>Schedule Loading...</h3>
              <p>Your tournament schedule is being prepared automatically.</p>
              
              {scheduleError && (
                <div className="error-message">
                  Error: {scheduleError}
                  <button
                    onClick={regenerateSchedule}
                    disabled={isGeneratingSchedule}
                    className="btn btn-secondary"
                  >
                    {isGeneratingSchedule ? 'Regenerating...' : 'Try Again'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="schedule-ready">
              <h3>Schedule Ready ✓</h3>
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
              </div>
              <div className="schedule-actions">
                <button
                  onClick={() => setCurrentView('schedule')}
                  className="btn btn-primary"
                >
                  View Schedule
                </button>
                <button
                  onClick={regenerateSchedule}
                  disabled={isGeneratingSchedule}
                  className="btn btn-outline"
                >
                  {isGeneratingSchedule ? 'Regenerating...' : 'Regenerate Schedule'}
                </button>
              </div>
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