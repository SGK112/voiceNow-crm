import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';

const API_URL = 'http://192.168.0.151:5001';

export default function App() {
  const [stats, setStats] = React.useState({
    calls: 0,
    messages: 0,
    leads: 0,
    conversionRate: '0%',
    activeLeads: 0,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/mobile/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>VoiceFlow AI</Text>
        <Text style={styles.subtitle}>AI Voicemail & SMS Assistant</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.calls}</Text>
            <Text style={styles.statLabel}>AI Calls</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.messages}</Text>
            <Text style={styles.statLabel}>SMS Handled</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.leads}</Text>
            <Text style={styles.statLabel}>Leads Created</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.conversionRate}</Text>
            <Text style={styles.statLabel}>Close Rate</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📞</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>AI Voicemail Agent</Text>
              <Text style={styles.featureText}>Automatically calls back missed calls</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>💬</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Smart SMS Replies</Text>
              <Text style={styles.featureText}>AI generates intelligent responses</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>👥</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>CRM Integration</Text>
              <Text style={styles.featureText}>Automatically creates leads</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={fetchStats}>
          <Text style={styles.refreshButtonText}>Refresh Stats</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
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
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1b',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  logo: {
    fontSize: 24,
    color: '#3b82f6',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#1a1a1b',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: '#1a1a1b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#374151',
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  refreshButtonText: {
    fontSize: 16,
    color: '#ffffff',
  },
});
