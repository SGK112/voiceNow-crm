import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Storage keys
const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';

// Types
export interface User {
  _id: string;
  email: string;
  name?: string;
  phone?: string;
  googleId?: string;
  plan: 'starter' | 'professional' | 'enterprise' | 'trial' | 'pay-as-you-go';
  credits: number;
  subscriptionStatus: string;
  profile?: {
    onboardingCompleted?: boolean;
    businessName?: string;
    industry?: string;
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
  };
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  // Initialize auth state from storage
  async initialize(): Promise<{ token: string | null; user: User | null }> {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
      ]);

      if (storedToken) {
        this.token = storedToken;

        if (storedUser) {
          this.user = JSON.parse(storedUser);
        }

        // Validate token by fetching current user
        const response = await this.getCurrentUser();
        if (response.success && response.user) {
          this.user = response.user;
          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(response.user));
          return { token: this.token, user: this.user };
        } else {
          // Token invalid (401 or other error), clear storage and logout
          console.log('Token validation failed, logging out');
          await this.logout();
          return { token: null, user: null };
        }
      }

      return { token: this.token, user: this.user };
    } catch (error) {
      console.error('Error initializing auth:', error);
      return { token: null, user: null };
    }
  }

  // Email/Password Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', credentials);

      if (response.data.success && response.data.token && response.data.user) {
        await this.setAuthData(response.data.token, response.data.user);
        return response.data;
      }

      return {
        success: false,
        message: response.data.message || 'Login failed',
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed',
      };
    }
  }

  // Email/Password Signup
  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/api/auth/signup', credentials);

      if (response.data.success && response.data.token && response.data.user) {
        await this.setAuthData(response.data.token, response.data.user);
        return response.data;
      }

      return {
        success: false,
        message: response.data.message || 'Signup failed',
      };
    } catch (error: any) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Signup failed',
      };
    }
  }

  // Google OAuth Login (for direct token/user from backend callback)
  async googleLogin(tokenOrIdToken: string, userOrAccessToken?: any): Promise<AuthResponse> {
    try {
      // If userOrAccessToken is an object, it means we got token+user from mobile OAuth callback
      if (typeof userOrAccessToken === 'object' && userOrAccessToken !== null && userOrAccessToken._id) {
        // Direct login with token and user from mobile OAuth callback
        const token = tokenOrIdToken;
        const user = userOrAccessToken as User;
        await this.setAuthData(token, user);
        return {
          success: true,
          token,
          user,
        };
      }

      // Legacy: ID token or access token from expo-auth-session
      const payload: any = {};
      if (tokenOrIdToken) {
        payload.id_token = tokenOrIdToken;
      }
      if (userOrAccessToken && typeof userOrAccessToken === 'string') {
        payload.access_token = userOrAccessToken;
      }

      const response = await api.post<AuthResponse>('/api/auth/google', payload);

      if (response.data.success && response.data.token && response.data.user) {
        await this.setAuthData(response.data.token, response.data.user);
        return response.data;
      }

      return {
        success: false,
        message: response.data.message || 'Google login failed',
      };
    } catch (error: any) {
      console.error('Google login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Google login failed',
      };
    }
  }

  // Forgot Password - Request reset code
  async forgotPassword(emailOrPhone: string): Promise<AuthResponse> {
    try {
      const isPhone = /^\+?[\d\s-()]+$/.test(emailOrPhone) && emailOrPhone.replace(/\D/g, '').length >= 10;

      const payload = isPhone
        ? { phone: emailOrPhone }
        : { email: emailOrPhone };

      const response = await api.post<AuthResponse>('/api/auth/forgot-password', payload);

      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to send reset code',
      };
    }
  }

  // Verify reset code
  async verifyResetCode(emailOrPhone: string, code: string): Promise<AuthResponse> {
    try {
      const isPhone = /^\+?[\d\s-()]+$/.test(emailOrPhone) && emailOrPhone.replace(/\D/g, '').length >= 10;

      const payload = isPhone
        ? { phone: emailOrPhone, code }
        : { email: emailOrPhone, code };

      const response = await api.post<AuthResponse>('/api/auth/verify-reset-code', payload);

      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error('Verify code error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Invalid code',
      };
    }
  }

  // Reset password with code
  async resetPassword(emailOrPhone: string, code: string, newPassword: string): Promise<AuthResponse> {
    try {
      const isPhone = /^\+?[\d\s-()]+$/.test(emailOrPhone) && emailOrPhone.replace(/\D/g, '').length >= 10;

      const payload = isPhone
        ? { phone: emailOrPhone, code, newPassword }
        : { email: emailOrPhone, code, newPassword };

      const response = await api.post<AuthResponse>('/api/auth/reset-password', payload);

      if (response.data.success && response.data.token && response.data.user) {
        await this.setAuthData(response.data.token, response.data.user);
      }

      return {
        success: response.data.success,
        message: response.data.message,
        token: response.data.token,
        user: response.data.user,
      };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to reset password',
      };
    }
  }

  // Get current user
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const response = await api.get('/api/auth/me');

      // Backend returns user directly, not wrapped in {success, user}
      const userData = response.data;

      // Check if it's a valid user object (has _id)
      if (userData && userData._id) {
        this.user = userData as User;
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        return {
          success: true,
          user: userData as User,
        };
      }

      // Handle wrapped response format (for backwards compatibility)
      if (userData.success && userData.user) {
        this.user = userData.user;
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData.user));
        return userData;
      }

      return {
        success: false,
        message: 'Invalid user data',
      };
    } catch (error: any) {
      console.error('Get current user error:', error);
      // If 401, clear the invalid token
      if (error.response?.status === 401) {
        console.log('Token invalid, clearing auth data');
        await this.logout();
      }
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get user',
      };
    }
  }

  // Login with existing token (for biometric login)
  async loginWithToken(token: string): Promise<AuthResponse> {
    try {
      // Temporarily set the token to make the request
      const previousToken = this.token;
      this.token = token;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);

      // Validate the token by fetching user info
      const response = await api.get<AuthResponse>('/api/auth/me');

      if (response.data.success && response.data.user) {
        this.user = response.data.user;
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(response.data.user));
        return {
          success: true,
          token: token,
          user: response.data.user,
        };
      }

      // Token is invalid, restore previous state
      this.token = previousToken;
      if (previousToken) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, previousToken);
      } else {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      }

      return {
        success: false,
        message: 'Session expired. Please login again.',
      };
    } catch (error: any) {
      console.error('Token login error:', error);
      // Clear invalid token
      this.token = null;
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      return {
        success: false,
        message: 'Session expired. Please login again.',
      };
    }
  }

  // Update profile
  async updateProfile(profileData: Partial<User['profile']>): Promise<AuthResponse> {
    try {
      const response = await api.put<AuthResponse>('/api/auth/profile', profileData);

      if (response.data.success && response.data.user) {
        this.user = response.data.user;
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error: any) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update profile',
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      this.token = null;
      this.user = null;
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Set auth data after successful login
  private async setAuthData(token: string, user: User): Promise<void> {
    this.token = token;
    this.user = user;
    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
      AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user)),
    ]);
  }

  // Get current token
  getToken(): string | null {
    return this.token;
  }

  // Get current user
  getUser(): User | null {
    return this.user;
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const authService = new AuthService();
export default authService;
