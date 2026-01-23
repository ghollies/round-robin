# Design Document

## Overview

The Pickleball Tournament Scheduler is a web-based application that automates the complex process of creating and managing round robin doubles tournaments for individual player signup. In this mode, individual players register for the tournament and are systematically paired with different partners throughout the event, ensuring each player partners with every other player exactly once while playing against every other player exactly twice. The application provides real-time schedule management, score tracking, and comprehensive individual player statistics.

## Architecture

### System Architecture
The application is a client-side only web application using local browser storage:

```
┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│ Local Storage   │
│   (Frontend)    │    │   (Browser)     │
└─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: React with TypeScript for type safety and better development experience
- **Storage**: Browser LocalStorage for tournament data persistence
- **Styling**: CSS Modules or Tailwind CSS for responsive design
- **State Management**: React Context API for tournament state with localStorage sync
- **Build Tool**: Vite for fast development and optimized builds
- **Deployment**: GitHub Pages for static hosting with automated CI/CD

## Components and Interfaces

### Frontend Components

#### 1. Tournament Setup Component
- **Purpose**: Configure tournament parameters, individual player entry, tournament scheduling, and automatic schedule generation
- **Key Features**:
  - Parameter validation (players, courts, scoring rules, start date/time)
  - Individual player entry with duplicate detection
  - Tournament configuration (courts, time, scoring)
  - Tournament start date/time selection with future date validation
  - Default scheduling to next available time slot if no date specified
  - Automatic schedule generation upon completion
  - Seamless transition to schedule view

#### 2. Schedule Display Component
- **Purpose**: Display automatically generated tournament schedules
- **Key Features**:
  - Schedule visualization with multiple views
  - Real-time schedule updates
  - Print and export functionality
  - Match status tracking

#### 3. Schedule Management Component
- **Purpose**: Real-time schedule modifications during tournament
- **Key Features**:
  - Drag-and-drop match rescheduling
  - Round order swapping for incomplete rounds
  - Round swapping for player accommodation (late arrivals, bye timing)
  - Conflict detection and validation
  - Change history logging

#### 4. Score Entry Component
- **Purpose**: Match result input and validation
- **Key Features**:
  - Score validation against tournament rules
  - Win condition checking (time/point limits)
  - Real-time statistics updates
  - Match completion status tracking

#### 5. Standings Dashboard Component
- **Purpose**: Real-time player statistics and rankings
- **Key Features**:
  - Live standings calculation
  - Individual player statistics
  - Point differential tracking
  - Sortable rankings table

### Local Storage Interface

#### Data Persistence Layer
- **Tournament Storage**: Save/load tournament configuration and state
- **Participant Storage**: Manage individual player data and statistics
- **Schedule Storage**: Persist generated schedules and match results
- **Settings Storage**: Store user preferences and tournament defaults

#### Storage Operations
- `saveTournament(tournament: Tournament)` - Persist tournament data
- `loadTournament(id: string)` - Retrieve tournament from storage
- `updateMatch(matchId: string, result: MatchResult)` - Update match results
- `getStandings(tournamentId: string)` - Calculate current standings
- `exportTournament(tournamentId: string)` - Export tournament data as JSON
- `swapRounds(tournamentId: string, round1: number, round2: number)` - Swap two incomplete rounds
- `validateRoundSwap(round1: Round, round2: Round)` - Validate round swap compatibility

## Data Models

### Tournament Model
```typescript
interface Tournament {
  id: string;
  name: string;
  settings: {
    courtCount: number;
    matchDuration: number; // minutes
    pointLimit: number;
    scoringRule: 'win-by-2' | 'first-to-limit';
    timeLimit: boolean;
    startDateTime?: Date; // Optional scheduled start time
  };
  status: 'setup' | 'scheduled' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  scheduledStartTime?: Date; // When the tournament is scheduled to begin
}
```

### Participant Model
```typescript
interface Participant {
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
```

### Team Model (Dynamic for Individual Mode)
```typescript
interface Team {
  id: string;
  tournamentId: string;
  player1Id: string;
  player2Id: string;
  isPermanent: boolean; // false for individual mode
}
```

### Match Model
```typescript
interface Match {
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
```

### Round Model
```typescript
interface Round {
  id: string;
  tournamentId: string;
  roundNumber: number;
  status: 'pending' | 'active' | 'completed';
  matches: Match[];
  byeTeamId?: string; // for odd team counts
}
```

## Algorithm Design

### Individual Signup Round Robin Generation

The individual signup mode uses a sophisticated algorithm ensuring each player partners with every other player exactly once while playing against every other player exactly twice:

#### Core Algorithm Requirements
- For n players: Requires (n-1) rounds
- Each round has n/2 matches (for even n) or (n-1)/2 matches with one bye (for odd n)
- Each player must partner with every other player exactly once
- Each player must play against every other player exactly twice (once as opponents, once as partners)

#### Mathematical Foundation
For n players, the total number of unique partnerships is C(n,2) = n(n-1)/2. Since each round can accommodate n/2 partnerships, we need exactly (n-1) rounds to cycle through all partnerships.

#### Implementation Strategy
1. **Partnership Matrix**: Create a matrix tracking which players have been partnered
2. **Opposition Tracking**: Ensure balanced opposition across all players
3. **Round Generation**: Use systematic rotation to generate fair pairings
4. **Bye Management**: For odd player counts, rotate bye assignments fairly

### Schedule Optimization Algorithm
1. **Court Assignment**: Distribute matches evenly across available courts
2. **Time Slot Calculation**: Based on match duration and court availability
3. **Rest Period Management**: Ensure minimum rest between consecutive matches for same players
4. **Bye Distribution**: For odd participant counts, distribute byes fairly

### Round Swapping Algorithm

The round swapping functionality allows tournament directors to reorder incomplete rounds to accommodate late players or specific bye timing requirements:

#### Core Swapping Requirements
- Only incomplete rounds (status: 'pending' or 'active' with no completed matches) can be swapped
- Both rounds must contain the same set of teams to maintain tournament integrity
- Match pairings within rounds remain unchanged during swaps
- Time slots are recalculated based on new round order
- Court assignments are preserved where possible

#### Validation Logic
1. **Round Status Check**: Verify both rounds are incomplete
2. **Team Consistency**: Ensure both rounds involve the same participants
3. **Match Pairing Preservation**: Validate that swapping maintains fair pairings
4. **Conflict Detection**: Check for scheduling conflicts after swap
5. **Bye Compatibility**: For odd player counts, ensure bye assignments remain valid

#### Implementation Strategy
1. **Pre-swap Validation**: Run comprehensive checks before allowing swap
2. **Atomic Operation**: Ensure swap completes fully or rolls back entirely
3. **Time Recalculation**: Update all match times based on new round order
4. **State Synchronization**: Update tournament state and persist changes
5. **Conflict Resolution**: Provide suggestions if conflicts arise

#### Use Cases
- **Late Player Accommodation**: Move a player's bye round to accommodate late arrival
- **Scheduling Flexibility**: Adjust round order for facility or timing constraints
- **Player Requests**: Handle specific timing needs for individual participants

## Error Handling

### Client-Side Error Handling
- **Validation Errors**: Real-time form validation with clear error messages
- **Storage Errors**: LocalStorage quota and access error handling
- **State Errors**: Graceful degradation with error boundaries
- **Schedule Conflicts**: Visual indicators and resolution suggestions
- **Algorithm Errors**: Fallback scheduling strategies for edge cases

### Error Response Format
```typescript
interface AppError {
  type: 'validation' | 'storage' | 'algorithm' | 'state';
  message: string;
  details?: any;
  timestamp: Date;
}
```

## Testing Strategy

### Unit Testing
- **Algorithm Testing**: Comprehensive tests for round robin generation and partnership algorithms
- **Component Testing**: React component testing with React Testing Library
- **Storage Testing**: LocalStorage operations and data persistence testing
- **Utility Testing**: Helper function and validation testing

### Integration Testing
- **Storage Integration**: Data persistence and retrieval from localStorage
- **Schedule Generation**: Complete tournament creation workflows
- **State Management**: React Context and localStorage synchronization

### End-to-End Testing
- **User Workflows**: Complete tournament setup and management flows
- **Cross-browser Testing**: Ensure compatibility across modern browsers
- **LocalStorage Testing**: Data persistence across browser sessions

### Test Data Strategy
- **Mock Tournaments**: Predefined tournament scenarios for testing
- **Edge Cases**: Odd participant counts, minimum/maximum limits
- **Storage Limits**: Testing localStorage quota and large tournament data

## Performance Considerations

### Frontend Optimization
- **Code Splitting**: Lazy loading of tournament management components
- **Memoization**: React.memo for expensive calculations and algorithm results
- **Virtual Scrolling**: For large participant and match lists
- **Debounced Updates**: For real-time search and filtering
- **LocalStorage Optimization**: Efficient serialization and batch updates

### Algorithm Optimization
- **Precomputed Schedules**: Cache common tournament configurations in memory
- **Incremental Updates**: Efficient recalculation for schedule changes
- **Memory Management**: Optimize data structures for large tournaments
- **Lazy Loading**: Generate schedule data on-demand rather than all at once

### Storage Optimization
- **Data Compression**: Minimize localStorage usage with efficient data structures
- **Selective Persistence**: Only save essential data, compute derived values on load
- **Cleanup Strategies**: Remove old tournament data to manage storage limits