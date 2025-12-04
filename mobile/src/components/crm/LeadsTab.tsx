import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Lead } from '../../types';
import LeadCard from './LeadCard';

interface LeadsTabProps {
  leads: Lead[];
  refreshing: boolean;
  onRefresh: () => void;
  onLeadPress: (lead: Lead) => void;
  onAddLead: () => void;
}

const LeadsTab: React.FC<LeadsTabProps> = ({ leads, refreshing, onRefresh, onLeadPress, onAddLead }) => (
  <FlatList
    data={leads}
    keyExtractor={(item) => item._id}
    renderItem={({ item }) => <LeadCard item={item} onPress={() => onLeadPress(item)} />}
    contentContainerStyle={styles.listContent}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
    }
    ListEmptyComponent={
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={48} color="#6b7280" />
        <Text style={styles.emptyText}>No leads found</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={onAddLead}>
          <Text style={styles.emptyButtonText}>Add First Lead</Text>
        </TouchableOpacity>
      </View>
    }
  />
);

const styles = StyleSheet.create({
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

export default LeadsTab;
