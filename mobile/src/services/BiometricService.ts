import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = '@biometric_credentials';

export interface BiometricCredentials {
  email: string;
  token: string;
}

class BiometricService {
  // Check if device supports biometrics (Face ID / Touch ID)
  async isAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  // Get the type of biometric available (Face ID, Touch ID, etc.)
  async getBiometricType(): Promise<string> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Touch ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris';
      }
      return 'Biometric';
    } catch (error) {
      return 'Biometric';
    }
  }

  // Check if biometric login is enabled for this user
  async isEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  // Enable biometric login and store credentials securely
  async enable(credentials: BiometricCredentials): Promise<boolean> {
    try {
      // Verify biometric first
      const result = await this.authenticate('Enable biometric login');
      if (!result.success) return false;

      // Store credentials
      await AsyncStorage.setItem(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  }

  // Disable biometric login
  async disable(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
    } catch (error) {
      console.error('Error disabling biometric:', error);
    }
  }

  // Authenticate with biometrics
  async authenticate(promptMessage?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const biometricType = await this.getBiometricType();

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || `Sign in with ${biometricType}`,
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error === 'user_cancel' ? 'Cancelled' : result.error
        };
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get stored credentials after successful biometric auth
  async getCredentials(): Promise<BiometricCredentials | null> {
    try {
      const credentials = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      if (credentials) {
        return JSON.parse(credentials);
      }
      return null;
    } catch (error) {
      console.error('Error getting biometric credentials:', error);
      return null;
    }
  }

  // Update stored token (e.g., after token refresh)
  async updateToken(token: string): Promise<void> {
    try {
      const credentials = await this.getCredentials();
      if (credentials) {
        credentials.token = token;
        await AsyncStorage.setItem(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
      }
    } catch (error) {
      console.error('Error updating biometric token:', error);
    }
  }

  // Check if credentials are stored
  async hasStoredCredentials(): Promise<boolean> {
    try {
      const credentials = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      return !!credentials;
    } catch (error) {
      return false;
    }
  }
}

export const biometricService = new BiometricService();
export default biometricService;
