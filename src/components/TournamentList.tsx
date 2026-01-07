import React, { useState, useEffect } from 'react';
import { Tournament } from '../types/tournament';
import { loadTournaments, deleteTournament, loadParticipantsByTournament } from '../utils/storage';
import { useNotifications } from './NotificationSystem';
import './TournamentList.css';

interface TournamentListProps {
  onTournamentSelect: (tournament: Tournament) => void;
  onCreateNew: () => void;
}

interface TournamentWithStats extends Tournament {
  participantCount: number;
  completedMatches: number;
  totalMatches: number;
}

export const TournamentList: React.FC<TournamentListProps> = ({
  onTournamentSelect,
  onCreateNew
}) => {
  const [tournaments, setTournaments] = useState<TournamentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'setup' | 'active' | 'completed'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const notifications = useNotifications();

  useEffect(() => {
    loadTournamentList();
  }, []);

  const loadTournamentList = async () => {
    try {
      setLoading(true);
      const tournamentData = loadTournaments() || []; // Handle undefined case
      
      // Enhance tournaments with statistics
      const tournamentsWithStats: TournamentWithStats[] = await Promise.all(
        tournamentData.map(async (tournament) => {
          const participants = loadParticipantsByTournament(tournament.id);
          
          // For now, set match counts to 0 - we'll enhance this later
          // In a real implementation, you'd load matches and calculate progress
          return {
            ...tournament,
            participantCount: participants.length,
            completedMatches: 0,
            totalMatches: 0
          };
        })
      );

      setTournaments(tournamentsWithStats);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      notifications.showError('Error', 'Failed to load tournament list');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      deleteTournament(tournamentId);
      await loadTournamentList();
      notifications.showSuccess('Success', 'Tournament deleted successfully');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete tournament:', error);
      notifications.showError('Error', 'Failed to delete tournament');
    }
  };

  const getStatusBadge = (status: Tournament['status']) => {
    const statusConfig = {
      setup: { label: 'Setup', className: 'status-setup' },
      active: { label: 'Active', className: 'status-active' },
      completed: { label: 'Completed', className: 'status-completed' }
    };

    const config = statusConfig[status];
    return (
      <span className={`status-badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tournament.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="tournament-list-loading">
        <div className="loading-spinner" />
        <p>Loading tournaments...</p>
      </div>
    );
  }

  return (
    <div className="tournament-list">
      <header className="tournament-list-header">
        <h2>Your Tournaments</h2>
        <button
          onClick={onCreateNew}
          className="btn btn-primary create-tournament-btn"
        >
          + Create New Tournament
        </button>
      </header>

      {tournaments.length > 0 && (
        <div className="tournament-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="status-filter">
            <label htmlFor="status-filter">Filter by status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Tournaments</option>
              <option value="setup">Setup</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏓</div>
          <h3>No tournaments yet</h3>
          <p>Create your first pickleball tournament to get started!</p>
          <button
            onClick={onCreateNew}
            className="btn btn-primary btn-large"
          >
            Create Your First Tournament
          </button>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="no-results">
          <p>No tournaments match your search criteria.</p>
        </div>
      ) : (
        <div className="tournament-grid">
          {filteredTournaments.map((tournament) => (
            <div key={tournament.id} className="tournament-card">
              <div className="tournament-card-header">
                <h3 className="tournament-name">{tournament.name}</h3>
                {getStatusBadge(tournament.status)}
              </div>

              <div className="tournament-details">
                <div className="detail-row">
                  <span className="detail-label">Mode:</span>
                  <span className="detail-value">
                    {tournament.mode === 'individual-signup' ? 'Individual Signup' : 'Pair Signup'}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Participants:</span>
                  <span className="detail-value">{tournament.participantCount}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Courts:</span>
                  <span className="detail-value">{tournament.settings.courtCount}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(tournament.createdAt)}</span>
                </div>

                {tournament.status !== 'setup' && (
                  <div className="detail-row">
                    <span className="detail-label">Progress:</span>
                    <span className="detail-value">
                      {tournament.completedMatches}/{tournament.totalMatches} matches
                    </span>
                  </div>
                )}
              </div>

              <div className="tournament-actions">
                <button
                  onClick={() => onTournamentSelect(tournament)}
                  className="btn btn-primary action-btn"
                >
                  {tournament.status === 'setup' ? 'Continue Setup' : 'Manage Tournament'}
                </button>
                
                <button
                  onClick={() => setDeleteConfirm(tournament.id)}
                  className="btn btn-danger action-btn"
                  title="Delete tournament"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Tournament</h3>
            <p>
              Are you sure you want to delete this tournament? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTournament(deleteConfirm)}
                className="btn btn-danger"
              >
                Delete Tournament
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentList;