import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AIOrbButton, { UIAction } from '../components/AIOrbButton';
import AriaResponseModal from '../components/AriaResponseModal';
import api from '../utils/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messages: ChatMessage[];
}

// AI Voice Options
const AI_VOICES = [
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female', accent: 'British' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'Female', accent: 'American' },
  { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi', gender: 'Female', accent: 'American' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'Female', accent: 'English-Swedish' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male', accent: 'British' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'Male', accent: 'Transatlantic' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male', accent: 'American' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'Male', accent: 'American' },
];

export default function AriaScreen() {
  const { colors } = useTheme();
  const [showDevTools, setShowDevTools] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL');
  const [voiceStyle, setVoiceStyle] = useState('friendly');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUIAction, setCurrentUIAction] = useState<UIAction | null>(null);
  const orbRef = useRef<any>(null);

  // Mode and chat state
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleUIAction = (action: UIAction) => {
    setCurrentUIAction(action);
    setModalVisible(true);
  };

  const handleModalAction = (action: string, data: any) => {
    setModalVisible(false);
  };

  useEffect(() => {
    fetchVoiceSettings();
  }, []);

  const fetchVoiceSettings = async () => {
    try {
      const response = await api.get('/api/profile/default');
      if (response.data.success && response.data.profile?.ariaPreferences) {
        const prefs = response.data.profile.ariaPreferences;
        setSelectedVoice(prefs.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL');
        setVoiceStyle(prefs.voiceStyle || 'friendly');
      }
    } catch (error) {
      console.error('Error fetching voice settings:', error);
    }
  };

  // Toggle mode with animation
  const toggleMode = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsTextMode(!isTextMode);
      setShowHistory(false); // Always start in chat view, not history
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  // Generate session title from first message
  const generateSessionTitle = (message: string): string => {
    const words = message.split(' ').slice(0, 4).join(' ');
    return words.length > 25 ? words.substring(0, 25) + '...' : words;
  };

  // Start new chat session
  const startNewChat = () => {
    // Save current session if it has messages
    if (chatMessages.length > 0 && activeSession) {
      const updatedSessions = chatSessions.map(s =>
        s.id === activeSession ? { ...s, messages: chatMessages } : s
      );
      setChatSessions(updatedSessions);
    }

    setChatMessages([]);
    setActiveSession(null);
    setShowHistory(false);
  };

  // Load a previous session
  const loadSession = (session: ChatSession) => {
    // Save current session first
    if (chatMessages.length > 0 && activeSession) {
      const updatedSessions = chatSessions.map(s =>
        s.id === activeSession ? { ...s, messages: chatMessages } : s
      );
      setChatSessions(updatedSessions);
    }

    setChatMessages(session.messages);
    setActiveSession(session.id);
    setShowHistory(false);
  };

  // Send text message
  const sendTextMessage = async () => {
    if (!textInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textInput.trim(),
      timestamp: new Date(),
    };

    // Create new session if needed
    if (!activeSession) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: generateSessionTitle(textInput.trim()),
        preview: textInput.trim(),
        timestamp: new Date(),
        messages: [],
      };
      setChatSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession.id);
    }

    setChatMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsLoading(true);
    Keyboard.dismiss();

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await api.post('/api/aria/chat', {
        message: userMessage.content,
        conversationHistory,
        context: {},
      });

      if (response.data.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, assistantMessage]);

        // Update session preview
        if (activeSession) {
          setChatSessions(prev => prev.map(s =>
            s.id === activeSession
              ? { ...s, preview: response.data.response.substring(0, 50) + '...' }
              : s
          ));
        }

        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedVoice = () => {
    return AI_VOICES.find(v => v.id === selectedVoice) || AI_VOICES[1];
  };

  const voice = getSelectedVoice();
  const genderColor = voice.gender === 'Female' ? '#EC4899' : '#3B82F6';

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {isTextMode ? (
          /* ===== TEXT CHAT INTERFACE ===== */
          <View style={styles.chatWrapper}>
            {/* Chat Header */}
            <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={toggleMode} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>

              <View style={styles.chatHeaderCenter}>
                <View style={styles.chatHeaderTitle}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <Text style={[styles.chatHeaderText, { color: colors.text }]}>Aria</Text>
                </View>
                <Text style={[styles.chatHeaderStatus, { color: colors.success }]}>Online</Text>
              </View>

              <View style={styles.chatHeaderActions}>
                {chatSessions.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setShowHistory(!showHistory)}
                    style={[styles.historyButton, { backgroundColor: colors.card }]}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={startNewChat}
                  style={[styles.newChatButton, { backgroundColor: colors.card }]}
                >
                  <Ionicons name="add" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {showHistory ? (
              /* Chat History / Checkpoints */
              <ScrollView style={styles.historyContainer} showsVerticalScrollIndicator={false}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>Conversations</Text>
                <Text style={[styles.historySubtitle, { color: colors.textTertiary }]}>
                  Pick up where you left off
                </Text>

                {chatSessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => loadSession(session)}
                  >
                    <View style={styles.sessionHeader}>
                      <View style={[styles.sessionIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="chatbubble" size={14} color={colors.primary} />
                      </View>
                      <View style={styles.sessionInfo}>
                        <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
                          {session.title}
                        </Text>
                        <Text style={[styles.sessionDate, { color: colors.textTertiary }]}>
                          {formatDate(session.timestamp)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </View>
                    <Text style={[styles.sessionPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                      {session.preview}
                    </Text>
                    <View style={styles.sessionMeta}>
                      <Text style={[styles.sessionMessages, { color: colors.textTertiary }]}>
                        {session.messages.length} messages
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.newChatCard, { borderColor: colors.primary }]}
                  onPress={startNewChat}
                >
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                  <Text style={[styles.newChatText, { color: colors.primary }]}>Start New Conversation</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              /* Active Chat */
              <>
                {/* Messages Area */}
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.messagesContainer}
                  contentContainerStyle={[
                    styles.messagesContent,
                    chatMessages.length === 0 && styles.messagesContentEmpty
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {chatMessages.length === 0 ? (
                    <View style={styles.emptyChat}>
                      <View style={[styles.emptyChatIcon, { backgroundColor: colors.primary + '10' }]}>
                        <Ionicons name="sparkles" size={32} color={colors.primary} />
                      </View>
                      <Text style={[styles.emptyChatTitle, { color: colors.text }]}>
                        Chat with Aria
                      </Text>
                      <Text style={[styles.emptyChatText, { color: colors.textTertiary }]}>
                        Type a message below or try a suggestion
                      </Text>

                      {/* Quick prompts - now send immediately */}
                      <View style={styles.quickPrompts}>
                        {['What\'s on my schedule?', 'Find a contact', 'Help me draft a message'].map((prompt, i) => (
                          <TouchableOpacity
                            key={i}
                            style={[styles.quickPrompt, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => {
                              setTextInput(prompt);
                              // Auto-send after a brief delay to show the text
                              setTimeout(() => {
                                const fakeEvent = { trim: () => prompt };
                                if (prompt.trim()) {
                                  // Directly send the prompt
                                  const msg: ChatMessage = {
                                    id: Date.now().toString(),
                                    role: 'user',
                                    content: prompt,
                                    timestamp: new Date(),
                                  };
                                  setChatMessages(prev => [...prev, msg]);
                                  setTextInput('');
                                  setIsLoading(true);

                                  api.post('/api/aria/chat', {
                                    message: prompt,
                                    conversationHistory: [],
                                    context: {},
                                  }).then(response => {
                                    if (response.data.success) {
                                      const assistantMsg: ChatMessage = {
                                        id: (Date.now() + 1).toString(),
                                        role: 'assistant',
                                        content: response.data.response,
                                        timestamp: new Date(),
                                      };
                                      setChatMessages(prev => [...prev, assistantMsg]);
                                    }
                                  }).catch(() => {
                                    const errorMsg: ChatMessage = {
                                      id: (Date.now() + 1).toString(),
                                      role: 'assistant',
                                      content: 'Sorry, I encountered an error.',
                                      timestamp: new Date(),
                                    };
                                    setChatMessages(prev => [...prev, errorMsg]);
                                  }).finally(() => {
                                    setIsLoading(false);
                                  });
                                }
                              }, 100);
                            }}
                          >
                            <Ionicons name="chatbubble-outline" size={14} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.quickPromptText, { color: colors.text }]}>{prompt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : (
                    chatMessages.map((message, index) => (
                      <View key={message.id}>
                        {index === 0 || (index > 0 &&
                          new Date(message.timestamp).getTime() - new Date(chatMessages[index-1].timestamp).getTime() > 300000) && (
                          <Text style={[styles.timeSeparator, { color: colors.textTertiary }]}>
                            {formatTime(message.timestamp)}
                          </Text>
                        )}
                        <View
                          style={[
                            styles.messageBubble,
                            message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                            {
                              backgroundColor: message.role === 'user'
                                ? colors.primary
                                : colors.card,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.messageText,
                              { color: message.role === 'user' ? '#fff' : colors.text },
                            ]}
                          >
                            {message.content}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                  {isLoading && (
                    <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: colors.card }]}>
                      <View style={styles.typingDots}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.typingText, { color: colors.textTertiary }]}>Aria is thinking...</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Input Area - ALWAYS VISIBLE */}
                <View style={[styles.inputArea, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="Type your message..."
                      placeholderTextColor={colors.textTertiary}
                      value={textInput}
                      onChangeText={setTextInput}
                      multiline
                      maxLength={500}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        { backgroundColor: textInput.trim() ? colors.primary : colors.backgroundSecondary },
                      ]}
                      onPress={sendTextMessage}
                      disabled={!textInput.trim() || isLoading}
                    >
                      <Ionicons
                        name="send"
                        size={18}
                        color={textInput.trim() ? '#fff' : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        ) : (
          /* ===== VOICE INTERFACE ===== */
          <View style={styles.voiceWrapper}>
            <Text style={[styles.title, { color: colors.primary }]}>ARIA</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your AI Voice Assistant</Text>

            {/* Voice Badge */}
            <View style={[styles.voiceBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.voiceBadgeIcon, { backgroundColor: genderColor + '20' }]}>
                <Ionicons name={voice.gender === 'Female' ? 'woman' : 'man'} size={14} color={genderColor} />
              </View>
              <Text style={[styles.voiceBadgeText, { color: colors.text }]}>
                Speaking as {voice.name}
              </Text>
              <Text style={[styles.voiceBadgeAccent, { color: colors.textTertiary }]}>
                {voice.accent}
              </Text>
            </View>

            {/* Sleek Text Mode Button */}
            <TouchableOpacity
              style={[styles.textModeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={toggleMode}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
              <Text style={[styles.textModeButtonText, { color: colors.text }]}>Text Chat</Text>
            </TouchableOpacity>

            {/* Orb */}
            <View style={styles.orbWrapper}>
              <AIOrbButton ref={orbRef} onPress={() => {}} onUIAction={handleUIAction} />
            </View>

            <Text style={[styles.hint, { color: colors.textTertiary }]}>Tap to speak with Aria</Text>
          </View>
        )}
      </Animated.View>

      {/* Dev Tools */}
      {!isTextMode && (
        <TouchableOpacity
          style={[styles.devToggleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowDevTools(!showDevTools)}
        >
          <Ionicons name={showDevTools ? 'close' : 'code-slash'} size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {showDevTools && !isTextMode && (
        <View style={[styles.devToolsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView style={styles.devToolsScroll}>
            <Text style={[styles.devToolsTitle, { color: colors.text }]}>Developer Tools</Text>
            <View style={styles.devSection}>
              <Text style={[styles.devSectionTitle, { color: colors.primary }]}>Voice</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Voice: {voice.name} ({voice.accent})</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Style: {voiceStyle}</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Model: GPT-4o-mini</Text>
            </View>
          </ScrollView>
        </View>
      )}

      <AriaResponseModal
        visible={modalVisible}
        uiAction={currentUIAction}
        onClose={() => setModalVisible(false)}
        onAction={handleModalAction}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  // Voice Interface
  voiceWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  title: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    letterSpacing: 2,
  },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  voiceBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  voiceBadgeAccent: {
    fontSize: 12,
  },
  textModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginBottom: 30,
  },
  textModeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  orbWrapper: {
    marginBottom: 20,
  },
  hint: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  // Chat Interface
  chatWrapper: {
    flex: 1,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  chatHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  chatHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatHeaderText: {
    fontSize: 17,
    fontWeight: '600',
  },
  chatHeaderStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  historyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // History
  historyContainer: {
    flex: 1,
    padding: 20,
  },
  historyTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  historySubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  sessionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  sessionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  sessionPreview: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
  },
  sessionMessages: {
    fontSize: 11,
  },
  newChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 8,
  },
  newChatText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messagesContentEmpty: {
    justifyContent: 'center',
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyChatIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyChatText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  quickPrompts: {
    gap: 8,
    width: '100%',
  },
  quickPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickPromptText: {
    fontSize: 14,
    flex: 1,
  },
  timeSeparator: {
    textAlign: 'center',
    fontSize: 11,
    marginVertical: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  typingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  // Input
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100, // Account for bottom tab bar (85px) + extra padding
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 36,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dev tools
  devToggleButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  devToolsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
  },
  devToolsScroll: {
    flex: 1,
    padding: 20,
  },
  devToolsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  devSection: {
    marginBottom: 16,
  },
  devSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  devInfo: {
    fontSize: 12,
    marginBottom: 3,
  },
});
