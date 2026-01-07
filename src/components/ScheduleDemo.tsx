import React, { useState } from 'react';
import { Participant } from '../types/tournament';
import { generateOptimizedSchedule, GeneratedSchedule } from '../utils/scheduleGenerator';
import { createTournament, createParticipant } from '../utils/index';
import ScheduleDisplay from './ScheduleDisplay';

const ScheduleDemo: React.FC = () => {
  const [schedule, setSchedule] = useState<GeneratedSchedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDemoSchedule = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Create a demo tournament
      const tournament = createTournament('Demo Tournament', 'individual-signup', {
        courtCount: 2,
        matchDuration: 20,
        pointLimit: 11,
        scoringRule: 'win-by-2',
        timeLimit: true
      });

      // Create demo participants
      const participants: Participant[] = [
        createParticipant(tournament.id, 'Alice Johnson'),
        createParticipant(tournament.id, 'Bob Smith'),
        createParticipant(tournament.id, 'Charlie Brown'),
        createParticipant(tournament.id, 'Diana Wilson'),
        createParticipant(tournament.id, 'Eve Davis'),
        createParticipant(tournament.id, 'Frank Miller')
      ];

      // Generate optimized schedule
      const generatedSchedule = generateOptimizedSchedule(tournament, participants, {
        startTime: new Date(Date.now() + 60000) // Start in 1 minute
      });

      setSchedule(generatedSchedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearSchedule = () => {
    setSchedule(null);
    setError(null);
  };

  if (schedule) {
    const participants: Participant[] = [
      createParticipant('demo', 'Alice Johnson'),
      createParticipant('demo', 'Bob Smith'),
      createParticipant('demo', 'Charlie Brown'),
      createParticipant('demo', 'Diana Wilson'),
      createParticipant('demo', 'Eve Davis'),
      createParticipant('demo', 'Frank Miller')
    ];

    return (
      <div>
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button 
            onClick={clearSchedule}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Demo
          </button>
        </div>
        <ScheduleDisplay 
          schedule={schedule} 
          participants={participants}
        />
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px 20px',
      textAlign: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
    }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>
        Schedule Generation Demo
      </h1>
      
      <p style={{ 
        fontSize: '1.1rem', 
        color: '#6c757d', 
        marginBottom: '40px',
        lineHeight: '1.6'
      }}>
        This demo shows the schedule generation and optimization features for a 6-player 
        individual signup tournament with 2 courts and 20-minute matches.
      </p>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '30px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
          Demo Tournament Settings
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          textAlign: 'left'
        }}>
          <div>
            <strong>Tournament Mode:</strong> Individual Signup<br/>
            <strong>Players:</strong> 6 players<br/>
            <strong>Courts:</strong> 2 courts
          </div>
          <div>
            <strong>Match Duration:</strong> 20 minutes<br/>
            <strong>Rest Period:</strong> 15 minutes<br/>
            <strong>Point Limit:</strong> 11 points
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #bbdefb'
      }}>
        <h4 style={{ color: '#1976d2', marginBottom: '15px' }}>
          What the demo will show:
        </h4>
        <ul style={{ 
          textAlign: 'left', 
          color: '#1976d2',
          lineHeight: '1.6'
        }}>
          <li>Automatic court assignment and time slot calculation</li>
          <li>Rest period management between consecutive matches</li>
          <li>Multiple schedule view options (chronological, by court, by player, by round)</li>
          <li>Tournament duration optimization with available courts</li>
          <li>Court utilization statistics</li>
        </ul>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          Error: {error}
        </div>
      )}

      <button
        onClick={generateDemoSchedule}
        disabled={isGenerating}
        style={{
          padding: '15px 30px',
          fontSize: '1.1rem',
          backgroundColor: isGenerating ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {isGenerating ? 'Generating Schedule...' : 'Generate Demo Schedule'}
      </button>
    </div>
  );
};

export default ScheduleDemo;