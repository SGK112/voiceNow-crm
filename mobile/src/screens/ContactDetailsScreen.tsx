import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import contactService, { Contact } from '../services/ContactService';
import { useTheme } from '../contexts/ThemeContext';
import twilioService from '../services/TwilioService';

export default function ContactDetailsScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { contactId } = route.params;
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchContactDetails();
  }, [contactId]);

  // Refresh when screen comes back into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchContactDetails();
    });
    return unsubscribe;
  }, [navigation, contactId]);

  const fetchContactDetails = async () => {
    try {
      setLoading(true);
      const fetchedContact = await contactService.getContact(contactId);

      if (fetchedContact) {
        setContact(fetchedContact);
      } else {
        Alert.alert('Error', 'Contact not found.');
        navigation.goBack();
      }
    } catch (err) {
      console.error('Error fetching contact details:', err);
      Alert.alert('Error', 'Failed to fetch contact details.');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContactDetails();
  }, [contactId]);

  // In-app VoIP calling via Twilio
  const handleCall = async () => {
    if (!contact) return;

    // Navigate to the in-app call screen
    navigation.navigate('Call', {
      mode: 'outgoing',
      phoneNumber: contact.phone,
      contactName: contact.name,
      contactId: contact._id,
    });
  };

  // In-app SMS chat via Twilio
  const handleSMS = async () => {
    if (!contact) return;

    // Navigate to the in-app SMS chat screen
    navigation.navigate('SMSChat', {
      contactId: contact._id,
      contactName: contact.name,
      contactPhone: contact.phone,
    });
  };

  // Silent auto-logging for email
  const handleEmail = async () => {
    if (!contact?.email) {
      Alert.alert('No Email', 'This contact does not have an email address');
      return;
    }

    try {
      const url = `mailto:${contact.email}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        // Auto-log the email attempt silently
        await contactService.addConversation(
          contact._id,
          'email',
          'outgoing',
          'Email sent',
          { initiatedAt: new Date().toISOString() }
        );
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open email client');
      }
    } catch (err) {
      console.error('Error opening email:', err);
      Alert.alert('Error', 'Failed to open email client');
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddEditContact', {
      mode: 'edit',
      contactId: contact?._id,
      contact: contact,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      const success = await contactService.deleteContact(contactId);
      if (success) {
        Alert.alert('Success', 'Contact deleted successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to delete contact');
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
      Alert.alert('Error', 'Failed to delete contact');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getConversationIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'call': return 'call';
      case 'sms': return 'chatbubble';
      case 'email': return 'mail';
      case 'note': return 'document-text';
      default: return 'chatbubble';
    }
  };

  const getConversationColor = (type: string) => {
    switch (type) {
      case 'call': return '#10b981';
      case 'sms': return '#8b5cf6';
      case 'email': return '#3b82f6';
      case 'note': return '#f59e0b';
      default: return '#8b5cf6';
    }
  };

  if (loading || !contact) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading contact...</Text>
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
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="trash-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Avatar and Name */}
        <View style={styles.profileSection}>
          <View style={[styles.largeAvatar, { backgroundColor: getAvatarColor(contact.name) }]}>
            <Text style={styles.largeAvatarText}>{getInitials(contact.name)}</Text>
          </View>
          <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
          {contact.company && <Text style={[styles.company, { color: colors.textSecondary }]}>{contact.company}</Text>}
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{contact.totalCalls || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Calls</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{contact.totalSMS || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Messages</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{contact.totalEmails || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Emails</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickActionsContainer, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <View style={[styles.actionIconContainer, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="call" size={28} color={colors.success} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSMS}>
            <View style={[styles.actionIconContainer, { backgroundColor: colors.secondary + '15' }]}>
              <Ionicons name="chatbubble" size={28} color={colors.secondary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEmail}
            disabled={!contact.email}
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: contact.email ? colors.primary + '15' : colors.backgroundTertiary },
              ]}
            >
              <Ionicons name="mail" size={28} color={contact.email ? colors.primary : colors.textTertiary} />
            </View>
            <Text style={[styles.actionLabel, { color: contact.email ? colors.text : colors.textTertiary }]}>
              Email
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contact Information */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{contact.phone}</Text>
            </View>
          </View>
          {contact.email && (
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{contact.email}</Text>
              </View>
            </View>
          )}
          {contact.company && (
            <View style={styles.infoItem}>
              <Ionicons name="business-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Company</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{contact.company}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tags</Text>
            <View style={styles.tagsContainer}>
              {contact.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activity History */}
        {contact.conversationHistory && contact.conversationHistory.length > 0 && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity History</Text>
            {contact.conversationHistory
              .slice()
              .reverse()
              .slice(0, 15)
              .map((item, index) => (
                <View key={index} style={styles.activityItem}>
                  <View
                    style={[
                      styles.activityIconContainer,
                      { backgroundColor: `${getConversationColor(item.type)}20` },
                    ]}
                  >
                    <Ionicons
                      name={getConversationIcon(item.type)}
                      size={18}
                      color={getConversationColor(item.type)}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={[styles.activityType, { color: getConversationColor(item.type) }]}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {item.direction}
                      </Text>
                      <Text style={[styles.activityTime, { color: colors.textTertiary }]}>{formatDate(item.timestamp)}</Text>
                    </View>
                    <Text style={[styles.activityText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.content}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Notes */}
        {contact.notes && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            <View style={[styles.notesContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Text style={[styles.notesText, { color: colors.text }]}>{contact.notes}</Text>
            </View>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metadataSection}>
          <Text style={[styles.metadataText, { color: colors.textTertiary }]}>
            Created: {new Date(contact.createdAt).toLocaleDateString()}
          </Text>
          {contact.lastInteraction && (
            <Text style={[styles.metadataText, { color: colors.textTertiary }]}>
              Last Activity: {formatDate(contact.lastInteraction)}
            </Text>
          )}
        </View>
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
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  largeAvatarText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  contactName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  company: {
    fontSize: 16,
    color: '#9ca3af',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#374151',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#ffffff',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#8b5cf620',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  tagText: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  activityType: {
    fontSize: 13,
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  activityText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  notesContainer: {
    backgroundColor: '#1a1a1b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  notesText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  metadataSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  metadataText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
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
});
