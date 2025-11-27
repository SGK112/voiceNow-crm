import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const CollapsibleSection = ({ title, children, defaultExpanded = true }: CollapsibleSectionProps) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [animation] = useState(new Animated.Value(defaultExpanded ? 1 : 0));

  const toggleExpand = () => {
    Animated.timing(animation, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  return (
    <View style={styles.collapsibleContainer}>
      <TouchableOpacity
        style={[styles.collapsibleHeader, { borderBottomColor: expanded ? colors.divider : 'transparent' }]}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <Text style={[styles.collapsibleTitle, { color: colors.text }]}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textTertiary}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.collapsibleContent}>{children}</View>}
    </View>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  trend?: string;
  onPress?: () => void;
}

const StatCard = ({ icon, value, label, trend, onPress }: StatCardProps) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.statCard,
        {
          backgroundColor: colors.card,
          shadowColor: colors.shadow,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIconWrapper, { backgroundColor: colors.primary + '12' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      {trend && (
        <View style={[styles.trendBadge, { backgroundColor: colors.success + '15' }]}>
          <Ionicons name="trending-up" size={12} color={colors.success} />
          <Text style={[styles.trendText, { color: colors.success }]}>{trend}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Quick Action Card
interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: number;
}

const QuickAction = ({ icon, title, subtitle, onPress, badge }: QuickActionProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.quickAction,
        {
          backgroundColor: colors.card,
          shadowColor: colors.shadow,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '10' }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
        {badge !== undefined && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.error }]}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.quickActionContent}>
        <Text style={[styles.quickActionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.quickActionSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

// Activity Item
interface ActivityItemProps {
  type: string;
  title: string;
  description: string;
  timeAgo: string;
}

const ActivityItem = ({ type, title, description, timeAgo }: ActivityItemProps) => {
  const { colors } = useTheme();

  const getIcon = () => {
    switch (type) {
      case 'call': return { icon: 'call' as const, color: colors.primary };
      case 'message': return { icon: 'chatbubble' as const, color: colors.secondary };
      case 'lead': return { icon: 'person-add' as const, color: colors.success };
      case 'email': return { icon: 'mail' as const, color: colors.warning };
      default: return { icon: 'ellipse' as const, color: colors.textTertiary };
    }
  };

  const { icon, color } = getIcon();

  return (
    <View style={[styles.activityItem, { borderBottomColor: colors.divider }]}>
      <View style={[styles.activityIcon, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.activityDesc, { color: colors.textTertiary }]} numberOfLines={1}>{description}</Text>
      </View>
      <Text style={[styles.activityTime, { color: colors.textTertiary }]}>{timeAgo}</Text>
    </View>
  );
};

// Time Saved Card Component
interface TimeSavedCardProps {
  totalMinutes: number;
  breakdown: Array<{ label: string; count: number; minutes: number }>;
}

const TimeSavedCard = ({ totalMinutes, breakdown }: TimeSavedCardProps) => {
  const { colors } = useTheme();

  const formatTime = (mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const minutes = mins % 60;
      return `${hours}h ${minutes}m`;
    }
    return `${mins} min`;
  };

  return (
    <View
      style={[
        styles.timeSavedCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.timeSavedAccent}
      />
      <View style={styles.timeSavedHeader}>
        <View style={styles.timeSavedIconWrapper}>
          <Ionicons name="time" size={20} color="#10B981" />
        </View>
        <Text style={[styles.timeSavedLabel, { color: colors.textSecondary }]}>
          AI Time Saved Today
        </Text>
      </View>
      <Text style={[styles.timeSavedValue, { color: colors.text }]}>
        {formatTime(totalMinutes)}
      </Text>
      <View style={styles.timeSavedBreakdown}>
        {breakdown.filter(b => b.count > 0).map((item, index) => (
          <View key={index} style={styles.breakdownItem}>
            <Text style={[styles.breakdownCount, { color: colors.primary }]}>
              {item.count}
            </Text>
            <Text style={[styles.breakdownLabel, { color: colors.textTertiary }]}>
              {item.label.toLowerCase()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function HomeScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState({
    calls: 0,
    messages: 0,
    leads: 0,
    conversionRate: '0%',
    activeLeads: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [timeSaved, setTimeSaved] = useState<{
    totalMinutes: number;
    breakdown: Array<{ label: string; count: number; minutes: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/mobile/stats', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (response.data.success) {
        setStats(response.data.stats);
      }

      const activityResponse = await api.get('/api/mobile/recent-activity', {
        params: { limit: 5 },
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (activityResponse.data.success) {
        setRecentActivity(activityResponse.data.activity || []);
      }

      // Fetch time saved stats
      try {
        const timeSavedResponse = await api.get('/api/mobile/time-saved', {
          params: { period: 'today' },
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (timeSavedResponse.data.success) {
          setTimeSaved(timeSavedResponse.data.timeSaved);
        }
      } catch (err) {
        console.log('Time saved endpoint not available:', err);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Gradient */}
      <LinearGradient
        colors={isDark
          ? ['#1E293B', colors.background]
          : [colors.primary + '08', colors.background]
        }
        style={styles.headerGradient}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.card }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Dashboard</Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('CRMActivity')}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {recentActivity.length > 0 && (
              <View style={[styles.notificationDot, { backgroundColor: colors.error }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Time Saved Card - Show AI value */}
        {timeSaved && timeSaved.totalMinutes > 0 && (
          <TimeSavedCard
            totalMinutes={timeSaved.totalMinutes}
            breakdown={timeSaved.breakdown}
          />
        )}

        {/* Stats Section */}
        <CollapsibleSection title="Performance Overview">
          <View style={styles.statsGrid}>
            <StatCard
              icon="call"
              value={stats.calls}
              label="AI Calls"
              onPress={() => navigation.navigate('Contacts', { screen: 'Calls' })}
            />
            <StatCard
              icon="chatbubbles"
              value={stats.messages}
              label="SMS Handled"
              onPress={() => navigation.navigate('Contacts', { screen: 'Messages' })}
            />
            <StatCard
              icon="people"
              value={stats.leads}
              label="Total Leads"
              onPress={() => navigation.navigate('Leads')}
            />
            <StatCard
              icon="trending-up"
              value={stats.conversionRate}
              label="Close Rate"
            />
          </View>
        </CollapsibleSection>

        {/* Quick Actions Section */}
        <CollapsibleSection title="Quick Actions">
          <View style={styles.actionsContainer}>
            <QuickAction
              icon="call"
              title="Call History"
              subtitle="View AI-handled calls"
              onPress={() => navigation.navigate('Contacts', { screen: 'Calls' })}
            />
            <QuickAction
              icon="chatbubble-ellipses"
              title="SMS Conversations"
              subtitle="Manage text threads"
              onPress={() => navigation.navigate('Contacts', { screen: 'Messages' })}
            />
            <QuickAction
              icon="person-add"
              title="Manage Leads"
              subtitle="View and update leads"
              onPress={() => navigation.navigate('Leads')}
              badge={stats.activeLeads}
            />
            <QuickAction
              icon="bar-chart"
              title="CRM Activity"
              subtitle="Track all interactions"
              onPress={() => navigation.navigate('Contacts', { screen: 'CRMActivity' })}
            />
          </View>
        </CollapsibleSection>

        {/* Recent Activity Section */}
        {recentActivity.length > 0 && (
          <CollapsibleSection title="Recent Activity">
            <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {recentActivity.map((activity, index) => (
                <ActivityItem
                  key={index}
                  type={activity.type}
                  title={activity.title}
                  description={activity.description}
                  timeAgo={activity.timeAgo}
                />
              ))}
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => navigation.navigate('Contacts', { screen: 'CRMActivity' })}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>View All Activity</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </CollapsibleSection>
        )}

        {/* AI Assistant CTA */}
        <TouchableOpacity
          style={styles.aiCardWrapper}
          onPress={() => navigation.navigate('Aria')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCard}
          >
            <View style={styles.aiCardContent}>
              <View style={styles.aiIconWrapper}>
                <Ionicons name="mic" size={26} color="#FFFFFF" />
              </View>
              <View style={styles.aiTextWrapper}>
                <Text style={styles.aiTitle}>Talk to Aria</Text>
                <Text style={styles.aiSubtitle}>Your AI voice assistant</Text>
              </View>
            </View>
            <View style={styles.aiArrow}>
              <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 120,
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Collapsible
  collapsibleContainer: {
    marginBottom: 24,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  collapsibleTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  collapsibleContent: {
    paddingTop: 16,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Quick Actions
  actionsContainer: {
    gap: 10,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Activity
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
    marginRight: 8,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDesc: {
    fontSize: 12,
  },
  activityTime: {
    fontSize: 11,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 6,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // AI Card
  aiCardWrapper: {
    marginTop: 8,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
  },
  aiCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  aiTextWrapper: {},
  aiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  aiSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  aiArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomSpacer: {
    height: 20,
  },

  // Time Saved Card
  timeSavedCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  timeSavedAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  timeSavedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeSavedIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  timeSavedLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSavedValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 16,
  },
  timeSavedBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  breakdownCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  breakdownLabel: {
    fontSize: 13,
  },
});
