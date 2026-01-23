import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Tournament, Participant, Team, Match, Round, AppError } from '../types/tournament';
import { generateOptimizedSchedule } from '../utils/scheduleGenerator';
import * as storage from '../utils/storage';

// State interface
export interface TournamentState {
  currentTournament: Tournament | null;
  participants: Participant[];
  teams: Team[];
  matches: Match[];
  rounds: Round[];
  standings: Participant[];
  loading: boolean;
  error: AppError | null;
  optimisticUpdates: Map<string, any>;
}

// Action types
export type TournamentAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: AppError | null }
  | { type: 'SET_TOURNAMENT'; payload: Tournament | null }
  | { type: 'SET_PARTICIPANTS'; payload: Participant[] }
  | { type: 'SET_TEAMS'; payload: Team[] }
  | { type: 'SET_MATCHES'; payload: Match[] }
  | { type: 'SET_ROUNDS'; payload: Round[] }
  | { type: 'SET_STANDINGS'; payload: Participant[] }
  | { type: 'UPDATE_PARTICIPANT'; payload: Participant }
  | { type: 'UPDATE_MATCH'; payload: Match }
  | { type: 'UPDATE_ROUND'; payload: Round }
  | { type: 'ADD_OPTIMISTIC_UPDATE'; payload: { key: string; value: any } }
  | { type: 'REMOVE_OPTIMISTIC_UPDATE'; payload: string }
  | { type: 'CLEAR_OPTIMISTIC_UPDATES' }
  | { type: 'RESET_STATE' };

// Initial state
export const initialState: TournamentState = {
  currentTournament: null,
  participants: [],
  teams: [],
  matches: [],
  rounds: [],
  standings: [],
  loading: false,
  error: null,
  optimisticUpdates: new Map(),
};

// Reducer
export function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_TOURNAMENT':
      return { ...state, currentTournament: action.payload };
    
    case 'SET_PARTICIPANTS':
      return { ...state, participants: action.payload };
    
    case 'SET_TEAMS':
      return { ...state, teams: action.payload };
    
    case 'SET_MATCHES':
      return { ...state, matches: action.payload };
    
    case 'SET_ROUNDS':
      return { ...state, rounds: action.payload };
    
    case 'SET_STANDINGS':
      return { ...state, standings: action.payload };
    
    case 'UPDATE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.map(p => 
          p.id === action.payload.id ? action.payload : p
        ),
      };
    
    case 'UPDATE_MATCH':
      return {
        ...state,
        matches: state.matches.map(m => 
          m.id === action.payload.id ? action.payload : m
        ),
      };
    
    case 'UPDATE_ROUND':
      return {
        ...state,
        rounds: state.rounds.map(r => 
          r.id === action.payload.id ? action.payload : r
        ),
      };
    
    case 'ADD_OPTIMISTIC_UPDATE':
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.set(action.payload.key, action.payload.value);
      return { ...state, optimisticUpdates: newOptimisticUpdates };
    
    case 'REMOVE_OPTIMISTIC_UPDATE':
      const updatedOptimisticUpdates = new Map(state.optimisticUpdates);
      updatedOptimisticUpdates.delete(action.payload);
      return { ...state, optimisticUpdates: updatedOptimisticUpdates };
    
    case 'CLEAR_OPTIMISTIC_UPDATES':
      return { ...state, optimisticUpdates: new Map() };
    
    case 'RESET_STATE':
      return { ...initialState };
    
    default:
      return state;
  }
}

// Context interface
export interface TournamentContextValue {
  state: TournamentState;
  dispatch: React.Dispatch<TournamentAction>;
  
  // Tournament operations
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
}

// Create context
const TournamentContext = createContext<TournamentContextValue | undefined>(undefined);

