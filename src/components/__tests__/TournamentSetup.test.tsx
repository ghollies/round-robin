import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TournamentSetup from '../TournamentSetup';

describe('TournamentSetup Component', () => {
  const mockOnTournamentCreate = jest.fn();

  beforeEach(() => {
    mockOnTournamentCreate.mockClear();
  });

  describe('Initial Form Rendering', () => {
    it('renders tournament setup form with all required fields', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      expect(screen.getByLabelText(/tournament name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tournament mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of players/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of courts/i)).toBeInTheDocument();
      
      // Expand advanced section to see other fields
      const advancedButton = screen.getByRole('button', { name: /advanced settings/i });
      await user.click(advancedButton);
      
      expect(screen.getByLabelText(/match duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/point limit/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/win condition/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/enable time limits/i)).toBeInTheDocument();
    });

    it('has default values set correctly', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      expect(screen.getByRole('combobox', { name: /tournament mode/i })).toHaveValue('individual-signup');
      expect(screen.getByDisplayValue('8')).toBeInTheDocument(); // participant count
      expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // court count
      
      // Expand advanced section to see other fields
      const advancedButton = screen.getByRole('button', { name: /advanced settings/i });
      await user.click(advancedButton);
      
      expect(screen.getByDisplayValue('20')).toBeInTheDocument(); // match duration
      expect(screen.getByDisplayValue('11')).toBeInTheDocument(); // point limit
      expect(screen.getByRole('combobox', { name: /win condition/i })).toHaveValue('win-by-2');
      expect(screen.getByLabelText(/enable time limits/i)).toBeChecked();
    });

    it('shows appropriate help text for tournament modes', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      // Individual signup mode help text
      expect(screen.getByText(/players sign up individually/i)).toBeInTheDocument();
      
      // Switch to pair signup mode
      await user.selectOptions(screen.getByLabelText(/tournament mode/i), 'pair-signup');
      expect(screen.getByText(/teams of 2 players sign up together/i)).toBeInTheDocument();
    });

    it('toggles advanced section visibility', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      // Advanced section should be collapsed by default
      expect(screen.queryByLabelText(/match duration/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/point limit/i)).not.toBeInTheDocument();
      
      // Expand advanced section
      const advancedButton = screen.getByRole('button', { name: /advanced settings/i });
      await user.click(advancedButton);
      
      // Fields should now be visible
      expect(screen.getByLabelText(/match duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/point limit/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/win condition/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/enable time limits/i)).toBeInTheDocument();
      
      // Collapse advanced section
      await user.click(advancedButton);
      
      // Fields should be hidden again
      expect(screen.queryByLabelText(/match duration/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/point limit/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required tournament name', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/tournament name is required/i)).toBeInTheDocument();
    });

    it('validates participant count for individual signup mode', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '2');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/number of individual players must be between 4 and 32/i)).toBeInTheDocument();
    });

    it('validates participant count for pair signup mode', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.selectOptions(screen.getByLabelText(/tournament mode/i), 'pair-signup');
      await user.clear(screen.getByLabelText(/number of teams/i));
      await user.type(screen.getByLabelText(/number of teams/i), '50');
      
      const nextButton = screen.getByRole('button', { name: /next: enter teams/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/number of teams must be between 4 and 32/i)).toBeInTheDocument();
    });

    it('validates court count range', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of courts/i));
      await user.type(screen.getByLabelText(/number of courts/i), '20');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/maximum of 16 courts is supported/i)).toBeInTheDocument();
    });

    it('validates match duration range', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      
      // Expand advanced section
      const advancedButton = screen.getByRole('button', { name: /advanced settings/i });
      await user.click(advancedButton);
      
      await user.clear(screen.getByLabelText(/match duration/i));
      await user.type(screen.getByLabelText(/match duration/i), '10');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/match duration must be at least 15 minutes/i)).toBeInTheDocument();
    });

    it('validates point limit is positive', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      
      // Expand advanced section
      const advancedButton = screen.getByRole('button', { name: /advanced settings/i });
      await user.click(advancedButton);
      
      await user.clear(screen.getByLabelText(/point limit/i));
      await user.type(screen.getByLabelText(/point limit/i), '0');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/point limit must be a positive whole number/i)).toBeInTheDocument();
    });

    it('clears errors when user corrects input', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/tournament name is required/i)).toBeInTheDocument();
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      
      expect(screen.queryByText(/tournament name is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Participant Entry', () => {
    it('shows bulk entry tab by default', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Check that bulk entry tab is active by default
      expect(screen.getByRole('button', { name: /bulk entry/i })).toHaveClass('active');
      expect(screen.getByLabelText(/enter names/i)).toBeInTheDocument();
    });

    it('switches between bulk and individual entry tabs', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Should start on bulk entry
      expect(screen.getByLabelText(/enter names/i)).toBeInTheDocument();
      
      // Switch to individual entry
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      expect(screen.getAllByLabelText(/player \d+/i)).toHaveLength(8);
      
      // Switch back to bulk entry
      await user.click(screen.getByRole('button', { name: /bulk entry/i }));
      expect(screen.getByLabelText(/enter names/i)).toBeInTheDocument();
    });

    it('parses comma-separated names in bulk entry', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      const textarea = screen.getByLabelText(/enter names/i);
      await user.type(textarea, 'John Doe, Jane Smith, Bob Johnson, Alice Brown');
      
      // Check preview shows 4 names
      expect(screen.getByText(/preview \(4 players\)/i)).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('parses newline-separated names in bulk entry', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      const textarea = screen.getByLabelText(/enter names/i);
      await user.type(textarea, 'John Doe\nJane Smith\nBob Johnson\nAlice Cooper');
      
      // Check preview shows 4 names
      expect(screen.getByText(/preview \(4 players\)/i)).toBeInTheDocument();
    });

    it('removes leading numbers from bulk entry names', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      const textarea = screen.getByLabelText(/enter names/i);
      await user.type(textarea, '1. bill\n2. sasdaa\n3. sdfs\n4. ds');
      
      // Check preview shows names without numbers
      expect(screen.getByText('bill')).toBeInTheDocument();
      expect(screen.getByText('sasdaa')).toBeInTheDocument();
      expect(screen.getByText('sdfs')).toBeInTheDocument();
      expect(screen.getByText('ds')).toBeInTheDocument();
      
      // Create tournament and verify names are stored without numbers
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(mockOnTournamentCreate).toHaveBeenCalledWith(
        expect.anything(),
        ['bill', 'sasdaa', 'sdfs', 'ds']
      );
    });

    it('creates tournament with bulk entry names', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      const textarea = screen.getByLabelText(/enter names/i);
      await user.type(textarea, 'John Doe, Jane Smith, Bob Johnson, Alice Brown');
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(mockOnTournamentCreate).toHaveBeenCalledWith(
        expect.anything(),
        ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown']
      );
    });

    it('validates participant count in bulk entry', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      const textarea = screen.getByLabelText(/enter names/i);
      await user.type(textarea, 'John Doe, Jane Smith'); // Only 2 names
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(screen.getByText(/expected 4 players, but found 2/i)).toBeInTheDocument();
    });

    it('pre-populates participant input fields with default text values', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Switch to individual entry tab
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      
      // Check that input fields are pre-populated with default values
      expect(screen.getByDisplayValue('Player 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Player 2')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Player 3')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Player 4')).toBeInTheDocument();
    });

    it('allows submitting tournament with default player names', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Switch to individual entry tab
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      
      // Submit without changing the pre-populated values
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(mockOnTournamentCreate).toHaveBeenCalledWith(
        expect.anything(),
        ['Player 1', 'Player 2', 'Player 3', 'Player 4']
      );
    });

    it('shows participant entry form after valid tournament setup', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/enter player names/i)).toBeInTheDocument();
      
      // Switch to individual entry to see the fields
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      expect(screen.getAllByLabelText(/player \d+/i)).toHaveLength(4);
    });

    it('shows team entry form for pair signup mode', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.selectOptions(screen.getByLabelText(/tournament mode/i), 'pair-signup');
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of teams/i));
      await user.type(screen.getByLabelText(/number of teams/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter teams/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/enter team names/i)).toBeInTheDocument();
      
      // Switch to individual entry to see the fields
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      expect(screen.getAllByLabelText(/team \d+/i)).toHaveLength(4);
    });

    it('validates required participant names in individual entry', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Switch to individual entry tab
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      
      // Clear the pre-populated values to test validation
      const playerInputs = screen.getAllByLabelText(/player \d+/i);
      for (const input of playerInputs) {
        await user.clear(input);
      }
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(screen.getAllByText(/name is required/i)).toHaveLength(4);
    });

    it('detects duplicate participant names in bulk entry', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      const textarea = screen.getByLabelText(/enter names/i);
      await user.type(textarea, 'John Doe, Jane Smith, john doe, Bob Johnson'); // Duplicate
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(screen.getByText(/all participant names must be unique/i)).toBeInTheDocument();
    });

    it('detects duplicate participant names in individual entry', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Switch to individual entry tab
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      
      const playerInputs = screen.getAllByLabelText(/player \d+/i);
      // Clear pre-populated values and enter new ones
      await user.clear(playerInputs[0]);
      await user.type(playerInputs[0], 'John Doe');
      await user.clear(playerInputs[1]);
      await user.type(playerInputs[1], 'Jane Smith');
      await user.clear(playerInputs[2]);
      await user.type(playerInputs[2], 'john doe'); // Case insensitive duplicate
      await user.clear(playerInputs[3]);
      await user.type(playerInputs[3], 'Bob Johnson');
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(screen.getByText(/all participant names must be unique/i)).toBeInTheDocument();
      expect(screen.getAllByText(/duplicate name detected/i)).toHaveLength(2);
    });

    it('allows going back to tournament setup from participant entry', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/enter player names/i)).toBeInTheDocument();
      
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      
      expect(screen.getByText(/tournament setup/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Tournament')).toBeInTheDocument();
    });

    it('clears participant errors when user types in individual entry', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Switch to individual entry tab
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      
      // Clear the pre-populated values to test validation
      const playerInputs = screen.getAllByLabelText(/player \d+/i);
      for (const input of playerInputs) {
        await user.clear(input);
      }
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(screen.getAllByText(/name is required/i)).toHaveLength(4);
      
      await user.type(playerInputs[0], 'John Doe');
      
      // Error should be cleared for the first input
      expect(screen.getAllByText(/name is required/i)).toHaveLength(3);
    });
  });

  describe('Tournament Creation', () => {
    it('creates tournament with valid data using bulk entry', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      // Fill tournament setup
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.selectOptions(screen.getByLabelText(/tournament mode/i), 'individual-signup');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      await user.clear(screen.getByLabelText(/number of courts/i));
      await user.type(screen.getByLabelText(/number of courts/i), '2');
      
      // Expand advanced section
      const advancedButton = screen.getByRole('button', { name: /advanced settings/i });
      await user.click(advancedButton);
      
      await user.clear(screen.getByLabelText(/match duration/i));
      await user.type(screen.getByLabelText(/match duration/i), '25');
      await user.clear(screen.getByLabelText(/point limit/i));
      await user.type(screen.getByLabelText(/point limit/i), '15');
      await user.selectOptions(screen.getByLabelText(/win condition/i), 'first-to-limit');
      await user.click(screen.getByLabelText(/enable time limits/i)); // Uncheck
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Use bulk entry (default)
      const textarea = screen.getByLabelText(/enter names/i);
      await user.type(textarea, 'John Doe, Jane Smith, Bob Johnson, Alice Brown');
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(mockOnTournamentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Tournament',
          mode: 'individual-signup',
          settings: expect.objectContaining({
            courtCount: 2,
            matchDuration: 25,
            pointLimit: 15,
            scoringRule: 'first-to-limit',
            timeLimit: false,
            startDateTime: expect.any(Date),
          }),
          status: 'setup',
          id: expect.any(String),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          scheduledStartTime: expect.any(Date),
        }),
        ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown']
      );
    });

    it('creates tournament with valid data using individual entry', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      // Fill tournament setup
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.selectOptions(screen.getByLabelText(/tournament mode/i), 'individual-signup');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      await user.clear(screen.getByLabelText(/number of courts/i));
      await user.type(screen.getByLabelText(/number of courts/i), '2');
      
      // Expand advanced section
      const advancedButton = screen.getByRole('button', { name: /advanced settings/i });
      await user.click(advancedButton);
      
      await user.clear(screen.getByLabelText(/match duration/i));
      await user.type(screen.getByLabelText(/match duration/i), '25');
      await user.clear(screen.getByLabelText(/point limit/i));
      await user.type(screen.getByLabelText(/point limit/i), '15');
      await user.selectOptions(screen.getByLabelText(/win condition/i), 'first-to-limit');
      await user.click(screen.getByLabelText(/enable time limits/i)); // Uncheck
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Switch to individual entry
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      
      // Fill participant names - clear pre-populated values first
      const playerInputs = screen.getAllByLabelText(/player \d+/i);
      await user.clear(playerInputs[0]);
      await user.type(playerInputs[0], 'John Doe');
      await user.clear(playerInputs[1]);
      await user.type(playerInputs[1], 'Jane Smith');
      await user.clear(playerInputs[2]);
      await user.type(playerInputs[2], 'Bob Johnson');
      await user.clear(playerInputs[3]);
      await user.type(playerInputs[3], 'Alice Brown');
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(mockOnTournamentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Tournament',
          mode: 'individual-signup',
          settings: expect.objectContaining({
            courtCount: 2,
            matchDuration: 25,
            pointLimit: 15,
            scoringRule: 'first-to-limit',
            timeLimit: false,
            startDateTime: expect.any(Date),
          }),
          status: 'setup',
          id: expect.any(String),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          scheduledStartTime: expect.any(Date),
        }),
        ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown']
      );
    });

    it('creates tournament with pair signup mode', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Pairs Tournament');
      await user.selectOptions(screen.getByLabelText(/tournament mode/i), 'pair-signup');
      await user.clear(screen.getByLabelText(/number of teams/i));
      await user.type(screen.getByLabelText(/number of teams/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter teams/i });
      await user.click(nextButton);
      
      // Use bulk entry
      const textarea = screen.getByLabelText(/enter names/i);
      await user.type(textarea, 'Smith/Johnson\nBrown/Davis\nWilson/Miller\nTaylor/Anderson');
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      // Debug: Check if the function was called at all
      expect(mockOnTournamentCreate).toHaveBeenCalled();
      
      expect(mockOnTournamentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pairs Tournament',
          mode: 'pair-signup',
        }),
        ['Smith/Johnson', 'Brown/Davis', 'Wilson/Miller', 'Taylor/Anderson']
      );
    });

    it('trims whitespace from participant names', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Use bulk entry with extra whitespace
      const textarea = screen.getByLabelText(/enter names/i);
      await user.type(textarea, '  John Doe  , Jane Smith , Bob Johnson,  Alice Brown');
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(mockOnTournamentCreate).toHaveBeenCalledWith(
        expect.anything(),
        ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown']
      );
    });
  });

  describe('Responsive Design and Accessibility', () => {
    it('has proper form labels and accessibility attributes', () => {
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      const nameInput = screen.getByLabelText(/tournament name/i);
      expect(nameInput).toHaveAttribute('id', 'name');
      expect(nameInput).toHaveAttribute('type', 'text');
      
      const modeSelect = screen.getByLabelText(/tournament mode/i);
      expect(modeSelect).toHaveAttribute('id', 'mode');
      
      const courtInput = screen.getByLabelText(/number of courts/i);
      expect(courtInput).toHaveAttribute('type', 'number');
      expect(courtInput).toHaveAttribute('min', '1');
      expect(courtInput).toHaveAttribute('max', '16');
    });

    it('shows proper placeholder text for participant inputs', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      
      // Individual signup mode
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Switch to individual entry to see placeholders
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      
      const playerInputs = screen.getAllByPlaceholderText(/player name/i);
      expect(playerInputs).toHaveLength(8); // Default participant count
      
      await user.click(screen.getByRole('button', { name: /back/i }));
      
      // Pair signup mode
      await user.selectOptions(screen.getByLabelText(/tournament mode/i), 'pair-signup');
      await user.click(screen.getByRole('button', { name: /next: enter teams/i }));
      
      // Switch to individual entry to see placeholders
      await user.click(screen.getByRole('button', { name: /individual entry/i }));
      
      const teamInputs = screen.getAllByPlaceholderText(/smith\/johnson/i);
      expect(teamInputs).toHaveLength(8); // Default participant count
    });
  });
});