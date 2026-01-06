import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, TournamentErrorBoundary } from '../ErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again or reload the page.')).toBeInTheDocument();
  });

  it('shows try again and reload buttons', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });
});

describe('TournamentErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders tournament-specific error UI', () => {
    render(
      <TournamentErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TournamentErrorBoundary>
    );

    expect(screen.getByText('Tournament Error')).toBeInTheDocument();
    expect(screen.getByText('There was an issue with the tournament system. Your data is safe, but you may need to restart the tournament setup.')).toBeInTheDocument();
  });

  it('shows reset tournament button when onReset is provided', () => {
    const onReset = jest.fn();
    
    render(
      <TournamentErrorBoundary onReset={onReset}>
        <ThrowError shouldThrow={true} />
      </TournamentErrorBoundary>
    );

    const resetButton = screen.getByText('Reset Tournament');
    expect(resetButton).toBeInTheDocument();
    
    fireEvent.click(resetButton);
    expect(onReset).toHaveBeenCalled();
  });
});