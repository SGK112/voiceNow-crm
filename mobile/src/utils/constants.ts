import Constants from 'expo-constants';

export const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:5001';
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
