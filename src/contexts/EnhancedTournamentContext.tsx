import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Tournament, Participant, Match, Round, AppError } from '../types/tournament';
import * as storage from '../utils/storage';
import { useNotifications, Notification } from '../components/NotificationSystem';
import { validateStorageQuota } from '../utils/validation';

// Re-export types from original context
export type { TournamentState, TournamentAction } from './TournamentContext';
import { tournamentReducer, initialState, TournamentState, TournamentAction } from './TournamentContext';

// Enhanced context interface with notifications
export interface EnhancedTournamentContextValue {
  state: TournamentState;
  dispatch: React.Dispatch<TournamentAction>;
  
  // Tournament operations with enhanced error handling
  loadTournament: (id: string) => Promise<void>;
  saveTournament: (tournament: Tournament) => Promise<void>;
  createTournament: (tournament: Tournament, participantNames: string[]) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  
  // Participant operations
  updateParticipant: (participant: Participant) => Promise<void>;
  
  // Match operations
  updateMatchResult: (matchId: string, result: NonNullable<Match['result']>) => Promise<void>;
  rescheduleMatch: (matchId: string, newTime: Date, newCourt: number) => Promise<void>;
  
  // Round operations
  swapRounds: (round1Id: string, round2Id: string) => Promise<void>;
  
  // Standings operations
  refreshStandings: () => Promise<void>;
  
  // Utility operations
  clearError: () => void;
  resetTournament: () => void;
  
  // Enhanced operations
  validateAndSave: (operation: () => Promise<any>, successMessage?: string) => Promise<any>;
  showStorageWarning: () => void;
}

// Create enhanced context
const EnhancedTournamentContext = createContext<EnhancedTournamentContextValue | undefined>(undefined);

