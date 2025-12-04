import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Deal, STAGES, PRIORITIES } from '../../types';

interface DealCardProps {
  item: Deal;
  onPress: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const DealCard: React.FC<DealCardProps> = ({ item, onPress }) => {
  const stageInfo = STAGES.find(s => s.key === item.stage);
  const priorityInfo = PRIORITIES.find(p => p.key === item.priority);

  return (
    <TouchableOpacity
      style={styles.dealCard}
      onPress={onPress}
    >
      <View style={styles.dealHeader}>
        <Text style={styles.dealTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: priorityInfo?.color || '#6b7280' }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>

      <View style={styles.dealInfo}>
        <Text style={styles.dealValue}>{formatCurrency(item.value)}</Text>
        <View style={[styles.stageBadge, { backgroundColor: stageInfo?.color || '#6b7280' }]}>
          <Text style={styles.stageText}>{stageInfo?.label}</Text>
        </View>
      </View>

      {item.contact && (
        <View style={styles.dealContact}>
          <Ionicons name="person-outline" size={14} color="#6b7280" />
          <Text style={styles.dealContactText}>{item.contact.name}</Text>
        </View>
      )}

      <View style={styles.dealFooter}>
        <Text style={styles.dealProbability}>{item.probability}% probability</Text>
        <Text style={styles.dealDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  dealCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dealTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 12,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  dealInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dealValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
  },
  stageBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  dealContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dealContactText: {
    fontSize: 14,
    color: '#6b7280',
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2e2e3e',
    paddingTop: 12,
  },
  dealProbability: {
    fontSize: 12,
    color: '#6b7280',
  },
  dealDate: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default DealCard;
