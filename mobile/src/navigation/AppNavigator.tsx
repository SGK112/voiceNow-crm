import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import AriaScreen from '../screens/AriaScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ContactDetailsScreen from '../screens/ContactDetailsScreen';
import AddEditContactScreen from '../screens/AddEditContactScreen';
import ContactImportScreen from '../screens/ContactImportScreen';
import DataImportScreen from '../screens/DataImportScreen';
import CalendarImportScreen from '../screens/CalendarImportScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CollaborationScreen from '../screens/CollaborationScreen';
import CallHistoryImportScreen from '../screens/CallHistoryImportScreen';
import CallsScreen from '../screens/CallsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import CRMActivityScreen from '../screens/CRMActivityScreen';
import CallScreen from '../screens/CallScreen';
import SMSChatScreen from '../screens/SMSChatScreen';

// Auth screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import SyncOnboardingScreen from '../screens/SyncOnboardingScreen';
import AriaOnboardingScreen from '../screens/AriaOnboardingScreen';

// Design screens
import DesignScreen from '../screens/DesignScreen';
import MoodboardDetailScreen from '../screens/MoodboardDetailScreen';

const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

// Auth Navigator (Welcome, Login, Signup, Forgot Password)
function AuthNavigator() {
  const { colors } = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// Onboarding Navigator (Aria intro + Sync accounts after first login)
function OnboardingNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Start with Aria introduction */}
      <Stack.Screen name="AriaOnboarding" component={AriaOnboardingScreen} />
      <Stack.Screen name="SyncOnboarding" component={SyncOnboardingScreen} />
      <Stack.Screen name="Main" component={MainNavigator} />
    </Stack.Navigator>
  );
}

// Main Navigator - Aria-centric with modal screens
function MainNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Aria is the base/home screen */}
      <Stack.Screen name="Aria" component={AriaScreen} />

      {/* Modal screens - slide up from bottom */}
      <Stack.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          ...TransitionPresets.ModalSlideFromBottomIOS,
          cardStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          ...TransitionPresets.ModalSlideFromBottomIOS,
          cardStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          ...TransitionPresets.ModalSlideFromBottomIOS,
          cardStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="Collaboration"
        component={CollaborationScreen}
        options={{
          ...TransitionPresets.ModalSlideFromBottomIOS,
          cardStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="Design"
        component={DesignScreen}
        options={{
          ...TransitionPresets.ModalSlideFromBottomIOS,
          cardStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          ...TransitionPresets.ModalSlideFromBottomIOS,
          cardStyle: { backgroundColor: colors.background },
        }}
      />

      {/* Sub-screens for contacts flow */}
      <Stack.Screen
        name="ContactDetails"
        component={ContactDetailsScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
      <Stack.Screen
        name="AddEditContact"
        component={AddEditContactScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
      <Stack.Screen
        name="DataImport"
        component={DataImportScreen}
        options={{
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
      />
      <Stack.Screen
        name="ContactImport"
        component={ContactImportScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
      <Stack.Screen
        name="CalendarImport"
        component={CalendarImportScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
      <Stack.Screen
        name="CallHistoryImport"
        component={CallHistoryImportScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
      <Stack.Screen
        name="Calls"
        component={CallsScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
      <Stack.Screen
        name="CRMActivity"
        component={CRMActivityScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
      <Stack.Screen
        name="Call"
        component={CallScreen}
        options={{
          ...TransitionPresets.ModalSlideFromBottomIOS,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="SMSChat"
        component={SMSChatScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
      <Stack.Screen
        name="MoodboardDetail"
        component={MoodboardDetailScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
    </Stack.Navigator>
  );
}

// Loading Screen
function LoadingScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function AppNavigator() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <NavigationContainer
        theme={{
          dark: isDark,
          colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.card,
            text: colors.text,
            border: colors.border,
            notification: colors.error,
          },
        }}
      >
        <LoadingScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.error,
        },
      }}
    >
      {isAuthenticated ? (
        needsOnboarding ? (
          <OnboardingNavigator />
        ) : (
          <MainNavigator />
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
