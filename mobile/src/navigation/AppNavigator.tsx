import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import AriaScreen from '../screens/AriaScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DevModeScreen from '../screens/DevModeScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ContactDetailsScreen from '../screens/ContactDetailsScreen';
import AddEditContactScreen from '../screens/AddEditContactScreen';
import ContactImportScreen from '../screens/ContactImportScreen';
import DataImportScreen from '../screens/DataImportScreen';
import CalendarImportScreen from '../screens/CalendarImportScreen';
import CallHistoryImportScreen from '../screens/CallHistoryImportScreen';
import CallsScreen from '../screens/CallsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import CRMActivityScreen from '../screens/CRMActivityScreen';
import CallScreen from '../screens/CallScreen';
import SMSChatScreen from '../screens/SMSChatScreen';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

// Auth Navigator (Login, Signup, Forgot Password)
function AuthNavigator() {
  const { colors } = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// Contacts Stack Navigator
function ContactsStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ContactsList" component={ContactsScreen} />
      <Stack.Screen name="ContactDetails" component={ContactDetailsScreen} />
      <Stack.Screen name="AddEditContact" component={AddEditContactScreen} />
      <Stack.Screen name="DataImport" component={DataImportScreen} />
      <Stack.Screen name="ContactImport" component={ContactImportScreen} />
      <Stack.Screen name="CalendarImport" component={CalendarImportScreen} />
      <Stack.Screen name="CallHistoryImport" component={CallHistoryImportScreen} />
      <Stack.Screen name="Calls" component={CallsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="CRMActivity" component={CRMActivityScreen} />
      <Stack.Screen name="Call" component={CallScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="SMSChat" component={SMSChatScreen} />
    </Stack.Navigator>
  );
}

// Tab Bar Icon Component
interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  outlineName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}

const TabIcon = ({ name, outlineName, focused, color }: TabIconProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.iconContainer}>
      <Ionicons
        name={focused ? name : outlineName}
        size={24}
        color={focused ? colors.tabBarActive : color}
      />
      {focused && (
        <View style={[styles.activeIndicator, { backgroundColor: colors.tabBarActive }]} />
      )}
    </View>
  );
};

function TabNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 28,
          paddingTop: 12,
          height: 85,
          position: 'absolute',
          elevation: isDark ? 0 : 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0 : 0.08,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Aria"
        component={AriaScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="radio"
              outlineName="radio-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="chatbox"
              outlineName="chatbox-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="stats-chart"
              outlineName="stats-chart-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="person"
              outlineName="person-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Dev Tools"
        component={DevModeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="code-slash"
              outlineName="code-slash-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
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
  const { isAuthenticated, isLoading } = useAuth();

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
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' as const },
            medium: { fontFamily: 'System', fontWeight: '500' as const },
            bold: { fontFamily: 'System', fontWeight: '700' as const },
            heavy: { fontFamily: 'System', fontWeight: '900' as const },
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
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' as const },
          medium: { fontFamily: 'System', fontWeight: '500' as const },
          bold: { fontFamily: 'System', fontWeight: '700' as const },
          heavy: { fontFamily: 'System', fontWeight: '900' as const },
        },
      }}
    >
      {isAuthenticated ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
