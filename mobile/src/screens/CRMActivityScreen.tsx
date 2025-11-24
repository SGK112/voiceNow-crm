import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://192.168.0.151:5001';

export default function CRMActivityScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [activity, setActivity] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/mobile/recent-activity`, {
        params: { limit: 20 },
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (response.data.success) {
        setActivity(response.data.activity || []);
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivity();
  };

  const getActivityConfig = (type: string) => {
    switch (type) {
      case 'call': return { color: colors.success, icon: 'call' as const };
      case 'message': return { color: colors.primary, icon: 'chatbubble' as const };
      case 'email': return { color: colors.warning, icon: 'mail' as const };
      case 'lead': return { color: colors.secondary, icon: 'person-add' as const };
      default: return { color: colors.textTertiary, icon: 'ellipse' as const };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading CRM activity...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>CRM Activity</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>All contact interactions</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {activity.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrapper, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="analytics-outline" size={48} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Activity from calls, messages, and leads will appear here
            </Text>
          </View>
        ) : (
          activity.map((item, index) => {
            const config = getActivityConfig(item.type);
            return (
              <View key={index} style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.activityIndicator, { backgroundColor: config.color }]} />

                <View style={[styles.activityIconContainer, { backgroundColor: config.color + '15' }]}>
                  <Ionicons name={config.icon} size={20} color={config.color} />
                </View>

                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>{item.description}</Text>

                  <View style={styles.activityFooter}>
                    <View style={[styles.activityTypeBadge, { backgroundColor: config.color + '15' }]}>
                      <Text style={[styles.activityTypeText, { color: config.color }]}>
                        {item.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.activityTime, { color: colors.textTertiary }]}>{item.timeAgo}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <Text style={[styles.pullToRefresh, { color: colors.textTertiary }]}>Pull down to refresh</Text>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  activityCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    overflow: 'hidden',
  },
  activityIndicator: {
    width: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activityTypeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activityTime: {
    fontSize: 12,
  },
  pullToRefresh: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});
