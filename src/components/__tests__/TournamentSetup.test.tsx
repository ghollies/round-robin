import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TournamentSetup from '../TournamentSetup';

describe('TournamentSetup Component', () => {
  const mockOnTournamentCreate = jest.fn();

  beforeEach(() => {
    mockOnTournamentCreate.mockClear();
  });

  describe('Initial Form Rendering', () => {
    it('renders tournament setup form with all required fields', () => {
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      expect(screen.getByLabelText(/tournament name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tournament mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of players/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of courts/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/match duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/point limit/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/win condition/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/enable time limits/i)).toBeInTheDocument();
    });

    it('has default values set correctly', () => {
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      expect(screen.getByRole('combobox', { name: /tournament mode/i })).toHaveValue('individual-signup');
      expect(screen.getByDisplayValue('8')).toBeInTheDocument(); // participant count
      expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // court count
      expect(screen.getByDisplayValue('30')).toBeInTheDocument(); // match duration
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
      
      expect(screen.getByText(/number of courts must be between 1 and 16/i)).toBeInTheDocument();
    });

    it('validates match duration range', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/match duration/i));
      await user.type(screen.getByLabelText(/match duration/i), '10');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/match duration must be between 15 and 60 minutes/i)).toBeInTheDocument();
    });

    it('validates point limit is positive', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/point limit/i));
      await user.type(screen.getByLabelText(/point limit/i), '0');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/point limit must be a positive number/i)).toBeInTheDocument();
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
    it('shows participant entry form after valid tournament setup', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      expect(screen.getByText(/enter player names/i)).toBeInTheDocument();
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
      expect(screen.getAllByLabelText(/team \d+/i)).toHaveLength(4);
    });

    it('validates required participant names', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(screen.getAllByText(/name is required/i)).toHaveLength(4);
    });

    it('detects duplicate participant names', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      const playerInputs = screen.getAllByLabelText(/player \d+/i);
      await user.type(playerInputs[0], 'John Doe');
      await user.type(playerInputs[1], 'Jane Smith');
      await user.type(playerInputs[2], 'john doe'); // Case insensitive duplicate
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

    it('clears participant errors when user types', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(screen.getAllByText(/name is required/i)).toHaveLength(4);
      
      const playerInputs = screen.getAllByLabelText(/player \d+/i);
      await user.type(playerInputs[0], 'John Doe');
      
      // Error should be cleared for the first input
      expect(screen.getAllByText(/name is required/i)).toHaveLength(3);
    });
  });

  describe('Tournament Creation', () => {
    it('creates tournament with valid data', async () => {
      const user = userEvent.setup();
      render(<TournamentSetup onTournamentCreate={mockOnTournamentCreate} />);
      
      // Fill tournament setup
      await user.type(screen.getByLabelText(/tournament name/i), 'Test Tournament');
      await user.selectOptions(screen.getByLabelText(/tournament mode/i), 'individual-signup');
      await user.clear(screen.getByLabelText(/number of players/i));
      await user.type(screen.getByLabelText(/number of players/i), '4');
      await user.clear(screen.getByLabelText(/number of courts/i));
      await user.type(screen.getByLabelText(/number of courts/i), '2');
      await user.clear(screen.getByLabelText(/match duration/i));
      await user.type(screen.getByLabelText(/match duration/i), '25');
      await user.clear(screen.getByLabelText(/point limit/i));
      await user.type(screen.getByLabelText(/point limit/i), '15');
      await user.selectOptions(screen.getByLabelText(/win condition/i), 'first-to-limit');
      await user.click(screen.getByLabelText(/enable time limits/i)); // Uncheck
      
      const nextButton = screen.getByRole('button', { name: /next: enter players/i });
      await user.click(nextButton);
      
      // Fill participant names
      const playerInputs = screen.getAllByLabelText(/player \d+/i);
      await user.type(playerInputs[0], 'John Doe');
      await user.type(playerInputs[1], 'Jane Smith');
      await user.type(playerInputs[2], 'Bob Johnson');
      await user.type(playerInputs[3], 'Alice Brown');
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
      expect(mockOnTournamentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Tournament',
          mode: 'individual-signup',
          settings: {
            courtCount: 2,
            matchDuration: 25,
            pointLimit: 15,
            scoringRule: 'first-to-limit',
            timeLimit: false,
          },
          status: 'setup',
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
      
      const teamInputs = screen.getAllByLabelText(/team \d+/i);
      await user.type(teamInputs[0], 'Smith/Johnson');
      await user.type(teamInputs[1], 'Brown/Davis');
      await user.type(teamInputs[2], 'Wilson/Miller');
      await user.type(teamInputs[3], 'Taylor/Anderson');
      
      const createButton = screen.getByRole('button', { name: /create tournament/i });
      await user.click(createButton);
      
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
      
      const playerInputs = screen.getAllByLabelText(/player \d+/i);
      await user.type(playerInputs[0], '  John Doe  ');
      await user.type(playerInputs[1], ' Jane Smith ');
      await user.type(playerInputs[2], 'Bob Johnson');
      await user.type(playerInputs[3], '  Alice Brown');
      
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
      
      const playerInputs = screen.getAllByPlaceholderText(/player name/i);
      expect(playerInputs).toHaveLength(8); // Default participant count
      
      await user.click(screen.getByRole('button', { name: /back/i }));
      
      // Pair signup mode
      await user.selectOptions(screen.getByLabelText(/tournament mode/i), 'pair-signup');
      await user.click(screen.getByRole('button', { name: /next: enter teams/i }));
      
      const teamInputs = screen.getAllByPlaceholderText(/smith\/johnson/i);
      expect(teamInputs).toHaveLength(8); // Default participant count
    });
  });
});