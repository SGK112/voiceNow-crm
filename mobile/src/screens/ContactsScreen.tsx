import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SectionList,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import contactService, { Contact } from '../services/ContactService';

interface ContactSection {
  title: string;
  data: Contact[];
}

export default function ContactsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactSection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchContacts();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchContacts(true);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    filterAndGroupContacts();
  }, [contacts, searchQuery]);

  const fetchContacts = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoading(true);
      const fetchedContacts = await contactService.getContacts(forceRefresh);
      setContacts(fetchedContacts);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      Alert.alert('Error', 'Failed to fetch contacts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAndGroupContacts = () => {
    let filtered = contacts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = contacts.filter(
        contact =>
          contact.name.toLowerCase().includes(query) ||
          contact.phone.includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query)
      );
    }

    const grouped: { [key: string]: Contact[] } = {};
    filtered.forEach(contact => {
      const firstLetter = contact.name.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(contact);
    });

    const sections: ContactSection[] = Object.keys(grouped)
      .sort()
      .map(letter => ({
        title: letter,
        data: grouped[letter].sort((a, b) => a.name.localeCompare(b.name))
      }));

    setFilteredContacts(sections);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContacts(true);
  }, []);

  const handleContactPress = (contact: Contact) => {
    navigation.navigate('ContactDetails', { contactId: contact._id });
  };

  const handleAddContact = () => {
    navigation.navigate('AddEditContact', { mode: 'add' });
  };

  const handleImportContacts = () => {
    navigation.navigate('DataImport');
  };

  const handleCall = async (contact: Contact) => {
    const phoneUrl = `tel:${contact.phone}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await contactService.addConversation(
          contact._id,
          'call',
          'outgoing',
          'Outgoing call',
          { initiatedAt: new Date().toISOString() }
        );
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Cannot make phone calls on this device');
      }
    } catch (error) {
      console.error('Error making call:', error);
      Alert.alert('Error', 'Failed to initiate call');
    }
  };

  const handleSMS = async (contact: Contact) => {
    const smsUrl = `sms:${contact.phone}`;
    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await contactService.addConversation(
          contact._id,
          'sms',
          'outgoing',
          'Message sent',
          { initiatedAt: new Date().toISOString() }
        );
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert('Error', 'Cannot send SMS on this device');
      }
    } catch (error) {
      console.error('Error opening SMS:', error);
      Alert.alert('Error', 'Failed to open messaging app');
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const avatarColors = ['#8B5CF6', '#4F8EF7', '#34D399', '#FBBF24', '#F87171', '#EC4899'];
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  const formatLastInteraction = (date?: string) => {
    if (!date) return 'No interaction';
    const now = new Date();
    const interactionDate = new Date(date);
    const diffMs = now.getTime() - interactionDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return interactionDate.toLocaleDateString();
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={[styles.contactItem, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}
      onPress={() => handleContactPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>

      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
        {item.company && (
          <Text style={[styles.contactCompany, { color: colors.textTertiary }]}>{item.company}</Text>
        )}
        <Text style={[styles.lastInteraction, { color: colors.textTertiary }]}>
          {formatLastInteraction(item.lastInteraction)}
        </Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: colors.success + '15' }]}
          onPress={() => handleCall(item)}
        >
          <Ionicons name="call" size={18} color={colors.success} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: colors.secondary + '15' }]}
          onPress={() => handleSMS(item)}
        >
          <Ionicons name="chatbubble" size={18} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: ContactSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>{section.title}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrapper, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
      </View>
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Contacts Yet</Text>
      <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
        Add contacts manually or import from your phone
      </Text>
      <TouchableOpacity
        style={[styles.importButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
        onPress={handleImportContacts}
      >
        <Ionicons name="download-outline" size={20} color={colors.primary} />
        <Text style={[styles.importButtonText, { color: colors.primary }]}>Import Contacts</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && contacts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading contacts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.title, { color: colors.text }]}>Contacts</Text>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={handleImportContacts}
        >
          <Ionicons name="download-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <Ionicons name="search" size={20} color={colors.placeholder} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search contacts..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={[styles.statsText, { color: colors.textTertiary }]}>{contacts.length} contacts</Text>
      </View>

      {/* Contact List */}
      {filteredContacts.length > 0 ? (
        <SectionList
          sections={filteredContacts}
          keyExtractor={(item) => item._id}
          renderItem={renderContactItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          stickySectionHeadersEnabled
        />
      ) : (
        renderEmptyState()
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={handleAddContact}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  statsBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '700',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    marginBottom: 2,
  },
  contactCompany: {
    fontSize: 12,
    marginBottom: 2,
  },
  lastInteraction: {
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