// Enhanced provider component
export function EnhancedTournamentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);
  const notifications = useNotifications();

  // Initialize storage on mount with enhanced error handling
  useEffect(() => {
    try {
      storage.initializeStorage();
      
      // Check storage quota and warn if needed
      const storageValidation = validateStorageQuota();
      if (!storageValidation.isValid) {
        notifications.showError(
          'Storage Error',
          storageValidation.error,
          { duration: 0 } // Persistent error
        );
      } else if (storageValidation.warning) {
        notifications.showWarning(
          'Storage Warning',
          storageValidation.warning
        );
      }
    } catch (error) {
      const appError: AppError = {
        type: 'storage',
        message: error instanceof Error ? error.message : 'Failed to initialize storage',
        details: error,
        timestamp: new Date(),
      };
      dispatch({ type: 'SET_ERROR', payload: appError });
      notifications.showError(
        'Initialization Failed',
        'Unable to initialize local storage. Some features may not work properly.',
        { duration: 0 }
      );
    }
  }, [notifications]);

  // Enhanced error handler with notifications
  const handleError = useCallback((
    error: unknown, 
    type: AppError['type'] = 'state',
    showNotification: boolean = true
  ) => {
    const appError: AppError = {
      type,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error,
      timestamp: new Date(),
    };
    
    dispatch({ type: 'SET_ERROR', payload: appError });
    
    if (showNotification) {
      const errorMessages = {
        storage: 'Storage operation failed. Your data may not be saved.',
        validation: 'Invalid data provided. Please check your input.',
        algorithm: 'Tournament scheduling failed. Please try again.',
        state: 'An unexpected error occurred. Please refresh the page.',
      };
      
      const notificationOptions: Partial<Notification> = {};
      if (type === 'state') {
        notificationOptions.action = {
          label: 'Reload Page',
          onClick: () => window.location.reload()
        };
      }
      
      notifications.showError(
        'Error',
        errorMessages[type] || appError.message,
        notificationOptions
      );
    }
    
    return appError;
  }, [notifications]);

  // Enhanced optimistic updates with notifications
  const withOptimisticUpdate = useCallback(async (
    key: string,
    optimisticValue: any,
    operation: () => Promise<void>,
    rollbackAction?: () => void,
    successMessage?: string
  ): Promise<void> => {
    // Apply optimistic update
    dispatch({ type: 'ADD_OPTIMISTIC_UPDATE', payload: { key, value: optimisticValue } });
    
    try {
      await operation();
      // Remove optimistic update on success
      dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: key });
      
      if (successMessage) {
        notifications.showSuccess('Success', successMessage);
      }
    } catch (error) {
      // Rollback on error
      dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: key });
      if (rollbackAction) {
        rollbackAction();
      }
      throw error;
    }
  }, [notifications]);

  // Enhanced tournament operations
  const loadTournament = useCallback(async (id: string) => {
    const loadingId = notifications.showLoading('Loading Tournament', 'Please wait while we load your tournament data...');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const tournament = storage.loadTournament(id);
      if (!tournament) {
        throw new Error(`Tournament with id ${id} not found`);
      }
      
      const participants = storage.loadParticipantsByTournament(id);
      const teams = storage.loadTeamsByTournament(id);
      const matches = storage.loadMatchesByTournament(id);
      const rounds = storage.loadRoundsByTournament(id);
      const standings = storage.getStandings(id);
      
      dispatch({ type: 'SET_TOURNAMENT', payload: tournament });
      dispatch({ type: 'SET_PARTICIPANTS', payload: participants });
      dispatch({ type: 'SET_TEAMS', payload: teams });
      dispatch({ type: 'SET_MATCHES', payload: matches });
      dispatch({ type: 'SET_ROUNDS', payload: rounds });
      dispatch({ type: 'SET_STANDINGS', payload: standings });
      
      notifications.removeNotification(loadingId);
      notifications.showSuccess('Tournament Loaded', `Successfully loaded "${tournament.name}"`);
    } catch (error) {
      notifications.removeNotification(loadingId);
      handleError(error, 'storage');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [handleError, notifications]);

  const saveTournament = useCallback(async (tournament: Tournament) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      await withOptimisticUpdate(
        `tournament-${tournament.id}`,
        tournament,
        async () => {
          storage.saveTournament(tournament);
          dispatch({ type: 'SET_TOURNAMENT', payload: tournament });
        },
        undefined,
        'Tournament saved successfully'
      );
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [handleError, withOptimisticUpdate]);

  const createTournament = useCallback(async (tournament: Tournament, participantNames: string[]) => {
    const loadingId = notifications.showLoading('Creating Tournament', 'Setting up your tournament...');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      // Save tournament
      storage.saveTournament(tournament);
      
      // Create participants
      const participants: Participant[] = participantNames.map((name, index) => ({
        id: `participant-${tournament.id}-${index}`,
        tournamentId: tournament.id,
        name,
        statistics: {
          gamesWon: 0,
          gamesLost: 0,
          totalPointsScored: 0,
          totalPointsAllowed: 0,
          pointDifferential: 0,
        },
      }));
      
      // Save participants
      participants.forEach(participant => storage.saveParticipant(participant));
      
      // Update state
      dispatch({ type: 'SET_TOURNAMENT', payload: tournament });
      dispatch({ type: 'SET_PARTICIPANTS', payload: participants });
      dispatch({ type: 'SET_TEAMS', payload: [] });
      dispatch({ type: 'SET_MATCHES', payload: [] });
      dispatch({ type: 'SET_ROUNDS', payload: [] });
      dispatch({ type: 'SET_STANDINGS', payload: participants });
      
      notifications.removeNotification(loadingId);
      notifications.showSuccess(
        'Tournament Created!',
        `"${tournament.name}" has been created with ${participants.length} participants.`
      );
    } catch (error) {
      notifications.removeNotification(loadingId);
      handleError(error, 'storage');
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [handleError, notifications]);

  const deleteTournament = useCallback(async (id: string) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      storage.deleteTournament(id);
      dispatch({ type: 'RESET_STATE' });
      notifications.showSuccess('Tournament Deleted', 'Tournament has been successfully deleted.');
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [handleError, notifications]);

  // Enhanced participant operations
  const updateParticipant = useCallback(async (participant: Participant) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    
    const originalParticipant = state.participants.find(p => p.id === participant.id);
    
    try {
      await withOptimisticUpdate(
        `participant-${participant.id}`,
        participant,
        async () => {
          storage.saveParticipant(participant);
          dispatch({ type: 'UPDATE_PARTICIPANT', payload: participant });
          
          // Refresh standings if tournament is loaded
          if (state.currentTournament) {
            const standings = storage.getStandings(state.currentTournament.id);
            dispatch({ type: 'SET_STANDINGS', payload: standings });
          }
        },
        () => {
          if (originalParticipant) {
            dispatch({ type: 'UPDATE_PARTICIPANT', payload: originalParticipant });
          }
        },
        'Participant updated successfully'
      );
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [state.participants, state.currentTournament, handleError, withOptimisticUpdate]);

  // Enhanced match operations
  const updateMatchResult = useCallback(async (matchId: string, result: NonNullable<Match['result']>) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    
    const originalMatch = state.matches.find(m => m.id === matchId);
    if (!originalMatch) {
      throw new Error(`Match with id ${matchId} not found`);
    }
    
    const updatedMatch: Match = {
      ...originalMatch,
      status: 'completed',
      result: result,
    };
    
    try {
      await withOptimisticUpdate(
        `match-${matchId}`,
        updatedMatch,
        async () => {
          storage.updateMatch(matchId, result);
          dispatch({ type: 'UPDATE_MATCH', payload: updatedMatch });
          
          // Refresh standings if tournament is loaded
          if (state.currentTournament) {
            const standings = storage.getStandings(state.currentTournament.id);
            dispatch({ type: 'SET_STANDINGS', payload: standings });
          }
        },
        () => {
          dispatch({ type: 'UPDATE_MATCH', payload: originalMatch });
        },
        'Match result saved successfully'
      );
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [state.matches, state.currentTournament, handleError, withOptimisticUpdate]);

  const rescheduleMatch = useCallback(async (matchId: string, newTime: Date, newCourt: number) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    
    const originalMatch = state.matches.find(m => m.id === matchId);
    if (!originalMatch) {
      throw new Error(`Match with id ${matchId} not found`);
    }
    
    const updatedMatch: Match = {
      ...originalMatch,
      scheduledTime: newTime,
      courtNumber: newCourt,
    };
    
    try {
      await withOptimisticUpdate(
        `match-reschedule-${matchId}`,
        updatedMatch,
        async () => {
          storage.saveMatch(updatedMatch);
          dispatch({ type: 'UPDATE_MATCH', payload: updatedMatch });
        },
        () => {
          dispatch({ type: 'UPDATE_MATCH', payload: originalMatch });
        },
        'Match rescheduled successfully'
      );
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [state.matches, handleError, withOptimisticUpdate]);

  // Enhanced round operations
  const swapRounds = useCallback(async (round1Id: string, round2Id: string) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    
    const round1 = state.rounds.find(r => r.id === round1Id);
    const round2 = state.rounds.find(r => r.id === round2Id);
    
    if (!round1 || !round2) {
      throw new Error('One or both rounds not found');
    }
    
    const swappedRound1: Round = { ...round1, roundNumber: round2.roundNumber };
    const swappedRound2: Round = { ...round2, roundNumber: round1.roundNumber };
    
    try {
      await withOptimisticUpdate(
        `round-swap-${round1Id}-${round2Id}`,
        { round1: swappedRound1, round2: swappedRound2 },
        async () => {
          storage.saveRound(swappedRound1);
          storage.saveRound(swappedRound2);
          dispatch({ type: 'UPDATE_ROUND', payload: swappedRound1 });
          dispatch({ type: 'UPDATE_ROUND', payload: swappedRound2 });
        },
        () => {
          dispatch({ type: 'UPDATE_ROUND', payload: round1 });
          dispatch({ type: 'UPDATE_ROUND', payload: round2 });
        },
        'Rounds swapped successfully'
      );
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [state.rounds, handleError, withOptimisticUpdate]);

  // Enhanced standings operations
  const refreshStandings = useCallback(async () => {
    if (!state.currentTournament) {
      return;
    }
    
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const standings = storage.getStandings(state.currentTournament.id);
      dispatch({ type: 'SET_STANDINGS', payload: standings });
      notifications.showInfo('Standings Updated', 'Player standings have been refreshed.');
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [state.currentTournament, handleError, notifications]);

  // Utility operations
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const resetTournament = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    notifications.showInfo('Tournament Reset', 'Tournament data has been cleared.');
  }, [notifications]);

  // Enhanced utility operations
  const validateAndSave = useCallback(
    (operation: () => Promise<any>, successMessage?: string): Promise<any> => {
      return (async (): Promise<any> => {
        // Check storage before operation
        const storageValidation = validateStorageQuota();
        if (!storageValidation.isValid) {
          throw new Error(storageValidation.error || 'Storage validation failed');
        }
        
        if (storageValidation.warning) {
          notifications.showWarning('Storage Warning', storageValidation.warning);
        }
        
        const result = await operation();
        
        if (successMessage) {
          notifications.showSuccess('Success', successMessage);
        }
        
        return result;
      })();
    },
    [notifications]
  );

  const showStorageWarning = useCallback(() => {
    const storageValidation = validateStorageQuota();
    if (storageValidation.warning) {
      notifications.showWarning('Storage Warning', storageValidation.warning);
    } else if (!storageValidation.isValid) {
      notifications.showError('Storage Error', storageValidation.error || 'Storage is full');
    } else {
      notifications.showInfo('Storage Status', 'Storage is working normally.');
    }
  }, [notifications]);

  const contextValue: EnhancedTournamentContextValue = {
    state,
    dispatch,
    loadTournament,
    saveTournament,
    createTournament,
    deleteTournament,
    updateParticipant,
    updateMatchResult,
    rescheduleMatch,
    swapRounds,
    refreshStandings,
    clearError,
    resetTournament,
    validateAndSave,
    showStorageWarning,
  };

  return (
    <EnhancedTournamentContext.Provider value={contextValue}>
      {children}
    </EnhancedTournamentContext.Provider>
  );
}

// Hook to use enhanced tournament context
export function useEnhancedTournamentContext() {
  const context = useContext(EnhancedTournamentContext);
  if (context === undefined) {
    throw new Error('useEnhancedTournamentContext must be used within an EnhancedTournamentProvider');
  }
  return context;
}