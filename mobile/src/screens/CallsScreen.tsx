import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Call } from '../services/CallHistoryService';
import { useCallHistory } from '../hooks/useCallHistory';

type TabType = 'daily' | 'history';

export default function CallsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { calls, loading, refreshing, onRefresh } = useCallHistory();
  const [activeTab, setActiveTab] = useState<TabType>('daily');

  // Filter calls based on active tab
  const filteredCalls = useMemo(() => {
    if (activeTab === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return calls.filter(call => {
        const callDate = new Date(call.timestamp);
        callDate.setHours(0, 0, 0, 0);
        return callDate.getTime() === today.getTime();
      });
    }
    return calls;
  }, [calls, activeTab]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderCall = ({ item }: { item: Call }) => (
    <View style={[styles.callCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.callHeader}>
        <View style={styles.callInfo}>
          <Text style={[styles.callName, { color: colors.text }]}>{item.contactName || 'Unknown'}</Text>
          <Text style={[styles.callPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
        </View>
        <View style={[
          styles.callStatusBadge,
          { backgroundColor: item.type === 'missed' ? colors.error + '15' : colors.success + '15' }
        ]}>
          <Ionicons
            name={item.type === 'missed' ? 'call-outline' : 'checkmark-circle'}
            size={14}
            color={item.type === 'missed' ? colors.error : colors.success}
          />
          <Text style={[
            styles.callType,
            { color: item.type === 'missed' ? colors.error : colors.success }
          ]}>
            {item.type === 'missed' ? 'Missed' : 'AI Handled'}
          </Text>
        </View>
      </View>
      <Text style={[styles.callTime, { color: colors.textTertiary }]}>{formatDate(item.timestamp)}</Text>
      {item.transcript && (
        <View style={[styles.transcriptBox, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.transcriptLabel, { color: colors.textSecondary }]}>Transcript</Text>
          <Text style={[styles.transcriptText, { color: colors.text }]}>{item.transcript}</Text>
        </View>
      )}
      {item.aiConfidence && (
        <View style={styles.confidenceRow}>
          <Ionicons name="analytics" size={14} color={colors.success} />
          <Text style={[styles.confidence, { color: colors.success }]}>AI Confidence: {item.aiConfidence}%</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading calls...</Text>
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
          <Text style={[styles.title, { color: colors.text }]}>Call History</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {activeTab === 'daily' ? `${filteredCalls.length} today` : `${calls.length} total calls`}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'daily' && [styles.activeTab, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('daily')}
        >
          <Ionicons
            name="today-outline"
            size={16}
            color={activeTab === 'daily' ? '#fff' : colors.textSecondary}
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'daily' ? '#fff' : colors.textSecondary }
          ]}>Daily</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'history' && [styles.activeTab, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'history' ? '#fff' : colors.textSecondary}
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'history' ? '#fff' : colors.textSecondary }
          ]}>History</Text>
        </TouchableOpacity>
      </View>

      {filteredCalls.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="call-outline" size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {activeTab === 'daily' ? 'No calls today' : 'No calls yet'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {activeTab === 'daily'
              ? 'No calls have been made or received today. Check the History tab to see all past calls.'
              : 'When you receive missed calls, the AI will automatically call them back and the history will appear here.'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCalls}
          renderItem={renderCall}
          keyExtractor={(item: Call) => item._id}
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
  callCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  callPhone: {
    fontSize: 14,
  },
  callStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  callType: {
    fontSize: 12,
    fontWeight: '600',
  },
  callTime: {
    fontSize: 12,
    marginBottom: 12,
  },
  transcriptBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidence: {
    fontSize: 12,
    fontWeight: '500',
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