// Provider component
export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);

  // Initialize storage on mount
  useEffect(() => {
    try {
      storage.initializeStorage();
    } catch (error) {
      const appError: AppError = {
        type: 'storage',
        message: error instanceof Error ? error.message : 'Failed to initialize storage',
        details: error,
        timestamp: new Date(),
      };
      dispatch({ type: 'SET_ERROR', payload: appError });
    }
  }, []);

  // Helper function to handle errors
  const handleError = useCallback((error: unknown, type: AppError['type'] = 'state') => {
    const appError: AppError = {
      type,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error,
      timestamp: new Date(),
    };
    dispatch({ type: 'SET_ERROR', payload: appError });
  }, []);

  // Helper function for optimistic updates with rollback
  const withOptimisticUpdate = useCallback(async (
    key: string,
    optimisticValue: any,
    operation: () => Promise<void>,
    rollbackAction?: () => void
  ): Promise<void> => {
    // Apply optimistic update
    dispatch({ type: 'ADD_OPTIMISTIC_UPDATE', payload: { key, value: optimisticValue } });
    
    try {
      await operation();
      // Remove optimistic update on success
      dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: key });
    } catch (error) {
      // Rollback on error
      dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: key });
      if (rollbackAction) {
        rollbackAction();
      }
      throw error;
    }
  }, []);

  // Tournament operations
  const loadTournament = useCallback(async (id: string) => {
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
    } catch (error) {
      handleError(error, 'storage');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [handleError]);

  const saveTournament = useCallback(async (tournament: Tournament) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      await withOptimisticUpdate(
        `tournament-${tournament.id}`,
        tournament,
        async () => {
          storage.saveTournament(tournament);
          dispatch({ type: 'SET_TOURNAMENT', payload: tournament });
        }
      );
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [handleError, withOptimisticUpdate]);

  const createTournament = useCallback(async (tournament: Tournament, participantNames: string[]) => {
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
      
      // Set initial tournament and participants state
      dispatch({ type: 'SET_TOURNAMENT', payload: tournament });
      dispatch({ type: 'SET_PARTICIPANTS', payload: participants });
      dispatch({ type: 'SET_STANDINGS', payload: participants });
      
      try {
        // Automatically generate schedule
        const generatedSchedule = generateOptimizedSchedule(tournament, participants);
        
        // Ensure schedule was generated successfully
        if (!generatedSchedule || !generatedSchedule.teams) {
          throw new Error('Failed to generate tournament schedule');
        }
        
        // Save generated schedule data
        generatedSchedule.teams.forEach(team => storage.saveTeam(team));
        generatedSchedule.rounds.forEach(round => storage.saveRound(round));
        generatedSchedule.scheduledMatches.forEach(match => storage.saveMatch(match));
        
        // Update tournament status to active since schedule is generated
        const updatedTournament: Tournament = {
          ...tournament,
          status: 'active',
          updatedAt: new Date(),
        };
        storage.saveTournament(updatedTournament);
        
        // Update state with all generated data
        dispatch({ type: 'SET_TOURNAMENT', payload: updatedTournament });
        dispatch({ type: 'SET_TEAMS', payload: generatedSchedule.teams });
        dispatch({ type: 'SET_MATCHES', payload: generatedSchedule.scheduledMatches });
        dispatch({ type: 'SET_ROUNDS', payload: generatedSchedule.rounds });
      } catch (scheduleError) {
        // Schedule generation failed, but tournament is still created in 'setup' status
        console.warn('Schedule generation failed:', scheduleError);
        // Tournament remains in 'setup' status, user can manually generate schedule later
      }
    } catch (error) {
      handleError(error, 'storage');
      // Don't re-throw the error to allow the state to be updated
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [handleError]);

  const deleteTournament = useCallback(async (id: string) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      storage.deleteTournament(id);
      dispatch({ type: 'RESET_STATE' });
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [handleError]);

  // Participant operations
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
        }
      );
    } catch (error) {
      handleError(error, 'storage');
      // Don't re-throw the error to allow the state to be updated
    }
  }, [state.participants, state.currentTournament, handleError, withOptimisticUpdate]);

  // Match operations
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
            // Use the enhanced standings calculation that handles caching and recalculation
            const { getEnhancedStandings } = await import('../utils/standings');
            const enhancedStandings = getEnhancedStandings(state.currentTournament.id);
            // Convert enhanced standings back to basic participants for compatibility
            const standings = enhancedStandings.map(standing => ({
              id: standing.id,
              tournamentId: standing.tournamentId,
              name: standing.name,
              statistics: standing.statistics
            }));
            dispatch({ type: 'SET_STANDINGS', payload: standings });
          }
        },
        () => {
          dispatch({ type: 'UPDATE_MATCH', payload: originalMatch });
        }
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
        }
      );
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [state.matches, handleError, withOptimisticUpdate]);

  // Round operations
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
        }
      );
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [state.rounds, handleError, withOptimisticUpdate]);

  // Standings operations
  const refreshStandings = useCallback(async () => {
    if (!state.currentTournament) {
      return;
    }
    
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const standings = storage.getStandings(state.currentTournament.id);
      dispatch({ type: 'SET_STANDINGS', payload: standings });
    } catch (error) {
      handleError(error, 'storage');
      throw error;
    }
  }, [state.currentTournament, handleError]);

  // Utility operations
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const resetTournament = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const contextValue: TournamentContextValue = {
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
  };

  return (
    <TournamentContext.Provider value={contextValue}>
      {children}
    </TournamentContext.Provider>
  );
}

// Hook to use tournament context
export function useTournamentContext() {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournamentContext must be used within a TournamentProvider');
  }
  return context;
}