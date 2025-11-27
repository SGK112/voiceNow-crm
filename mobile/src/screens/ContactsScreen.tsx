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
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      // Check for 401 unauthorized - don't show alert, just show empty state
      if (err?.response?.status === 401) {
        console.log('Unauthorized - user may need to re-login');
        setContacts([]);
      } else if (!forceRefresh) {
        // Only show alert on initial load, not on refresh
        Alert.alert('Error', 'Failed to fetch contacts. Please try again.');
      }
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

  const handleEditContact = (contact: Contact) => {
    navigation.navigate('AddEditContact', {
      mode: 'edit',
      contactId: contact._id,
    });
  };

  const handleDeleteContact = async (contact: Contact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactService.deleteContact(contact._id);
              await fetchContacts(true);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete contact.');
            }
          },
        },
      ]
    );
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
        await Linking.openURL(phoneUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Cannot make phone calls');
    }
  };

  const handleSMS = async (contact: Contact) => {
    const smsUrl = `sms:${contact.phone}`;
    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Cannot send SMS');
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
    const avatarColors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={[styles.contactRow, { borderBottomColor: colors.border }]}
      onPress={() => handleContactPress(item)}
      activeOpacity={0.6}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>

      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => handleCall(item)}
        >
          <Ionicons name="call-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => handleSMS(item)}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: ContactSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.textTertiary }]}>{section.title}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Contacts</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Add contacts or import from your phone
      </Text>
      <TouchableOpacity
        style={[styles.importBtn, { backgroundColor: colors.primary }]}
        onPress={handleImportContacts}
      >
        <Ionicons name="download-outline" size={18} color="#fff" />
        <Text style={styles.importBtnText}>Import Contacts</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && contacts.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalContacts = contacts.length;
  const activeContacts = contacts.filter(c => c.lastInteraction).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Contacts</Text>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.backgroundSecondary }]}
          onPress={handleImportContacts}
        >
          <Ionicons name="download-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalContacts}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{activeContacts}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Active</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search contacts..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
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
            />
          }
          stickySectionHeadersEnabled
        />
      ) : (
        renderEmptyState()
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddContact}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 120,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 14,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  importBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});
