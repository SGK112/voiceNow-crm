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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import contactService, { Contact } from '../services/ContactService';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';

export default function ContactDetailsScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { contactId } = route.params;
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Aria modal state
  const [ariaModalVisible, setAriaModalVisible] = useState(false);
  const [ariaAction, setAriaAction] = useState<'call' | 'message' | null>(null);
  const [ariaMessage, setAriaMessage] = useState('');
  const [ariaLoading, setAriaLoading] = useState(false);
  const [ariaResponse, setAriaResponse] = useState('');

  useEffect(() => {
    fetchContactDetails();
  }, [contactId]);

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

  // Direct call
  const handleCall = async () => {
    if (!contact) return;
    navigation.navigate('Call', {
      mode: 'outgoing',
      phoneNumber: contact.phone,
      contactName: contact.name,
      contactId: contact._id,
    });
  };

  // Direct SMS
  const handleSMS = async () => {
    if (!contact) return;
    navigation.navigate('SMSChat', {
      contactId: contact._id,
      contactName: contact.name,
      contactPhone: contact.phone,
    });
  };

  // Aria call - opens modal to compose what Aria should say
  const handleAriaCall = () => {
    setAriaAction('call');
    setAriaMessage('');
    setAriaResponse('');
    setAriaModalVisible(true);
  };

  // Aria message - opens modal to compose message
  const handleAriaMessage = () => {
    setAriaAction('message');
    setAriaMessage('');
    setAriaResponse('');
    setAriaModalVisible(true);
  };

  // Send Aria action
  const sendAriaAction = async () => {
    if (!contact || !ariaMessage.trim()) return;

    setAriaLoading(true);
    try {
      // Get Aria to compose/refine the message
      const response = await api.post('/api/aria/chat', {
        message: ariaAction === 'call'
          ? `I need to call ${contact.name}. Help me prepare what to say: "${ariaMessage}". Give me a brief, professional script.`
          : `I need to send a message to ${contact.name}. Help me write this message: "${ariaMessage}". Make it professional and concise.`,
        conversationHistory: [],
        context: {
          contacts: {
            current: {
              name: contact.name,
              phone: contact.phone,
              company: contact.company,
              email: contact.email,
            }
          }
        },
      });

      if (response.data.success) {
        setAriaResponse(response.data.response);
      }
    } catch (error) {
      console.error('Aria error:', error);
      Alert.alert('Error', 'Failed to get Aria response');
    } finally {
      setAriaLoading(false);
    }
  };

  // Execute the Aria action (actually call or send message)
  const executeAriaAction = async () => {
    if (!contact) return;

    if (ariaAction === 'call') {
      // Navigate to call screen with Aria script
      setAriaModalVisible(false);
      navigation.navigate('Call', {
        mode: 'outgoing',
        phoneNumber: contact.phone,
        contactName: contact.name,
        contactId: contact._id,
        ariaScript: ariaResponse || ariaMessage,
      });
    } else {
      // Send SMS with Aria-composed message
      setAriaModalVisible(false);
      navigation.navigate('SMSChat', {
        contactId: contact._id,
        contactName: contact.name,
        contactPhone: contact.phone,
        prefillMessage: ariaResponse || ariaMessage,
      });
    }
  };

  const handleEmail = async () => {
    if (!contact?.email) {
      Alert.alert('No Email', 'This contact does not have an email address');
      return;
    }
    try {
      const url = `mailto:${contact.email}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (err) {
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
        navigation.goBack();
      }
    } catch (err) {
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
    const avatarColors = ['#3B82F6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading || !contact) {
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={[styles.headerBtn, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.headerBtn, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(contact.name) }]}>
            <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{contact.name}</Text>
          {contact.company && (
            <Text style={[styles.company, { color: colors.textSecondary }]}>{contact.company}</Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleCall}>
            <View style={[styles.actionIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="call" size={20} color="#10B981" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleSMS}>
            <View style={[styles.actionIcon, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="chatbubble" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleEmail}
            disabled={!contact.email}
          >
            <View style={[styles.actionIcon, { backgroundColor: contact.email ? '#F59E0B20' : colors.backgroundSecondary }]}>
              <Ionicons name="mail" size={20} color={contact.email ? '#F59E0B' : colors.textTertiary} />
            </View>
            <Text style={[styles.actionText, { color: contact.email ? colors.text : colors.textTertiary }]}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* Aria Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ARIA ASSISTANT</Text>

          <TouchableOpacity
            style={[styles.ariaBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
            onPress={handleAriaCall}
          >
            <View style={[styles.ariaBtnIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </View>
            <View style={styles.ariaBtnContent}>
              <Text style={[styles.ariaBtnTitle, { color: colors.text }]}>Aria Call</Text>
              <Text style={[styles.ariaBtnDesc, { color: colors.textSecondary }]}>
                Let Aria help you prepare for the call
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ariaBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
            onPress={handleAriaMessage}
          >
            <View style={[styles.ariaBtnIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </View>
            <View style={styles.ariaBtnContent}>
              <Text style={[styles.ariaBtnTitle, { color: colors.text }]}>Aria Message</Text>
              <Text style={[styles.ariaBtnDesc, { color: colors.textSecondary }]}>
                Let Aria compose a message for you
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONTACT INFO</Text>

          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={colors.textTertiary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{contact.phone}</Text>
            </View>

            {contact.email && (
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textTertiary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{contact.email}</Text>
              </View>
            )}

            {contact.company && (
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Ionicons name="business-outline" size={18} color={colors.textTertiary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Company</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{contact.company}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TAGS</Text>
            <View style={styles.tagsRow}>
              {contact.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activity */}
        {contact.conversationHistory && contact.conversationHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENT ACTIVITY</Text>
            <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {contact.conversationHistory.slice().reverse().slice(0, 5).map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.activityRow,
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }
                  ]}
                >
                  <Ionicons
                    name={item.type === 'call' ? 'call' : item.type === 'sms' ? 'chatbubble' : 'mail'}
                    size={16}
                    color={colors.textTertiary}
                  />
                  <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={1}>
                    {item.content}
                  </Text>
                  <Text style={[styles.activityTime, { color: colors.textTertiary }]}>
                    {formatDate(item.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {contact.notes && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTES</Text>
            <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.notesText, { color: colors.text }]}>{contact.notes}</Text>
            </View>
          </View>
        )}

        <View style={styles.footer} />
      </ScrollView>

      {/* Aria Modal */}
      <Modal
        visible={ariaModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAriaModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setAriaModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.modalTitleRow}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {ariaAction === 'call' ? 'Aria Call' : 'Aria Message'}
              </Text>
            </View>
            <TouchableOpacity onPress={ariaResponse ? executeAriaAction : sendAriaAction} disabled={ariaLoading || !ariaMessage.trim()}>
              <Text style={[styles.modalAction, { color: ariaMessage.trim() ? colors.primary : colors.textTertiary }]}>
                {ariaResponse ? 'Send' : 'Generate'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>To: {contact.name}</Text>

            <Text style={[styles.modalInputLabel, { color: colors.textSecondary }]}>
              {ariaAction === 'call' ? 'What do you want to discuss?' : 'What do you want to say?'}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder={ariaAction === 'call' ? 'e.g., Follow up on our meeting...' : 'e.g., Schedule a meeting for next week...'}
              placeholderTextColor={colors.textTertiary}
              value={ariaMessage}
              onChangeText={setAriaMessage}
              multiline
              numberOfLines={4}
            />

            {ariaLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Aria is thinking...</Text>
              </View>
            )}

            {ariaResponse && (
              <View style={styles.responseSection}>
                <Text style={[styles.responseLabel, { color: colors.textSecondary }]}>Aria's suggestion:</Text>
                <View style={[styles.responseCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} style={styles.responseIcon} />
                  <Text style={[styles.responseText, { color: colors.text }]}>{ariaResponse}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
    paddingBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  company: {
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  ariaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  ariaBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ariaBtnContent: {
    flex: 1,
    marginLeft: 12,
  },
  ariaBtnTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  ariaBtnDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  infoLabel: {
    fontSize: 13,
    width: 60,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  activityCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  activityText: {
    flex: 1,
    fontSize: 14,
  },
  activityTime: {
    fontSize: 12,
  },
  notesCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    height: 100,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalAction: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  responseSection: {
    marginTop: 20,
  },
  responseLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  responseCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
  },
  responseIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  responseText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});
