import React from 'react';
import { performanceMonitor, logMemoryUsage } from '../utils/performance';
import './LoadingState.css';

export interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  overlay?: boolean;
  className?: string;
}

export function LoadingState({
  message = 'Loading...',
  size = 'medium',
  variant = 'spinner',
  overlay = false,
  className = '',
}: LoadingStateProps) {
  const baseClass = `loading-state loading-state-${size} loading-state-${variant}`;
  const classes = `${baseClass} ${overlay ? 'loading-state-overlay' : ''} ${className}`.trim();

  const renderSpinner = () => (
    <div className="loading-spinner">
      <div className="spinner-ring"></div>
    </div>
  );

  const renderDots = () => (
    <div className="loading-dots">
      <div className="dot"></div>
      <div className="dot"></div>
      <div className="dot"></div>
    </div>
  );

  const renderPulse = () => (
    <div className="loading-pulse">
      <div className="pulse-circle"></div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="loading-skeleton">
      <div className="skeleton-line skeleton-line-long"></div>
      <div className="skeleton-line skeleton-line-medium"></div>
      <div className="skeleton-line skeleton-line-short"></div>
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'skeleton':
        return renderSkeleton();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={classes} role="status" aria-live="polite">
      {variant !== 'skeleton' && (
        <div className="loading-content">
          {renderLoader()}
          {message && <div className="loading-message">{message}</div>}
        </div>
      )}
      {variant === 'skeleton' && renderLoader()}
      <span className="sr-only">{message}</span>
    </div>
  );
}

// Specialized loading components
export function ButtonLoadingState({ size = 'small' }: { size?: LoadingStateProps['size'] }) {
  return (
    <LoadingState
      variant="spinner"
      size={size}
      message=""
      className="loading-state-inline"
    />
  );
}

export function PageLoadingState({ message = 'Loading page...' }: { message?: string }) {
  return (
    <LoadingState
      variant="spinner"
      size="large"
      message={message}
      overlay={true}
      className="loading-state-page"
    />
  );
}

export function FormLoadingState({ message = 'Processing...' }: { message?: string }) {
  return (
    <LoadingState
      variant="dots"
      size="medium"
      message={message}
      className="loading-state-form"
    />
  );
}

export function SkeletonLoader({ 
  lines = 3, 
  className = '' 
}: { 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={`loading-skeleton ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={`skeleton-line ${
            index === 0 ? 'skeleton-line-long' :
            index === lines - 1 ? 'skeleton-line-short' :
            'skeleton-line-medium'
          }`}
        />
      ))}
    </div>
  );
}

// Loading overlay for specific components with performance monitoring
export function LoadingOverlay({ 
  isLoading, 
  message = 'Loading...', 
  children 
}: {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}) {
  // Performance monitoring for loading states
  React.useEffect(() => {
    if (isLoading) {
      performanceMonitor.startTiming('loading-overlay');
      if (process.env.NODE_ENV === 'development') {
        logMemoryUsage('LoadingOverlay-start');
      }
    } else {
      const duration = performanceMonitor.endTiming('loading-overlay');
      if (duration && process.env.NODE_ENV === 'development') {
        logMemoryUsage('LoadingOverlay-end');
        if (duration > 3000) {
          console.warn(`Long loading operation: ${duration.toFixed(2)}ms`);
        }
      }
    }
  }, [isLoading]);

  return (
    <div className="loading-overlay-container">
      {children}
      {isLoading && (
        <div className="loading-overlay-backdrop">
          <LoadingState
            variant="spinner"
            size="large"
            message={message}
            className="loading-overlay-content"
          />
        </div>
      )}
    </div>
  );
}

// Hook for managing loading states with performance tracking
export function useLoadingState(initialLoading: boolean = false) {
  const [isLoading, setIsLoading] = React.useState(initialLoading);
  const [progress, setProgress] = React.useState(0);
  const [message, setMessage] = React.useState('Loading...');

  const startLoading = React.useCallback((loadingMessage?: string) => {
    performanceMonitor.startTiming('loading-operation');
    setIsLoading(true);
    setProgress(0);
    if (loadingMessage) {
      setMessage(loadingMessage);
    }
  }, []);

  const updateProgress = React.useCallback((newProgress: number, newMessage?: string) => {
    setProgress(newProgress);
    if (newMessage) {
      setMessage(newMessage);
    }
  }, []);

  const stopLoading = React.useCallback(() => {
    const duration = performanceMonitor.endTiming('loading-operation');
    if (duration && duration > 1000) {
      console.warn(`Long loading operation detected: ${duration.toFixed(2)}ms`);
    }
    setIsLoading(false);
    setProgress(100);
  }, []);

  return {
    isLoading,
    progress,
    message,
    startLoading,
    updateProgress,
    stopLoading,
  };
}