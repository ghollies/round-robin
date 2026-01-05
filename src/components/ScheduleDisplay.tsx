import React, { useState, useMemo, useRef } from 'react';
import { GeneratedSchedule, ScheduledMatch } from '../utils/scheduleGenerator';
import { Participant } from '../types/tournament';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './ScheduleDisplay.css';

export type ScheduleView = 'chronological' | 'by-court' | 'by-player' | 'by-round';

interface ScheduleDisplayProps {
  schedule: GeneratedSchedule;
  participants: Participant[];
  onMatchUpdate?: (matchId: string, updates: Partial<ScheduledMatch>) => void;
}

interface ScheduleStats {
  totalMatches: number;
  totalRounds: number;
  estimatedDuration: string;
  courtUtilization: string;
}

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({
  schedule,
  participants,
  onMatchUpdate
}) => {
  const [currentView, setCurrentView] = useState<ScheduleView>('chronological');
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);

  // Calculate schedule statistics
  const stats: ScheduleStats = useMemo(() => {
    const totalMatches = schedule.scheduledMatches.length;
    const totalRounds = schedule.rounds.length;
    const durationHours = Math.floor(schedule.optimization.totalDuration / 60);
    const durationMinutes = schedule.optimization.totalDuration % 60;
    const estimatedDuration = `${durationHours}h ${durationMinutes}m`;
    const courtUtilization = `${schedule.optimization.courtUtilization.toFixed(1)}%`;

    return {
      totalMatches,
      totalRounds,
      estimatedDuration,
      courtUtilization
    };
  }, [schedule]);

  // Get unique courts
  const courts = useMemo(() => {
    const courtNumbers = [...new Set(schedule.scheduledMatches.map(m => m.courtNumber))];
    return courtNumbers.sort((a, b) => a - b);
  }, [schedule.scheduledMatches]);

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format match duration
  const formatDuration = (startTime: Date, durationMinutes: number): string => {
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  // Get player name by ID
  const getPlayerName = (playerId: string): string => {
    const participant = participants.find(p => p.id === playerId);
    return participant?.name || `Player ${playerId}`;
  };

  // Get team display name
  const getTeamName = (match: ScheduledMatch, teamKey: 'team1' | 'team2'): string => {
    const team = match.teams[teamKey];
    const player1Name = getPlayerName(team.player1Id);
    const player2Name = getPlayerName(team.player2Id);
    return `${player1Name} / ${player2Name}`;
  };

  // Filter matches based on current view and selections
  const filteredMatches = useMemo(() => {
    let matches = [...schedule.scheduledMatches];

    if (currentView === 'by-court' && selectedCourt) {
      matches = matches.filter(m => m.courtNumber === selectedCourt);
    }

    if (currentView === 'by-player' && selectedPlayer) {
      matches = matches.filter(m => 
        m.teams.team1.player1Id === selectedPlayer ||
        m.teams.team1.player2Id === selectedPlayer ||
        m.teams.team2.player1Id === selectedPlayer ||
        m.teams.team2.player2Id === selectedPlayer
      );
    }

    // Sort matches based on view
    switch (currentView) {
      case 'chronological':
        return matches.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
      case 'by-court':
        return matches.sort((a, b) => {
          if (a.courtNumber !== b.courtNumber) {
            return a.courtNumber - b.courtNumber;
          }
          return a.scheduledTime.getTime() - b.scheduledTime.getTime();
        });
      case 'by-round':
        return matches.sort((a, b) => {
          if (a.roundNumber !== b.roundNumber) {
            return a.roundNumber - b.roundNumber;
          }
          return a.matchNumber - b.matchNumber;
        });
      default:
        return matches;
    }
  }, [schedule.scheduledMatches, currentView, selectedCourt, selectedPlayer]);

  // Export schedule as PDF
  const exportToPDF = async () => {
    if (!scheduleRef.current) return;
    
    setIsExporting(true);
    
    try {
      // Create a temporary container for PDF export
      const exportContainer = document.createElement('div');
      exportContainer.className = 'schedule-display pdf-export';
      exportContainer.innerHTML = scheduleRef.current.innerHTML;
      
      // Remove interactive elements for PDF
      const controls = exportContainer.querySelector('.schedule-controls');
      const actions = exportContainer.querySelector('.schedule-actions');
      if (controls) controls.remove();
      if (actions) actions.remove();
      
      // Add PDF-specific styling
      exportContainer.style.width = '210mm';
      exportContainer.style.minHeight = '297mm';
      exportContainer.style.padding = '20mm';
      exportContainer.style.backgroundColor = 'white';
      exportContainer.style.fontSize = '12px';
      
      document.body.appendChild(exportContainer);
      
      // Generate PDF
      const canvas = await html2canvas(exportContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `tournament-schedule-${dateStr}.pdf`;
      
      pdf.save(filename);
      
      // Clean up
      document.body.removeChild(exportContainer);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export schedule data as JSON
  const exportToJSON = () => {
    const exportData = {
      schedule,
      participants,
      exportedAt: new Date().toISOString(),
      view: currentView,
      filters: {
        selectedCourt,
        selectedPlayer
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `tournament-schedule-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  // Print optimized schedule
  const printSchedule = () => {
    // Create a print-optimized version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tournament Schedule</title>
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          <div class="print-schedule">
            ${generatePrintContent()}
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Generate print-optimized content
  const generatePrintContent = (): string => {
    let content = `
      <div class="print-header">
        <h1>Tournament Schedule</h1>
        <div class="print-stats">
          <span>Total Matches: ${stats.totalMatches}</span>
          <span>Rounds: ${stats.totalRounds}</span>
          <span>Duration: ${stats.estimatedDuration}</span>
          <span>Court Usage: ${stats.courtUtilization}</span>
        </div>
      </div>
    `;
    
    groupedMatches.forEach(({ groupName, matches }) => {
      content += `
        <div class="print-group">
          <h2>${groupName}</h2>
          <table class="print-matches-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Time</th>
                <th>Court</th>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      matches.forEach(match => {
        const team1Name = getTeamName(match, 'team1');
        const team2Name = getTeamName(match, 'team2');
        const timeStr = formatDuration(match.scheduledTime, 30);
        const resultStr = match.result 
          ? `${match.result.team1Score}-${match.result.team2Score}`
          : 'Pending';
        
        content += `
          <tr>
            <td>${match.matchNumber}</td>
            <td>${timeStr}</td>
            <td>${match.courtNumber}</td>
            <td>${team1Name}</td>
            <td>${team2Name}</td>
            <td>${resultStr}</td>
          </tr>
        `;
      });
      
      content += `
            </tbody>
          </table>
        </div>
      `;
    });
    
    return content;
  };

  // Get print-specific CSS styles
  const getPrintStyles = (): string => {
    return `
      @page {
        margin: 1in;
        size: letter;
      }
      
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #000;
        background: white;
      }
      
      .print-schedule {
        width: 100%;
      }
      
      .print-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #000;
        padding-bottom: 15px;
      }
      
      .print-header h1 {
        margin: 0 0 15px 0;
        font-size: 24px;
        font-weight: bold;
      }
      
      .print-stats {
        display: flex;
        justify-content: space-around;
        font-size: 11px;
        font-weight: bold;
      }
      
      .print-group {
        margin-bottom: 40px;
        break-inside: avoid;
      }
      
      .print-group h2 {
        margin: 0 0 15px 0;
        font-size: 16px;
        font-weight: bold;
        border-bottom: 1px solid #000;
        padding-bottom: 5px;
      }
      
      .print-matches-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      
      .print-matches-table th,
      .print-matches-table td {
        border: 1px solid #000;
        padding: 8px;
        text-align: left;
        vertical-align: top;
      }
      
      .print-matches-table th {
        background-color: #f0f0f0;
        font-weight: bold;
        font-size: 11px;
      }
      
      .print-matches-table td {
        font-size: 10px;
      }
      
      .print-matches-table tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      @media print {
        .print-group {
          break-inside: avoid;
        }
        
        .print-matches-table {
          break-inside: avoid;
        }
      }
    `;
  };

  // Group matches for display
  const groupedMatches = useMemo(() => {
    const groups = new Map<string, ScheduledMatch[]>();

    filteredMatches.forEach(match => {
      let groupKey: string;

      switch (currentView) {
        case 'by-court':
          groupKey = `Court ${match.courtNumber}`;
          break;
        case 'by-round':
          groupKey = `Round ${match.roundNumber}`;
          break;
        case 'chronological':
          // Group by hour for chronological view
          const hour = match.scheduledTime.getHours();
          const period = hour < 12 ? 'AM' : 'PM';
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          groupKey = `${displayHour}:00 ${period}`;
          break;
        default:
          groupKey = 'All Matches';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(match);
    });

    return Array.from(groups.entries()).map(([key, matches]) => ({
      groupName: key,
      matches
    }));
  }, [filteredMatches, currentView]);

  const renderMatchCard = (match: ScheduledMatch) => (
    <div key={match.id} className="match-card">
      <div className="match-header">
        <div className="match-info">
          <span className="match-number">Match {match.matchNumber}</span>
          <span className="round-number">Round {match.roundNumber}</span>
        </div>
        <div className="match-status">
          <span className={`status-badge ${match.status}`}>
            {match.status.replace('-', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="match-details">
        <div className="match-time">
          <strong>Time:</strong> {formatDuration(match.scheduledTime, 30)}
        </div>
        <div className="match-court">
          <strong>Court:</strong> {match.courtNumber}
        </div>
      </div>

      <div className="match-teams">
        <div className="team">
          <div className="team-label">Team 1:</div>
          <div className="team-players">{getTeamName(match, 'team1')}</div>
        </div>
        <div className="vs-divider">VS</div>
        <div className="team">
          <div className="team-label">Team 2:</div>
          <div className="team-players">{getTeamName(match, 'team2')}</div>
        </div>
      </div>

      {match.result && (
        <div className="match-result">
          <div className="score">
            {match.result.team1Score} - {match.result.team2Score}
          </div>
          <div className="winner">
            Winner: {match.result.winnerId === match.team1Id ? 
              getTeamName(match, 'team1') : 
              getTeamName(match, 'team2')
            }
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="schedule-display" ref={scheduleRef}>
      <div className="schedule-header">
        <h2>Tournament Schedule</h2>
        
        <div className="schedule-stats">
          <div className="stat">
            <span className="stat-label">Total Matches:</span>
            <span className="stat-value">{stats.totalMatches}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Rounds:</span>
            <span className="stat-value">{stats.totalRounds}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Duration:</span>
            <span className="stat-value">{stats.estimatedDuration}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Court Usage:</span>
            <span className="stat-value">{stats.courtUtilization}</span>
          </div>
        </div>
      </div>

      <div className="schedule-controls">
        <div className="view-selector">
          <label htmlFor="view-select">View:</label>
          <select
            id="view-select"
            value={currentView}
            onChange={(e) => setCurrentView(e.target.value as ScheduleView)}
          >
            <option value="chronological">Chronological</option>
            <option value="by-court">By Court</option>
            <option value="by-player">By Player</option>
            <option value="by-round">By Round</option>
          </select>
        </div>

        {currentView === 'by-court' && (
          <div className="court-selector">
            <label htmlFor="court-select">Court:</label>
            <select
              id="court-select"
              value={selectedCourt || ''}
              onChange={(e) => setSelectedCourt(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All Courts</option>
              {courts.map(court => (
                <option key={court} value={court}>Court {court}</option>
              ))}
            </select>
          </div>
        )}

        {currentView === 'by-player' && (
          <div className="player-selector">
            <label htmlFor="player-select">Player:</label>
            <select
              id="player-select"
              value={selectedPlayer || ''}
              onChange={(e) => setSelectedPlayer(e.target.value || null)}
            >
              <option value="">All Players</option>
              {participants.map(participant => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="schedule-content">
        {groupedMatches.length === 0 ? (
          <div className="no-matches">
            <p>No matches found for the selected criteria.</p>
          </div>
        ) : (
          groupedMatches.map(({ groupName, matches }) => (
            <div key={groupName} className="match-group">
              <h3 className="group-header">{groupName}</h3>
              <div className="matches-grid">
                {matches.map(renderMatchCard)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="schedule-actions">
        <button className="btn-secondary" onClick={printSchedule}>
          Print Schedule
        </button>
        <div className="export-dropdown">
          <button className="btn-primary" onClick={exportToPDF} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export as PDF'}
          </button>
          <button className="btn-outline" onClick={exportToJSON}>
            Export as JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDisplay;