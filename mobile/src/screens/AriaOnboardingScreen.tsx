import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import notificationService from '../services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Onboarding steps
const STEPS = [
  {
    id: 'welcome',
    title: 'Meet Aria',
    subtitle: 'Your AI assistant that handles calls, captures leads, and manages conversations.',
  },
  {
    id: 'calls',
    title: 'Never Miss a Call',
    subtitle: 'Aria answers when you\'re busy, qualifies leads, and schedules appointments.',
  },
  {
    id: 'sms',
    title: 'Instant Responses',
    subtitle: 'Smart auto-replies keep leads engaged 24/7 with personalized messages.',
  },
  {
    id: 'notifications',
    title: 'Stay in the Loop',
    subtitle: 'Get daily summaries of calls handled, leads captured, and opportunities.',
  },
];

// Header tabs
const HEADER_TABS = ['Aria', 'Calls', 'SMS', 'Daily'];

interface Props {
  navigation: any;
}

export default function AriaOnboardingScreen({ navigation }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [enableDailySummary, setEnableDailySummary] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateStepChange = (newStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: newStep > currentStep ? 20 : -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(newStep);
      slideAnim.setValue(newStep > currentStep ? 20 : -20);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 10,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      animateStepChange(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (enableDailySummary) {
      await notificationService.scheduleDailySummary(8);
    }
    navigation.navigate('SyncOnboarding');
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <View style={styles.menuLines}>
            <View style={styles.menuLine} />
            <View style={[styles.menuLine, styles.menuLineShort]} />
          </View>
        </TouchableOpacity>

        <View style={styles.headerTabs}>
          {HEADER_TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              onPress={() => animateStepChange(index)}
              style={styles.headerTab}
            >
              <Text style={[
                styles.headerTabText,
                index === currentStep && styles.headerTabTextActive
              ]}>
                {tab}
              </Text>
              {index === currentStep && <View style={styles.headerTabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.navigate('SyncOnboarding')}
        >
          <Ionicons name="close" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainArea}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="flash" size={36} color="#d1d5db" />
            <View style={styles.logoOrbit} />
          </View>
          <View style={styles.sparkle}>
            <Ionicons name="sparkles" size={16} color="#d1d5db" />
          </View>
        </View>

        {/* Title and Subtitle */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.subtitle}>{step.subtitle}</Text>
        </Animated.View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {STEPS.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => animateStepChange(index)}
              style={[
                styles.stepDot,
                index === currentStep && styles.stepDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Quick Action Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActions}
        >
          <TouchableOpacity
            style={[styles.quickAction, styles.quickActionPrimary]}
            onPress={handleNext}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="flash" size={16} color="#3b82f6" />
            </View>
            <Text style={styles.quickActionTextPrimary}>
              {isLastStep ? 'Get Started' : 'Continue'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('SyncOnboarding')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="mic-outline" size={16} color="#6b7280" />
            </View>
            <Text style={styles.quickActionText}>Voice Mode</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionImage}>
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={18} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Input Box */}
        <View style={styles.inputBox}>
          <Text style={styles.inputPlaceholder}>Ask Anything</Text>

          <View style={styles.inputActions}>
            <TouchableOpacity style={styles.inputActionBtn}>
              <Ionicons name="attach-outline" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modeBadge}>
              <Ionicons name="flash" size={12} color="#6b7280" />
              <Text style={styles.modeBadgeText}>Fast</Text>
              <Ionicons name="chevron-down" size={12} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.speakBtn} onPress={handleNext}>
              <Ionicons name="mic" size={16} color="#fff" />
              <Text style={styles.speakBtnText}>Speak</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Summary Toggle (last step) */}
        {isLastStep && (
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setEnableDailySummary(!enableDailySummary)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.toggleCheckbox,
              enableDailySummary && styles.toggleCheckboxActive
            ]}>
              {enableDailySummary && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <Text style={styles.toggleText}>Enable daily summary at 8 AM</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  menuLines: {
    gap: 5,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
  },
  menuLineShort: {
    width: 14,
  },
  headerTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  headerTab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9ca3af',
    letterSpacing: -0.3,
  },
  headerTabTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  headerTabUnderline: {
    marginTop: 8,
    width: 14,
    height: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  // Main Area
  mainArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    position: 'relative',
  },
  logoOrbit: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  sparkle: {
    position: 'absolute',
    bottom: -4,
    right: -12,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
  },
  stepDotActive: {
    width: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },

  // Bottom Section
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    gap: 12,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  quickActionPrimary: {
    backgroundColor: '#eff6ff',
  },
  quickActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    letterSpacing: -0.2,
  },
  quickActionTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    letterSpacing: -0.2,
  },
  quickActionImage: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 8,
  },
  imagePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Input Box
  inputBox: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  inputPlaceholder: {
    fontSize: 17,
    color: '#9ca3af',
    marginBottom: 12,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 5,
  },
  modeBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  speakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
    marginLeft: 'auto',
  },
  speakBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.2,
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  toggleCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCheckboxActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  toggleText: {
    fontSize: 13,
    color: '#6b7280',
  },
});
