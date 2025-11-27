import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

interface PhoneContact {
  id: string;
  name: string;
  phoneNumbers?: Array<{ number?: string }>;
  emails?: Array<{ email?: string }>;
  company?: string;
  selected: boolean;
}

export default function ContactImportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        setPermissionGranted(true);
        loadPhoneContacts();
      } else {
        setPermissionGranted(false);
      }
    } catch (err) {
      console.error('Error requesting contacts permission:', err);
      Alert.alert('Error', 'Failed to request contacts permission');
    }
  };

  const loadPhoneContacts = async () => {
    try {
      setLoading(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Company,
        ],
      });

      // Filter contacts that have phone numbers and format them
      const formattedContacts: PhoneContact[] = data
        .filter((contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map((contact) => ({
          id: contact.id,
          name: contact.name || 'Unknown',
          phoneNumbers: contact.phoneNumbers,
          emails: contact.emails,
          company: contact.company,
          selected: false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setPhoneContacts(formattedContacts);
    } catch (err) {
      console.error('Error loading contacts:', err);
      Alert.alert('Error', 'Failed to load contacts from phone');
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (id: string) => {
    setPhoneContacts((prev) =>
      prev.map((contact) =>
        contact.id === id ? { ...contact, selected: !contact.selected } : contact
      )
    );
  };

  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setPhoneContacts((prev) =>
      prev.map((contact) => ({ ...contact, selected: newSelectAll }))
    );
  };

  const getSelectedCount = () => {
    return phoneContacts.filter((c) => c.selected).length;
  };

  const handleImport = async () => {
    const selectedContacts = phoneContacts.filter((c) => c.selected);

    if (selectedContacts.length === 0) {
      Alert.alert('No Selection', 'Please select at least one contact to import');
      return;
    }

    Alert.alert(
      'Import Contacts',
      `Import ${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Import',
          onPress: confirmImport,
        },
      ]
    );
  };

  const confirmImport = async () => {
    try {
      setImporting(true);

      const selectedContacts = phoneContacts.filter((c) => c.selected);

      // Format contacts for API
      const contactsToImport = selectedContacts.map((contact) => ({
        name: contact.name,
        phone: contact.phoneNumbers?.[0]?.number || '',
        email: contact.emails?.[0]?.email || undefined,
        company: contact.company || undefined,
        notes: 'Imported from phone contacts',
      }));

      const response = await api.post(
        '/api/mobile/contacts/import',
        { contacts: contactsToImport }
      );

      if (response.data.success) {
        // Clear cache to force refresh
        await AsyncStorage.removeItem('contacts');

        const { imported, duplicates, skipped, message } = response.data;

        // Build a helpful message based on what happened
        let alertMessage = message;
        let alertTitle = 'Import Complete';

        if (imported > 0) {
          alertTitle = 'Success';
          alertMessage = `Successfully imported ${imported} contact${imported !== 1 ? 's' : ''}.`;
          if (duplicates > 0) {
            alertMessage += ` ${duplicates} already existed.`;
          }
        } else if (duplicates > 0) {
          alertMessage = `All ${duplicates} contacts already exist in your CRM. No new contacts were added.`;
        } else {
          alertMessage = message || 'No contacts were imported.';
        }

        Alert.alert(
          alertTitle,
          alertMessage,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Error importing contacts:', err);
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to import contacts. Please try again.'
      );
    } finally {
      setImporting(false);
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
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const renderPermissionRequest = () => (
    <View style={styles.permissionContainer}>
      <Ionicons name="people" size={80} color={colors.primary} />
      <Text style={[styles.permissionTitle, { color: colors.text }]}>Access Your Contacts</Text>
      <Text style={[styles.permissionText, { color: colors.text }]}>
        VoiceNow CRM needs permission to access your contacts to import them into the app.
      </Text>
      <Text style={[styles.permissionSubtext, { color: colors.textSecondary }]}>
        Your privacy is important. We only read contact information and never share it with
        third parties.
      </Text>
      <TouchableOpacity style={[styles.permissionButton, { backgroundColor: colors.primary }]} onPress={requestPermission}>
        <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
        <Text style={styles.permissionButtonText}>Grant Permission</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContactItem = ({ item }: { item: PhoneContact }) => (
    <TouchableOpacity
      style={[styles.contactItem, { borderBottomColor: colors.border }]}
      onPress={() => toggleContact(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.checkbox}>
        {item.selected ? (
          <Ionicons name="checkbox" size={28} color={colors.primary} />
        ) : (
          <Ionicons name="square-outline" size={28} color={colors.textTertiary} />
        )}
      </View>

      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>

      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>
          {item.phoneNumbers?.[0]?.number || 'No phone'}
        </Text>
        {item.emails && item.emails.length > 0 && (
          <Text style={[styles.contactEmail, { color: colors.textTertiary }]}>{item.emails[0].email}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!permissionGranted) {
    return <View style={[styles.container, { backgroundColor: colors.background }]}>{renderPermissionRequest()}</View>;
  }

  if (loading) {
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Import Contacts</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Selection Controls */}
      <View style={[styles.controlsContainer, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.selectAllButton} onPress={toggleSelectAll}>
          <Ionicons
            name={selectAll ? 'checkbox' : 'square-outline'}
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.selectAllText, { color: colors.primary }]}>
            {selectAll ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
          {getSelectedCount()} of {phoneContacts.length} selected
        </Text>
      </View>

      {/* Contacts List */}
      <FlatList
        data={phoneContacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContactItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No contacts found on your phone</Text>
          </View>
        }
      />

      {/* Import Button */}
      {getSelectedCount() > 0 && (
        <View style={[styles.importButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: colors.primary }]}
            onPress={handleImport}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="download" size={24} color="#ffffff" />
                <Text style={styles.importButtonText}>
                  Import {getSelectedCount()} Contact{getSelectedCount() > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  selectedCount: {
    fontSize: 14,
    color: '#9ca3af',
  },
  listContent: {
    paddingBottom: 100,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  checkbox: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  importButtonContainer: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#0a0a0b',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1b',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  importButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
