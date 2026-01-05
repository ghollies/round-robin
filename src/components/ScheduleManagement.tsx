import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Match, Round, ScheduleChange, ScheduleConflict, DragDropContext } from '../types/tournament';
import { 
  ScheduleChangeHistory, 
  ConflictDetector, 
  ScheduleManipulator, 
  TimeSlotManager 
} from '../utils/scheduleManagement';
import './ScheduleManagement.css';

interface ScheduleManagementProps {
  matches: Match[];
  rounds: Round[];
  courtCount: number;
  matchDuration: number;
  onMatchesUpdate: (matches: Match[]) => void;
  onRoundsUpdate: (rounds: Round[]) => void;
  onConflictsDetected: (conflicts: ScheduleConflict[]) => void;
}

const ScheduleManagement: React.FC<ScheduleManagementProps> = ({
  matches,
  rounds,
  courtCount,
  matchDuration,
  onMatchesUpdate,
  onRoundsUpdate,
  onConflictsDetected
}) => {
  const [changeHistory] = useState(() => new ScheduleChangeHistory());
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [dragContext, setDragContext] = useState<DragDropContext>({
    draggedMatch: null,
    draggedRound: null,
    dropTarget: null
  });
  const [showConflicts, setShowConflicts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());

  const dragOverlayRef = useRef<HTMLDivElement>(null);

  // Detect conflicts whenever matches or rounds change
  useEffect(() => {
    const detectedConflicts = ConflictDetector.detectConflicts(matches, rounds);
    setConflicts(detectedConflicts);
    onConflictsDetected(detectedConflicts);
  }, [matches, rounds, onConflictsDetected]);

  // Handle match drag start
  const handleMatchDragStart = useCallback((e: React.DragEvent, match: Match) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', match.id);
    
    setDragContext(prev => ({
      ...prev,
      draggedMatch: match,
      draggedRound: null
    }));

    // Add visual feedback
    e.currentTarget.classList.add('dragging');
  }, []);

  // Handle match drag end
  const handleMatchDragEnd = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
    
    setDragContext({
      draggedMatch: null,
      draggedRound: null,
      dropTarget: null
    });
  }, []);

  // Handle round drag start
  const handleRoundDragStart = useCallback((e: React.DragEvent, round: Round) => {
    // Only allow dragging incomplete rounds
    if (round.status === 'completed') {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', round.id);
    
    setDragContext(prev => ({
      ...prev,
      draggedRound: round,
      draggedMatch: null
    }));

    e.currentTarget.classList.add('dragging');
  }, []);

  // Handle round drag end
  const handleRoundDragEnd = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
    
    setDragContext({
      draggedMatch: null,
      draggedRound: null,
      dropTarget: null
    });
  }, []);

  // Handle drop on court
  const handleCourtDrop = useCallback((e: React.DragEvent, courtNumber: number) => {
    e.preventDefault();
    
    const { draggedMatch } = dragContext;
    if (!draggedMatch) return;

    // Find available time slot for this court
    const availableTime = TimeSlotManager.findAvailableTimeSlot(
      courtNumber,
      draggedMatch.scheduledTime,
      matches,
      matchDuration
    );

    if (!availableTime) {
      alert(`No available time slots on Court ${courtNumber}`);
      return;
    }

    // Validate the move
    const conflicts = ConflictDetector.validateMatchReschedule(
      draggedMatch,
      availableTime,
      courtNumber,
      matches
    );

    if (conflicts.some(c => c.severity === 'error')) {
      alert('Cannot move match: ' + conflicts.map(c => c.message).join(', '));
      return;
    }

    // Perform the move
    const updatedMatch = ScheduleManipulator.rescheduleMatch(
      draggedMatch,
      availableTime,
      courtNumber,
      changeHistory
    );

    const updatedMatches = matches.map(m => 
      m.id === updatedMatch.id ? updatedMatch : m
    );

    onMatchesUpdate(updatedMatches);
  }, [dragContext, matches, matchDuration, changeHistory, onMatchesUpdate]);

  // Handle drop on time slot
  const handleTimeSlotDrop = useCallback((e: React.DragEvent, timeSlot: Date, courtNumber: number) => {
    e.preventDefault();
    
    const { draggedMatch } = dragContext;
    if (!draggedMatch) return;

    // Validate the move
    const conflicts = ConflictDetector.validateMatchReschedule(
      draggedMatch,
      timeSlot,
      courtNumber,
      matches
    );

    if (conflicts.some(c => c.severity === 'error')) {
      alert('Cannot move match: ' + conflicts.map(c => c.message).join(', '));
      return;
    }

    // Perform the move
    const updatedMatch = ScheduleManipulator.rescheduleMatch(
      draggedMatch,
      timeSlot,
      courtNumber,
      changeHistory
    );

    const updatedMatches = matches.map(m => 
      m.id === updatedMatch.id ? updatedMatch : m
    );

    onMatchesUpdate(updatedMatches);
  }, [dragContext, matches, changeHistory, onMatchesUpdate]);

  // Handle round swap
  const handleRoundDrop = useCallback((e: React.DragEvent, targetRound: Round) => {
    e.preventDefault();
    
    const { draggedRound } = dragContext;
    if (!draggedRound || draggedRound.id === targetRound.id) return;

    // Only allow swapping incomplete rounds
    if (targetRound.status === 'completed') {
      alert('Cannot swap with completed round');
      return;
    }

    try {
      const { updatedRounds, updatedMatches } = ScheduleManipulator.swapRounds(
        draggedRound,
        targetRound,
        matches,
        changeHistory
      );

      // Update all rounds
      const allUpdatedRounds = rounds.map(round => {
        const updated = updatedRounds.find(ur => ur.id === round.id);
        return updated || round;
      });

      onRoundsUpdate(allUpdatedRounds);
      onMatchesUpdate(updatedMatches);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to swap rounds');
    }
  }, [dragContext, matches, rounds, changeHistory, onRoundsUpdate, onMatchesUpdate]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

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

  // Toggle match selection
  const toggleMatchSelection = useCallback((matchId: string) => {
    setSelectedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  }, []);

  // Bulk reschedule selected matches
  const handleBulkReschedule = useCallback((newCourt: number) => {
    const selectedMatchObjects = matches.filter(m => selectedMatches.has(m.id));
    
    if (selectedMatchObjects.length === 0) {
      alert('No matches selected');
      return;
    }

    const updatedMatches = [...matches];
    let hasConflicts = false;

    selectedMatchObjects.forEach(match => {
      const availableTime = TimeSlotManager.findAvailableTimeSlot(
        newCourt,
        match.scheduledTime,
        updatedMatches,
        matchDuration
      );

      if (availableTime) {
        const updatedMatch = ScheduleManipulator.rescheduleMatch(
          match,
          availableTime,
          newCourt,
          changeHistory
        );

        const index = updatedMatches.findIndex(m => m.id === match.id);
        if (index !== -1) {
          updatedMatches[index] = updatedMatch;
        }
      } else {
        hasConflicts = true;
      }
    });

    if (hasConflicts) {
      alert('Some matches could not be rescheduled due to conflicts');
    }

    onMatchesUpdate(updatedMatches);
    setSelectedMatches(new Set());
  }, [matches, selectedMatches, matchDuration, changeHistory, onMatchesUpdate]);

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get conflict indicator for match
  const getMatchConflicts = (matchId: string): ScheduleConflict[] => {
    return conflicts.filter(c => c.affectedMatches.includes(matchId));
  };

  // Render match card
  const renderMatchCard = (match: Match) => {
    const matchConflicts = getMatchConflicts(match.id);
    const hasConflicts = matchConflicts.length > 0;
    const isSelected = selectedMatches.has(match.id);

    return (
      <div
        key={match.id}
        className={`match-card ${hasConflicts ? 'has-conflicts' : ''} ${isSelected ? 'selected' : ''}`}
        draggable={match.status !== 'completed'}
        onDragStart={(e) => handleMatchDragStart(e, match)}
        onDragEnd={handleMatchDragEnd}
        onClick={() => toggleMatchSelection(match.id)}
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

  // Render court column
  const renderCourtColumn = (courtNumber: number) => {
    const courtMatches = matches
      .filter(m => m.courtNumber === courtNumber)
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    return (
      <div
        key={courtNumber}
        className="court-column"
        onDrop={(e) => handleCourtDrop(e, courtNumber)}
        onDragOver={handleDragOver}
      >
        <div className="court-header">
          <h3>Court {courtNumber}</h3>
          <div className="court-stats">
            {courtMatches.length} matches
          </div>
        </div>
        
        <div className="court-matches">
          {courtMatches.map(renderMatchCard)}
        </div>
      </div>
    );
  };

  // Render round row
  const renderRoundRow = (round: Round) => {
    const roundMatches = matches
      .filter(m => m.roundNumber === round.roundNumber)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    return (
      <div
        key={round.id}
        className={`round-row ${round.status}`}
        draggable={round.status !== 'completed'}
        onDragStart={(e) => handleRoundDragStart(e, round)}
        onDragEnd={handleRoundDragEnd}
        onDrop={(e) => handleRoundDrop(e, round)}
        onDragOver={handleDragOver}
      >
        <div className="round-header">
          <h3>Round {round.roundNumber}</h3>
          <div className="round-status">{round.status}</div>
          {round.byeTeamId && (
            <div className="bye-indicator">Bye: Team {round.byeTeamId}</div>
          )}
        </div>
        
        <div className="round-matches">
          {roundMatches.map(renderMatchCard)}
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

      {selectedMatches.size > 0 && (
        <div className="bulk-actions">
          <span>Selected: {selectedMatches.size} matches</span>
          <div className="bulk-controls">
            <select
              onChange={(e) => {
                const court = parseInt(e.target.value);
                if (court) handleBulkReschedule(court);
              }}
              defaultValue=""
            >
              <option value="">Move to court...</option>
              {Array.from({ length: courtCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>Court {i + 1}</option>
              ))}
            </select>
            <button onClick={() => setSelectedMatches(new Set())}>
              Clear Selection
            </button>
          </div>
        </div>
      )}

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
        <div className="view-tabs">
          <button className="tab-button active">By Court</button>
          <button className="tab-button">By Round</button>
        </div>

        <div className="schedule-grid">
          <div className="courts-view">
            {Array.from({ length: courtCount }, (_, i) => renderCourtColumn(i + 1))}
          </div>
        </div>
      </div>

      <div ref={dragOverlayRef} className="drag-overlay" />
    </div>
  );
};

export default ScheduleManagement;