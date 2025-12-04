import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastActive?: string;
}

interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: Date;
  type: 'contact' | 'deal' | 'task' | 'note' | 'call';
}

interface SharedItem {
  id: string;
  type: 'contact' | 'deal' | 'list';
  name: string;
  sharedBy: string;
  sharedAt: Date;
  permissions: 'view' | 'edit';
}

export default function CollaborationScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'team' | 'activity' | 'shared'>('team');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load team members
      try {
        const teamRes = await api.get('/api/mobile/team/members');
        if (teamRes.data.members) {
          setTeamMembers(teamRes.data.members);
        }
      } catch (err) {
        // Use placeholder data if API not available
        setTeamMembers([
          {
            id: '1',
            name: user?.name || 'You',
            email: user?.email || '',
            role: 'owner',
            status: 'online',
          },
        ]);
      }

      // Load activity feed
      try {
        const activityRes = await api.get('/api/mobile/team/activity');
        if (activityRes.data.activities) {
          setActivities(activityRes.data.activities);
        }
      } catch (err) {
        setActivities([]);
      }

      // Load shared items
      try {
        const sharedRes = await api.get('/api/mobile/team/shared');
        if (sharedRes.data.items) {
          setSharedItems(sharedRes.data.items);
        }
      } catch (err) {
        setSharedItems([]);
      }

    } catch (error) {
      console.error('Error loading collaboration data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      await api.post('/api/mobile/team/invite', { email: inviteEmail });
      Alert.alert('Invitation Sent', `An invitation has been sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInvite(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10B981';
      case 'away': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return '#3B82F6';
      case 'admin': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contact': return 'person';
      case 'deal': return 'cash';
      case 'task': return 'checkbox';
      case 'note': return 'document-text';
      case 'call': return 'call';
      default: return 'ellipse';
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const renderTeamTab = () => (
    <View style={styles.tabContent}>
      {/* Invite Button */}
      <TouchableOpacity
        style={[styles.inviteButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowInvite(true)}
      >
        <Ionicons name="person-add" size={18} color="#fff" />
        <Text style={styles.inviteButtonText}>Invite Team Member</Text>
      </TouchableOpacity>

      {/* Invite Modal */}
      {showInvite && (
        <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.inviteTitle, { color: colors.text }]}>Invite by Email</Text>
          <TextInput
            style={[styles.inviteInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter email address"
            placeholderTextColor={colors.textTertiary}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.inviteActions}>
            <TouchableOpacity
              style={[styles.inviteCancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowInvite(false)}
            >
              <Text style={[styles.inviteCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inviteSendBtn, { backgroundColor: colors.primary }]}
              onPress={handleInvite}
            >
              <Text style={styles.inviteSendText}>Send Invite</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Team Members List */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TEAM MEMBERS</Text>
      {teamMembers.map((member) => (
        <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.card }]}>
          <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.memberAvatarText}>{getInitials(member.name)}</Text>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
          </View>
          <View style={styles.memberInfo}>
            <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
            <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{member.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) + '20' }]}>
            <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </Text>
          </View>
        </View>
      ))}

      {teamMembers.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Team Members</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Invite your team to collaborate
          </Text>
        </View>
      )}
    </View>
  );

  const renderActivityTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENT ACTIVITY</Text>
      {activities.map((activity) => (
        <View key={activity.id} style={[styles.activityCard, { backgroundColor: colors.card }]}>
          <View style={[styles.activityIcon, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name={getActivityIcon(activity.type) as any} size={16} color={colors.primary} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={[styles.activityText, { color: colors.text }]}>
              <Text style={styles.activityUser}>{activity.user}</Text> {activity.action}{' '}
              <Text style={styles.activityTarget}>{activity.target}</Text>
            </Text>
            <Text style={[styles.activityTime, { color: colors.textTertiary }]}>
              {formatTimeAgo(activity.timestamp)}
            </Text>
          </View>
        </View>
      ))}

      {activities.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="pulse-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Activity Yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Team activity will appear here
          </Text>
        </View>
      )}
    </View>
  );

  const renderSharedTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SHARED WITH YOU</Text>
      {sharedItems.map((item) => (
        <View key={item.id} style={[styles.sharedCard, { backgroundColor: colors.card }]}>
          <View style={[styles.sharedIcon, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons
              name={item.type === 'contact' ? 'person' : item.type === 'deal' ? 'cash' : 'list'}
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={styles.sharedInfo}>
            <Text style={[styles.sharedName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.sharedMeta, { color: colors.textSecondary }]}>
              Shared by {item.sharedBy} · {item.permissions === 'edit' ? 'Can edit' : 'View only'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      ))}

      {sharedItems.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="share-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing Shared</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Items shared with you will appear here
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Team</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {['team', 'activity', 'shared'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? colors.primary : colors.textSecondary }
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeTab === 'team' && renderTeamTab()}
        {activeTab === 'activity' && renderActivityTab()}
        {activeTab === 'shared' && renderSharedTab()}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  tabContent: {},
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  inviteCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inviteInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 12,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  inviteCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inviteSendBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  inviteSendText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityText: {
    fontSize: 14,
    lineHeight: 20,
  },
  activityUser: {
    fontWeight: '600',
  },
  activityTarget: {
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
    marginTop: 4,
  },
  sharedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  sharedIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sharedName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sharedMeta: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
