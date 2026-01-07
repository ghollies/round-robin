import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Match, Round, ScheduleConflict, Team, Participant } from '../types/tournament';
import { 
  ScheduleChangeHistory, 
  ConflictDetector, 
  ScheduleManipulator
} from '../utils/scheduleManagement';
import './ScheduleManagement.css';

interface ScheduleManagementProps {
  matches: Match[];
  rounds: Round[];
  teams: Team[];
  participants: Participant[];
  courtCount: number;
  matchDuration: number;
  onMatchesUpdate: (matches: Match[]) => void;
  onRoundsUpdate: (rounds: Round[]) => void;
  onConflictsDetected: (conflicts: ScheduleConflict[]) => void;
}

const ScheduleManagement: React.FC<ScheduleManagementProps> = ({
  matches,
  rounds,
  teams,
  participants,
  courtCount,
  matchDuration,
  onMatchesUpdate,
  onRoundsUpdate,
  onConflictsDetected
}) => {
  const [changeHistory] = useState(() => new ScheduleChangeHistory());
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedRounds, setSelectedRounds] = useState<Set<number>>(new Set());
  const [showRoundSwap, setShowRoundSwap] = useState(false);

  const dragOverlayRef = useRef<HTMLDivElement>(null);

  // Detect conflicts whenever matches or rounds change
  useEffect(() => {
    const detectedConflicts = ConflictDetector.detectConflicts(matches, rounds) || [];
    setConflicts(detectedConflicts);
    onConflictsDetected(detectedConflicts);
  }, [matches, rounds, onConflictsDetected]);

  // Undo last change
  const handleUndo = useCallback(() => {
    const lastChange = changeHistory.getUndoableChange();
    if (!lastChange) return;

    try {
      const { updatedMatches, updatedRounds } = ScheduleManipulator.undoLastChange(
        lastChange,
        matches,
        rounds
      );

      onMatchesUpdate(updatedMatches);
      onRoundsUpdate(updatedRounds);
      
      // Remove the change from history (simplified - in real app might want to mark as undone)
      changeHistory.clear();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to undo change');
    }
  }, [changeHistory, matches, rounds, onMatchesUpdate, onRoundsUpdate]);

  // Toggle round selection
  const toggleRoundSelection = useCallback((roundNumber: number) => {
    setSelectedRounds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roundNumber)) {
        newSet.delete(roundNumber);
      } else {
        newSet.add(roundNumber);
      }
      return newSet;
    });
  }, []);

  // Handle round swap with court rebalancing
  const handleRoundSwap = useCallback(() => {
    const selectedRoundNumbers = Array.from(selectedRounds);
    
    if (selectedRoundNumbers.length !== 2) {
      alert('Please select exactly 2 rounds to swap');
      return;
    }

    const [round1Number, round2Number] = selectedRoundNumbers.sort((a, b) => a - b);
    const round1 = rounds.find(r => r.roundNumber === round1Number);
    const round2 = rounds.find(r => r.roundNumber === round2Number);

    if (!round1 || !round2) {
      alert('Selected rounds not found');
      return;
    }

    try {
      // Validate the swap first
      const validation = ScheduleManipulator.validateRoundSwap(round1, round2, matches);
      
      if (!validation.isValid) {
        alert(`Cannot swap rounds: ${validation.errors.join(', ')}`);
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        const proceed = window.confirm(
          `Warning: ${validation.warnings.join(', ')}\n\nDo you want to proceed with the swap?`
        );
        if (!proceed) return;
      }

      // Perform the swap with court rebalancing
      const { updatedRounds, updatedMatches } = ScheduleManipulator.swapRoundsWithCourtRebalancing(
        round1,
        round2,
        matches,
        changeHistory,
        matchDuration,
        courtCount
      );

      // Update the rounds array
      const newRounds = rounds.map(round => {
        const updated = updatedRounds.find(ur => ur.id === round.id);
        return updated || round;
      });

      onRoundsUpdate(newRounds);
      onMatchesUpdate(updatedMatches);
      
      // Clear selection
      setSelectedRounds(new Set());
      setShowRoundSwap(false);
      
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to swap rounds');
    }
  }, [selectedRounds, rounds, matches, changeHistory, matchDuration, courtCount, onRoundsUpdate, onMatchesUpdate]);

  // Get incomplete rounds for swapping
  const getIncompleteRounds = useCallback(() => {
    return rounds.filter(round => {
      const roundMatches = matches.filter(m => m.roundNumber === round.roundNumber);
      const hasCompletedMatches = roundMatches.some(m => m.status === 'completed');
      return round.status !== 'completed' && !hasCompletedMatches;
    });
  }, [rounds, matches]);

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get participant names from team ID
  const getTeamPlayerNames = useCallback((teamId: string): { player1Name: string; player2Name: string } => {
    // Handle bye case
    if (teamId === 'bye') {
      return { player1Name: 'BYE', player2Name: '' };
    }

    // Find the team
    const team = teams?.find(t => t.id === teamId);
    if (!team) {
      return { player1Name: 'Unknown', player2Name: 'Unknown' };
    }

    // Find the participants
    const player1 = participants?.find(p => p.id === team.player1Id);
    const player2 = participants?.find(p => p.id === team.player2Id);

    return {
      player1Name: player1?.name || 'Unknown',
      player2Name: player2?.name || 'Unknown'
    };
  }, [teams, participants]);

  // Format team names for compact display
  const formatTeamNames = useCallback((teamId: string): string => {
    const { player1Name, player2Name } = getTeamPlayerNames(teamId);
    
    if (player1Name === 'BYE') {
      return 'BYE';
    }

    // Abbreviate long names for compact display
    const abbreviateName = (name: string): string => {
      if (name.length <= 8) return name;
      return name.substring(0, 6) + '..';
    };

    const abbrev1 = abbreviateName(player1Name);
    const abbrev2 = abbreviateName(player2Name);
    
    return `${abbrev1}/${abbrev2}`;
  }, [getTeamPlayerNames]);

  // Format bye information to show player names
  const formatByeInfo = useCallback((byeTeamId: string): string => {
    // In individual signup mode, byeTeamId is actually a player ID
    // First try to find it as a player ID
    const byePlayer = participants?.find(p => p.id === byeTeamId);
    if (byePlayer) {
      // Single player bye
      const abbreviateName = (name: string): string => {
        if (name.length <= 12) return name;
        return name.substring(0, 10) + '..';
      };
      return `Bye: ${abbreviateName(byePlayer.name)}`;
    }

    // Fallback: try as team ID (for pair signup mode)
    const { player1Name, player2Name } = getTeamPlayerNames(byeTeamId);
    
    if (player1Name !== 'Unknown' || player2Name !== 'Unknown') {
      // Abbreviate long names for compact display
      const abbreviateName = (name: string): string => {
        if (name.length <= 10) return name;
        return name.substring(0, 8) + '..';
      };

      const abbrev1 = abbreviateName(player1Name);
      const abbrev2 = abbreviateName(player2Name);
      
      return `Bye: ${abbrev1}/${abbrev2}`;
    }

    // If we can't find the player or team, just show generic bye
    return 'Bye';
  }, [getTeamPlayerNames, participants]);

  // Get conflict indicator for match
  const getMatchConflicts = (matchId: string): ScheduleConflict[] => {
    return conflicts.filter(c => c.affectedMatches.includes(matchId));
  };

  // Render match card
  const renderMatchCard = (match: Match) => {
    const matchConflicts = getMatchConflicts(match.id);
    const hasConflicts = matchConflicts.length > 0;

    return (
      <div
        key={match.id}
        className={`match-card ${hasConflicts ? 'has-conflicts' : ''}`}
      >
        <div className="match-header">
          <span className="match-number">Match {match.matchNumber}</span>
          <span className="round-number">Round {match.roundNumber}</span>
          {hasConflicts && (
            <span className="conflict-indicator" title={matchConflicts.map(c => c.message).join(', ')}>
              ⚠️
            </span>
          )}
        </div>
        
        <div className="match-details">
          <div className="match-time">{formatTime(match.scheduledTime)}</div>
          <div className="match-court">Court {match.courtNumber}</div>
          <div className="match-status">{match.status}</div>
        </div>

        {hasConflicts && (
          <div className="conflict-details">
            {matchConflicts.map(conflict => (
              <div key={conflict.id} className={`conflict-message ${conflict.severity}`}>
                {conflict.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render round card for round view
  const renderRoundCard = (round: Round) => {
    const roundMatches = matches.filter(m => m.roundNumber === round.roundNumber);
    const completedMatches = roundMatches.filter(m => m.status === 'completed');
    const isSelected = selectedRounds.has(round.roundNumber);
    const isIncomplete = round.status !== 'completed' && completedMatches.length === 0;
    const incompleteRounds = getIncompleteRounds();
    const canSwap = isIncomplete && incompleteRounds.length >= 2;

    return (
      <div
        key={round.id}
        className={`round-card ${isSelected ? 'selected' : ''} ${!isIncomplete ? 'completed' : ''}`}
        onClick={() => canSwap && toggleRoundSelection(round.roundNumber)}
        style={{ cursor: canSwap ? 'pointer' : 'default' }}
      >
        <div className="round-header">
          <h3>Round {round.roundNumber}</h3>
          <div className="round-status">
            <span className={`status-badge ${round.status}`}>{round.status}</span>
            {round.byeTeamId && <span className="bye-indicator">{formatByeInfo(round.byeTeamId)}</span>}
          </div>
        </div>
        
        <div className="round-stats">
          <div className="stat">
            <span className="stat-label">Matches:</span>
            <span className="stat-value">{roundMatches.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Completed:</span>
            <span className="stat-value">{completedMatches.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Status:</span>
            <span className="stat-value">{isIncomplete ? 'Can Swap' : 'Locked'}</span>
          </div>
        </div>

        <div className="round-matches">
          {roundMatches.slice(0, 3).map(match => (
            <div key={match.id} className="round-match-summary">
              <div className="match-info">
                <span className="match-time">{formatTime(match.scheduledTime)}</span>
                <span className="match-court">Court {match.courtNumber}</span>
                <span className={`match-status ${match.status}`}>{match.status}</span>
              </div>
              <div className="match-teams">
                <div className="team-pairing">
                  <span className="team-name">{formatTeamNames(match.team1Id)}</span>
                  <span className="vs-separator">vs</span>
                  <span className="team-name">{formatTeamNames(match.team2Id)}</span>
                </div>
              </div>
            </div>
          ))}
          {roundMatches.length > 3 && (
            <div className="more-matches">+{roundMatches.length - 3} more matches</div>
          )}
        </div>
      </div>
    );
  };

  // Render rounds view
  const renderRoundsView = () => {
    const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    const incompleteRounds = getIncompleteRounds();

    return (
      <div className="rounds-view">
        <div className="rounds-header">
          <h3>Tournament Rounds</h3>
          {incompleteRounds.length >= 2 && (
            <div className="round-swap-controls">
              <button
                className="btn-outline"
                onClick={() => setShowRoundSwap(!showRoundSwap)}
              >
                Swap Rounds ({selectedRounds.size}/2)
              </button>
              {selectedRounds.size === 2 && (
                <button
                  className="btn-primary"
                  onClick={handleRoundSwap}
                >
                  Swap Selected Rounds
                </button>
              )}
              {selectedRounds.size > 0 && (
                <button
                  className="btn-secondary"
                  onClick={() => setSelectedRounds(new Set())}
                >
                  Clear Selection
                </button>
              )}
            </div>
          )}
        </div>

        {showRoundSwap && (
          <div className="round-swap-info">
            <div className="info-panel">
              <h4>Round Swapping with Court Rebalancing</h4>
              <p>Select exactly 2 incomplete rounds to swap their order. Courts will be automatically rebalanced to prevent conflicts.</p>
              <div className="swap-rules">
                <h5>Rules:</h5>
                <ul>
                  <li>Only incomplete rounds (no completed matches) can be swapped</li>
                  <li>Round times will be recalculated automatically</li>
                  <li>Courts will be rebalanced to prevent conflicts</li>
                  <li>Match pairings within rounds remain unchanged</li>
                  <li>Bye assignments are preserved</li>
                </ul>
              </div>
              {incompleteRounds.length < 2 && (
                <div className="warning">
                  <strong>Note:</strong> Not enough incomplete rounds available for swapping.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounds-grid">
          {sortedRounds.map(renderRoundCard)}
        </div>
      </div>
    );
  };



  return (
    <div className="schedule-management">
      <div className="management-header">
        <h2>Schedule Management</h2>
        
        <div className="management-controls">
          <button
            className="btn-secondary"
            onClick={handleUndo}
            disabled={!changeHistory.canUndo()}
          >
            Undo Last Change
          </button>
          
          <button
            className="btn-outline"
            onClick={() => setShowConflicts(!showConflicts)}
          >
            Conflicts ({conflicts.length})
          </button>
          
          <button
            className="btn-outline"
            onClick={() => setShowHistory(!showHistory)}
          >
            History
          </button>
        </div>
      </div>

      {showConflicts && conflicts.length > 0 && (
        <div className="conflicts-panel">
          <h3>Schedule Conflicts</h3>
          {conflicts.map(conflict => (
            <div key={conflict.id} className={`conflict-item ${conflict.severity}`}>
              <div className="conflict-message">{conflict.message}</div>
              <div className="conflict-type">{conflict.type}</div>
              {conflict.suggestions && (
                <div className="conflict-suggestions">
                  <strong>Suggestions:</strong>
                  <ul>
                    {conflict.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showHistory && (
        <div className="history-panel">
          <h3>Change History</h3>
          <div className="history-list">
            {changeHistory.getHistory().map(change => (
              <div key={change.id} className="history-item">
                <div className="change-description">{change.description}</div>
                <div className="change-timestamp">
                  {change.timestamp.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="schedule-views">
        <div className="schedule-grid">
          {renderRoundsView()}
        </div>
      </div>

      <div ref={dragOverlayRef} className="drag-overlay" />
    </div>
  );
};

export default ScheduleManagement;