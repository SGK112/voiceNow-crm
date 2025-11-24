import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

// Google OAuth Client IDs
const GOOGLE_WEB_CLIENT_ID = '710258787879-po32qt7v1cta0h0esrl0mle53vb8193a.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '710258787879-732ell2g9g0llo41uispncfkpqr4qlf2.apps.googleusercontent.com';

export default function LoginScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { login, googleLogin, biometricLogin, biometricAvailable, biometricEnabled, biometricType } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Auto-prompt biometric on mount if enabled
  React.useEffect(() => {
    if (biometricAvailable && biometricEnabled) {
      handleBiometricLogin();
    }
  }, [biometricAvailable, biometricEnabled]);

  // Google OAuth using Expo's proxy only (force proxy mode for Expo Go)
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
  });

  // Handle Google auth response
  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleSuccess(authentication.accessToken, authentication.idToken);
      }
    } else if (response?.type === 'error') {
      console.error('Google OAuth error:', response.error);
      Alert.alert('Error', 'Google sign-in failed');
      setIsGoogleLoading(false);
    } else if (response?.type === 'dismiss') {
      setIsGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleSuccess = async (accessToken: string, idToken?: string | null) => {
    try {
      const loginResult = await googleLogin(idToken || '', accessToken);
      if (!loginResult.success) {
        Alert.alert('Error', loginResult.message || 'Google sign-in failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google sign-in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    try {
      setIsLoading(true);
      const result = await login({ email: email.trim().toLowerCase(), password });

      if (!result.success) {
        Alert.alert('Login Failed', result.message || 'Invalid email or password');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (!request) {
      Alert.alert('Error', 'Google sign-in not ready. Please try again.');
      return;
    }
    setIsGoogleLoading(true);
    promptAsync();
  };

  const handleBiometricLogin = async () => {
    try {
      setIsBiometricLoading(true);
      const result = await biometricLogin();
      if (!result.success) {
        // Only show error if it's not a cancellation
        if (result.message !== 'Cancelled') {
          Alert.alert('Authentication Failed', result.message || `${biometricType} authentication failed`);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Biometric authentication failed');
    } finally {
      setIsBiometricLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={isDark
          ? ['#1E3A8A', '#7C3AED', '#0F172A']
          : ['#3B82F6', '#8B5CF6', '#F1F5F9']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Decorative Circles */}
      <View style={[styles.decorativeCircle, styles.circle1, { backgroundColor: isDark ? '#3B82F620' : '#FFFFFF30' }]} />
      <View style={[styles.decorativeCircle, styles.circle2, { backgroundColor: isDark ? '#8B5CF620' : '#FFFFFF20' }]} />
      <View style={[styles.decorativeCircle, styles.circle3, { backgroundColor: isDark ? '#3B82F610' : '#FFFFFF15' }]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']}
                style={styles.logoGradient}
              >
                <Ionicons name="radio" size={32} color="#3B82F6" />
              </LinearGradient>
            </View>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.brandText}>VoiceFlow AI</Text>
          </View>

          {/* Login Card */}
          <View style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              shadowColor: isDark ? '#000' : '#64748B',
            }
          ]}>
            {/* Card Header Accent */}
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardAccent}
            />

            <View style={styles.cardContent}>
              {/* Biometric & Google Sign In Row */}
              <View style={styles.socialButtonsRow}>
                {/* Face ID / Touch ID Button - Only show if biometric is enabled */}
                {biometricAvailable && biometricEnabled && (
                  <TouchableOpacity
                    style={[
                      styles.biometricButton,
                      {
                        backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF',
                        borderColor: isDark ? '#3B82F6' : '#BFDBFE',
                      }
                    ]}
                    onPress={handleBiometricLogin}
                    disabled={isLoading || isGoogleLoading || isBiometricLoading}
                    activeOpacity={0.8}
                  >
                    {isBiometricLoading ? (
                      <ActivityIndicator color="#3B82F6" size="small" />
                    ) : (
                      <Ionicons
                        name={biometricType === 'Face ID' ? 'scan' : 'finger-print'}
                        size={24}
                        color="#3B82F6"
                      />
                    )}
                  </TouchableOpacity>
                )}

                {/* Google Sign In Button */}
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    biometricAvailable && biometricEnabled && styles.googleButtonWithBiometric,
                    {
                      backgroundColor: isDark ? '#FFFFFF' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    }
                  ]}
                  onPress={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading || isBiometricLoading}
                  activeOpacity={0.8}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator color="#1F2937" size="small" />
                  ) : (
                    <>
                      {/* Google "G" Logo SVG Recreation */}
                      <View style={styles.googleLogoContainer}>
                        <View style={styles.googleLogo}>
                          <View style={[styles.googleLogoSegment, styles.googleBlue]} />
                          <View style={[styles.googleLogoSegment, styles.googleRed]} />
                          <View style={[styles.googleLogoSegment, styles.googleYellow]} />
                          <View style={[styles.googleLogoSegment, styles.googleGreen]} />
                          <View style={styles.googleLogoCenter} />
                        </View>
                      </View>
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                <View style={[styles.dividerTextContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                  <Text style={[styles.dividerText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    or sign in with email
                  </Text>
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
                        ? '#3B82F6'
                        : isDark ? '#334155' : '#E2E8F0',
                      borderWidth: focusedInput === 'email' ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[
                    styles.inputIconContainer,
                    { backgroundColor: focusedInput === 'email' ? '#3B82F615' : 'transparent' }
                  ]}>
                    <Ionicons
                      name="mail"
                      size={18}
                      color={focusedInput === 'email' ? '#3B82F6' : isDark ? '#64748B' : '#94A3B8'}
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
                <View style={styles.passwordLabelRow}>
                  <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Password
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    disabled={isLoading || isGoogleLoading}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot?</Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: focusedInput === 'password'
                        ? '#3B82F6'
                        : isDark ? '#334155' : '#E2E8F0',
                      borderWidth: focusedInput === 'password' ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[
                    styles.inputIconContainer,
                    { backgroundColor: focusedInput === 'password' ? '#3B82F615' : 'transparent' }
                  ]}>
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color={focusedInput === 'password' ? '#3B82F6' : isDark ? '#64748B' : '#94A3B8'}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, { color: isDark ? '#F1F5F9' : '#1E293B' }]}
                    placeholder="Enter your password"
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
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, (isLoading || isGoogleLoading) && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading || isGoogleLoading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Sign In</Text>
                      <View style={styles.loginButtonIcon}>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Don't have an account?
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Signup')}
              disabled={isLoading || isGoogleLoading}
              style={styles.signupButton}
            >
              <Text style={styles.signupLink}>Create Account</Text>
              <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text style={[styles.termsText, { color: isDark ? '#475569' : '#94A3B8' }]}>
            By signing in, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
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
    height: height * 0.45,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    top: 100,
    left: -30,
  },
  circle3: {
    width: 100,
    height: 100,
    top: 200,
    right: 50,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  brandText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
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
  socialButtonsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  biometricButton: {
    width: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonWithBiometric: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dividerContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 54,
    paddingHorizontal: 4,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
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
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    paddingHorizontal: 24,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  loginButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  signupText: {
    fontSize: 15,
    marginBottom: 8,
  },
  signupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signupLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  termsLink: {
    color: '#3B82F6',
    fontWeight: '500',
  },
});
