import React, { useState, useEffect } from 'react';
import { Tournament, Participant, Team, Match } from '../types/tournament';
import { StandingsDashboard } from './StandingsDashboard';
import { 
  saveTournament, 
  saveParticipant, 
  saveTeam, 
  saveMatch,
  loadTournament,
  loadParticipantsByTournament 
} from '../utils/storage';
import { createParticipant, generateId } from '../utils/index';

export const StandingsDashboardDemo: React.FC = () => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const setupDemoData = async () => {
      try {
        const tournamentId = 'demo-standings-tournament';
        
        // Check if demo tournament already exists
        let existingTournament = loadTournament(tournamentId);
        
        if (!existingTournament) {
          // Create demo tournament
          const demoTournament: Tournament = {
            id: tournamentId,
            name: 'Demo Standings Tournament',
            mode: 'individual-signup',
            settings: {
              courtCount: 2,
              matchDuration: 30,
              pointLimit: 11,
              scoringRule: 'win-by-2',
              timeLimit: true
            },
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Create demo participants with varied statistics
          const participantNames = [
            'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson',
            'Emma Brown', 'Frank Miller', 'Grace Lee', 'Henry Taylor'
          ];

          const participants: Participant[] = participantNames.map(name => 
            createParticipant(tournamentId, name)
          );

          // Add some demo statistics to make the standings interesting
          participants[0].statistics = { gamesWon: 5, gamesLost: 1, totalPointsScored: 66, totalPointsAllowed: 45, pointDifferential: 21 };
          participants[1].statistics = { gamesWon: 4, gamesLost: 2, totalPointsScored: 58, totalPointsAllowed: 52, pointDifferential: 6 };
          participants[2].statistics = { gamesWon: 4, gamesLost: 2, totalPointsScored: 55, totalPointsAllowed: 48, pointDifferential: 7 };
          participants[3].statistics = { gamesWon: 3, gamesLost: 3, totalPointsScored: 52, totalPointsAllowed: 55, pointDifferential: -3 };
          participants[4].statistics = { gamesWon: 3, gamesLost: 3, totalPointsScored: 48, totalPointsAllowed: 51, pointDifferential: -3 };
          participants[5].statistics = { gamesWon: 2, gamesLost: 4, totalPointsScored: 44, totalPointsAllowed: 58, pointDifferential: -14 };
          participants[6].statistics = { gamesWon: 2, gamesLost: 4, totalPointsScored: 41, totalPointsAllowed: 56, pointDifferential: -15 };
          participants[7].statistics = { gamesWon: 1, gamesLost: 5, totalPointsScored: 38, totalPointsAllowed: 67, pointDifferential: -29 };

          // Create some demo teams (for individual signup, teams are temporary)
          const teams: Team[] = [
            {
              id: generateId(),
              tournamentId,
              player1Id: participants[0].id,
              player2Id: participants[1].id,
              isPermanent: false
            },
            {
              id: generateId(),
              tournamentId,
              player1Id: participants[2].id,
              player2Id: participants[3].id,
              isPermanent: false
            }
          ];

          // Create some demo completed matches
          const matches: Match[] = [
            {
              id: generateId(),
              tournamentId,
              roundNumber: 1,
              matchNumber: 1,
              team1Id: teams[0].id,
              team2Id: teams[1].id,
              courtNumber: 1,
              scheduledTime: new Date(Date.now() - 3600000), // 1 hour ago
              status: 'completed',
              result: {
                team1Score: 11,
                team2Score: 8,
                winnerId: teams[0].id,
                completedAt: new Date(Date.now() - 3000000), // 50 minutes ago
                endReason: 'points'
              }
            }
          ];

          // Save all demo data
          saveTournament(demoTournament);
          participants.forEach(p => saveParticipant(p));
          teams.forEach(t => saveTeam(t));
          matches.forEach(m => saveMatch(m));

          existingTournament = demoTournament;
        }

        setTournament(existingTournament);
      } catch (error) {
        console.error('Error setting up demo data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setupDemoData();
  }, []);

  const handleRefresh = () => {
    // Simulate a refresh by reloading participant data
    if (tournament) {
      const participants = loadParticipantsByTournament(tournament.id);
      console.log('Refreshed standings data:', participants.length, 'participants');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Standings Demo...</h2>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error loading demo tournament</h2>
        <p>Please refresh the page to try again.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderBottom: '1px solid #dee2e6',
        marginBottom: '20px'
      }}>
        <h1>Standings Dashboard Demo</h1>
        <p>
          This demo shows the standings dashboard with sample tournament data. 
          The standings are calculated in real-time based on match results and show:
        </p>
        <ul style={{ marginLeft: '20px' }}>
          <li>Player rankings based on games won and point differential</li>
          <li>Detailed statistics including win percentage and averages</li>
          <li>Tournament winner identification when complete</li>
          <li>Sortable columns for different views of the data</li>
          <li>Real-time updates after each match result entry</li>
        </ul>
      </div>

      <StandingsDashboard 
        tournament={tournament} 
        onRefresh={handleRefresh}
      />
    </div>
  );
};

export default StandingsDashboardDemo;