# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Initialize React TypeScript project with Create React App
  - Configure ESLint, Prettier, and TypeScript strict mode
  - Set up GitHub repository with Pages deployment workflow
  - Create basic folder structure for components, hooks, utils, and types
  - Verify local development server runs successfully (npm start)
  - _Requirements: 1.1, 1.4_

- [x] 2. Implement core data models and TypeScript interfaces
  - Define Tournament, Participant, Team, Match, and Round interfaces
  - Create AppError interface for error handling
  - Implement data validation schemas for all models
  - Write utility functions for ID generation and data serialization
  - _Requirements: 1.1, 2.3, 2.5_

- [x] 3. Create localStorage service layer
  - Implement storage operations (save, load, update, delete)
  - Add error handling for storage quota and access issues
  - Create data migration utilities for schema changes
  - Write unit tests for all storage operations
  - _Requirements: 1.8, 8.3_

- [ ] 4. Build tournament setup and player entry components with automatic schedule generation
  - Create tournament configuration form with validation
  - Implement player entry interface with duplicate detection
  - Add form validation for all tournament parameters
  - Integrate automatic schedule generation upon tournament completion
  - Create seamless transition from setup to schedule view
  - Create responsive UI components with proper error display
  - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 2.1, 2.2, 2.4, 2.5, 5.6_

- [x] 5. Implement individual signup round robin algorithm
  - Create partnership matrix tracking system
  - Implement systematic player rotation algorithm
  - Add bye round management for odd player counts
  - Ensure each player partners with every other player exactly once
  - Ensure each player plays against every other player exactly twice
  - Write comprehensive unit tests for algorithm correctness
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 3.1, 3.2, 3.4, 3.5_

- [x] 6. Build schedule generation and optimization
  - Implement court assignment and time slot calculation
  - Add rest period management between consecutive matches
  - Create schedule visualization with multiple view options
  - Optimize tournament duration with available courts
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Create schedule display and printing functionality
  - Build comprehensive schedule display component
  - Implement chronological and player-specific schedule views
  - Add print-optimized formatting and PDF export capability
  - Create clear match information display (time, court, teams)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Implement real-time schedule management
  - Create drag-and-drop match rescheduling interface
  - Add court reassignment with conflict detection
  - Implement round order swapping for incomplete rounds
  - Build change history logging and undo functionality
  - Add visual conflict indicators and resolution suggestions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 8.1 Implement round swapping functionality for player accommodation
  - Add round swap validation logic to ensure only incomplete rounds can be swapped
  - Create validateRoundSwap function to check team consistency between rounds
  - Implement swapRounds function with atomic operation guarantees
  - Add UI controls for selecting and swapping rounds in schedule management
  - Create conflict detection and resolution for round swaps
  - Add time slot recalculation after round swaps
  - Write unit tests for round swap validation and execution
  - _Requirements: 7.5, 7.6, 7.7, 7.8, 7.9_

- [x] 9. Build score entry and match result tracking
  - Create score input interface with validation against tournament rules
  - Implement win condition checking for both time and point limits
  - Add match completion status tracking and updates
  - Handle matches ending due to time limits with current score recording
  - _Requirements: 8.1, 8.2, 8.6, 8.7_

- [x] 10. Implement player statistics and standings system
  - Create real-time statistics calculation for individual players
  - Build standings dashboard with sortable rankings table
  - Implement point differential tracking and win/loss records
  - Add live standings updates after each match result entry
  - Create tournament winner identification and highlighting
  - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.8_

- [x] 11. Add React Context state management
  - Create tournament context provider with localStorage synchronization
  - Implement state management for tournament data, matches, and standings
  - Add optimistic updates with error rollback capabilities
  - Create custom hooks for tournament operations and data access
  - _Requirements: 1.8, 8.3, 8.6_

- [x] 12. Implement error handling and user feedback
  - Create error boundary components for graceful error handling
  - Add comprehensive form validation with clear error messages
  - Implement storage error handling with user-friendly messages
  - Create loading states and success feedback for all operations
  - _Requirements: 1.8, 2.5, 8.2_

