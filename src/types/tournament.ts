export interface Tournament {
  id: string;
  name: string;
  mode: 'pair-signup' | 'individual-signup';
  settings: {
    courtCount: number;
    matchDuration: number; // minutes
    pointLimit: number;
    scoringRule: 'win-by-2' | 'first-to-limit';
    timeLimit: boolean;
  };
  status: 'setup' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  id: string;
  tournamentId: string;
  name: string;
  statistics: {
    gamesWon: number;
    gamesLost: number;
    totalPointsScored: number;
    totalPointsAllowed: number;
    pointDifferential: number;
  };
}

export interface Team {
  id: string;
  tournamentId: string;
  player1Id: string;
  player2Id: string;
  isPermanent: boolean; // false for individual mode
}

export interface Match {
  id: string;
  tournamentId: string;
  roundNumber: number;
  matchNumber: number;
  team1Id: string;
  team2Id: string;
  courtNumber: number;
  scheduledTime: Date;
  status: 'scheduled' | 'in-progress' | 'completed';
  result?: {
    team1Score: number;
    team2Score: number;
    winnerId: string;
    completedAt: Date;
    endReason: 'points' | 'time';
  };
}

export interface Round {
  id: string;
  tournamentId: string;
  roundNumber: number;
  status: 'pending' | 'active' | 'completed';
  matches: Match[];
  byeTeamId?: string; // for odd team counts
}

export interface AppError {
  type: 'validation' | 'storage' | 'algorithm' | 'state';
  message: string;
  details?: any;
  timestamp: Date;
}

// Schedule management types
export interface ScheduleChange {
  id: string;
  type: 'match-reschedule' | 'court-reassign' | 'round-swap';
  timestamp: Date;
  description: string;
  oldValue: any;
  newValue: any;
  matchId?: string;
  roundId?: string;
}

export interface ScheduleConflict {
  id: string;
  type: 'court-double-booking' | 'player-overlap' | 'time-conflict';
  severity: 'error' | 'warning';
  message: string;
  affectedMatches: string[];
  suggestions?: string[];
}

export interface DragDropContext {
  draggedMatch: Match | null;
  draggedRound: Round | null;
  dropTarget: {
    type: 'court' | 'time' | 'round';
    value: any;
  } | null;
}