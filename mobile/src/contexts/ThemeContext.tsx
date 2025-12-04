import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  // Backgrounds - softer, easier on eyes
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  card: string;
  cardElevated: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Brand - softer blue
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;

  // Status
  success: string;
  warning: string;
  error: string;
  info: string;

  // UI
  border: string;
  borderLight: string;
  divider: string;
  shadow: string;
  overlay: string;

  // Tab bar
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Input
  inputBackground: string;
  inputBorder: string;
  placeholder: string;
}

// Light theme - warm, soft, easy on eyes
export const lightTheme: ThemeColors = {
  // Backgrounds - warm off-white tones
  background: '#F9FAFB',
  backgroundSecondary: '#F3F4F6',
  backgroundTertiary: '#E5E7EB',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',

  // Text - softer contrast
  text: '#1F2937',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Brand - blue theme
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  secondary: '#0EA5E9',

  // Status - muted tones
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  // UI
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#E5E7EB',
  shadow: '#6B7280',
  overlay: 'rgba(31, 41, 55, 0.4)',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  tabBarActive: '#3B82F6',
  tabBarInactive: '#9CA3AF',

  // Input
  inputBackground: '#F3F4F6',
  inputBorder: '#E5E7EB',
  placeholder: '#9CA3AF',
};

// Dark theme
export const darkTheme: ThemeColors = {
  // Backgrounds
  background: '#111827',
  backgroundSecondary: '#1F2937',
  backgroundTertiary: '#374151',
  card: '#1F2937',
  cardElevated: '#374151',

  // Text
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  textInverse: '#111827',

  // Brand - blue theme
  primary: '#60A5FA',
  primaryLight: '#93C5FD',
  primaryDark: '#3B82F6',
  secondary: '#38BDF8',

  // Status
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  // UI
  border: '#374151',
  borderLight: '#1F2937',
  divider: '#374151',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',

  // Tab bar
  tabBar: '#111827',
  tabBarBorder: '#1F2937',
  tabBarActive: '#60A5FA',
  tabBarInactive: '#6B7280',

  // Input
  inputBackground: '#1F2937',
  inputBorder: '#374151',
  placeholder: '#6B7280',
};

interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: lightTheme,
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setTheme = async (newTheme: 'light' | 'dark') => {
    try {
      await AsyncStorage.setItem('app_theme', newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const colors = theme === 'light' ? lightTheme : darkTheme;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
