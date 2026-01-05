import React, { useState } from 'react';
import { Tournament } from '../types/tournament';
import { validateTournament, validateParticipantCount } from '../utils/validation';
import './TournamentSetup.css';

interface TournamentSetupProps {
  onTournamentCreate: (tournament: Tournament, participants: string[]) => void;
}

interface TournamentFormData {
  name: string;
  mode: 'pair-signup' | 'individual-signup';
  participantCount: number;
  courtCount: number;
  matchDuration: number;
  pointLimit: number;
  scoringRule: 'win-by-2' | 'first-to-limit';
  timeLimit: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const TournamentSetup: React.FC<TournamentSetupProps> = ({ onTournamentCreate }) => {
  const [formData, setFormData] = useState<TournamentFormData>({
    name: '',
    mode: 'individual-signup',
    participantCount: 8,
    courtCount: 2,
    matchDuration: 30,
    pointLimit: 11,
    scoringRule: 'win-by-2',
    timeLimit: true,
  });

  const [participants, setParticipants] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showParticipantEntry, setShowParticipantEntry] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value) || 0 : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Basic tournament validation
    if (!formData.name.trim()) {
      newErrors.name = 'Tournament name is required';
    }

    // Participant count validation
    const participantValidation = validateParticipantCount(formData.participantCount, formData.mode);
    if (!participantValidation.isValid) {
      newErrors.participantCount = participantValidation.errors[0];
    }

    // Court count validation
    if (formData.courtCount < 1 || formData.courtCount > 16) {
      newErrors.courtCount = 'Number of courts must be between 1 and 16';
    }

    // Match duration validation
    if (formData.matchDuration < 15 || formData.matchDuration > 60) {
      newErrors.matchDuration = 'Match duration must be between 15 and 60 minutes';
    }

    // Point limit validation
    if (formData.pointLimit < 1) {
      newErrors.pointLimit = 'Point limit must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      // Initialize participants array based on count
      const initialParticipants = Array(formData.participantCount).fill('');
      setParticipants(initialParticipants);
      setShowParticipantEntry(true);
    }
  };

  const handleBack = () => {
    setShowParticipantEntry(false);
    setParticipants([]);
  };

  const handleParticipantChange = (index: number, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = value;
    setParticipants(newParticipants);

    // Clear participant-specific errors
    if (errors[`participant_${index}`]) {
      setErrors(prev => ({ ...prev, [`participant_${index}`]: '' }));
    }
    if (errors.duplicates) {
      setErrors(prev => ({ ...prev, duplicates: '' }));
    }
  };

  const validateParticipants = (): boolean => {
    const newErrors: FormErrors = {};
    const nameMap = new Map<string, number>();

    // Check for empty names and duplicates
    participants.forEach((name, index) => {
      if (!name.trim()) {
        newErrors[`participant_${index}`] = 'Name is required';
        return;
      }

      const normalizedName = name.trim().toLowerCase();
      if (nameMap.has(normalizedName)) {
        const firstIndex = nameMap.get(normalizedName)!;
        newErrors[`participant_${firstIndex}`] = 'Duplicate name detected';
        newErrors[`participant_${index}`] = 'Duplicate name detected';
        newErrors.duplicates = 'All participant names must be unique';
      } else {
        nameMap.set(normalizedName, index);
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTournament = () => {
    if (validateParticipants()) {
      const tournament: Tournament = {
        id: `tournament_${Date.now()}`,
        name: formData.name,
        mode: formData.mode,
        settings: {
          courtCount: formData.courtCount,
          matchDuration: formData.matchDuration,
          pointLimit: formData.pointLimit,
          scoringRule: formData.scoringRule,
          timeLimit: formData.timeLimit,
        },
        status: 'setup',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      onTournamentCreate(tournament, participants.map(name => name.trim()));
    }
  };

  if (showParticipantEntry) {
    return (
      <div className="tournament-setup">
        <div className="setup-header">
          <h2>Enter {formData.mode === 'pair-signup' ? 'Team' : 'Player'} Names</h2>
          <p>
            {formData.mode === 'pair-signup' 
              ? `Enter names for ${formData.participantCount} teams (2 players per team)`
              : `Enter names for ${formData.participantCount} individual players`
            }
          </p>
        </div>

        <div className="participant-entry">
          {errors.duplicates && (
            <div className="error-message global-error">
              {errors.duplicates}
            </div>
          )}

          <div className="participants-grid">
            {participants.map((name, index) => (
              <div key={index} className="participant-input-group">
                <label htmlFor={`participant_${index}`}>
                  {formData.mode === 'pair-signup' ? `Team ${index + 1}` : `Player ${index + 1}`}
                </label>
                <input
                  type="text"
                  id={`participant_${index}`}
                  value={name}
                  onChange={(e) => handleParticipantChange(index, e.target.value)}
                  placeholder={formData.mode === 'pair-signup' ? 'Smith/Johnson' : 'Player Name'}
                  className={errors[`participant_${index}`] ? 'error' : ''}
                />
                {errors[`participant_${index}`] && (
                  <span className="error-text">{errors[`participant_${index}`]}</span>
                )}
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleBack} className="btn-secondary">
              Back
            </button>
            <button 
              type="button" 
              onClick={handleCreateTournament}
              className="btn-primary"
            >
              Create Tournament
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tournament-setup">
      <div className="setup-header">
        <h2>Tournament Setup</h2>
        <p>Configure your pickleball tournament parameters</p>
      </div>

      <form className="setup-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="name">Tournament Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter tournament name"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="mode">Tournament Mode *</label>
            <select
              id="mode"
              name="mode"
              value={formData.mode}
              onChange={handleInputChange}
            >
              <option value="individual-signup">Individual Signup</option>
              <option value="pair-signup">Pair Signup</option>
            </select>
            <div className="help-text">
              {formData.mode === 'individual-signup' 
                ? 'Players sign up individually and are paired with different partners each round'
                : 'Teams of 2 players sign up together and play as fixed pairs'
              }
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="participantCount">
              Number of {formData.mode === 'pair-signup' ? 'Teams' : 'Players'} *
            </label>
            <input
              type="number"
              id="participantCount"
              name="participantCount"
              value={formData.participantCount}
              onChange={handleInputChange}
              min="4"
              max="32"
              className={errors.participantCount ? 'error' : ''}
            />
            {errors.participantCount && <span className="error-text">{errors.participantCount}</span>}
            <div className="help-text">Between 4 and 32 participants</div>
          </div>
        </div>

        <div className="form-section">
          <h3>Court & Timing</h3>
          
          <div className="form-group">
            <label htmlFor="courtCount">Number of Courts *</label>
            <input
              type="number"
              id="courtCount"
              name="courtCount"
              value={formData.courtCount}
              onChange={handleInputChange}
              min="1"
              max="16"
              className={errors.courtCount ? 'error' : ''}
            />
            {errors.courtCount && <span className="error-text">{errors.courtCount}</span>}
            <div className="help-text">Between 1 and 16 courts</div>
          </div>

          <div className="form-group">
            <label htmlFor="matchDuration">Match Duration (minutes) *</label>
            <input
              type="number"
              id="matchDuration"
              name="matchDuration"
              value={formData.matchDuration}
              onChange={handleInputChange}
              min="15"
              max="60"
              className={errors.matchDuration ? 'error' : ''}
            />
            {errors.matchDuration && <span className="error-text">{errors.matchDuration}</span>}
            <div className="help-text">Between 15 and 60 minutes</div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="timeLimit"
                checked={formData.timeLimit}
                onChange={handleInputChange}
              />
              Enable time limits for matches
            </label>
            <div className="help-text">
              Matches can end when time expires, even if point limit isn't reached
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Scoring Rules</h3>
          
          <div className="form-group">
            <label htmlFor="pointLimit">Point Limit *</label>
            <input
              type="number"
              id="pointLimit"
              name="pointLimit"
              value={formData.pointLimit}
              onChange={handleInputChange}
              min="1"
              className={errors.pointLimit ? 'error' : ''}
            />
            {errors.pointLimit && <span className="error-text">{errors.pointLimit}</span>}
            <div className="help-text">Points needed to win a game (e.g., 11, 15, 21)</div>
          </div>

          <div className="form-group">
            <label htmlFor="scoringRule">Win Condition *</label>
            <select
              id="scoringRule"
              name="scoringRule"
              value={formData.scoringRule}
              onChange={handleInputChange}
            >
              <option value="win-by-2">Win by 2</option>
              <option value="first-to-limit">First to Point Limit</option>
            </select>
            <div className="help-text">
              {formData.scoringRule === 'win-by-2' 
                ? 'Must win by at least 2 points (e.g., 11-9, 12-10, 13-11)'
                : 'First team to reach point limit wins'
              }
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={handleNext} className="btn-primary">
            Next: Enter {formData.mode === 'pair-signup' ? 'Teams' : 'Players'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TournamentSetup;