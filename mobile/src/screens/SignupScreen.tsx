import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../utils/constants';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function SignupScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { signup, googleLogin } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Handle deep link OAuth callback
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received (signup):', url);

      if (url.includes('oauth')) {
        handleOAuthCallback(url);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('oauth')) {
        handleOAuthCallback(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleOAuthCallback = async (url: string) => {
    try {
      const params = new URLSearchParams(url.split('?')[1]);
      const token = params.get('token');
      const userParam = params.get('user');
      const error = params.get('error');

      if (error) {
        console.error('OAuth error:', error);
        Alert.alert('Error', `Google sign-up failed: ${error}`);
        setIsGoogleLoading(false);
        return;
      }

      if (token && userParam) {
        const user = JSON.parse(decodeURIComponent(userParam));
        console.log('OAuth success, user:', user.email);
        await handleGoogleSuccess(token, user);
      }
    } catch (err: any) {
      console.error('Error parsing OAuth callback:', err);
      Alert.alert('Error', 'Failed to process Google sign-up');
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSuccess = async (token: string, user: any) => {
    try {
      // The backend has already authenticated - just set the auth state
      const loginResult = await googleLogin(token, user);
      if (!loginResult.success) {
        Alert.alert('Error', loginResult.message || 'Google sign-up failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google sign-up failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pass)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pass)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pass)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Error', passwordError);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    try {
      setIsLoading(true);
      const result = await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (!result.success) {
        Alert.alert('Signup Failed', result.message || 'Could not create account');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);

    try {
      // Get OAuth URL from backend
      const response = await fetch(`${API_URL}/api/mobile/auth/google/url`);
      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error('Failed to get OAuth URL');
      }

      const oauthState = data.state;
      // Extract the production base URL from the OAuth URL for polling
      // The OAuth callback goes to production, so we must poll production for results
      const oauthUrl = new URL(data.url);
      const redirectUri = oauthUrl.searchParams.get('redirect_uri');
      const productionBaseUrl = redirectUri
        ? redirectUri.replace('/api/mobile/auth/google/callback', '')
        : 'https://voiceflow-crm.onrender.com'; // Fallback to production

      console.log('Opening Google OAuth URL with state:', oauthState?.substring(0, 8) + '...');
      console.log('Will poll production server:', productionBaseUrl);
      console.log('Full OAuth URL:', data.url);

      // Try using Linking.openURL for better iOS compatibility
      // This opens in Safari instead of in-app browser, which is more reliable
      const canOpen = await Linking.canOpenURL(data.url);
      console.log('Can open URL:', canOpen);

      if (canOpen) {
        await Linking.openURL(data.url);
        console.log('URL opened with Linking.openURL');
      } else {
        // Fallback to WebBrowser if Linking fails
        console.log('Fallback to WebBrowser.openAuthSessionAsync');
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'voicenow-crm://oauth'
        );
        console.log('WebBrowser closed, result type:', result.type);
      }

      // Start polling immediately since we can't wait for browser to close with Linking.openURL

      // When browser closes, poll for the OAuth result
      if (oauthState) {
        console.log('Polling for OAuth result...');

        // Poll for result - MUST poll production server since that's where OAuth callback goes
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max

        const pollForResult = async (): Promise<void> => {
          try {
            // Poll the PRODUCTION server, not local, because OAuth callback stores result there
            const pollResponse = await fetch(`${productionBaseUrl}/api/mobile/auth/google/complete/${oauthState}`);
            const pollData = await pollResponse.json();

            console.log('Poll attempt', attempts + 1, '- status:', pollData.status);

            if (pollData.success && pollData.status === 'completed') {
              // OAuth completed successfully!
              console.log('OAuth completed for:', pollData.user?.email);
              await handleGoogleSuccess(pollData.token, pollData.user);
              return;
            } else if (pollData.status === 'expired' || pollData.status === 'not_found') {
              // OAuth session expired or not found
              if (attempts < 2) {
                // First couple attempts might be too early, keep trying
                attempts++;
                setTimeout(pollForResult, 1000);
              } else {
                console.log('OAuth session not found after polling');
                setIsGoogleLoading(false);
              }
              return;
            } else if (pollData.status === 'pending') {
              // Still waiting, try again
              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(pollForResult, 1000);
              } else {
                console.log('OAuth polling timed out');
                Alert.alert('Timeout', 'Sign-up took too long. Please try again.');
                setIsGoogleLoading(false);
              }
            }
          } catch (pollError: any) {
            // Use warn instead of error to avoid red modal in dev
            console.warn('Poll network error (will retry):', pollError?.message || pollError);
            attempts++;
            if (attempts < maxAttempts) {
              // Wait a bit longer on network errors
              setTimeout(pollForResult, 2000);
            } else {
              Alert.alert('Network Error', 'Could not connect to server. Please check your connection and try again.');
              setIsGoogleLoading(false);
            }
          }
        };

        // Start polling after a short delay to give user time to complete OAuth
        setTimeout(pollForResult, 1000);
      } else {
        setIsGoogleLoading(false);
      }
    } catch (error: any) {
      console.error('Google sign-up error:', error);
      Alert.alert('Error', error.message || 'Failed to start Google sign-up');
      setIsGoogleLoading(false);
    }
  };

  const getPasswordStrength = (): { label: string; color: string; width: string; level: number } => {
    if (!password) return { label: '', color: '#E2E8F0', width: '0%', level: 0 };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { label: 'Weak', color: '#EF4444', width: '33%', level: 1 };
    if (strength <= 3) return { label: 'Medium', color: '#F59E0B', width: '66%', level: 2 };
    return { label: 'Strong', color: '#10B981', width: '100%', level: 3 };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={isDark
          ? ['#7C3AED', '#1E3A8A', '#0F172A']
          : ['#8B5CF6', '#3B82F6', '#F1F5F9']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Decorative Circles */}
      <View style={[styles.decorativeCircle, styles.circle1, { backgroundColor: isDark ? '#8B5CF620' : '#FFFFFF30' }]} />
      <View style={[styles.decorativeCircle, styles.circle2, { backgroundColor: isDark ? '#3B82F620' : '#FFFFFF20' }]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: isDark ? '#FFFFFF20' : '#FFFFFF40' }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerSubtitle}>Start your 14-day free trial</Text>
          </View>

          {/* Signup Card */}
          <View style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              shadowColor: isDark ? '#000' : '#64748B',
            }
          ]}>
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardAccent}
            />

            <View style={styles.cardContent}>
              {/* Google Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.googleButton,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  }
                ]}
                onPress={handleGoogleSignUp}
                disabled={isLoading || isGoogleLoading}
                activeOpacity={0.8}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color="#1F2937" size="small" />
                ) : (
                  <>
                    <View style={styles.googleLogoContainer}>
                      <View style={styles.googleLogo}>
                        <View style={[styles.googleLogoSegment, styles.googleBlue]} />
                        <View style={[styles.googleLogoSegment, styles.googleRed]} />
                        <View style={[styles.googleLogoSegment, styles.googleYellow]} />
                        <View style={[styles.googleLogoSegment, styles.googleGreen]} />
                        <View style={styles.googleLogoCenter} />
                      </View>
                    </View>
                    <Text style={styles.googleButtonText}>Sign up with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                <View style={[styles.dividerTextContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                  <Text style={[styles.dividerText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    or with email
                  </Text>
                </View>
              </View>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Full Name
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: focusedInput === 'name'
                        ? '#8B5CF6'
                        : isDark ? '#334155' : '#E2E8F0',
                      borderWidth: focusedInput === 'name' ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[
                    styles.inputIconContainer,
                    { backgroundColor: focusedInput === 'name' ? '#8B5CF615' : 'transparent' }
                  ]}>
                    <Ionicons
                      name="person"
                      size={18}
                      color={focusedInput === 'name' ? '#8B5CF6' : isDark ? '#64748B' : '#94A3B8'}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, { color: isDark ? '#F1F5F9' : '#1E293B' }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!isLoading && !isGoogleLoading}
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Email Address
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: focusedInput === 'email'
                        ? '#8B5CF6'
                        : isDark ? '#334155' : '#E2E8F0',
                      borderWidth: focusedInput === 'email' ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[
                    styles.inputIconContainer,
                    { backgroundColor: focusedInput === 'email' ? '#8B5CF615' : 'transparent' }
                  ]}>
                    <Ionicons
                      name="mail"
                      size={18}
                      color={focusedInput === 'email' ? '#8B5CF6' : isDark ? '#64748B' : '#94A3B8'}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, { color: isDark ? '#F1F5F9' : '#1E293B' }]}
                    placeholder="Enter your email"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading && !isGoogleLoading}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Password
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: focusedInput === 'password'
                        ? '#8B5CF6'
                        : isDark ? '#334155' : '#E2E8F0',
                      borderWidth: focusedInput === 'password' ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[
                    styles.inputIconContainer,
                    { backgroundColor: focusedInput === 'password' ? '#8B5CF615' : 'transparent' }
                  ]}>
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color={focusedInput === 'password' ? '#8B5CF6' : isDark ? '#64748B' : '#94A3B8'}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, { color: isDark ? '#F1F5F9' : '#1E293B' }]}
                    placeholder="Create a password"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!isLoading && !isGoogleLoading}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={isDark ? '#64748B' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Strength */}
                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor: passwordStrength.level >= level
                                ? passwordStrength.color
                                : isDark ? '#334155' : '#E2E8F0'
                            }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Confirm Password
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: focusedInput === 'confirmPassword'
                        ? '#8B5CF6'
                        : confirmPassword && password !== confirmPassword
                          ? '#EF4444'
                          : isDark ? '#334155' : '#E2E8F0',
                      borderWidth: focusedInput === 'confirmPassword' ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[
                    styles.inputIconContainer,
                    { backgroundColor: focusedInput === 'confirmPassword' ? '#8B5CF615' : 'transparent' }
                  ]}>
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color={focusedInput === 'confirmPassword' ? '#8B5CF6' : isDark ? '#64748B' : '#94A3B8'}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, { color: isDark ? '#F1F5F9' : '#1E293B' }]}
                    placeholder="Confirm your password"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!isLoading && !isGoogleLoading}
                    onFocus={() => setFocusedInput('confirmPassword')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  {confirmPassword.length > 0 && password === confirmPassword && (
                    <View style={styles.matchIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                  )}
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                )}
              </View>

              {/* Terms Agreement */}
              <TouchableOpacity
                style={styles.termsContainer}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: agreedToTerms ? '#8B5CF6' : 'transparent',
                      borderColor: agreedToTerms ? '#8B5CF6' : isDark ? '#475569' : '#CBD5E1',
                    },
                  ]}
                >
                  {agreedToTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={[styles.termsText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Signup Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  (!agreedToTerms || isLoading || isGoogleLoading) && styles.buttonDisabled,
                ]}
                onPress={handleSignup}
                disabled={isLoading || isGoogleLoading || !agreedToTerms}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signupButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.signupButtonText}>Create Account</Text>
                      <View style={styles.signupButtonIcon}>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Already have an account?
            </Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={isLoading || isGoogleLoading}
              style={styles.loginButton}
            >
              <Text style={styles.loginLink}>Sign In</Text>
              <Ionicons name="arrow-forward" size={16} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 180,
    height: 180,
    top: -40,
    left: -40,
  },
  circle2: {
    width: 120,
    height: 120,
    top: 80,
    right: -20,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 24,
  },
  cardAccent: {
    height: 4,
  },
  cardContent: {
    padding: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleLogoContainer: {
    marginRight: 12,
  },
  googleLogo: {
    width: 20,
    height: 20,
    position: 'relative',
  },
  googleLogoSegment: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  googleBlue: {
    backgroundColor: '#4285F4',
    top: 0,
    right: 0,
    borderTopRightRadius: 10,
  },
  googleRed: {
    backgroundColor: '#EA4335',
    top: 0,
    left: 0,
    borderTopLeftRadius: 10,
  },
  googleYellow: {
    backgroundColor: '#FBBC05',
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 10,
  },
  googleGreen: {
    backgroundColor: '#34A853',
    bottom: 0,
    right: 0,
    borderBottomRightRadius: 10,
  },
  googleLogoCenter: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    top: 6,
    left: 6,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  dividerContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
  },
  dividerTextContainer: {
    paddingHorizontal: 16,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 4,
  },
  inputIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
  },
  eyeButton: {
    padding: 12,
  },
  matchIcon: {
    paddingRight: 12,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 55,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  signupButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signupButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: 24,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  signupButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    fontSize: 15,
    marginBottom: 8,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});
