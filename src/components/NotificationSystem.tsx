import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import './NotificationSystem.css';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 means persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  timestamp: Date;
}

interface NotificationState {
  notifications: Notification[];
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'UPDATE_NOTIFICATION'; payload: { id: string; updates: Partial<Notification> } };

const initialState: NotificationState = {
  notifications: [],
};

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
      };
    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload.id ? { ...n, ...action.payload.updates } : n
        ),
      };
    default:
      return state;
  }
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  
  // Convenience methods
  showSuccess: (title: string, message?: string, options?: Partial<Notification>) => string;
  showError: (title: string, message?: string, options?: Partial<Notification>) => string;
  showWarning: (title: string, message?: string, options?: Partial<Notification>) => string;
  showInfo: (title: string, message?: string, options?: Partial<Notification>) => string;
  showLoading: (title: string, message?: string, options?: Partial<Notification>) => string;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const fullNotification: Notification = {
      id,
      timestamp: new Date(),
      duration: 5000, // Default 5 seconds
      dismissible: true,
      ...notification,
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });

    // Auto-remove after duration (if not persistent)
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, fullNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    dispatch({ type: 'UPDATE_NOTIFICATION', payload: { id, updates } });
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    const notification: Omit<Notification, 'id' | 'timestamp'> = {
      type: 'success',
      title,
      ...options,
    };
    if (message !== undefined) {
      notification.message = message;
    }
    return addNotification(notification);
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    const notification: Omit<Notification, 'id' | 'timestamp'> = {
      type: 'error',
      title,
      duration: 8000, // Errors stay longer
      ...options,
    };
    if (message !== undefined) {
      notification.message = message;
    }
    return addNotification(notification);
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    const notification: Omit<Notification, 'id' | 'timestamp'> = {
      type: 'warning',
      title,
      duration: 6000,
      ...options,
    };
    if (message !== undefined) {
      notification.message = message;
    }
    return addNotification(notification);
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    const notification: Omit<Notification, 'id' | 'timestamp'> = {
      type: 'info',
      title,
      ...options,
    };
    if (message !== undefined) {
      notification.message = message;
    }
    return addNotification(notification);
  }, [addNotification]);

  const showLoading = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    const notification: Omit<Notification, 'id' | 'timestamp'> = {
      type: 'loading',
      title,
      duration: 0, // Loading notifications are persistent by default
      dismissible: false,
      ...options,
    };
    if (message !== undefined) {
      notification.message = message;
    }
    return addNotification(notification);
  }, [addNotification]);

  const contextValue: NotificationContextValue = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearAll,
    updateNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Notification display component
function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: () => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    if (!notification.dismissible) return;
    
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300); // Match CSS transition duration
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'loading':
        return '⏳';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      className={`notification notification-${notification.type} ${
        isVisible ? 'notification-visible' : ''
      } ${isExiting ? 'notification-exiting' : ''}`}
      role="alert"
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="notification-icon">
        {notification.type === 'loading' ? (
          <div className="loading-spinner" />
        ) : (
          getIcon()
        )}
      </div>
      
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        {notification.message && (
          <div className="notification-message">{notification.message}</div>
        )}
        {notification.action && (
          <button
            className="notification-action"
            onClick={notification.action.onClick}
            type="button"
          >
            {notification.action.label}
          </button>
        )}
      </div>

      {notification.dismissible && (
        <button
          className="notification-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          type="button"
        >
          ×
        </button>
      )}
    </div>
  );
}