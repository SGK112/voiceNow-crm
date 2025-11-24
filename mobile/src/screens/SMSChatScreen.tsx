import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import twilioService, { SMSMessage } from '../services/TwilioService';

interface SMSChatScreenProps {
  route: {
    params: {
      contactId: string;
      contactName: string;
      contactPhone: string;
    };
  };
  navigation: any;
}

export default function SMSChatScreen({ route, navigation }: SMSChatScreenProps) {
  const { colors } = useTheme();
  const { contactId, contactName, contactPhone } = route.params;

  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Load conversation
  useEffect(() => {
    loadConversation();

    // Subscribe to incoming SMS
    const unsubscribe = twilioService.addSMSListener((message) => {
      // Check if message is from this contact
      const normalizedFrom = message.from.replace(/\D/g, '').slice(-10);
      const normalizedContact = contactPhone.replace(/\D/g, '').slice(-10);

      if (normalizedFrom === normalizedContact) {
        setMessages((prev) => [...prev, message]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return unsubscribe;
  }, [contactId, contactPhone]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      const conversation = await twilioService.getConversation(contactId);
      setMessages(conversation);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversation();
    setRefreshing(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistically add message to UI
    const optimisticMessage: SMSMessage = {
      _id: `temp_${Date.now()}`,
      from: 'me',
      to: contactPhone,
      body: messageText,
      direction: 'outgoing',
      status: 'queued',
      timestamp: new Date().toISOString(),
      contactId,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const result = await twilioService.sendSMS(contactPhone, messageText, contactId);

      if (result.success) {
        // Update the optimistic message with actual data
        setMessages((prev) =>
          prev.map((m) =>
            m._id === optimisticMessage._id
              ? { ...m, _id: result.messageSid || m._id, status: 'sent' }
              : m
          )
        );
      } else {
        // Mark message as failed
        setMessages((prev) =>
          prev.map((m) =>
            m._id === optimisticMessage._id ? { ...m, status: 'failed' } : m
          )
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === optimisticMessage._id ? { ...m, status: 'failed' } : m
        )
      );
    } finally {
      setSending(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleCall = () => {
    navigation.navigate('Call', {
      mode: 'outgoing',
      phoneNumber: contactPhone,
      contactName,
      contactId,
    });
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) return timeStr;
    if (isYesterday) return `Yesterday ${timeStr}`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderMessage = ({ item, index }: { item: SMSMessage; index: number }) => {
    const isOutgoing = item.direction === 'outgoing';
    const showAvatar = !isOutgoing && (index === 0 || messages[index - 1]?.direction !== 'incoming');
    const showTime = index === messages.length - 1 ||
      new Date(messages[index + 1]?.timestamp).getTime() - new Date(item.timestamp).getTime() > 300000; // 5 min gap

    return (
      <View
        style={[
          styles.messageContainer,
          isOutgoing ? styles.outgoingContainer : styles.incomingContainer,
        ]}
      >
        {!isOutgoing && showAvatar && (
          <View style={[styles.messageAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{getInitials(contactName)}</Text>
          </View>
        )}
        {!isOutgoing && !showAvatar && <View style={styles.avatarPlaceholder} />}

        <View style={styles.messageBubbleContainer}>
          <View
            style={[
              styles.messageBubble,
              isOutgoing
                ? [styles.outgoingBubble, { backgroundColor: colors.primary }]
                : [styles.incomingBubble, { backgroundColor: colors.backgroundSecondary }],
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: isOutgoing ? '#fff' : colors.text },
              ]}
            >
              {item.body}
            </Text>
          </View>

          {showTime && (
            <View style={[styles.messageFooter, isOutgoing && styles.outgoingFooter]}>
              <Text style={[styles.messageTime, { color: colors.textTertiary }]}>
                {formatTime(item.timestamp)}
              </Text>
              {isOutgoing && (
                <Ionicons
                  name={
                    item.status === 'delivered'
                      ? 'checkmark-done'
                      : item.status === 'sent'
                      ? 'checkmark'
                      : item.status === 'failed'
                      ? 'close-circle'
                      : 'time-outline'
                  }
                  size={14}
                  color={
                    item.status === 'failed'
                      ? colors.error
                      : item.status === 'delivered'
                      ? colors.success
                      : colors.textTertiary
                  }
                  style={styles.statusIcon}
                />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]}>
            {contactName}
          </Text>
          <Text style={[styles.headerPhone, { color: colors.textSecondary }]}>
            {twilioService.formatPhoneNumber(contactPhone)}
          </Text>
        </View>

        <TouchableOpacity onPress={handleCall} style={styles.callButton}>
          <Ionicons name="call" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading messages...
          </Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No messages yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Start the conversation by sending a message
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />
      )}

      {/* Input Area */}
      <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.placeholder}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1600}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: newMessage.trim() ? colors.primary : colors.backgroundSecondary,
            },
          ]}
          onPress={handleSend}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={newMessage.trim() ? '#fff' : colors.textTertiary}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerPhone: {
    fontSize: 14,
    marginTop: 2,
  },
  callButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  outgoingContainer: {
    justifyContent: 'flex-end',
  },
  incomingContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarPlaceholder: {
    width: 40,
  },
  messageBubbleContainer: {
    maxWidth: '75%',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  outgoingBubble: {
    borderBottomRightRadius: 4,
  },
  incomingBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 4,
  },
  outgoingFooter: {
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
  },
  statusIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
