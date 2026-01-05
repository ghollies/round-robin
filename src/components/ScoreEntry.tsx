import React, { useState, useEffect } from 'react';
import { Match, Tournament, Team, Participant } from '../types/tournament';
import { updateMatch, loadTeam, loadParticipantsByTournament } from '../utils/storage';
import './ScoreEntry.css';

interface ScoreEntryProps {
  match: Match;
  tournament: Tournament;
  onMatchUpdate: (updatedMatch: Match) => void;
  onClose: () => void;
}

interface ScoreValidation {
  isValid: boolean;
  errors: string[];
  winner?: string | undefined;
  endReason?: 'points' | 'time' | undefined;
}

export const ScoreEntry: React.FC<ScoreEntryProps> = ({
  match,
  tournament,
  onMatchUpdate,
  onClose
}) => {
  const [team1Score, setTeam1Score] = useState<number>(match.result?.team1Score || 0);
  const [team2Score, setTeam2Score] = useState<number>(match.result?.team2Score || 0);
  const [endReason, setEndReason] = useState<'points' | 'time'>('points');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validation, setValidation] = useState<ScoreValidation>({ isValid: false, errors: [] });
  const [team1Data, setTeam1Data] = useState<Team | null>(null);
  const [team2Data, setTeam2Data] = useState<Team | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Load team and participant data
  useEffect(() => {
    const loadTeamData = async () => {
      try {
        const t1 = loadTeam(match.team1Id);
        const t2 = loadTeam(match.team2Id);
        const allParticipants = loadParticipantsByTournament(tournament.id);
        
        setTeam1Data(t1);
        setTeam2Data(t2);
        setParticipants(allParticipants);
      } catch (error) {
        // Handle team data loading error silently
      }
    };

    loadTeamData();
  }, [match.team1Id, match.team2Id, tournament.id]);

  // Validate scores whenever they change
  useEffect(() => {
    const validateScores = (): ScoreValidation => {
      const errors: string[] = [];
      
      // Basic validation
      if (team1Score < 0 || team2Score < 0) {
        errors.push('Scores cannot be negative');
      }

      if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score)) {
        errors.push('Scores must be whole numbers');
      }

      // If both scores are 0, it's not a valid completed match
      if (team1Score === 0 && team2Score === 0) {
        errors.push('At least one team must have scored points');
      }

      // Determine winner and validate based on tournament rules
      let winner: string | undefined;
      let actualEndReason: 'points' | 'time' = endReason;

      if (errors.length === 0) {
        // Check if match ended due to point limit
        const { pointLimit, scoringRule } = tournament.settings;
        
        if (scoringRule === 'first-to-limit') {
          // First to reach point limit wins
          if (team1Score >= pointLimit && team1Score > team2Score) {
            winner = match.team1Id;
            actualEndReason = 'points';
          } else if (team2Score >= pointLimit && team2Score > team1Score) {
            winner = match.team2Id;
            actualEndReason = 'points';
          } else if (endReason === 'time') {
            // Time limit reached, higher score wins
            if (team1Score > team2Score) {
              winner = match.team1Id;
            } else if (team2Score > team1Score) {
              winner = match.team2Id;
            } else {
              errors.push('Match cannot end in a tie. Please enter different scores or continue play.');
            }
          } else {
            errors.push(`Match has not reached the point limit (${pointLimit}) and time limit was not selected`);
          }
        } else if (scoringRule === 'win-by-2') {
          // Must win by 2 points and reach point limit
          const scoreDiff = Math.abs(team1Score - team2Score);
          const maxScore = Math.max(team1Score, team2Score);
          
          if (maxScore >= pointLimit && scoreDiff >= 2) {
            winner = team1Score > team2Score ? match.team1Id : match.team2Id;
            actualEndReason = 'points';
          } else if (endReason === 'time') {
            // Time limit reached, higher score wins (even without 2-point margin)
            if (team1Score > team2Score) {
              winner = match.team1Id;
            } else if (team2Score > team1Score) {
              winner = match.team2Id;
            } else {
              errors.push('Match cannot end in a tie. Please enter different scores or continue play.');
            }
          } else {
            if (maxScore < pointLimit) {
              errors.push(`Match has not reached the point limit (${pointLimit})`);
            } else if (scoreDiff < 2) {
              errors.push('Match must be won by at least 2 points or select "Time Limit" if time expired');
            }
          }
        }
      }

      return {
        isValid: errors.length === 0 && winner !== undefined,
        errors,
        winner: winner,
        endReason: actualEndReason
      } as ScoreValidation;
    };

    setValidation(validateScores());
  }, [team1Score, team2Score, endReason, tournament.settings, match.team1Id, match.team2Id]);

  const getTeamDisplayName = (team: Team | null): string => {
    if (!team) return 'Unknown Team';
    
    const player1 = participants.find(p => p.id === team.player1Id);
    const player2 = participants.find(p => p.id === team.player2Id);
    
    const player1Name = player1?.name || 'Unknown Player';
    const player2Name = player2?.name || 'Unknown Player';
    
    return `${player1Name} / ${player2Name}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.isValid || !validation.winner) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const matchResult: Match['result'] = {
        team1Score,
        team2Score,
        winnerId: validation.winner,
        completedAt: new Date(),
        endReason: validation.endReason || 'points'
      };

      // Update match in storage
      updateMatch(match.id, matchResult);

      // Update participant statistics
      await updateParticipantStatistics(matchResult);

      // Create updated match object
      const updatedMatch: Match = {
        ...match,
        status: 'completed',
        result: matchResult
      };

      onMatchUpdate(updatedMatch);
      onClose();
    } catch (error) {
      // Handle match result save error silently or show user-friendly message
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateParticipantStatistics = async (result: Match['result']) => {
    if (!result || !team1Data || !team2Data) return;

    // Use the new standings utility for consistent statistics updates
    const { updateParticipantStatisticsFromMatch } = await import('../utils/standings');
    const { loadTeamsByTournament } = await import('../utils/storage');
    
    const teams = loadTeamsByTournament(match.tournamentId);
    const updatedMatch = { ...match, result, status: 'completed' as const };
    
    updateParticipantStatisticsFromMatch(updatedMatch, teams);
  };

  const handleScoreChange = (team: 'team1' | 'team2', value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, numValue);
    if (team === 'team1') {
      setTeam1Score(clampedValue);
    } else {
      setTeam2Score(clampedValue);
    }
  };

  return (
    <div className="score-entry-overlay">
      <div className="score-entry-modal">
        <div className="score-entry-header">
          <h2>Enter Match Result</h2>
          <button 
            type="button" 
            className="close-button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="match-info">
          <div className="match-details">
            <span className="match-label">Round {match.roundNumber}, Match {match.matchNumber}</span>
            <span className="court-label">Court {match.courtNumber}</span>
          </div>
          <div className="tournament-rules">
            <span>Point Limit: {tournament.settings.pointLimit}</span>
            <span>Scoring: {tournament.settings.scoringRule === 'win-by-2' ? 'Win by 2' : 'First to limit'}</span>
            {tournament.settings.timeLimit && <span>Time Limit: {tournament.settings.matchDuration} min</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="score-entry-form">
          <div className="teams-scores">
            <div className="team-score">
              <label className="team-label">
                {getTeamDisplayName(team1Data)}
              </label>
              <input
                type="number"
                min="0"
                value={team1Score}
                onChange={(e) => handleScoreChange('team1', e.target.value)}
                className="score-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="vs-separator">VS</div>

            <div className="team-score">
              <label className="team-label">
                {getTeamDisplayName(team2Data)}
              </label>
              <input
                type="number"
                min="0"
                value={team2Score}
                onChange={(e) => handleScoreChange('team2', e.target.value)}
                className="score-input"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {tournament.settings.timeLimit && (
            <div className="end-reason-section">
              <label className="section-label">How did the match end?</label>
              <div className="end-reason-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="endReason"
                    value="points"
                    checked={endReason === 'points'}
                    onChange={(e) => setEndReason(e.target.value as 'points' | 'time')}
                    disabled={isSubmitting}
                  />
                  <span>Reached point limit</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="endReason"
                    value="time"
                    checked={endReason === 'time'}
                    onChange={(e) => setEndReason(e.target.value as 'points' | 'time')}
                    disabled={isSubmitting}
                  />
                  <span>Time limit expired</span>
                </label>
              </div>
            </div>
          )}

          {validation.errors.length > 0 && (
            <div className="validation-errors">
              {validation.errors.map((error, index) => (
                <div key={index} className="error-message">
                  {error}
                </div>
              ))}
            </div>
          )}

          {validation.isValid && validation.winner && (
            <div className="match-result-preview">
              <div className="winner-announcement">
                Winner: {validation.winner === match.team1Id 
                  ? getTeamDisplayName(team1Data) 
                  : getTeamDisplayName(team2Data)}
              </div>
              <div className="end-reason-display">
                Match ended by: {validation.endReason === 'points' ? 'Point limit' : 'Time limit'}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={!validation.isValid || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScoreEntry;