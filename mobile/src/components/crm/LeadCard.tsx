import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Lead } from '../../types';

interface LeadCardProps {
  item: Lead;
  onPress: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.leadCard}
    onPress={onPress}
  >
    <View style={styles.leadHeader}>
      <View style={styles.leadAvatar}>
        <Text style={styles.leadAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.leadInfo}>
        <Text style={styles.leadName}>{item.name}</Text>
        <Text style={styles.leadEmail}>{item.email}</Text>
      </View>
    </View>

    {item.company && (
      <View style={styles.leadDetail}>
        <Ionicons name="business-outline" size={14} color="#6b7280" />
        <Text style={styles.leadDetailText}>{item.company}</Text>
      </View>
    )}

    {item.phone && (
      <View style={styles.leadDetail}>
        <Ionicons name="call-outline" size={14} color="#6b7280" />
        <Text style={styles.leadDetailText}>{item.phone}</Text>
      </View>
    )}

    <View style={styles.leadFooter}>
      <Text style={styles.leadSource}>{item.source || 'Unknown source'}</Text>
      <Text style={styles.leadDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  leadCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  leadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leadAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  leadEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  leadDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  leadDetailText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2e2e3e',
  },
  leadSource: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '500',
  },
  leadDate: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default LeadCard;