- [x] 13. Build responsive UI and styling
  - Implement responsive design for mobile and desktop use
  - Create consistent styling system with CSS modules or Tailwind
  - Add accessibility features (ARIA labels, keyboard navigation)
  - Optimize UI for tournament director workflow efficiency
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 14. Add data export and import functionality
  - Implement tournament data export as JSON
  - Create tournament backup and restore capabilities
  - Add schedule export for external sharing
  - Build data validation for imported tournament files
  - _Requirements: 6.5_

- [x] 15. Write comprehensive test suite
  - Create unit tests for all algorithm functions and utilities
  - Add component tests for all React components
  - Implement integration tests for complete tournament workflows
  - Create end-to-end tests for critical user journeys
  - Test localStorage operations and data persistence
  - _Requirements: 4.2, 4.3, 4.4, 5.1, 8.3_

- [x] 16. Fix individual signup round robin algorithm partnership generation
  - Debug and fix the "Not all partnerships have been used" error in schedule generation
  - Implement proper opponent team creation for individual signup tournaments
  - Ensure each player partners with every other player exactly once
  - Ensure each player plays against every other player exactly twice
  - Fix the partnership matrix validation to work with the complete algorithm
  - Add comprehensive unit tests for the fixed algorithm
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 17. Set up GitHub Pages deployment
  - Configure GitHub Actions workflow for automated deployment
  - Set up build optimization for production
  - Add environment-specific configuration
  - Test deployment process and verify functionality
  - Create deployment documentation
  - _Requirements: 1.1_

- [x] 17. Performance optimization and final polish
  - Implement code splitting and lazy loading for components
  - Add memoization for expensive calculations
  - Optimize localStorage usage and data structures
  - Create loading states and performance monitoring
  - Final testing and bug fixes
  - _Requirements: 5.1, 8.3_

- [x] 18. Add tournament listing and management dashboard
  - Create tournament list component showing all saved tournaments
  - Display tournament status (setup, active, completed) with visual indicators
  - Show key tournament info (name, participants, creation date, progress)
  - Add actions to resume/continue managing existing tournaments
  - Implement tournament deletion with confirmation dialog
  - Replace demo navigation with tournament listing on home page
  - Add search and filter functionality for tournament list
  - Create responsive design for tournament cards/list view
  - _Requirements: 1.1, 6.1, 8.6_

- [x] 19. Fix score editing to update rather than add duplicate statistics
  - Modify updateParticipantStatisticsFromMatch to handle match result updates properly
  - Implement logic to detect when a match already has results and subtract old statistics
  - Add recalculateAllStatistics call when match results are updated to ensure accuracy
  - Update ScoreEntry component to use proper statistics update flow
  - Add unit tests to verify statistics are correctly updated when scores are edited
  - Ensure standings display reflects accurate statistics after score edits
  - _Requirements: 8.3, 8.4, 8.5, 8.6_

- [x] 20. Enhance round swap UI to display player names in round boxes
  - Add helper function to get participant names from team IDs in matches
  - Update round card rendering to display team player names in compact format
  - Implement name abbreviation logic for long names to maintain readability
  - Add team pairing display showing "Player1/Player2" format for each match
  - Update CSS styling to accommodate player names while keeping compact layout
  - Ensure player names are clearly visible but don't overwhelm the round box design
  - Test with various name lengths and tournament sizes to ensure proper display
  - _Requirements: 7.10, 7.11_

- [ ] 21. Add tournament start date/time scheduling functionality
  - Add date/time picker input fields to tournament setup form
  - Implement validation to ensure selected date/time is in the future
  - Update Tournament interface to include scheduledStartTime field
  - Modify schedule generation to use specified start time instead of current time + 1 minute
  - Add default behavior to use current time + 30 minutes if no start time specified
  - Update tournament status to include 'scheduled' state for future tournaments
  - Modify tournament list to display scheduled start time for future tournaments
  - Update schedule display to show actual tournament start time
  - Add unit tests for date/time validation and schedule generation with custom start times
  - _Requirements: 1.9, 1.10, 1.11, 1.12_