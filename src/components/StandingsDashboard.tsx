import React, { useState, useEffect, useMemo } from 'react';
import { Tournament } from '../types/tournament';
import { 
  ParticipantStanding, 
  getEnhancedStandings, 
  getTournamentWinners, 
  isTournamentComplete 
} from '../utils/standings';
import './StandingsDashboard.css';

interface StandingsDashboardProps {
  tournament: Tournament;
  onRefresh?: () => void;
}

type SortField = 'rank' | 'name' | 'gamesWon' | 'gamesLost' | 'winPercentage' | 'pointDifferential' | 'totalPointsScored' | 'averagePointsScored';
type SortDirection = 'asc' | 'desc';

export const StandingsDashboard: React.FC<StandingsDashboardProps> = ({ 
  tournament, 
  onRefresh 
}) => {
  const [standings, setStandings] = useState<ParticipantStanding[]>([]);
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load standings data
  const loadStandings = async () => {
    setIsLoading(true);
    try {
      const currentStandings = getEnhancedStandings(tournament.id);
      setStandings(currentStandings);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and refresh
  useEffect(() => {
    loadStandings();
  }, [tournament.id]);

  // Handle refresh
  const handleRefresh = () => {
    loadStandings();
    onRefresh?.();
  };

  // Tournament completion status
  const tournamentComplete = useMemo(() => 
    isTournamentComplete(tournament.id), 
    [tournament.id, lastUpdated]
  );

  // Tournament winners
  const winners = useMemo(() => {
    try {
      return getTournamentWinners(tournament.id);
    } catch (error) {
      console.error('Error getting tournament winners:', error);
      return [];
    }
  }, [tournament.id, standings]);

  // Sorted standings
  const sortedStandings = useMemo(() => {
    const sorted = [...standings].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'rank':
          aValue = a.rank;
          bValue = b.rank;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'gamesWon':
          aValue = a.statistics.gamesWon;
          bValue = b.statistics.gamesWon;
          break;
        case 'gamesLost':
          aValue = a.statistics.gamesLost;
          bValue = b.statistics.gamesLost;
          break;
        case 'winPercentage':
          aValue = a.winPercentage;
          bValue = b.winPercentage;
          break;
        case 'pointDifferential':
          aValue = a.statistics.pointDifferential;
          bValue = b.statistics.pointDifferential;
          break;
        case 'totalPointsScored':
          aValue = a.statistics.totalPointsScored;
          bValue = b.statistics.totalPointsScored;
          break;
        case 'averagePointsScored':
          aValue = a.averagePointsScored;
          bValue = b.averagePointsScored;
          break;
        default:
          aValue = a.rank;
          bValue = b.rank;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const numA = aValue as number;
      const numB = bValue as number;
      
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return sorted;
  }, [standings, sortField, sortDirection]);

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'rank' || field === 'name' ? 'asc' : 'desc');
    }
  };

  // Get sort indicator
  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Format decimal
  const formatDecimal = (value: number) => {
    return value.toFixed(1);
  };

  return (
    <div className="standings-dashboard">
      <div className="standings-header">
        <div className="standings-title">
          <h2>Tournament Standings</h2>
          {tournamentComplete && (
            <div className="tournament-complete-badge">
              Tournament Complete
            </div>
          )}
        </div>
        
        <div className="standings-controls">
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="refresh-button"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {winners.length > 0 && tournamentComplete && (
        <div className="winners-section">
          <h3>🏆 Tournament Winner{winners.length > 1 ? 's' : ''}</h3>
          <div className="winners-list">
            {winners.map(winner => (
              <div key={winner.id} className="winner-card">
                <div className="winner-name">{winner.name}</div>
                <div className="winner-stats">
                  {winner.statistics.gamesWon}W-{winner.statistics.gamesLost}L 
                  ({formatPercentage(winner.winPercentage)}) | 
                  +{winner.statistics.pointDifferential} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="standings-summary">
        <div className="summary-stat">
          <span className="stat-label">Total Players:</span>
          <span className="stat-value">{standings.length}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Games Played:</span>
          <span className="stat-value">
            {standings.reduce((sum, s) => sum + s.gamesPlayed, 0) / 2}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Total Points:</span>
          <span className="stat-value">
            {standings.reduce((sum, s) => sum + s.statistics.totalPointsScored, 0)}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-message">Loading standings...</div>
      ) : standings.length === 0 ? (
        <div className="no-data-message">
          No standings data available. Complete some matches to see standings.
        </div>
      ) : (
        <div className="standings-table-container">
          <table className="standings-table">
            <thead>
              <tr>
                <th 
                  onClick={() => handleSort('rank')}
                  className={`sortable ${sortField === 'rank' ? 'active' : ''}`}
                >
                  Rank{getSortIndicator('rank')}
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  className={`sortable ${sortField === 'name' ? 'active' : ''}`}
                >
                  Player{getSortIndicator('name')}
                </th>
                <th 
                  onClick={() => handleSort('gamesWon')}
                  className={`sortable ${sortField === 'gamesWon' ? 'active' : ''}`}
                >
                  Wins{getSortIndicator('gamesWon')}
                </th>
                <th 
                  onClick={() => handleSort('gamesLost')}
                  className={`sortable ${sortField === 'gamesLost' ? 'active' : ''}`}
                >
                  Losses{getSortIndicator('gamesLost')}
                </th>
                <th 
                  onClick={() => handleSort('winPercentage')}
                  className={`sortable ${sortField === 'winPercentage' ? 'active' : ''}`}
                >
                  Win %{getSortIndicator('winPercentage')}
                </th>
                <th 
                  onClick={() => handleSort('pointDifferential')}
                  className={`sortable ${sortField === 'pointDifferential' ? 'active' : ''}`}
                >
                  +/-{getSortIndicator('pointDifferential')}
                </th>
                <th 
                  onClick={() => handleSort('totalPointsScored')}
                  className={`sortable ${sortField === 'totalPointsScored' ? 'active' : ''}`}
                >
                  Points For{getSortIndicator('totalPointsScored')}
                </th>
                <th 
                  onClick={() => handleSort('averagePointsScored')}
                  className={`sortable ${sortField === 'averagePointsScored' ? 'active' : ''}`}
                >
                  Avg For{getSortIndicator('averagePointsScored')}
                </th>
                <th>Avg Against</th>
              </tr>
            </thead>
            <tbody>
              {sortedStandings.map((standing) => (
                <tr 
                  key={standing.id} 
                  className={`
                    ${standing.isWinner ? 'winner-row' : ''} 
                    ${standing.rank <= 3 ? `top-${standing.rank}` : ''}
                  `}
                >
                  <td className="rank-cell">
                    <span className="rank-number">{standing.rank}</span>
                    {standing.isWinner && <span className="winner-icon">👑</span>}
                  </td>
                  <td className="name-cell">
                    <span className="player-name">{standing.name}</span>
                  </td>
                  <td className="wins-cell">{standing.statistics.gamesWon}</td>
                  <td className="losses-cell">{standing.statistics.gamesLost}</td>
                  <td className="percentage-cell">
                    {formatPercentage(standing.winPercentage)}
                  </td>
                  <td className={`differential-cell ${
                    standing.statistics.pointDifferential > 0 ? 'positive' : 
                    standing.statistics.pointDifferential < 0 ? 'negative' : 'neutral'
                  }`}>
                    {standing.statistics.pointDifferential > 0 ? '+' : ''}
                    {standing.statistics.pointDifferential}
                  </td>
                  <td className="points-cell">
                    {standing.statistics.totalPointsScored}
                  </td>
                  <td className="average-cell">
                    {formatDecimal(standing.averagePointsScored)}
                  </td>
                  <td className="average-cell">
                    {formatDecimal(standing.averagePointsAllowed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="standings-footer">
        <div className="standings-legend">
          <div className="legend-item">
            <span className="legend-symbol">👑</span>
            <span className="legend-text">Tournament Winner</span>
          </div>
          <div className="legend-item">
            <span className="legend-symbol">+/-</span>
            <span className="legend-text">Point Differential (Points For - Points Against)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandingsDashboard;