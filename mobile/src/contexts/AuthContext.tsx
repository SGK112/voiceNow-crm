import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService, { User, AuthResponse, LoginCredentials, SignupCredentials } from '../services/AuthService';
import biometricService from '../services/BiometricService';

const ONBOARDING_COMPLETED_KEY = '@voiceflow_onboarding_completed';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricType: string;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  signup: (credentials: SignupCredentials) => Promise<AuthResponse>;
  googleLogin: (idToken: string, accessToken?: string) => Promise<AuthResponse>;
  biometricLogin: () => Promise<AuthResponse>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  forgotPassword: (emailOrPhone: string) => Promise<AuthResponse>;
  verifyResetCode: (emailOrPhone: string, code: string) => Promise<AuthResponse>;
  resetPassword: (emailOrPhone: string, code: string, newPassword: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  needsOnboarding: false,
  biometricAvailable: false,
  biometricEnabled: false,
  biometricType: 'Biometric',
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  googleLogin: async () => ({ success: false }),
  biometricLogin: async () => ({ success: false }),
  enableBiometric: async () => false,
  disableBiometric: async () => {},
  forgotPassword: async () => ({ success: false }),
  verifyResetCode: async () => ({ success: false }),
  resetPassword: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
  completeOnboarding: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
    initializeBiometric();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const { token: storedToken, user: storedUser } = await authService.initialize();
      setToken(storedToken);
      setUser(storedUser);

      // Check if user needs onboarding
      if (storedToken && storedUser) {
        const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        setNeedsOnboarding(!onboardingCompleted);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeBiometric = async () => {
    try {
      const available = await biometricService.isAvailable();
      setBiometricAvailable(available);

      if (available) {
        const type = await biometricService.getBiometricType();
        setBiometricType(type);

        const enabled = await biometricService.isEnabled();
        setBiometricEnabled(enabled);
      }
    } catch (error) {
      console.error('Biometric initialization error:', error);
    }
  };

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await authService.login(credentials);
    if (response.success && response.user && response.token) {
      setUser(response.user);
      setToken(response.token);
      // Check onboarding status for this login
      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      setNeedsOnboarding(!onboardingCompleted);
    }
    return response;
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials): Promise<AuthResponse> => {
    const response = await authService.signup(credentials);
    if (response.success && response.user && response.token) {
      setUser(response.user);
      setToken(response.token);
      // New signups always need onboarding
      setNeedsOnboarding(true);
    }
    return response;
  }, []);

  const googleLogin = useCallback(async (idToken: string, accessToken?: string): Promise<AuthResponse> => {
    const response = await authService.googleLogin(idToken, accessToken);
    if (response.success && response.user && response.token) {
      setUser(response.user);
      setToken(response.token);
      // Check onboarding status for this login
      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      setNeedsOnboarding(!onboardingCompleted);
    }
    return response;
  }, []);

  const biometricLogin = useCallback(async (): Promise<AuthResponse> => {
    try {
      // Check if biometric is enabled and has credentials
      const hasCredentials = await biometricService.hasStoredCredentials();
      if (!hasCredentials) {
        return { success: false, message: 'Biometric login not set up' };
      }

      // Authenticate with biometrics
      const authResult = await biometricService.authenticate();
      if (!authResult.success) {
        return { success: false, message: authResult.error || 'Authentication failed' };
      }

      // Get stored credentials
      const credentials = await biometricService.getCredentials();
      if (!credentials) {
        return { success: false, message: 'No stored credentials' };
      }

      // Use the stored token to restore session
      const response = await authService.loginWithToken(credentials.token);
      if (response.success && response.user && response.token) {
        setUser(response.user);
        setToken(response.token);
        // Update stored token if it changed
        await biometricService.updateToken(response.token);
      }
      return response;
    } catch (error: any) {
      console.error('Biometric login error:', error);
      return { success: false, message: error.message || 'Biometric login failed' };
    }
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!token || !user) return false;

    const success = await biometricService.enable({
      email: user.email,
      token: token,
    });

    if (success) {
      setBiometricEnabled(true);
    }
    return success;
  }, [token, user]);

  const disableBiometric = useCallback(async (): Promise<void> => {
    await biometricService.disable();
    setBiometricEnabled(false);
  }, []);

  const forgotPassword = useCallback(async (emailOrPhone: string): Promise<AuthResponse> => {
    return await authService.forgotPassword(emailOrPhone);
  }, []);

  const verifyResetCode = useCallback(async (emailOrPhone: string, code: string): Promise<AuthResponse> => {
    return await authService.verifyResetCode(emailOrPhone, code);
  }, []);

  const resetPassword = useCallback(async (
    emailOrPhone: string,
    code: string,
    newPassword: string
  ): Promise<AuthResponse> => {
    const response = await authService.resetPassword(emailOrPhone, code, newPassword);
    if (response.success && response.user && response.token) {
      setUser(response.user);
      setToken(response.token);
    }
    return response;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    // Don't disable biometric on logout - user might want to use it to log back in
    setUser(null);
    setToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await authService.getCurrentUser();
    if (response.success && response.user) {
      setUser(response.user);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setNeedsOnboarding(false);
  }, []);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        needsOnboarding,
        biometricAvailable,
        biometricEnabled,
        biometricType,
        login,
        signup,
        googleLogin,
        biometricLogin,
        enableBiometric,
        disableBiometric,
        forgotPassword,
        verifyResetCode,
        resetPassword,
        logout,
        refreshUser,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
