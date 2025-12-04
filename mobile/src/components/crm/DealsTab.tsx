import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Deal, STAGES } from '../../types';
import DealCard from './DealCard';

interface DealsTabProps {
  deals: Deal[];
  refreshing: boolean;
  onRefresh: () => void;
  onDealPress: (deal: Deal) => void;
  onAddDeal: () => void;
  selectedStage: string | null;
  onStageChange: (stage: string | null) => void;
}

const DealsTab: React.FC<DealsTabProps> = ({ deals, refreshing, onRefresh, onDealPress, onAddDeal, selectedStage, onStageChange }) => (
  <View style={styles.dealsContainer}>
    {/* Stage Filter */}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageFilter}>
      <TouchableOpacity
        style={[styles.stageFilterBtn, !selectedStage && styles.stageFilterActive]}
        onPress={() => onStageChange(null)}
      >
        <Text style={[styles.stageFilterText, !selectedStage && styles.stageFilterTextActive]}>
          All
        </Text>
      </TouchableOpacity>
      {STAGES.map(stage => (
        <TouchableOpacity
          key={stage.key}
          style={[
            styles.stageFilterBtn,
            selectedStage === stage.key && styles.stageFilterActive,
            { borderColor: stage.color }
          ]}
          onPress={() => onStageChange(selectedStage === stage.key ? null : stage.key)}
        >
          <Text style={[
            styles.stageFilterText,
            selectedStage === stage.key && { color: stage.color }
          ]}>
            {stage.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>

    <FlatList
      data={deals}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => <DealCard item={item} onPress={() => onDealPress(item)} />}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color="#6b7280" />
          <Text style={styles.emptyText}>No deals found</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onAddDeal}>
            <Text style={styles.emptyButtonText}>Create First Deal</Text>
          </TouchableOpacity>
        </View>
      }
    />
  </View>
);

const styles = StyleSheet.create({
  dealsContainer: {
    flex: 1,
  },
  stageFilter: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  stageFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e1e2e',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2e2e3e',
  },
  stageFilterActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: '#a855f7',
  },
  stageFilterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  stageFilterTextActive: {
    color: '#a855f7',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default DealsTab;
