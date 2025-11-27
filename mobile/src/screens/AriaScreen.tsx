import React, { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  Modal,
  Animated,
  Pressable,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import AriaResponseModal from '../components/AriaResponseModal';
import RealtimeOrbButton from '../components/RealtimeOrbButton';
import LocalSearchResults from '../components/LocalSearchResults';
import api from '../utils/api';

// Location types (services are optional - may not work in Expo Go)
interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
};

// Navigation menu items
const MENU_ITEMS = [
  { id: 'Dashboard', icon: 'stats-chart-outline', label: 'Dashboard' },
  { id: 'Contacts', icon: 'people-outline', label: 'Contacts' },
  { id: 'Calendar', icon: 'calendar-outline', label: 'Calendar' },
  { id: 'Collaboration', icon: 'chatbubbles-outline', label: 'Team' },
  { id: 'Profile', icon: 'person-outline', label: 'Profile' },
];

// Header tabs
const NAV_TABS = [
  { id: 'Ask', label: 'Ask' },
  { id: 'History', label: 'History' },
  { id: 'Settings', label: 'Settings' },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  uiAction?: UIAction | null;
  imageUrl?: string | null;
  imageActions?: any[] | null;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface UIAction {
  type: string;
  data?: any;
}

export default function AriaScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  // State
  const [conversationState, setConversationState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUIAction, setCurrentUIAction] = useState<UIAction | null>(null);
  const [textInput, setTextInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Ask');
  const [inputFocused, setInputFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  const realtimeOrbRef = useRef<any>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const menuSlide = useRef(new Animated.Value(-SCREEN_WIDTH * 0.8)).current;

  // Load conversations from storage on mount and initialize location
  useEffect(() => {
    loadConversationsFromStorage();
    initializeLocation();

    // Cleanup: stop session when leaving screen
    return () => {
      if (realtimeOrbRef.current && realtimeOrbRef.current.isActive()) {
        realtimeOrbRef.current.stopSession();
      }
    };
  }, []);

  // Initialize location services for Aria's awareness
  // Note: Location requires native module - disabled for Expo Go compatibility
  const initializeLocation = async () => {
    // Location services disabled for Expo Go
    // Will be enabled in production build
    console.log('[Aria] Location services disabled in Expo Go');
    setLocationEnabled(false);
  };

  // Save conversations to storage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversationsToStorage();
    }
  }, [conversations]);

  const loadConversationsFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem('aria_conversations');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const convs = parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        }));
        setConversations(convs);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const saveConversationsToStorage = async () => {
    try {
      await AsyncStorage.setItem('aria_conversations', JSON.stringify(conversations));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  };

  // Generate title from first message
  const generateTitle = (message: string) => {
    const truncated = message.slice(0, 40);
    return truncated.length < message.length ? `${truncated}...` : truncated;
  };

  // Start new conversation
  const startNewConversation = () => {
    // Save current conversation if it has messages
    if (chatMessages.length > 0 && currentConversationId) {
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: chatMessages, updatedAt: new Date() }
          : conv
      ));
    }
    setChatMessages([]);
    setCurrentConversationId(null);
    setActiveTab('Ask');
  };

  // Load a conversation from history
  const loadConversation = (conversation: Conversation) => {
    // Save current conversation first
    if (chatMessages.length > 0 && currentConversationId) {
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: chatMessages, updatedAt: new Date() }
          : conv
      ));
    }
    setChatMessages(conversation.messages);
    setCurrentConversationId(conversation.id);
    setActiveTab('Ask');
  };

  // Delete a conversation
  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (currentConversationId === id) {
      setChatMessages([]);
      setCurrentConversationId(null);
    }
  };

  // Clear all history
  const clearAllHistory = async () => {
    setConversations([]);
    setChatMessages([]);
    setCurrentConversationId(null);
    await AsyncStorage.removeItem('aria_conversations');
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.spring(menuSlide, {
      toValue: 0,
      friction: 10,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuSlide, {
      toValue: -SCREEN_WIDTH * 0.8,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setMenuOpen(false));
  };

  const handleMenuNav = (screenId: string) => {
    closeMenu();
    setTimeout(() => navigation.navigate(screenId), 200);
  };

  // Real-time voice handlers - Simple toggle
  const handleVoicePress = () => {
    if (!realtimeOrbRef.current) return;
    // Toggle session on/off
    realtimeOrbRef.current.handlePress();
  };

  // Stop session completely
  const handleStopSession = () => {
    if (realtimeOrbRef.current) {
      realtimeOrbRef.current.stopSession();
    }
  };

  const handleVoiceStateChange = (state: 'idle' | 'listening' | 'thinking' | 'speaking') => {
    setConversationState(state);
    setIsVoiceActive(state !== 'idle');
  };

  // Handle UI actions from voice (image generation, reference image requests, etc.)
  const handleVoiceUIAction = (action: any) => {
    console.log('[Aria] Voice UI Action:', action.type, action.data);

    if (action.type === 'image_generated' && action.data?.imageUrl) {
      // Add generated image to chat as assistant message
      const imageMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I've generated your image! Here's the result based on: "${action.data.prompt?.substring(0, 50)}..."`,
        imageUrl: action.data.imageUrl,
      };
      setChatMessages(prev => [...prev, imageMessage]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } else if (action.type === 'request_image_upload') {
      // Aria is asking user to provide a reference image
      Alert.alert(
        'Reference Image',
        action.data.message || 'Would you like to attach a reference image?',
        [
          { text: 'Skip', style: 'cancel' },
          { text: 'Attach Image', onPress: () => pickImage() },
        ]
      );
    } else if (action.type === 'agent_switch') {
      // Agent switch notification
      const agentMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Switching to ${action.data.agentName}...`,
      };
      setChatMessages(prev => [...prev, agentMessage]);
    }
  };

  const handleVoiceTranscript = (text: string, role: 'user' | 'assistant') => {
    // Add transcript to chat messages
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content: text,
    };
    setChatMessages(prev => [...prev, newMessage]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Image/file picker function
  const pickImage = async () => {
    // Image picker requires a development build - show info for now
    Alert.alert(
      'Image Attachments',
      'Image attachments will be available in the production build. For now, describe what you want to share with Aria.',
      [{ text: 'OK' }]
    );
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
  };

  // SuperAria upgrade handler
  const handleUpgradePress = () => {
    setUpgradeModalVisible(true);
  };

  const handleUpgradeAction = (action: string) => {
    setUpgradeModalVisible(false);
    if (action === 'upgrade') {
      // Navigate to subscription/billing screen or open web link
      navigation.navigate('Profile', { tab: 'subscription' });
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const sendTextMessage = async () => {
    if (!textInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textInput.trim(),
    };

    // Create new conversation if this is the first message
    const isNewConversation = chatMessages.length === 0 && !currentConversationId;
    let convId = currentConversationId;

    if (isNewConversation) {
      convId = Date.now().toString();
      const newConversation: Conversation = {
        id: convId,
        title: generateTitle(userMessage.content),
        messages: [userMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversationId(convId);
    }

    setChatMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsLoading(true);
    Keyboard.dismiss();

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Include location data for Aria's awareness
      const locationData = userLocation ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        city: userLocation.city,
        state: userLocation.state,
        country: userLocation.country,
      } : null;

      const response = await api.post('/api/aria/chat', {
        message: userMessage.content,
        conversationHistory: chatMessages.map(m => ({ role: m.role, content: m.content })),
        location: locationData,
      });

      if (response.data.success) {
        // Extract image URL from imageActions if present
        let generatedImageUrl = null;
        if (response.data.imageActions && response.data.imageActions.length > 0) {
          const imageAction = response.data.imageActions.find(
            (a: any) => a.result?.success && a.result?.imageUrl
          );
          if (imageAction) {
            generatedImageUrl = imageAction.result.imageUrl;
          }
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.response,
          uiAction: response.data.uiAction || null,
          imageUrl: generatedImageUrl,
          imageActions: response.data.imageActions || null,
        };

        setChatMessages(prev => {
          const newMessages = [...prev, assistantMessage];
          // Update conversation in history
          if (convId) {
            setConversations(convs => convs.map(conv =>
              conv.id === convId
                ? { ...conv, messages: newMessages, updatedAt: new Date() }
                : conv
            ));
          }
          return newMessages;
        });
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, something went wrong.',
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
              <View style={styles.menuLines}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, styles.menuLineShort]} />
              </View>
            </TouchableOpacity>

            <View style={styles.headerTabs}>
              {NAV_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={styles.headerTab}
                >
                  <Text style={[
                    styles.headerTabText,
                    activeTab === tab.id && styles.headerTabTextActive
                  ]}>
                    {tab.label}
                  </Text>
                  {activeTab === tab.id && <View style={styles.headerTabUnderline} />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => setActiveTab('History')}
            >
              <Ionicons
                name={activeTab === 'History' ? 'chatbubble' : 'chatbubble-outline'}
                size={22}
                color="#1a1a1a"
              />
            </TouchableOpacity>
          </View>

          {/* Main Content Area */}
          <View style={styles.mainArea}>
            {activeTab === 'Ask' && (
              <>
                {chatMessages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.logoContainer}>
                      <View style={styles.logoIcon}>
                        <Ionicons name="flash" size={36} color="#d1d5db" />
                        <View style={styles.logoOrbit} />
                      </View>
                      <View style={styles.sparkle}>
                        <Ionicons name="sparkles" size={16} color="#d1d5db" />
                      </View>
                    </View>
                  </View>
                ) : (
                  <ScrollView
                    ref={scrollViewRef}
                    style={styles.chatMessages}
                    contentContainerStyle={styles.chatMessagesContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {chatMessages.map((msg) => (
                      <View key={msg.id}>
                        <View
                          style={[
                            styles.chatBubble,
                            msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                          ]}
                        >
                          <Text style={[
                            styles.chatBubbleText,
                            msg.role === 'user' && styles.userBubbleText,
                          ]}>
                            {msg.content}
                          </Text>
                        </View>
                        {/* Render generated image if present */}
                        {msg.imageUrl && typeof msg.imageUrl === 'string' && (
                          <TouchableOpacity
                            style={styles.generatedImageContainer}
                            onPress={() => {
                              // Open image in full screen or share
                              const imageUrlStr = typeof msg.imageUrl === 'string' ? msg.imageUrl : '';
                              if (imageUrlStr) {
                                Alert.alert(
                                  'Image Options',
                                  'What would you like to do?',
                                  [
                                    { text: 'Open', onPress: () => Linking.openURL(imageUrlStr) },
                                    { text: 'Cancel', style: 'cancel' },
                                  ]
                                );
                              }
                            }}
                          >
                            <Image
                              source={{ uri: typeof msg.imageUrl === 'string' ? msg.imageUrl : '' }}
                              style={styles.generatedImage}
                              resizeMode="cover"
                            />
                            <View style={styles.imageOverlay}>
                              <Ionicons name="expand-outline" size={20} color="#fff" />
                            </View>
                          </TouchableOpacity>
                        )}
                        {/* Render LocalSearchResults for location-based UI actions */}
                        {msg.uiAction && ['local_search_results', 'place_details', 'directions'].includes(msg.uiAction.type) && (
                          <LocalSearchResults uiAction={msg.uiAction as any} />
                        )}
                      </View>
                    ))}
                    {isLoading && (
                      <View style={[styles.chatBubble, styles.assistantBubble]}>
                        <ActivityIndicator size="small" color="#3b82f6" />
                      </View>
                    )}
                  </ScrollView>
                )}
              </>
            )}

            {activeTab === 'History' && (
              <View style={styles.historyContainer}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>Conversations</Text>
                  <TouchableOpacity
                    style={styles.newChatBtn}
                    onPress={startNewConversation}
                  >
                    <Ionicons name="add" size={20} color="#3b82f6" />
                    <Text style={styles.newChatBtnText}>New Chat</Text>
                  </TouchableOpacity>
                </View>

                {conversations.length === 0 ? (
                  <View style={styles.emptyHistory}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyHistoryText}>No conversations yet</Text>
                    <Text style={styles.emptyHistorySubtext}>
                      Start chatting with Aria to see your history here
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.historyList}
                    showsVerticalScrollIndicator={false}
                  >
                    {conversations.map((conv) => (
                      <TouchableOpacity
                        key={conv.id}
                        style={[
                          styles.historyItem,
                          currentConversationId === conv.id && styles.historyItemActive,
                        ]}
                        onPress={() => loadConversation(conv)}
                      >
                        <View style={styles.historyItemIcon}>
                          <Ionicons
                            name="chatbubble-outline"
                            size={18}
                            color={currentConversationId === conv.id ? '#3b82f6' : '#6b7280'}
                          />
                        </View>
                        <View style={styles.historyItemContent}>
                          <Text
                            style={[
                              styles.historyItemTitle,
                              currentConversationId === conv.id && styles.historyItemTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {conv.title}
                          </Text>
                          <Text style={styles.historyItemMeta}>
                            {conv.messages.length} messages · {formatTimeAgo(conv.updatedAt)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.historyItemDelete}
                          onPress={() => deleteConversation(conv.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {activeTab === 'Settings' && (
              <ScrollView style={styles.settingsContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>Voice</Text>
                  <TouchableOpacity style={styles.settingsItem}>
                    <Ionicons name="mic-outline" size={22} color="#374151" />
                    <Text style={styles.settingsItemText}>Voice Settings</Text>
                    <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.settingsItem}>
                    <Ionicons name="volume-high-outline" size={22} color="#374151" />
                    <Text style={styles.settingsItemText}>Response Voice</Text>
                    <Text style={styles.settingsItemValue}>Nova</Text>
                    <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                  </TouchableOpacity>
                </View>

                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>Notifications</Text>
                  <TouchableOpacity style={styles.settingsItem}>
                    <Ionicons name="notifications-outline" size={22} color="#374151" />
                    <Text style={styles.settingsItemText}>Daily Summary</Text>
                    <View style={styles.settingsToggle}>
                      <View style={[styles.settingsToggleTrack, styles.settingsToggleTrackOn]}>
                        <View style={[styles.settingsToggleThumb, styles.settingsToggleThumbOn]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>Data</Text>
                  <TouchableOpacity style={styles.settingsItem}>
                    <Ionicons name="cloud-download-outline" size={22} color="#374151" />
                    <Text style={styles.settingsItemText}>Export Conversations</Text>
                    <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.settingsItem} onPress={clearAllHistory}>
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                    <Text style={[styles.settingsItemText, { color: '#ef4444' }]}>Clear All History</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* Quick Action Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActions}
            >
              <TouchableOpacity
                style={[styles.quickAction, styles.quickActionPrimary]}
                onPress={handleUpgradePress}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name="flash" size={16} color="#3b82f6" />
                </View>
                <Text style={styles.quickActionTextPrimary}>Get SuperAria</Text>
              </TouchableOpacity>

              {/* Voice button - Toggle on/off */}
              <TouchableOpacity
                style={[
                  styles.quickAction,
                  isVoiceActive && styles.quickActionActive
                ]}
                onPress={handleVoicePress}
                onLongPress={isVoiceActive ? handleStopSession : undefined}
              >
                <View style={[
                  styles.quickActionIcon,
                  isVoiceActive && styles.quickActionIconActive
                ]}>
                  <Ionicons
                    name={isVoiceActive ? "mic" : "mic-outline"}
                    size={16}
                    color={isVoiceActive ? "#10b981" : "#6b7280"}
                  />
                </View>
                <Text style={[
                  styles.quickActionText,
                  isVoiceActive && styles.quickActionTextActive
                ]}>
                  {isVoiceActive ? (conversationState === 'speaking' ? 'Speaking...' : 'Listening') : "Voice"}
                </Text>
              </TouchableOpacity>

              {/* Generate Image quick action */}
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => {
                  setTextInput('Help me create an image for ');
                  inputRef.current?.focus();
                }}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name="sparkles-outline" size={16} color="#8b5cf6" />
                </View>
                <Text style={styles.quickActionText}>Generate</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionImage} onPress={pickImage}>
                {attachedImage ? (
                  <View style={styles.attachedImageContainer}>
                    <Image source={{ uri: attachedImage }} style={styles.attachedImageThumb} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={removeAttachedImage}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={18} color="#9ca3af" />
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>

            {/* Input Box */}
            <TouchableOpacity
              style={[styles.inputBox, inputFocused && styles.inputBoxFocused]}
              onPress={focusInput}
              activeOpacity={1}
            >
              <TextInput
                ref={inputRef}
                style={styles.inputText}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Ask Anything"
                placeholderTextColor="#9ca3af"
                onSubmitEditing={sendTextMessage}
                returnKeyType="send"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                multiline
              />

              <View style={styles.inputActions}>
                <TouchableOpacity style={styles.inputActionBtn} onPress={pickImage}>
                  <Ionicons
                    name={attachedImage ? "image" : "attach-outline"}
                    size={20}
                    color={attachedImage ? "#3b82f6" : "#9ca3af"}
                  />
                </TouchableOpacity>

                <TouchableOpacity style={styles.modeBadge}>
                  <Ionicons name="flash" size={12} color="#6b7280" />
                  <Text style={styles.modeBadgeText}>Fast</Text>
                  <Ionicons name="chevron-down" size={12} color="#6b7280" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.speakBtn}
                  onPress={textInput.trim() ? sendTextMessage : handleVoicePress}
                >
                  {textInput.trim() ? (
                    <Ionicons name="arrow-up" size={16} color="#fff" />
                  ) : (
                    <Image
                      source={require('../../assets/voiceflow-logo.jpg')}
                      style={styles.speakBtnLogo}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>

          {/* Response Modal */}
          <AriaResponseModal
            visible={modalVisible}
            uiAction={currentUIAction}
            onClose={() => setModalVisible(false)}
            onAction={() => setModalVisible(false)}
          />

          {/* Hidden Realtime Orb for voice - controls are in the input area */}
          <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
            <RealtimeOrbButton
              ref={realtimeOrbRef}
              onPress={() => {}}
              onStateChange={handleVoiceStateChange}
              onTranscript={handleVoiceTranscript}
              onUIAction={handleVoiceUIAction}
              agentId="aria"
            />
          </View>

          {/* Slide-out Menu */}
          <Modal
            visible={menuOpen}
            transparent
            animationType="none"
            onRequestClose={closeMenu}
          >
            <View style={styles.menuOverlay}>
              <Pressable style={styles.menuBackdrop} onPress={closeMenu} />
              <Animated.View
                style={[
                  styles.menuDrawer,
                  { transform: [{ translateX: menuSlide }] },
                ]}
              >
                {/* Menu Header */}
                <View style={styles.menuHeader}>
                  <View style={styles.menuLogoRow}>
                    <View style={styles.menuLogo}>
                      <Ionicons name="flash" size={20} color="#3b82f6" />
                    </View>
                    <Text style={styles.menuTitle}>Aria</Text>
                  </View>
                  <TouchableOpacity onPress={closeMenu} style={styles.menuClose}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* User Info */}
                {user && (
                  <View style={styles.menuUser}>
                    <View style={styles.menuAvatar}>
                      <Text style={styles.menuAvatarText}>
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </Text>
                    </View>
                    <View style={styles.menuUserInfo}>
                      <Text style={styles.menuUserName}>{user.name || 'User'}</Text>
                      <Text style={styles.menuUserEmail}>{user.email}</Text>
                    </View>
                  </View>
                )}

                {/* Menu Items */}
                <View style={styles.menuItems}>
                  {MENU_ITEMS.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.menuItem}
                      onPress={() => handleMenuNav(item.id)}
                    >
                      <Ionicons name={item.icon as any} size={22} color="#374151" />
                      <Text style={styles.menuItemText}>{item.label}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Menu Footer */}
                <View style={styles.menuFooter}>
                  <TouchableOpacity style={styles.menuFooterBtn} onPress={logout}>
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={styles.menuFooterBtnText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </Modal>

          {/* SuperAria Upgrade Modal */}
          <Modal
            visible={upgradeModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setUpgradeModalVisible(false)}
          >
            <View style={styles.upgradeOverlay}>
              <View style={styles.upgradeModal}>
                {/* Close button */}
                <TouchableOpacity
                  style={styles.upgradeClose}
                  onPress={() => setUpgradeModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>

                {/* Icon */}
                <View style={styles.upgradeIconContainer}>
                  <View style={styles.upgradeIcon}>
                    <Ionicons name="flash" size={32} color="#3b82f6" />
                  </View>
                  <View style={styles.upgradeSparkle}>
                    <Ionicons name="sparkles" size={16} color="#f59e0b" />
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.upgradeTitle}>Unlock SuperAria</Text>
                <Text style={styles.upgradeSubtitle}>
                  Get unlimited conversations, priority responses, and advanced features.
                </Text>

                {/* Features */}
                <View style={styles.upgradeFeatures}>
                  <View style={styles.upgradeFeature}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.upgradeFeatureText}>Unlimited voice conversations</Text>
                  </View>
                  <View style={styles.upgradeFeature}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.upgradeFeatureText}>Priority AI responses</Text>
                  </View>
                  <View style={styles.upgradeFeature}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.upgradeFeatureText}>Image analysis & understanding</Text>
                  </View>
                  <View style={styles.upgradeFeature}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.upgradeFeatureText}>Advanced CRM integrations</Text>
                  </View>
                </View>

                {/* CTA Buttons */}
                <TouchableOpacity
                  style={styles.upgradeCta}
                  onPress={() => handleUpgradeAction('upgrade')}
                >
                  <Ionicons name="flash" size={18} color="#fff" />
                  <Text style={styles.upgradeCtaText}>Upgrade Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.upgradeLater}
                  onPress={() => setUpgradeModalVisible(false)}
                >
                  <Text style={styles.upgradeLaterText}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  menuLines: {
    gap: 5,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
  },
  menuLineShort: {
    width: 14,
  },
  headerTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  headerTab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerTabText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#9ca3af',
    letterSpacing: -0.3,
  },
  headerTabTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  headerTabUnderline: {
    marginTop: 8,
    width: 16,
    height: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  // Main Area
  mainArea: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    position: 'relative',
  },
  logoOrbit: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  sparkle: {
    position: 'absolute',
    bottom: -4,
    right: -12,
  },

  // Chat Messages
  chatMessages: {
    flex: 1,
    paddingHorizontal: 20,
  },
  chatMessagesContent: {
    paddingVertical: 20,
  },
  chatBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a1a1a',
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 6,
  },
  chatBubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  userBubbleText: {
    color: '#ffffff',
  },

  // Generated Image Styles
  generatedImageContainer: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: -4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    maxWidth: '85%',
  },
  generatedImage: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: 16,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom Section
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    gap: 12,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  quickActionPrimary: {
    backgroundColor: '#eff6ff',
  },
  quickActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    letterSpacing: -0.2,
  },
  quickActionTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    letterSpacing: -0.2,
  },
  quickActionImage: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 8,
  },
  imagePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Input Box
  inputBox: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  inputBoxFocused: {
    borderColor: '#d1d5db',
    shadowOpacity: 0.06,
  },
  inputText: {
    fontSize: 17,
    color: '#1a1a1a',
    minHeight: 24,
    maxHeight: 100,
    paddingVertical: 0,
    marginBottom: 12,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 5,
  },
  modeBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  speakBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  speakBtnRecording: {
    backgroundColor: '#374151',
  },
  speakBtnLogo: {
    width: 22,
    height: 22,
    borderRadius: 4,
    tintColor: '#fff',
  },

  // Menu Drawer
  menuOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  menuDrawer: {
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 320,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  menuClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuUser: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  menuAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuUserEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  menuItems: {
    flex: 1,
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  menuFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  menuFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuFooterBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ef4444',
  },

  // History Tab
  historyContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  newChatBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  emptyHistory: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyHistoryText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 240,
  },
  historyList: {
    flex: 1,
    paddingTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  historyItemActive: {
    backgroundColor: '#eff6ff',
  },
  historyItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  historyItemTitleActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  historyItemMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  historyItemDelete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Settings Tab
  settingsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  settingsSection: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  settingsItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  settingsItemValue: {
    fontSize: 14,
    color: '#9ca3af',
    marginRight: 4,
  },
  settingsToggle: {
    marginLeft: 'auto',
  },
  settingsToggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  settingsToggleTrackOn: {
    backgroundColor: '#3b82f6',
  },
  settingsToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsToggleThumbOn: {
    alignSelf: 'flex-end',
  },

  // Voice Recording Styles
  quickActionRecording: {
    backgroundColor: '#fef2f2',
  },
  quickActionIconRecording: {
    backgroundColor: '#fee2e2',
  },
  quickActionTextRecording: {
    color: '#ef4444',
    fontWeight: '600',
  },
  quickActionActive: {
    backgroundColor: '#ecfdf5',
  },
  quickActionIconActive: {
    backgroundColor: '#d1fae5',
  },
  quickActionTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },

  // Attached Image Styles
  attachedImageContainer: {
    position: 'relative',
  },
  attachedImageThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },

  // Upgrade Modal Styles
  upgradeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  upgradeModal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  upgradeClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeIconContainer: {
    position: 'relative',
    marginBottom: 20,
    marginTop: 8,
  },
  upgradeIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeSparkle: {
    position: 'absolute',
    top: -4,
    right: -8,
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  upgradeSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  upgradeFeatures: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  upgradeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upgradeFeatureText: {
    fontSize: 15,
    color: '#374151',
  },
  upgradeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  upgradeCtaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  upgradeLater: {
    paddingVertical: 14,
  },
  upgradeLaterText: {
    fontSize: 15,
    color: '#9ca3af',
    fontWeight: '500',
  },
});
