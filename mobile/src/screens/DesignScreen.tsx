import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

interface MoodboardItem {
  _id: string;
  name: string;
  description?: string;
  coverImage?: string;
  category: string;
  style: string;
  tags: string[];
  itemCount: number;
  budget?: {
    total: number;
  };
  approval?: {
    status: string;
  };
  sharing?: {
    isPublic: boolean;
  };
  collaborators?: any[];
  isOwner: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
  projectId?: {
    name: string;
  };
  leadId?: {
    name: string;
  };
}

const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'kitchen', label: 'Kitchen', icon: 'restaurant-outline' },
  { key: 'bathroom', label: 'Bathroom', icon: 'water-outline' },
  { key: 'bedroom', label: 'Bedroom', icon: 'bed-outline' },
  { key: 'living_room', label: 'Living', icon: 'tv-outline' },
  { key: 'outdoor', label: 'Outdoor', icon: 'leaf-outline' },
  { key: 'office', label: 'Office', icon: 'briefcase-outline' },
];

const STYLES = [
  'modern', 'traditional', 'transitional', 'farmhouse', 'coastal',
  'industrial', 'minimalist', 'bohemian', 'mediterranean', 'contemporary'
];

export default function DesignScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [moodboards, setMoodboards] = useState<MoodboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // New moodboard form
  const [newBoard, setNewBoard] = useState({
    name: '',
    description: '',
    category: 'kitchen',
    style: 'modern',
  });

  const fetchMoodboards = useCallback(async () => {
    try {
      const params: any = { status: 'active' };
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await api.get('/moodboards', { params });
      setMoodboards(response.data);
    } catch (error) {
      console.error('Error fetching moodboards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchMoodboards();
  }, [fetchMoodboards]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMoodboards();
  };

  const handleCreateMoodboard = async () => {
    if (!newBoard.name.trim()) {
      Alert.alert('Error', 'Please enter a name for your moodboard');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/moodboards', newBoard);
      setMoodboards([response.data, ...moodboards]);
      setShowCreateModal(false);
      setNewBoard({ name: '', description: '', category: 'kitchen', style: 'modern' });

      // Navigate to the new moodboard
      navigation.navigate('MoodboardDetail', { moodboardId: response.data._id });
    } catch (error) {
      console.error('Error creating moodboard:', error);
      Alert.alert('Error', 'Failed to create moodboard');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMoodboard = (id: string, name: string) => {
    Alert.alert(
      'Delete Moodboard',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/moodboards/${id}`);
              setMoodboards(moodboards.filter(m => m._id !== id));
            } catch (error) {
              console.error('Error deleting moodboard:', error);
              Alert.alert('Error', 'Failed to delete moodboard');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending_review': return colors.warning;
      case 'changes_requested': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const renderMoodboard = ({ item }: { item: MoodboardItem }) => (
    <TouchableOpacity
      style={[styles.moodboardCard, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate('MoodboardDetail', { moodboardId: item._id })}
      onLongPress={() => item.isOwner && handleDeleteMoodboard(item._id, item.name)}
    >
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={[styles.placeholderCover, { backgroundColor: colors.border }]}>
            <Ionicons name="images-outline" size={40} color={colors.textSecondary} />
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgeContainer}>
          {item.sharing?.isPublic && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Ionicons name="globe-outline" size={12} color="#fff" />
            </View>
          )}
          {(item.collaborators?.length || 0) > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="people-outline" size={12} color="#fff" />
              <Text style={styles.badgeText}>{item.collaborators?.length}</Text>
            </View>
          )}
        </View>

        {/* Item Count */}
        <View style={[styles.itemCount, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Ionicons name="images" size={12} color="#fff" />
          <Text style={styles.itemCountText}>{item.itemCount}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>

        <View style={styles.cardMeta}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
              {item.category.replace('_', ' ')}
            </Text>
          </View>

          {item.approval?.status && item.approval.status !== 'draft' && (
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.approval.status) }]} />
          )}
        </View>

        {item.projectId?.name && (
          <Text style={[styles.linkedProject, { color: colors.textSecondary }]} numberOfLines={1}>
            <Ionicons name="folder-outline" size={10} /> {item.projectId.name}
          </Text>
        )}

        {item.budget?.total ? (
          <Text style={[styles.budget, { color: colors.primary }]}>
            ${item.budget.total.toLocaleString()}
          </Text>
        ) : null}
      </View>

      {/* Role indicator */}
      {!item.isOwner && (
        <View style={[styles.roleIndicator, { backgroundColor: colors.secondary + '20' }]}>
          <Text style={[styles.roleText, { color: colors.secondary }]}>
            {item.role}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Moodboard</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Name */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., Master Bathroom Renovation"
              placeholderTextColor={colors.textSecondary}
              value={newBoard.name}
              onChangeText={(text) => setNewBoard({ ...newBoard, name: text })}
            />

            {/* Description */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Brief description of the design concept..."
              placeholderTextColor={colors.textSecondary}
              value={newBoard.description}
              onChangeText={(text) => setNewBoard({ ...newBoard, description: text })}
              multiline
              numberOfLines={3}
            />

            {/* Category */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Room Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
              {CATEGORIES.filter(c => c.key !== 'all').map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.optionButton,
                    { borderColor: colors.border },
                    newBoard.category === cat.key && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setNewBoard({ ...newBoard, category: cat.key })}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={newBoard.category === cat.key ? '#fff' : colors.textSecondary}
                  />
                  <Text style={[
                    styles.optionText,
                    { color: newBoard.category === cat.key ? '#fff' : colors.textSecondary }
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Style */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Design Style</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
              {STYLES.map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.optionButton,
                    { borderColor: colors.border },
                    newBoard.style === style && { backgroundColor: colors.secondary, borderColor: colors.secondary }
                  ]}
                  onPress={() => setNewBoard({ ...newBoard, style })}
                >
                  <Text style={[
                    styles.optionText,
                    { color: newBoard.style === style ? '#fff' : colors.textSecondary }
                  ]}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateMoodboard}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create Moodboard</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Design Studio</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search moodboards..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchMoodboards}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchMoodboards(); }}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryButton,
                { borderColor: colors.border },
                selectedCategory === cat.key && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={selectedCategory === cat.key ? '#fff' : colors.textSecondary}
              />
              <Text style={[
                styles.categoryLabel,
                { color: selectedCategory === cat.key ? '#fff' : colors.textSecondary }
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : moodboards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="color-palette-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Moodboards Yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Create your first moodboard to start collecting materials and inspiration
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Create Moodboard</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={moodboards}
          renderItem={renderMoodboard}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {renderCreateModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryContent: {
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  moodboardCard: {
    width: '48%',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  coverContainer: {
    height: 140,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  itemCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  itemCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardInfo: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  linkedProject: {
    fontSize: 11,
    marginTop: 6,
  },
  budget: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  roleIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionScroll: {
    marginTop: 4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
