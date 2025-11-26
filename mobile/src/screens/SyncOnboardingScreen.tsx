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
    color: '#8B5CF6',
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
          Contacts.Fields.JobTitle,
          Contacts.Fields.Note,
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
        title: contact.jobTitle || '',
        notes: contact.note || '',
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
    await completeOnboarding();
  };

  const handleContinue = async () => {
    await completeOnboarding();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark
          ? ['#1E3A8A', '#7C3AED', '#0F172A']
          : ['#3B82F6', '#8B5CF6', '#F1F5F9']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />

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
          <Text style={styles.title}>Sync Your Accounts</Text>
          <Text style={styles.subtitle}>
            Import your contacts and calendar to get started with VoiceFlow
          </Text>
        </View>

        {/* Sync Options */}
        <View style={styles.optionsContainer}>
          {syncOptions.map((option) => {
            const isSyncing = syncingItem === option.id;
            const isSynced = syncedItems.has(option.id);

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isSynced ? '#10B981' : isDark ? '#334155' : '#E2E8F0',
                    borderWidth: isSynced ? 2 : 1,
                  },
                ]}
                onPress={() => handleSync(option.id)}
                disabled={isSyncing || isSynced}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: `${option.color}15` }]}>
                  <Ionicons name={option.icon} size={28} color={option.color} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
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
            );
          })}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E293B' : '#F0F9FF' }]}>
          <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
          <Text style={[styles.infoText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Your data stays private and secure. We only sync to help you manage your business better.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: colors.background }]}>
        {syncedItems.size > 0 ? (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>Continue to App</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 200,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
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
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
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
