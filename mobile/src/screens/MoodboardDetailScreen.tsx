import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 2;

interface MaterialItem {
  _id: string;
  name: string;
  category: string;
  supplier: string;
  supplierUrl?: string;
  productUrl?: string;
  imageUrl: string;
  color?: string;
  finish?: string;
  material?: string;
  pricePerUnit?: number;
  priceUnit?: string;
  estimatedTotal?: number;
  quantity?: number;
  notes?: string;
}

interface Moodboard {
  _id: string;
  name: string;
  description?: string;
  category: string;
  style: string;
  tags: string[];
  items: MaterialItem[];
  layout: {
    type: string;
    columns: number;
    backgroundColor: string;
  };
  budget: {
    estimated?: number;
    materials: number;
    labor: number;
    total: number;
  };
  collaborators: any[];
  sharing: {
    isPublic: boolean;
    publicUrl?: string;
    allowComments: boolean;
    viewCount: number;
  };
  approval: {
    status: string;
  };
  comments: any[];
  isOwner: boolean;
  role: string;
}

interface SearchResult {
  name: string;
  supplier: string;
  imageUrl: string;
  productUrl?: string;
  pricePerUnit?: number;
  priceUnit?: string;
  category?: string;
  color?: string;
  material?: string;
}

export default function MoodboardDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { moodboardId } = route.params;

  const [moodboard, setMoodboard] = useState<Moodboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showItemDetail, setShowItemDetail] = useState<MaterialItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchMoodboard = useCallback(async () => {
    try {
      const response = await api.get(`/moodboards/${moodboardId}`);
      // Handle various response formats and ensure all nested objects exist
      const data = response.data?.moodboard || response.data;
      const safeMoodboard: Moodboard = {
        ...data,
        items: data.items || [],
        tags: data.tags || [],
        collaborators: data.collaborators || [],
        budget: {
          estimated: data.budget?.estimated || 0,
          materials: data.budget?.materials || 0,
          labor: data.budget?.labor || 0,
          total: data.budget?.total || 0,
        },
        sharing: {
          isPublic: data.sharing?.isPublic || false,
          publicUrl: data.sharing?.publicUrl || '',
          allowComments: data.sharing?.allowComments || false,
          viewCount: data.sharing?.viewCount || 0,
        },
        approval: {
          status: data.approval?.status || 'pending',
        },
        layout: {
          type: data.layout?.type || 'grid',
          columns: data.layout?.columns || 2,
          backgroundColor: data.layout?.backgroundColor || '#ffffff',
        },
        comments: data.comments || [],
      };
      setMoodboard(safeMoodboard);
      setNewName(data.name || 'Untitled');
    } catch (error) {
      console.error('Error fetching moodboard:', error);
      Alert.alert('Error', 'Failed to load moodboard');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [moodboardId]);

  useEffect(() => {
    fetchMoodboard();
  }, [fetchMoodboard]);

  const searchMaterials = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await api.get('/moodboards/search/materials', {
        params: { query: searchQuery }
      });
      setSearchResults(response.data.products || []);
    } catch (error) {
      console.error('Error searching materials:', error);
      Alert.alert('Error', 'Failed to search materials');
    } finally {
      setSearching(false);
    }
  };

  const addMaterial = async (material: SearchResult) => {
    if (!moodboard) return;

    try {
      const item = {
        name: material.name,
        category: material.category || 'other',
        supplier: material.supplier,
        productUrl: material.productUrl,
        imageUrl: material.imageUrl,
        pricePerUnit: material.pricePerUnit,
        priceUnit: material.priceUnit,
        color: material.color,
        material: material.material,
      };

      const response = await api.post(`/moodboards/${moodboardId}/items`, item);
      setMoodboard(response.data);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding material:', error);
      Alert.alert('Error', 'Failed to add material');
    }
  };

  const removeMaterial = async (itemId: string) => {
    if (!moodboard) return;

    Alert.alert(
      'Remove Material',
      'Are you sure you want to remove this material?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/moodboards/${moodboardId}/items/${itemId}`);
              setMoodboard(response.data);
              setShowItemDetail(null);
            } catch (error) {
              console.error('Error removing material:', error);
              Alert.alert('Error', 'Failed to remove material');
            }
          },
        },
      ]
    );
  };

  const updateName = async () => {
    if (!newName.trim() || !moodboard) return;

    try {
      const response = await api.put(`/moodboards/${moodboardId}`, { name: newName });
      setMoodboard(response.data);
      setEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name');
    }
  };

  const togglePublicSharing = async () => {
    if (!moodboard) return;

    try {
      const response = await api.post(`/moodboards/${moodboardId}/public`, {
        isPublic: !moodboard.sharing?.isPublic,
        allowComments: true,
      });
      setMoodboard({
        ...moodboard,
        sharing: response.data?.sharing || {
          isPublic: !moodboard.sharing?.isPublic,
          publicUrl: '',
          allowComments: true,
          viewCount: 0,
        }
      });
    } catch (error) {
      console.error('Error toggling sharing:', error);
      Alert.alert('Error', 'Failed to update sharing settings');
    }
  };

  const shareBoard = async () => {
    if (!moodboard?.sharing.publicUrl) {
      Alert.alert('Share', 'Enable public sharing first to get a shareable link');
      return;
    }

    try {
      await Share.share({
        message: `Check out my ${moodboard.name} moodboard!`,
        url: `https://voiceflow-crm.onrender.com/moodboard/${moodboard.sharing.publicUrl}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const duplicateBoard = async () => {
    try {
      const response = await api.post(`/moodboards/${moodboardId}/duplicate`);
      Alert.alert('Success', 'Moodboard duplicated!', [
        {
          text: 'View Copy',
          onPress: () => navigation.replace('MoodboardDetail', { moodboardId: response.data._id })
        },
        { text: 'Stay Here' }
      ]);
    } catch (error) {
      console.error('Error duplicating:', error);
      Alert.alert('Error', 'Failed to duplicate moodboard');
    }
  };

  const renderMaterialItem = ({ item }: { item: MaterialItem }) => (
    <TouchableOpacity
      style={[styles.materialCard, { backgroundColor: colors.card }]}
      onPress={() => setShowItemDetail(item)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.materialImage} />
      <View style={styles.materialInfo}>
        <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.materialSupplier, { color: colors.textSecondary }]}>
          {item.supplier}
        </Text>
        {item.pricePerUnit && (
          <Text style={[styles.materialPrice, { color: colors.primary }]}>
            ${item.pricePerUnit}/{item.priceUnit || 'ea'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[styles.searchResultCard, { backgroundColor: colors.card }]}
      onPress={() => addMaterial(item)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.searchResultImage} />
      <View style={styles.searchResultInfo}>
        <Text style={[styles.searchResultName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.searchResultSupplier, { color: colors.textSecondary }]}>
          {item.supplier}
        </Text>
        {item.pricePerUnit && (
          <Text style={[styles.searchResultPrice, { color: colors.primary }]}>
            ${item.pricePerUnit}/{item.priceUnit || 'sqft'}
          </Text>
        )}
      </View>
      <Ionicons name="add-circle" size={24} color={colors.primary} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!moodboard) {
    return null;
  }

  const canEdit = moodboard.isOwner || moodboard.role === 'editor';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {editingName ? (
          <View style={styles.editNameContainer}>
            <TextInput
              style={[styles.editNameInput, { color: colors.text, borderColor: colors.border }]}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={updateName}
            />
            <TouchableOpacity onPress={updateName}>
              <Ionicons name="checkmark" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.titleContainer}
            onPress={() => canEdit && setEditingName(true)}
          >
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {moodboard.name}
            </Text>
            {canEdit && (
              <Ionicons name="pencil" size={14} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowShare(true)}
          >
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              Alert.alert('Options', '', [
                { text: 'Duplicate', onPress: duplicateBoard },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.card }]}>
        <View style={styles.stat}>
          <Ionicons name="images-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.text }]}>
            {moodboard.items.length} items
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.text }]}>
            ${moodboard.budget.total.toLocaleString()}
          </Text>
        </View>
        {moodboard.sharing.isPublic && (
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {moodboard.sharing.viewCount} views
            </Text>
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.statusText, { color: colors.primary }]}>
            {moodboard.style}
          </Text>
        </View>
      </View>

      {/* Materials Grid */}
      {moodboard.items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="color-palette-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Materials Yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Start adding materials to build your moodboard
          </Text>
        </View>
      ) : (
        <FlatList
          data={moodboard.items}
          renderItem={renderMaterialItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Add Button */}
      {canEdit && (
        <TouchableOpacity
          style={[styles.addFab, { backgroundColor: colors.primary }]}
          onPress={() => setShowSearch(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Search Modal */}
      <Modal
        visible={showSearch}
        animationType="slide"
        onRequestClose={() => setShowSearch(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.searchHeader}>
            <TouchableOpacity onPress={() => setShowSearch(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.searchTitle, { color: colors.text }]}>Add Materials</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.searchInputContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search countertops, tiles, flooring..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchMaterials}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={searchMaterials}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>Search Materials</Text>
            )}
          </TouchableOpacity>

          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item, index) => `${item.name}-${index}`}
              contentContainerStyle={styles.searchResultsList}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={showShare}
        animationType="slide"
        transparent
        onRequestClose={() => setShowShare(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.shareModal, { backgroundColor: colors.card }]}>
            <View style={styles.shareHeader}>
              <Text style={[styles.shareTitle, { color: colors.text }]}>Share Moodboard</Text>
              <TouchableOpacity onPress={() => setShowShare(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.background }]}
              onPress={togglePublicSharing}
            >
              <View style={styles.shareOptionLeft}>
                <Ionicons
                  name={moodboard.sharing.isPublic ? 'globe' : 'globe-outline'}
                  size={24}
                  color={moodboard.sharing.isPublic ? colors.primary : colors.textSecondary}
                />
                <View>
                  <Text style={[styles.shareOptionTitle, { color: colors.text }]}>
                    Public Link
                  </Text>
                  <Text style={[styles.shareOptionDesc, { color: colors.textSecondary }]}>
                    {moodboard.sharing.isPublic ? 'Anyone with link can view' : 'Only collaborators can access'}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.toggle,
                { backgroundColor: moodboard.sharing.isPublic ? colors.primary : colors.border }
              ]}>
                <View style={[
                  styles.toggleKnob,
                  moodboard.sharing.isPublic && styles.toggleKnobActive
                ]} />
              </View>
            </TouchableOpacity>

            {moodboard.sharing.isPublic && (
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: colors.primary }]}
                onPress={shareBoard}
              >
                <Ionicons name="share-outline" size={20} color="#fff" />
                <Text style={styles.shareButtonText}>Share Link</Text>
              </TouchableOpacity>
            )}

            <View style={styles.collaboratorsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Collaborators</Text>
              {moodboard.collaborators.length === 0 ? (
                <Text style={[styles.noCollaborators, { color: colors.textSecondary }]}>
                  No collaborators yet
                </Text>
              ) : (
                moodboard.collaborators.map((collab, index) => (
                  <View key={index} style={[styles.collaboratorRow, { backgroundColor: colors.background }]}>
                    <View style={[styles.collaboratorAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.collaboratorInitial}>
                        {(collab.name || collab.email || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.collaboratorInfo}>
                      <Text style={[styles.collaboratorName, { color: colors.text }]}>
                        {collab.name || collab.email}
                      </Text>
                      <Text style={[styles.collaboratorRole, { color: colors.textSecondary }]}>
                        {collab.role}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Item Detail Modal */}
      <Modal
        visible={!!showItemDetail}
        animationType="slide"
        transparent
        onRequestClose={() => setShowItemDetail(null)}
      >
        {showItemDetail && (
          <View style={styles.modalOverlay}>
            <View style={[styles.itemDetailModal, { backgroundColor: colors.card }]}>
              <Image source={{ uri: showItemDetail.imageUrl }} style={styles.detailImage} />

              <ScrollView style={styles.detailContent}>
                <Text style={[styles.detailName, { color: colors.text }]}>
                  {showItemDetail.name}
                </Text>
                <Text style={[styles.detailSupplier, { color: colors.textSecondary }]}>
                  {showItemDetail.supplier}
                </Text>

                <View style={styles.detailRow}>
                  {showItemDetail.material && (
                    <View style={[styles.detailBadge, { backgroundColor: colors.background }]}>
                      <Text style={[styles.detailBadgeText, { color: colors.text }]}>
                        {showItemDetail.material}
                      </Text>
                    </View>
                  )}
                  {showItemDetail.color && (
                    <View style={[styles.detailBadge, { backgroundColor: colors.background }]}>
                      <Text style={[styles.detailBadgeText, { color: colors.text }]}>
                        {showItemDetail.color}
                      </Text>
                    </View>
                  )}
                  {showItemDetail.finish && (
                    <View style={[styles.detailBadge, { backgroundColor: colors.background }]}>
                      <Text style={[styles.detailBadgeText, { color: colors.text }]}>
                        {showItemDetail.finish}
                      </Text>
                    </View>
                  )}
                </View>

                {showItemDetail.pricePerUnit && (
                  <Text style={[styles.detailPrice, { color: colors.primary }]}>
                    ${showItemDetail.pricePerUnit} / {showItemDetail.priceUnit || 'sqft'}
                  </Text>
                )}

                <View style={styles.detailActions}>
                  {showItemDetail.productUrl && (
                    <TouchableOpacity
                      style={[styles.detailButton, { backgroundColor: colors.primary }]}
                    >
                      <Ionicons name="open-outline" size={18} color="#fff" />
                      <Text style={styles.detailButtonText}>View Product</Text>
                    </TouchableOpacity>
                  )}

                  {canEdit && (
                    <TouchableOpacity
                      style={[styles.detailButton, { backgroundColor: colors.error }]}
                      onPress={() => removeMaterial(showItemDetail._id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={styles.detailButtonText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.closeDetailButton}
                onPress={() => setShowItemDetail(null)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  editNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editNameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    borderBottomWidth: 2,
    paddingVertical: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    gap: 16,
    marginBottom: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
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
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  materialCard: {
    width: ITEM_SIZE,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  materialImage: {
    width: '100%',
    height: ITEM_SIZE,
    resizeMode: 'cover',
  },
  materialInfo: {
    padding: 10,
  },
  materialName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  materialSupplier: {
    fontSize: 11,
    marginBottom: 4,
  },
  materialPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  addFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  searchButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchResultsList: {
    padding: 16,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchResultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultSupplier: {
    fontSize: 12,
    marginBottom: 2,
  },
  searchResultPrice: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  shareModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  shareOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  shareOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    padding: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  collaboratorsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  noCollaborators: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  collaboratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  collaboratorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collaboratorInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  collaboratorInfo: {
    marginLeft: 12,
  },
  collaboratorName: {
    fontSize: 14,
    fontWeight: '500',
  },
  collaboratorRole: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  itemDetailModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  detailImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  detailContent: {
    padding: 20,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailSupplier: {
    fontSize: 14,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  detailBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  detailPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  detailButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeDetailButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
