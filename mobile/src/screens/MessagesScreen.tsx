import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Thread } from '../services/MessageService';
import { useMessageThreads } from '../hooks/useMessageThreads';

export default function MessagesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { threads, loading, refreshing, onRefresh } = useMessageThreads();

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  };

  const getAvatarColor = (name: string) => {
    const avatarColors = ['#8B5CF6', '#4F8EF7', '#34D399', '#FBBF24', '#F87171', '#EC4899'];
    const char = name?.charAt(0) || '?';
    const index = char.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  const renderThread = ({ item }: { item: Thread }) => (
    <TouchableOpacity style={[styles.threadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.threadHeader}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.contactName) }]}>
          <Text style={styles.avatarText}>
            {item.contactName ? item.contactName.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.threadInfo}>
          <Text style={[styles.threadName, { color: colors.text }]}>{item.contactName || 'Unknown'}</Text>
          <Text style={[styles.threadPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
        </View>
        <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{formatTime(item.lastMessageTime)}</Text>
      </View>
      <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={2}>
        {item.lastMessage}
      </Text>
      {item.unreadCount > 0 && (
        <View style={[styles.unreadBadge, { backgroundColor: colors.error }]}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{threads.length} conversations</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {threads.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            When you receive text messages, the AI will generate smart replies and conversations will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          renderItem={renderThread}
          keyExtractor={(item: Thread) => item.phone}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  threadCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  threadInfo: {
    flex: 1,
  },
  threadName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  threadPhone: {
    fontSize: 13,
  },
  threadTime: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  unreadBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 22,
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
