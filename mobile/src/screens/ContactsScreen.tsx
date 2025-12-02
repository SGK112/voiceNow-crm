import React, { useEffect } from 'react';
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
import { Contact } from '../services/ContactService';
import { useContacts } from '../hooks/useContacts';

interface ContactSection {
  title: string;
  data: Contact[];
}

export default function ContactsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const {
    contactSections,
    searchQuery,
    setSearchQuery,
    loading,
    refreshing,
    onRefresh,
    fetchContacts,
    totalContacts,
    activeContacts,
  } = useContacts();

  useEffect(() => {
    fetchContacts();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchContacts(true);
    });
    return unsubscribe;
  }, [navigation]);

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
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Contacts Found</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {searchQuery ? 'Try a different search term.' : 'Add contacts or import from your phone'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={[styles.importBtn, { backgroundColor: colors.primary }]}
          onPress={handleImportContacts}
        >
          <Ionicons name="download-outline" size={18} color="#fff" />
          <Text style={styles.importBtnText}>Import Contacts</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && totalContacts === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
      {contactSections.length > 0 ? (
        <SectionList
          sections={contactSections}
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
