import React, { useState, useMemo } from 'react';
import { GeneratedSchedule, ScheduledMatch } from '../utils/scheduleGenerator';
import { Participant } from '../types/tournament';
import './ScheduleDisplay.css';

export type ScheduleView = 'chronological' | 'by-court' | 'by-player' | 'by-round';

interface ScheduleDisplayProps {
  schedule: GeneratedSchedule;
  participants: Participant[];
  onMatchUpdate?: (matchId: string, updates: Partial<ScheduledMatch>) => void;
}

interface ScheduleStats {
  totalMatches: number;
  totalRounds: number;
  estimatedDuration: string;
  courtUtilization: string;
}

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({
  schedule,
  participants,
  onMatchUpdate
}) => {
  const [currentView, setCurrentView] = useState<ScheduleView>('chronological');
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Calculate schedule statistics
  const stats: ScheduleStats = useMemo(() => {
    const totalMatches = schedule.scheduledMatches.length;
    const totalRounds = schedule.rounds.length;
    const durationHours = Math.floor(schedule.optimization.totalDuration / 60);
    const durationMinutes = schedule.optimization.totalDuration % 60;
    const estimatedDuration = `${durationHours}h ${durationMinutes}m`;
    const courtUtilization = `${schedule.optimization.courtUtilization.toFixed(1)}%`;

    return {
      totalMatches,
      totalRounds,
      estimatedDuration,
      courtUtilization
    };
  }, [schedule]);

  // Get unique courts
  const courts = useMemo(() => {
    const courtNumbers = [...new Set(schedule.scheduledMatches.map(m => m.courtNumber))];
    return courtNumbers.sort((a, b) => a - b);
  }, [schedule.scheduledMatches]);

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format match duration
  const formatDuration = (startTime: Date, durationMinutes: number): string => {
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  // Get player name by ID
  const getPlayerName = (playerId: string): string => {
    const participant = participants.find(p => p.id === playerId);
    return participant?.name || `Player ${playerId}`;
  };

  // Get team display name
  const getTeamName = (match: ScheduledMatch, teamKey: 'team1' | 'team2'): string => {
    const team = match.teams[teamKey];
    const player1Name = getPlayerName(team.player1Id);
    const player2Name = getPlayerName(team.player2Id);
    return `${player1Name} / ${player2Name}`;
  };

  // Filter matches based on current view and selections
  const filteredMatches = useMemo(() => {
    let matches = [...schedule.scheduledMatches];

    if (currentView === 'by-court' && selectedCourt) {
      matches = matches.filter(m => m.courtNumber === selectedCourt);
    }

    if (currentView === 'by-player' && selectedPlayer) {
      matches = matches.filter(m => 
        m.teams.team1.player1Id === selectedPlayer ||
        m.teams.team1.player2Id === selectedPlayer ||
        m.teams.team2.player1Id === selectedPlayer ||
        m.teams.team2.player2Id === selectedPlayer
      );
    }

    // Sort matches based on view
    switch (currentView) {
      case 'chronological':
        return matches.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
      case 'by-court':
        return matches.sort((a, b) => {
          if (a.courtNumber !== b.courtNumber) {
            return a.courtNumber - b.courtNumber;
          }
          return a.scheduledTime.getTime() - b.scheduledTime.getTime();
        });
      case 'by-round':
        return matches.sort((a, b) => {
          if (a.roundNumber !== b.roundNumber) {
            return a.roundNumber - b.roundNumber;
          }
          return a.matchNumber - b.matchNumber;
        });
      default:
        return matches;
    }
  }, [schedule.scheduledMatches, currentView, selectedCourt, selectedPlayer]);

  // Group matches for display
  const groupedMatches = useMemo(() => {
    const groups = new Map<string, ScheduledMatch[]>();

    filteredMatches.forEach(match => {
      let groupKey: string;

      switch (currentView) {
        case 'by-court':
          groupKey = `Court ${match.courtNumber}`;
          break;
        case 'by-round':
          groupKey = `Round ${match.roundNumber}`;
          break;
        case 'chronological':
          // Group by hour for chronological view
          const hour = match.scheduledTime.getHours();
          const period = hour < 12 ? 'AM' : 'PM';
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          groupKey = `${displayHour}:00 ${period}`;
          break;
        default:
          groupKey = 'All Matches';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(match);
    });

    return Array.from(groups.entries()).map(([key, matches]) => ({
      groupName: key,
      matches
    }));
  }, [filteredMatches, currentView]);

  const renderMatchCard = (match: ScheduledMatch) => (
    <div key={match.id} className="match-card">
      <div className="match-header">
        <div className="match-info">
          <span className="match-number">Match {match.matchNumber}</span>
          <span className="round-number">Round {match.roundNumber}</span>
        </div>
        <div className="match-status">
          <span className={`status-badge ${match.status}`}>
            {match.status.replace('-', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="match-details">
        <div className="match-time">
          <strong>Time:</strong> {formatDuration(match.scheduledTime, 30)}
        </div>
        <div className="match-court">
          <strong>Court:</strong> {match.courtNumber}
        </div>
      </div>

      <div className="match-teams">
        <div className="team">
          <div className="team-label">Team 1:</div>
          <div className="team-players">{getTeamName(match, 'team1')}</div>
        </div>
        <div className="vs-divider">VS</div>
        <div className="team">
          <div className="team-label">Team 2:</div>
          <div className="team-players">{getTeamName(match, 'team2')}</div>
        </div>
      </div>

      {match.result && (
        <div className="match-result">
          <div className="score">
            {match.result.team1Score} - {match.result.team2Score}
          </div>
          <div className="winner">
            Winner: {match.result.winnerId === match.team1Id ? 
              getTeamName(match, 'team1') : 
              getTeamName(match, 'team2')
            }
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="schedule-display">
      <div className="schedule-header">
        <h2>Tournament Schedule</h2>
        
        <div className="schedule-stats">
          <div className="stat">
            <span className="stat-label">Total Matches:</span>
            <span className="stat-value">{stats.totalMatches}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Rounds:</span>
            <span className="stat-value">{stats.totalRounds}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Duration:</span>
            <span className="stat-value">{stats.estimatedDuration}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Court Usage:</span>
            <span className="stat-value">{stats.courtUtilization}</span>
          </div>
        </div>
      </div>

      <div className="schedule-controls">
        <div className="view-selector">
          <label htmlFor="view-select">View:</label>
          <select
            id="view-select"
            value={currentView}
            onChange={(e) => setCurrentView(e.target.value as ScheduleView)}
          >
            <option value="chronological">Chronological</option>
            <option value="by-court">By Court</option>
            <option value="by-player">By Player</option>
            <option value="by-round">By Round</option>
          </select>
        </div>

        {currentView === 'by-court' && (
          <div className="court-selector">
            <label htmlFor="court-select">Court:</label>
            <select
              id="court-select"
              value={selectedCourt || ''}
              onChange={(e) => setSelectedCourt(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All Courts</option>
              {courts.map(court => (
                <option key={court} value={court}>Court {court}</option>
              ))}
            </select>
          </div>
        )}

        {currentView === 'by-player' && (
          <div className="player-selector">
            <label htmlFor="player-select">Player:</label>
            <select
              id="player-select"
              value={selectedPlayer || ''}
              onChange={(e) => setSelectedPlayer(e.target.value || null)}
            >
              <option value="">All Players</option>
              {participants.map(participant => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="schedule-content">
        {groupedMatches.length === 0 ? (
          <div className="no-matches">
            <p>No matches found for the selected criteria.</p>
          </div>
        ) : (
          groupedMatches.map(({ groupName, matches }) => (
            <div key={groupName} className="match-group">
              <h3 className="group-header">{groupName}</h3>
              <div className="matches-grid">
                {matches.map(renderMatchCard)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="schedule-actions">
        <button className="btn-secondary" onClick={() => window.print()}>
          Print Schedule
        </button>
        <button className="btn-primary">
          Export Schedule
        </button>
      </div>
    </div>
  );
};

export default ScheduleDisplay;