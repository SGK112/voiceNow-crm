import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ImportOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  comingSoon?: boolean;
}

export default function DataImportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const importOptions: ImportOption[] = [
    {
      id: 'contacts',
      title: 'Phone Contacts',
      description: 'Import contacts from your phone\'s address book',
      icon: 'people',
      color: '#3b82f6',
      route: 'ContactImport',
    },
    {
      id: 'calendar',
      title: 'Calendar Events',
      description: 'Sync your calendar appointments to CRM',
      icon: 'calendar',
      color: '#3b82f6',
      route: 'CalendarImport',
    },
    {
      id: 'calls',
      title: 'Call History',
      description: 'Import your phone call logs and link to contacts',
      icon: 'call',
      color: '#10b981',
      route: 'CallHistoryImport',
    },
    {
      id: 'email',
      title: 'Email Account',
      description: 'Connect Gmail or Outlook to sync emails',
      icon: 'mail',
      color: '#f59e0b',
      route: 'EmailConnect',
      comingSoon: true,
    },
    {
      id: 'messages',
      title: 'Text Messages',
      description: 'Import SMS conversations with contacts',
      icon: 'chatbubbles',
      color: '#ec4899',
      route: 'SMSImport',
      comingSoon: true,
    },
  ];

  const handleOptionPress = (option: ImportOption) => {
    if (option.comingSoon) {
      return;
    }
    navigation.navigate(option.route);
  };

  const renderImportOption = (option: ImportOption) => (
    <TouchableOpacity
      key={option.id}
      style={[
        styles.optionCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        option.comingSoon && styles.optionCardDisabled,
      ]}
      onPress={() => handleOptionPress(option)}
      activeOpacity={option.comingSoon ? 1 : 0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${option.color}20` }]}>
        <Ionicons name={option.icon} size={32} color={option.color} />
      </View>

      <View style={styles.optionContent}>
        <View style={styles.optionHeader}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
          {option.comingSoon && (
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.textTertiary }]}>
              <Text style={styles.comingSoonText}>Soon</Text>
            </View>
          )}
        </View>
        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>{option.description}</Text>
      </View>

      {!option.comingSoon && (
        <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Import Data</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Import your existing data to get started faster. All imports are secure and only
            stored on your CRM.
          </Text>
        </View>

        {/* Import Options */}
        <View style={styles.optionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Imports</Text>
          {importOptions.map(renderImportOption)}
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerButton: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#3b82f620',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#2a2a2b',
  },
  optionCardDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  optionDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  comingSoonBadge: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  bottomSpacer: {
    height: 120,
  },
});
