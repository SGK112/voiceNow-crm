import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Use ngrok URL for OAuth to work on mobile devices
const DEFAULT_API_URL = 'https://ca11d08d36ac.ngrok-free.app';

export const API_URL = Constants.expoConfig?.extra?.API_URL || DEFAULT_API_URL;
export const ELEVENLABS_API_KEY = Constants.expoConfig?.extra?.ELEVENLABS_API_KEY || '';
export const TWILIO_ACCOUNT_SID = Constants.expoConfig?.extra?.TWILIO_ACCOUNT_SID || '';
export const TWILIO_AUTH_TOKEN = Constants.expoConfig?.extra?.TWILIO_AUTH_TOKEN || '';
export const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY || '';

export const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  background: '#0a0a0b',
  card: '#1a1a1b',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#374151',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
};
