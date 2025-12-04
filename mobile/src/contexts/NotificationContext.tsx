import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import InAppNotification, { NotificationType } from '../components/InAppNotification';

interface NotificationContextType {
  notification: Notifications.Notification | null;
  expoPushToken: string | null;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notification: null,
  expoPushToken: null,
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
});

export const useNotification = () => useContext(NotificationContext);
export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: React.ReactNode;
}

interface InAppNotificationState {
  message: string;
  type: NotificationType;
  visible: boolean;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [inAppNotification, setInAppNotification] = useState<InAppNotificationState | null>(null);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    return () => subscription.remove();
  }, []);

  const showNotification = (message: string, type: NotificationType) => {
    setInAppNotification({ message, type, visible: true });
  };

  const showSuccess = (message: string) => {
    showNotification(message, 'success');
  };

  const showError = (message: string) => {
    showNotification(message, 'error');
  };

  const showInfo = (message: string) => {
    showNotification(message, 'info');
  };

  const onDismiss = () => {
    setInAppNotification(null);
  };

  return (
    <NotificationContext.Provider value={{
      notification,
      expoPushToken,
      showSuccess,
      showError,
      showInfo
    }}>
      {children}
      {inAppNotification && inAppNotification.visible && (
        <InAppNotification
          message={inAppNotification.message}
          type={inAppNotification.type}
          onDismiss={onDismiss}
        />
      )}
    </NotificationContext.Provider>
  );
};
