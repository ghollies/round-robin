import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '../NotificationSystem';

// Test component that uses notifications
const TestComponent = () => {
  const notifications = useNotifications();

  return (
    <div>
      <button onClick={() => notifications.showSuccess('Success', 'Operation completed')}>
        Show Success
      </button>
      <button onClick={() => notifications.showError('Error', 'Something went wrong')}>
        Show Error
      </button>
      <button onClick={() => notifications.showWarning('Warning', 'Be careful')}>
        Show Warning
      </button>
      <button onClick={() => notifications.showInfo('Info', 'Just so you know')}>
        Show Info
      </button>
      <button onClick={() => notifications.showLoading('Loading', 'Please wait')}>
        Show Loading
      </button>
      <button onClick={() => notifications.clearAll()}>
        Clear All
      </button>
    </div>
  );
};

describe('NotificationSystem', () => {
  it('renders without crashing', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    expect(screen.getByText('Show Success')).toBeInTheDocument();
  });

  it('shows success notification', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('shows error notification', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows warning notification', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Be careful')).toBeInTheDocument();
  });

  it('shows info notification', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Just so you know')).toBeInTheDocument();
  });

  it('shows loading notification', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Loading'));
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  it('allows dismissing notifications', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success')).toBeInTheDocument();

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });
  });

  it('clears all notifications', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear All'));
    
    expect(screen.queryByText('Success')).not.toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('auto-removes notifications after duration', async () => {
    // Use fake timers to control timing in tests
    jest.useFakeTimers();
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success')).toBeInTheDocument();

    // Fast-forward time by 5 seconds (default duration) wrapped in act
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });

    // Restore real timers
    jest.useRealTimers();
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNotifications must be used within a NotificationProvider');

    console.error = originalError;
  });
});