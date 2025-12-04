import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as Calendar from 'expo-calendar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../utils/constants';
import DotGridBackground from '../components/DotGridBackground';
import notificationService from '../services/notificationService';

interface SyncOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const syncOptions: SyncOption[] = [
  {
    id: 'contacts',
    title: 'Phone Contacts',
    description: 'Import your contacts to manage leads and customers',
    icon: 'people',
    color: '#3B82F6',
  },
  {
    id: 'calendar',
    title: 'Calendar Events',
    description: 'Sync appointments and schedule jobs seamlessly',
    icon: 'calendar',
    color: '#3B82F6',
  },
];

export default function SyncOnboardingScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { token, user, completeOnboarding } = useAuth();
  const [syncingItem, setSyncingItem] = useState<string | null>(null);
  const [syncedItems, setSyncedItems] = useState<Set<string>>(new Set());

  const syncContacts = async () => {
    try {
      setSyncingItem('contacts');

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable contacts access in your device settings to sync contacts.');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Company,
        ],
      });

      if (data.length === 0) {
        Alert.alert('No Contacts', 'No contacts found on your device.');
        return;
      }

      // Transform contacts for API
      const contacts = data.slice(0, 500).map(contact => ({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        phone: contact.phoneNumbers?.[0]?.number || '',
        email: contact.emails?.[0]?.email || '',
        company: contact.company || '',
        source: 'device_sync',
      })).filter(c => c.firstName || c.lastName || c.phone || c.email);

      // Send to backend
      const response = await fetch(`${API_URL}/api/profile/default/sync/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ contacts }),
      });

      const result = await response.json();

      if (result.success) {
        setSyncedItems(prev => new Set([...prev, 'contacts']));
        Alert.alert('Success', `Synced ${result.imported || contacts.length} contacts!`);
      } else {
        throw new Error(result.message || 'Failed to sync contacts');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sync contacts');
    } finally {
      setSyncingItem(null);
    }
  };

  const syncCalendar = async () => {
    try {
      setSyncingItem('calendar');

      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable calendar access in your device settings to sync events.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const calendarIds = calendars.map(cal => cal.id);

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Next 3 months

      const events = await Calendar.getEventsAsync(
        calendarIds,
        startDate,
        endDate
      );

      if (events.length === 0) {
        Alert.alert('No Events', 'No upcoming calendar events found.');
        return;
      }

      // Transform events for API
      const calendarEvents = events.slice(0, 200).map(event => ({
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location || '',
        notes: event.notes || '',
        source: 'device_sync',
      }));

      // Send to backend
      const response = await fetch(`${API_URL}/api/profile/default/sync/calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ events: calendarEvents }),
      });

      const result = await response.json();

      if (result.success) {
        setSyncedItems(prev => new Set([...prev, 'calendar']));
        Alert.alert('Success', `Synced ${result.imported || calendarEvents.length} calendar events!`);
      } else {
        throw new Error(result.message || 'Failed to sync calendar');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sync calendar');
    } finally {
      setSyncingItem(null);
    }
  };

  const handleSync = async (optionId: string) => {
    if (optionId === 'contacts') {
      await syncContacts();
    } else if (optionId === 'calendar') {
      await syncCalendar();
    }
  };

  const handleSkip = async () => {
    // Initialize notification service for daily summaries
    await notificationService.initializeDailySummary();
    await completeOnboarding();
  };

  const handleContinue = async () => {
    // Initialize notification service for daily summaries
    await notificationService.initializeDailySummary();
    await completeOnboarding();
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
      {/* Dot Grid Background */}
      <DotGridBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#FFFFFF', '#FFFFFF']}
              style={styles.iconGradient}
            >
              <Ionicons name="sync" size={32} color="#3B82F6" />
            </LinearGradient>
          </View>
          <Text style={styles.welcomeText}>Almost there!</Text>
          <Text style={styles.title}>Sync Your Data</Text>
          <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Import your contacts and calendar to get started with VoiceFlow AI
          </Text>
        </View>

        {/* Sync Options Card */}
        <View style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            shadowColor: isDark ? '#000' : '#64748B',
          }
        ]}>
          {/* Card Header Accent */}
          <LinearGradient
            colors={['#3B82F6', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardAccent}
          />

          <View style={styles.cardContent}>
            {syncOptions.map((option, index) => {
              const isSyncing = syncingItem === option.id;
              const isSynced = syncedItems.has(option.id);

              return (
                <React.Fragment key={option.id}>
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: isSynced ? '#10B981' : isDark ? '#334155' : '#E2E8F0',
                        borderWidth: isSynced ? 2 : 1,
                      },
                    ]}
                    onPress={() => handleSync(option.id)}
                    disabled={isSyncing || isSynced}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionIconContainer, { backgroundColor: `${option.color}15` }]}>
                      <Ionicons name={option.icon} size={24} color={option.color} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                        {option.title}
                      </Text>
                      <Text style={[styles.optionDescription, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                        {option.description}
                      </Text>
                    </View>
                    <View style={styles.optionAction}>
                      {isSyncing ? (
                        <ActivityIndicator color={option.color} size="small" />
                      ) : isSynced ? (
                        <View style={styles.syncedBadge}>
                          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        </View>
                      ) : (
                        <View style={[styles.syncButton, { backgroundColor: option.color }]}>
                          <Text style={styles.syncButtonText}>Sync</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  {index < syncOptions.length - 1 && <View style={styles.optionSpacer} />}
                </React.Fragment>
              );
            })}

            {/* Info Card */}
            <View style={[styles.infoCard, { backgroundColor: isDark ? '#0F172A' : '#F0F9FF' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#3B82F6" />
              <Text style={[styles.infoText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Your data stays private and secure. We only sync to help you manage your business better.
              </Text>
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={syncedItems.size > 0 ? ['#10B981', '#059669'] : ['#334155', '#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>
              {syncedItems.size > 0 ? 'Continue to App' : 'Get Started'}
            </Text>
            <View style={styles.continueButtonIcon}>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Skip Link */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipButtonText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            Skip for now
          </Text>
        </TouchableOpacity>

        <Text style={[styles.laterText, { color: isDark ? '#475569' : '#CBD5E1' }]}>
          You can always sync later from Profile Settings
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
    marginBottom: 24,
  },
  cardAccent: {
    height: 4,
  },
  cardContent: {
    padding: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  optionSpacer: {
    height: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  optionAction: {
    marginLeft: 12,
  },
  syncButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  syncedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    paddingHorizontal: 24,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  continueButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  laterText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
