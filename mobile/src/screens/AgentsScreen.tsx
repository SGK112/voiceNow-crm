import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

interface Agent {
  _id: string;
  name: string;
  description?: string;
  type: string;
  customType?: string;
  voiceName?: string;
  enabled: boolean;
  deployed: boolean;
  createdAt: string;
  metadata?: {
    installedFrom?: string;
    category?: string;
    tier?: string;
  };
}

interface LibraryAgent {
  id: string;
  name: string;
  description: string;
  category?: string;
  tier?: string;
  rating?: number;
  downloads?: number;
  icon?: string;
  price?: {
    monthly?: number;
    perCall?: number;
    perMessage?: number;
  };
  features?: string[];
}

// Category definitions with icons
const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'voice', name: 'Voice', icon: 'call' },
  { id: 'sms', name: 'SMS', icon: 'chatbubble' },
  { id: 'email', name: 'Email', icon: 'mail' },
  { id: 'shopify', name: 'Shopify', icon: 'cart' },
  { id: 'marketing', name: 'Marketing', icon: 'megaphone' },
  { id: 'trade', name: 'Trade', icon: 'construct' },
  { id: 'service', name: 'Support', icon: 'headset' },
  { id: 'specialized', name: 'Special', icon: 'flash' },
];

type TabType = 'my_agents' | 'marketplace';

