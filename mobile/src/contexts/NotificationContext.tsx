import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';

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

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    return () => subscription.remove();
  }, []);

  const showSuccess = (message: string) => {
    console.log('✅ Success:', message);
  };

  const showError = (message: string) => {
    console.log('❌ Error:', message);
  };

  const showInfo = (message: string) => {
    console.log('ℹ️ Info:', message);
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
    </NotificationContext.Provider>
  );
};
