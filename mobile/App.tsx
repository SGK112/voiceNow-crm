import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import notificationService from './src/services/notificationService';
import { NotificationProvider, useNotification } from './src/contexts/NotificationContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { deviceSyncService } from './src/services/DeviceSyncService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function AppContent() {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { showError, showSuccess, showInfo } = useNotification();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    deviceSyncService.setNotificationHooks({ showError, showSuccess, showInfo });
  }, [showError, showSuccess, showInfo]);

  useEffect(() => {
    // Only initialize services when authenticated
    if (!isAuthenticated) return;

    const initNotifications = async () => {
      try {
        console.log('Initializing push notifications...');
        await notificationService.initialize();
        console.log('Notifications initialized');
      } catch (error) {
        console.error('Notification initialization failed:', error);
      }
    };

    initNotifications();

    // Initial device sync on app start
    const initSync = async () => {
      try {
        await deviceSyncService.syncDeviceData();
      } catch (error) {
        console.error('Initial sync failed:', error);
      }
    };

    initSync();

    const receivedSubscription = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    const responseSubscription = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
      }
    );

    // Sync device data when app comes to foreground
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App came to foreground, syncing device data...');
        try {
          await deviceSyncService.syncDeviceData();
        } catch (error) {
          console.error('Background sync failed:', error);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
      appStateSubscription.remove();
    };
  }, [isAuthenticated]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