export default function AgentsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('my_agents');
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [libraryAgents, setLibraryAgents] = useState<LibraryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  const fetchMyAgents = async () => {
    try {
      const response = await api.get('/api/agents');
      if (response.data) {
        setMyAgents(Array.isArray(response.data) ? response.data : response.data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchLibraryAgents = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await api.get(`/api/agent-library?${params.toString()}`);
      if (response.data?.success) {
        setLibraryAgents(response.data.data.agents || []);
        if (response.data.data.categories) {
          setCategories(Object.keys(response.data.data.categories));
        }
      }
    } catch (error) {
      console.error('Error fetching agent library:', error);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'my_agents') {
      await fetchMyAgents();
    } else {
      await fetchLibraryAgents();
    }
    setLoading(false);
  }, [activeTab, selectedCategory, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleInstallAgent = async (agentId: string, agentName: string) => {
    try {
      Alert.alert(
        'Install Agent',
        `Would you like to install ${agentName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Install',
            onPress: async () => {
              try {
                const response = await api.post(`/api/agent-library/${agentId}/install`);
                if (response.data?.success) {
                  Alert.alert('Success', `${agentName} has been installed!`);
                  setActiveTab('my_agents');
                  fetchMyAgents();
                } else {
                  Alert.alert('Error', response.data?.message || 'Failed to install agent');
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to install agent');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error installing agent:', error);
    }
  };

  const handleToggleAgent = async (agent: Agent) => {
    try {
      const response = await api.patch(`/api/agents/${agent._id}`, {
        enabled: !agent.enabled
      });
      if (response.data) {
        fetchMyAgents();
      }
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  const handleDeleteAgent = (agent: Agent) => {
    Alert.alert(
      'Delete Agent',
      `Are you sure you want to delete ${agent.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/agents/${agent._id}`);
              fetchMyAgents();
            } catch (error) {
              console.error('Error deleting agent:', error);
            }
          }
        }
      ]
    );
  };

  const renderMyAgent = ({ item }: { item: Agent }) => (
    <TouchableOpacity
      style={[styles.agentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        // Show agent details in an alert for now
        Alert.alert(
          item.name,
          `${item.description || 'No description'}\n\nType: ${item.customType || item.type}\nStatus: ${item.deployed ? 'Deployed' : 'Draft'}\n${item.voiceName ? `Voice: ${item.voiceName}` : ''}`,
          [
            { text: 'Close', style: 'cancel' },
            { text: item.enabled ? 'Disable' : 'Enable', onPress: () => handleToggleAgent(item) },
            { text: 'Delete', style: 'destructive', onPress: () => handleDeleteAgent(item) }
          ]
        );
      }}
    >
      <View style={styles.agentHeader}>
        <View style={[styles.agentIcon, { backgroundColor: item.enabled ? colors.primary : colors.backgroundSecondary }]}>
          <Ionicons
            name={item.type === 'voice' ? 'call' : item.type === 'sms' ? 'chatbubble' : 'person'}
            size={20}
            color={item.enabled ? '#fff' : colors.textTertiary}
          />
        </View>
        <View style={styles.agentInfo}>
          <Text style={[styles.agentName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.agentType, { color: colors.textSecondary }]}>
            {item.customType || item.type} {item.voiceName ? `• ${item.voiceName}` : ''}
          </Text>
        </View>
        <View style={styles.agentActions}>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: item.enabled ? colors.success + '20' : colors.backgroundSecondary }]}
            onPress={() => handleToggleAgent(item)}
          >
            <Ionicons
              name={item.enabled ? 'power' : 'power-outline'}
              size={18}
              color={item.enabled ? colors.success : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>
      {item.description && (
        <Text style={[styles.agentDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View style={styles.agentFooter}>
        <View style={[styles.statusBadge, { backgroundColor: item.deployed ? colors.success + '20' : colors.warning + '20' }]}>
          <Text style={[styles.statusText, { color: item.deployed ? colors.success : colors.warning }]}>
            {item.deployed ? 'Deployed' : 'Draft'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteAgent(item)}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Get icon name based on category
  const getAgentIcon = (category?: string): string => {
    if (!category) return 'cube-outline';
    const cat = category.toLowerCase();
    if (cat.includes('voice') || cat.includes('call')) return 'call';
    if (cat.includes('sms') || cat.includes('mms')) return 'chatbubble';
    if (cat.includes('email')) return 'mail';
    if (cat.includes('shopify') || cat.includes('ecommerce')) return 'cart';
    if (cat.includes('marketing') || cat.includes('social')) return 'megaphone';
    if (cat.includes('trade') || cat.includes('hvac') || cat.includes('plumbing') || cat.includes('electrical')) return 'construct';
    if (cat.includes('service') || cat.includes('support')) return 'headset';
    if (cat.includes('scheduling') || cat.includes('appointment')) return 'calendar';
    if (cat.includes('rag') || cat.includes('knowledge')) return 'library';
    return 'cube-outline';
  };

  // Get tier color
  const getTierColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise': return '#2563EB';
      case 'professional': return colors.primary;
      case 'starter': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const renderLibraryAgent = ({ item }: { item: LibraryAgent }) => (
    <TouchableOpacity
      style={[styles.agentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleInstallAgent(item.id, item.name)}
    >
      <View style={styles.agentHeader}>
        <View style={[styles.agentIcon, { backgroundColor: colors.primary + '20' }]}>
          {item.icon ? (
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
          ) : (
            <Ionicons name={getAgentIcon(item.category) as any} size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.agentInfo}>
          <Text style={[styles.agentName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.agentType, { color: colors.textSecondary }]}>
            {item.category?.replace('specialty-', '').replace('shopify-', '').replace(/-/g, ' ') || 'General'}
          </Text>
        </View>
        {item.tier && (
          <View style={[styles.tierBadge, { backgroundColor: getTierColor(item.tier) + '20' }]}>
            <Text style={[styles.tierText, { color: getTierColor(item.tier) }]}>
              {item.tier}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.agentDescription, { color: colors.textSecondary }]} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.agentFooter}>
        <View style={styles.ratingContainer}>
          {item.rating && (
            <>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={[styles.ratingText, { color: colors.textSecondary }]}>{item.rating.toFixed(1)}</Text>
            </>
          )}
          {item.price?.monthly && (
            <Text style={[styles.priceText, { color: colors.textSecondary, marginLeft: item.rating ? 8 : 0 }]}>
              ${item.price.monthly}/mo
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.installButton, { backgroundColor: colors.primary }]}
          onPress={() => handleInstallAgent(item.id, item.name)}
        >
          <Text style={styles.installButtonText}>Install</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>AI Agents</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {activeTab === 'my_agents' ? `${myAgents.length} agents` : 'Browse marketplace'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('marketplace')}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'my_agents' && [styles.activeTab, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('my_agents')}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color={activeTab === 'my_agents' ? '#fff' : colors.textSecondary}
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'my_agents' ? '#fff' : colors.textSecondary }
          ]}>My Agents</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'marketplace' && [styles.activeTab, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('marketplace')}
        >
          <Ionicons
            name="storefront-outline"
            size={16}
            color={activeTab === 'marketplace' ? '#fff' : colors.textSecondary}
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'marketplace' ? '#fff' : colors.textSecondary }
          ]}>Marketplace</Text>
        </TouchableOpacity>
      </View>

      {/* Search (Marketplace only) */}
      {activeTab === 'marketplace' && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search agents..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={fetchLibraryAgents}
            />
          </View>

          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCategory === cat.id ? colors.primary : colors.backgroundSecondary
                  }
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={selectedCategory === cat.id ? '#fff' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={{
                  color: selectedCategory === cat.id ? '#fff' : colors.textSecondary,
                  fontSize: 13,
                  fontWeight: '500',
                }}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'my_agents' ? (
        myAgents.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrapper, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No agents yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Install an agent from the marketplace to get started
            </Text>
            <TouchableOpacity
              style={[styles.browseButton, { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('marketplace')}
            >
              <Text style={styles.browseButtonText}>Browse Marketplace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={myAgents}
            renderItem={renderMyAgent}
            keyExtractor={(item) => item._id}
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
        )
      ) : (
        <FlatList
          data={libraryAgents}
          renderItem={renderLibraryAgent}
          keyExtractor={(item, index) => item.id || `library-${index}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No agents found matching your criteria
              </Text>
            </View>
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
    marginLeft: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  categoryScroll: {
    marginTop: 12,
  },
  categoryScrollContent: {
    paddingRight: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 20,
    gap: 12,
  },
  agentCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  agentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  agentType: {
    fontSize: 13,
    marginTop: 2,
  },
  agentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  agentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  installButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  installButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
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
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
