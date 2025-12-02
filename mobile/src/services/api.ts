import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/constants';

export const API_BASE_URL = API_URL;

const AUTH_TOKEN_KEY = 'authToken';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor to add auth token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('401 Unauthorized - Token invalid or expired. Logging out.');
      try {
        // Use dynamic import to avoid circular dependency
        const { authService } = await import('./AuthService');
        // This will clear all user data and the AuthContext will trigger navigation to the login screen
        await authService.logout();
      } catch (e) {
        console.error('Failed to handle logout after 401:', e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
