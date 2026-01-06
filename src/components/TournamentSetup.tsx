import React, { useState, useCallback, useMemo } from 'react';
import { Tournament } from '../types/tournament';
import { 
  validateParticipantCount, 
  validateTournamentName,
  validateCourtCount,
  validateMatchDuration,
  validatePointLimit,
  validateParticipantName
} from '../utils/validation';
import { LoadingOverlay } from './LoadingState';
import { usePerfMeasure } from '../utils/performance';
import './TournamentSetup.css';

interface TournamentSetupProps {
  onTournamentCreate: (tournament: Tournament, participants: string[]) => void;
  onBack?: () => void;
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

const TournamentSetup: React.FC<TournamentSetupProps> = ({ onTournamentCreate, onBack }) => {
  // Performance monitoring
  usePerfMeasure('TournamentSetup');

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
  const [warnings, setWarnings] = useState<FormErrors>({});
  const [showParticipantEntry, setShowParticipantEntry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized validation functions to avoid recalculation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    const newWarnings: FormErrors = {};

    // Enhanced tournament name validation
    const nameValidation = validateTournamentName(formData.name);
    if (!nameValidation.isValid && nameValidation.error) {
      newErrors.name = nameValidation.error;
    }

    // Enhanced participant count validation
    const participantValidation = validateParticipantCount(formData.participantCount, formData.mode);
    if (!participantValidation.isValid) {
      newErrors.participantCount = participantValidation.errors[0];
    }

    // Enhanced court count validation
    const courtValidation = validateCourtCount(formData.courtCount, formData.participantCount);
    if (!courtValidation.isValid && courtValidation.error) {
      newErrors.courtCount = courtValidation.error;
    } else if (courtValidation.warning) {
      newWarnings.courtCount = courtValidation.warning;
    }

    // Enhanced match duration validation
    const durationValidation = validateMatchDuration(formData.matchDuration);
    if (!durationValidation.isValid && durationValidation.error) {
      newErrors.matchDuration = durationValidation.error;
    } else if (durationValidation.warning) {
      newWarnings.matchDuration = durationValidation.warning;
    }

    // Enhanced point limit validation
    const pointValidation = validatePointLimit(formData.pointLimit);
    if (!pointValidation.isValid && pointValidation.error) {
      newErrors.pointLimit = pointValidation.error;
    } else if (pointValidation.warning) {
      newWarnings.pointLimit = pointValidation.warning;
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const validateParticipants = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    const newWarnings: FormErrors = {};
    const existingNames: string[] = [];

    // Enhanced participant validation
    participants.forEach((name, index) => {
      const validation = validateParticipantName(name, existingNames, formData.mode);
      
      if (!validation.isValid && validation.error) {
        newErrors[`participant_${index}`] = validation.error;
      } else if (validation.warning) {
        newWarnings[`participant_${index}`] = validation.warning;
      }
      
      // Add to existing names if valid
      if (validation.isValid && name.trim()) {
        existingNames.push(name.trim());
      }
    });

    // Check for duplicates globally
    const nameMap = new Map<string, number[]>();
    participants.forEach((name, index) => {
      const normalizedName = name.trim().toLowerCase();
      if (normalizedName) {
        if (!nameMap.has(normalizedName)) {
          nameMap.set(normalizedName, []);
        }
        nameMap.get(normalizedName)!.push(index);
      }
    });

    // Mark duplicates
    nameMap.forEach((indices, name) => {
      if (indices.length > 1) {
        indices.forEach(index => {
          newErrors[`participant_${index}`] = 'Duplicate name detected';
        });
        newErrors.duplicates = 'All participant names must be unique';
      }
    });

    setErrors(newErrors);
    setWarnings(newWarnings);
    return Object.keys(newErrors).length === 0;
  }, [participants, formData.mode]);

  // Memoized event handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value) || 0 : value
    }));

    // Clear error when user starts typing
    setErrors(prev => {
      if (prev[name]) {
        const { [name]: removed, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (validateForm()) {
      // Initialize participants array based on count
      const initialParticipants = Array(formData.participantCount).fill('');
      setParticipants(initialParticipants);
      setShowParticipantEntry(true);
    }
  }, [validateForm, formData.participantCount]);

  const handleBack = useCallback(() => {
    setShowParticipantEntry(false);
    setParticipants([]);
  }, []);

  const handleParticipantChange = useCallback((index: number, value: string) => {
    setParticipants(prev => {
      const newParticipants = [...prev];
      newParticipants[index] = value;
      return newParticipants;
    });

    // Clear participant-specific errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`participant_${index}`];
      delete newErrors.duplicates;
      return newErrors;
    });
  }, []);

  const handleCreateTournament = useCallback(async () => {
    if (validateParticipants()) {
      setIsSubmitting(true);
      try {
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

        await onTournamentCreate(tournament, participants.map(name => name.trim()));
      } catch (error) {
        // Error handling is done by the parent component
        console.error('Tournament creation failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [validateParticipants, formData, participants, onTournamentCreate]);

  // Memoized help text to avoid recalculation
  const modeHelpText = useMemo(() => {
    return formData.mode === 'individual-signup' 
      ? 'Players sign up individually and are paired with different partners each round'
      : 'Teams of 2 players sign up together and play as fixed pairs';
  }, [formData.mode]);

  const scoringHelpText = useMemo(() => {
    return formData.scoringRule === 'win-by-2' 
      ? 'Must win by at least 2 points (e.g., 11-9, 12-10, 13-11)'
      : 'First team to reach point limit wins';
  }, [formData.scoringRule]);

  const participantEntryTitle = useMemo(() => {
    return formData.mode === 'pair-signup' ? 'Team' : 'Player';
  }, [formData.mode]);

  const participantEntryDescription = useMemo(() => {
    return formData.mode === 'pair-signup' 
      ? `Enter names for ${formData.participantCount} teams (2 players per team)`
      : `Enter names for ${formData.participantCount} individual players`;
  }, [formData.mode, formData.participantCount]);

  // Memoized participant inputs to avoid re-rendering all inputs when one changes
  const participantInputs = useMemo(() => {
    return participants.map((name, index) => (
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
    ));
  }, [participants, formData.mode, errors, handleParticipantChange]);

  if (showParticipantEntry) {
    return (
      <div className="tournament-setup">
        <div className="setup-header">
          <h2>Enter {participantEntryTitle} Names</h2>
          <p>{participantEntryDescription}</p>
        </div>

        <div className="participant-entry">
          {errors.duplicates && (
            <div className="error-message global-error">
              {errors.duplicates}
            </div>
          )}

          <div className="participants-grid">
            {participantInputs}
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
    <LoadingOverlay isLoading={isSubmitting} message="Creating tournament...">
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
              {modeHelpText}
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
            {warnings.courtCount && <span className="warning-text">{warnings.courtCount}</span>}
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
            {warnings.matchDuration && <span className="warning-text">{warnings.matchDuration}</span>}
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
            {warnings.pointLimit && <span className="warning-text">{warnings.pointLimit}</span>}
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
              {scoringHelpText}
            </div>
          </div>
        </div>

        <div className="form-actions">
          {onBack && (
            <button type="button" onClick={onBack} className="btn-secondary">
              ← Back to Tournament List
            </button>
          )}
          <button type="button" onClick={handleNext} className="btn-primary">
            Next: Enter {formData.mode === 'pair-signup' ? 'Teams' : 'Players'}
          </button>
        </div>
      </form>
      </div>
    </LoadingOverlay>
  );
};

export default TournamentSetup;