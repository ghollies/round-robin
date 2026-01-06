import React, { useState, lazy, Suspense } from 'react';

// Lazy load demo components
const ScheduleDemo = lazy(() => import('./ScheduleDemo'));
const ScheduleManagementDemo = lazy(() => import('./ScheduleManagementDemo'));
const ScoreEntryDemo = lazy(() => import('./ScoreEntryDemo'));
const StandingsDashboardDemo = lazy(() => import('./StandingsDashboardDemo'));

type DemoPage = 'home' | 'schedule' | 'management' | 'scoring' | 'standings';

export const DemoNavigation: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<DemoPage>('home');

  const DemoLoadingFallback = ({ demoName }: { demoName: string }) => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '400px',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: '#7f8c8d', fontSize: '1.1rem' }}>
        Loading {demoName} demo...
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'schedule':
        return (
          <Suspense fallback={<DemoLoadingFallback demoName="Schedule Generation" />}>
            <ScheduleDemo />
          </Suspense>
        );
      case 'management':
        return (
          <Suspense fallback={<DemoLoadingFallback demoName="Schedule Management" />}>
            <ScheduleManagementDemo />
          </Suspense>
        );
      case 'scoring':
        return (
          <Suspense fallback={<DemoLoadingFallback demoName="Score Entry" />}>
            <ScoreEntryDemo />
          </Suspense>
        );
      case 'standings':
        return (
          <Suspense fallback={<DemoLoadingFallback demoName="Standings Dashboard" />}>
            <StandingsDashboardDemo />
          </Suspense>
        );
      default:
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1 style={{ color: '#2c3e50', marginBottom: '30px' }}>
              Pickleball Tournament Scheduler Demo
            </h1>
            <p style={{ 
              fontSize: '1.2rem', 
              color: '#7f8c8d', 
              marginBottom: '40px',
              maxWidth: '800px',
              margin: '0 auto 40px auto',
              lineHeight: '1.6'
            }}>
              Explore the complete tournament management system with these interactive demos. 
              Each demo showcases different aspects of organizing and running pickleball tournaments.
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '1px solid #e1e8ed'
              }}>
                <h3 style={{ color: '#3498db', marginBottom: '15px' }}>
                  📅 Schedule Generation
                </h3>
                <p style={{ color: '#7f8c8d', marginBottom: '20px', lineHeight: '1.5' }}>
                  Automatically generate optimized tournament schedules with round-robin algorithms, 
                  court assignments, and time slot management.
                </p>
                <button
                  onClick={() => setCurrentPage('schedule')}
                  style={{
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  Try Schedule Demo
                </button>
              </div>

              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '1px solid #e1e8ed'
              }}>
                <h3 style={{ color: '#e67e22', marginBottom: '15px' }}>
                  🔄 Schedule Management
                </h3>
                <p style={{ color: '#7f8c8d', marginBottom: '20px', lineHeight: '1.5' }}>
                  Make real-time adjustments to tournament schedules with drag-and-drop functionality, 
                  conflict detection, and change tracking.
                </p>
                <button
                  onClick={() => setCurrentPage('management')}
                  style={{
                    background: '#e67e22',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  Try Management Demo
                </button>
              </div>

              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '1px solid #e1e8ed'
              }}>
                <h3 style={{ color: '#27ae60', marginBottom: '15px' }}>
                  🏓 Score Entry
                </h3>
                <p style={{ color: '#7f8c8d', marginBottom: '20px', lineHeight: '1.5' }}>
                  Record match results with intelligent score validation, win condition checking, 
                  and automatic statistics updates.
                </p>
                <button
                  onClick={() => setCurrentPage('scoring')}
                  style={{
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  Try Scoring Demo
                </button>
              </div>

              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '1px solid #e1e8ed'
              }}>
                <h3 style={{ color: '#f39c12', marginBottom: '15px' }}>
                  🏆 Standings Dashboard
                </h3>
                <p style={{ color: '#7f8c8d', marginBottom: '20px', lineHeight: '1.5' }}>
                  View real-time player statistics, sortable rankings, tournament winners, 
                  and comprehensive performance analytics.
                </p>
                <button
                  onClick={() => setCurrentPage('standings')}
                  style={{
                    background: '#f39c12',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  Try Standings Demo
                </button>
              </div>
            </div>

            <div style={{ 
              marginTop: '50px',
              padding: '30px',
              background: '#f8f9fa',
              borderRadius: '12px',
              maxWidth: '800px',
              margin: '50px auto 0 auto'
            }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
                🎯 Key Features
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                textAlign: 'left'
              }}>
                <div>
                  <h4 style={{ color: '#3498db', marginBottom: '10px' }}>Individual Signup</h4>
                  <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
                    Players register individually and are paired systematically
                  </p>
                </div>
                <div>
                  <h4 style={{ color: '#e67e22', marginBottom: '10px' }}>Round Robin</h4>
                  <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
                    Each player partners with everyone and plays against everyone twice
                  </p>
                </div>
                <div>
                  <h4 style={{ color: '#27ae60', marginBottom: '10px' }}>Real-time Updates</h4>
                  <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
                    Live standings and statistics updates after each match
                  </p>
                </div>
                <div>
                  <h4 style={{ color: '#f39c12', marginBottom: '10px' }}>Court Optimization</h4>
                  <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
                    Efficient court usage and tournament duration optimization
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {currentPage !== 'home' && (
        <div style={{ 
          background: 'white', 
          padding: '15px 20px', 
          borderBottom: '1px solid #e1e8ed',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <button
            onClick={() => setCurrentPage('home')}
            style={{
              background: '#95a5a6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ← Back to Demo Home
          </button>
        </div>
      )}
      
      {renderCurrentPage()}
    </div>
  );
};

export default DemoNavigation;