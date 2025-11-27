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
    if (error.response?.status === 401) {
      // Token is invalid or expired - clear the invalid token
      console.log('401 Unauthorized - Token invalid or expired, clearing stored token');
      try {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      } catch (e) {
        console.error('Failed to clear invalid token:', e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
