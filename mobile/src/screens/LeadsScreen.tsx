import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

// Use 10.0.2.2 for Android emulator, 192.168.0.151 for physical devices
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://192.168.0.151:5001';

export default function LeadsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [leads, setLeads] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/mobile/leads`, {
        params: { _t: Date.now() },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.data.success) {
        setLeads(response.data.leads);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#3b82f6';
      case 'contacted': return '#8b5cf6';
      case 'qualified': return '#10b981';
      case 'won': return '#22c55e';
      case 'lost': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'call': return '📞';
      case 'sms': return '💬';
      case 'web': return '🌐';
      case 'social': return '📱';
      default: return '👤';
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderLead = ({ item }: any) => (
    <View style={[styles.leadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.leadHeader}>
        <View style={styles.leadInfo}>
          <Text style={[styles.leadName, { color: colors.text }]}>{item.name || 'Unknown'}</Text>
          {item.phone && <Text style={[styles.leadPhone, { color: colors.textSecondary }]}>{item.phone}</Text>}
          {item.email && <Text style={[styles.leadEmail, { color: colors.textSecondary }]}>{item.email}</Text>}
        </View>
        <View style={styles.badges}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status || 'new'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.leadMeta}>
        <Text style={[styles.metaItem, { color: colors.textTertiary }]}>
          {getSourceIcon(item.source)} {item.source || 'unknown'}
        </Text>
        <Text style={[styles.metaDivider, { color: colors.textTertiary }]}>•</Text>
        <Text style={[styles.metaItem, { color: colors.textTertiary }]}>
          {formatDate(item.createdAt)}
        </Text>
      </View>

      {item.notes && (
        <View style={[styles.notesBox, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes:</Text>
          <Text style={[styles.notesText, { color: colors.text }]} numberOfLines={3}>{item.notes}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading leads...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: 60, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Leads</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{leads.length} total leads</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {leads.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No leads yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Leads will be automatically created when the AI handles missed calls and text messages.
          </Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          renderItem={renderLead}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
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
  },
  leadCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  leadPhone: {
    fontSize: 14,
    marginBottom: 2,
  },
  leadEmail: {
    fontSize: 14,
  },
  badges: {
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  leadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaItem: {
    fontSize: 12,
  },
  metaDivider: {
    fontSize: 12,
    marginHorizontal: 8,
  },
  notesBox: {
    padding: 12,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
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
