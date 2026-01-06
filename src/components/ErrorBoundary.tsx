import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError } from '../types/tournament';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | undefined;
  onError?: ((error: Error, errorInfo: ErrorInfo) => void) | undefined;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p className="error-message">
              An unexpected error occurred. Please try again or reload the page.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <div className="error-stack">
                  <strong>Error:</strong> {this.state.error.message}
                  <br />
                  <strong>Stack:</strong>
                  <pre>{this.state.error.stack}</pre>
                  {this.state.errorInfo && (
                    <>
                      <strong>Component Stack:</strong>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="error-actions">
              <button
                onClick={this.handleRetry}
                className="btn-primary"
                type="button"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="btn-secondary"
                type="button"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Specialized error boundary for tournament operations
interface TournamentErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

export function TournamentErrorBoundary({ children, onReset }: TournamentErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="error-boundary tournament-error">
          <div className="error-boundary-content">
            <div className="error-icon">🏓</div>
            <h2>Tournament Error</h2>
            <p className="error-message">
              There was an issue with the tournament system. Your data is safe, but you may need to restart the tournament setup.
            </p>
            <div className="error-actions">
              {onReset && (
                <button
                  onClick={onReset}
                  className="btn-primary"
                  type="button"
                >
                  Reset Tournament
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary"
                type="button"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        // Log tournament-specific errors
        console.error('Tournament error:', error, errorInfo);
        
        // Could send to error reporting service here
        // errorReportingService.captureException(error, { extra: errorInfo });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}