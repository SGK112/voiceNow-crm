import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';

const API_URL = 'http://192.168.0.151:5001';

export default function CallsScreen() {
  const [calls, setCalls] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/mobile/call-history`);
      if (response.data.success) {
        setCalls(response.data.calls);
      }
    } catch (err) {
      console.error('Error fetching calls:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderCall = ({ item }: any) => (
    <View style={styles.callCard}>
      <View style={styles.callHeader}>
        <View style={styles.callInfo}>
          <Text style={styles.callName}>{item.contactName || 'Unknown'}</Text>
          <Text style={styles.callPhone}>{item.phone}</Text>
        </View>
        <View style={styles.callStatus}>
          <Text style={styles.callType}>{item.type === 'missed' ? '📵 Missed' : '✅ AI Handled'}</Text>
        </View>
      </View>
      <Text style={styles.callTime}>{formatDate(item.timestamp)}</Text>
      {item.transcript && (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>Transcript:</Text>
          <Text style={styles.transcriptText}>{item.transcript}</Text>
        </View>
      )}
      {item.aiConfidence && (
        <Text style={styles.confidence}>AI Confidence: {item.aiConfidence}%</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading calls...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Call History</Text>
        <Text style={styles.subtitle}>{calls.length} total calls</Text>
      </View>

      {calls.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📞</Text>
          <Text style={styles.emptyTitle}>No calls yet</Text>
          <Text style={styles.emptyText}>
            When you receive missed calls, the AI will automatically call them back and the history will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          renderItem={renderCall}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 14,
  },
  list: {
    padding: 20,
  },
  callCard: {
    backgroundColor: '#1a1a1b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  callPhone: {
    fontSize: 14,
    color: '#9ca3af',
  },
  callStatus: {
    marginLeft: 8,
  },
  callType: {
    fontSize: 12,
    color: '#3b82f6',
  },
  callTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  transcriptBox: {
    backgroundColor: '#0a0a0b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 13,
    color: '#d1d5db',
    lineHeight: 18,
  },
  confidence: {
    fontSize: 12,
    color: '#10b981',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});
