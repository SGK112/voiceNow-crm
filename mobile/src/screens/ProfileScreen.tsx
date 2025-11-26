import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import * as Contacts from 'expo-contacts';
import * as Calendar from 'expo-calendar';

const VOICES = [
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', accent: 'British' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', accent: 'American' },
  { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi', accent: 'American' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', accent: 'British' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', accent: 'American' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', accent: 'American' },
];

export default function ProfileScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { showSuccess, showError, showInfo } = useNotification();
  const { user, logout, biometricAvailable, biometricEnabled, biometricType, enableBiometric, disableBiometric } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [togglingBiometric, setTogglingBiometric] = useState(false);
  const [contactCount, setContactCount] = useState(0);
  const [calendarCount, setCalendarCount] = useState(0);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyStore, setShopifyStore] = useState<string | null>(null);
  const [quickbooksConnected, setQuickbooksConnected] = useState(false);

  // Profile & Aria
  const [bio, setBio] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL');
  const [autoCallback, setAutoCallback] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsRes, calendarRes, googleRes, shopifyRes, quickbooksRes, settingsRes] = await Promise.all([
        api.get('/api/mobile/contacts').catch(() => ({ data: { count: 0 } })),
        api.get('/api/mobile/calendar-events?upcoming=false').catch(() => ({ data: { count: 0 } })),
        api.get('/api/mobile/google/status').catch(() => ({ data: { connected: false } })),
        api.get('/api/shopify/status').catch(() => ({ data: { connected: false } })),
        api.get('/api/quickbooks/status').catch(() => ({ data: { connected: false } })),
        api.get('/api/mobile/settings').catch(() => ({ data: { settings: {} } })),
      ]);
      setContactCount(contactsRes.data.count || 0);
      setCalendarCount(calendarRes.data.count || 0);
      setGoogleConnected(googleRes.data.connected || false);
      setGoogleEmail(googleRes.data.email || null);
      setShopifyConnected(shopifyRes.data.connected || false);
      setShopifyStore(shopifyRes.data.shop || null);
      setQuickbooksConnected(quickbooksRes.data.connected || false);

      const settings = settingsRes.data.settings || {};
      setBio(settings.bio || '');
      setSelectedVoice(settings.voiceId || 'EXAVITQu4vr4xnSDxMaL');
      setAutoCallback(settings.autoCallback || false);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/api/mobile/settings', {
        bio,
        voiceId: selectedVoice,
        autoCallback,
      });
      showSuccess('Saved');
    } catch { showError('Save failed'); }
    finally { setSaving(false); }
  };

  const syncContacts = async () => {
    setSyncing('contacts');
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') { showError('Permission denied'); return; }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });

      const formatted = data.filter(c => c.phoneNumbers?.length).slice(0, 500).map(c => ({
        name: c.name || 'Unknown',
        phone: c.phoneNumbers?.[0]?.number || '',
        email: c.emails?.[0]?.email,
      }));

      if (!formatted.length) { showInfo('No contacts found'); return; }

      const res = await api.post('/api/mobile/contacts/import', { contacts: formatted });
      showSuccess(`${res.data.imported || 0} synced`);
      loadData();
    } catch { showError('Sync failed'); }
    finally { setSyncing(null); }
  };

  const syncCalendar = async () => {
    setSyncing('calendar');
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { showError('Permission denied'); return; }

      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const now = new Date();
      const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      let events: any[] = [];
      for (const cal of cals) {
        try { events.push(...await Calendar.getEventsAsync([cal.id], now, end)); } catch {}
      }

      const formatted = events.filter(e => e.title).slice(0, 100).map(e => ({
        id: e.id, title: e.title, startDate: e.startDate, endDate: e.endDate,
      }));

      if (!formatted.length) { showInfo('No events found'); return; }

      const res = await api.post('/api/mobile/calendar/import', { events: formatted });
      showSuccess(`${res.data.imported || 0} synced`);
      loadData();
    } catch { showError('Sync failed'); }
    finally { setSyncing(null); }
  };

  const syncGoogle = async (type: 'contacts' | 'calendar' | 'all') => {
    if (!googleConnected) {
      connectGoogle();
      return;
    }
    setSyncing(`google-${type}`);
    try {
      const endpoint = type === 'all' ? '/api/mobile/google/sync/all' : `/api/mobile/google/sync/${type}`;
      const res = await api.post(endpoint);
      if (res.data.success) {
        showSuccess(type === 'all' ? 'Google synced' : `${res.data.imported || 0} synced`);
        loadData();
      }
    } catch { showError('Sync failed'); }
    finally { setSyncing(null); }
  };

  const connectGoogle = async () => {
    setSyncing('google');
    try {
      const res = await api.get('/api/mobile/auth/google/url?extended=true');
      if (res.data.url) {
        await Linking.openURL(res.data.url);
        showInfo('Complete sign-in in browser');
        setTimeout(() => { loadData(); setSyncing(null); }, 5000);
      }
    } catch { showError('Failed'); setSyncing(null); }
  };

  const disconnectGoogle = () => {
    Alert.alert('Disconnect', 'Remove Google account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => {
        try {
          await api.post('/api/mobile/google/disconnect');
          setGoogleConnected(false);
          setGoogleEmail(null);
          showSuccess('Disconnected');
        } catch { showError('Failed'); }
      }},
    ]);
  };

  const connectShopify = () => {
    Alert.prompt(
      'Connect Shopify',
      'Enter your Shopify store name (e.g., mystore)',
      async (shop) => {
        if (!shop) return;
        setSyncing('shopify');
        try {
          const res = await api.get(`/api/shopify/auth/url?shop=${shop}`);
          if (res.data.url) {
            await Linking.openURL(res.data.url);
            showInfo('Complete sign-in in browser');
            setTimeout(() => { loadData(); setSyncing(null); }, 5000);
          }
        } catch { showError('Failed'); setSyncing(null); }
      },
      'plain-text',
      '',
      'default'
    );
  };

  const disconnectShopify = () => {
    Alert.alert('Disconnect', 'Remove Shopify store?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => {
        try {
          await api.post('/api/shopify/disconnect');
          setShopifyConnected(false);
          setShopifyStore(null);
          showSuccess('Disconnected');
        } catch { showError('Failed'); }
      }},
    ]);
  };

  const syncShopifyCustomers = async () => {
    setSyncing('shopify-customers');
    try {
      const res = await api.post('/api/shopify/sync/customers');
      if (res.data.success) {
        showSuccess(`${res.data.imported || 0} customers synced`);
        loadData();
      }
    } catch { showError('Sync failed'); }
    finally { setSyncing(null); }
  };

  const connectQuickbooks = async () => {
    setSyncing('quickbooks');
    try {
      const res = await api.get('/api/quickbooks/connect');
      if (res.data.authUrl) {
        await Linking.openURL(res.data.authUrl);
        showInfo('Complete sign-in in browser');
        setTimeout(() => { loadData(); setSyncing(null); }, 5000);
      }
    } catch { showError('Failed'); setSyncing(null); }
  };

  const disconnectQuickbooks = () => {
    Alert.alert('Disconnect', 'Remove QuickBooks account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => {
        try {
          await api.post('/api/quickbooks/disconnect');
          setQuickbooksConnected(false);
          showSuccess('Disconnected');
        } catch { showError('Failed'); }
      }},
    ]);
  };

  const syncQuickbooks = async () => {
    setSyncing('quickbooks-sync');
    try {
      const res = await api.post('/api/quickbooks/sync');
      if (res.data.message) {
        showSuccess('QuickBooks synced');
        loadData();
      }
    } catch { showError('Sync failed'); }
    finally { setSyncing(null); }
  };

  const handleBiometric = async () => {
    setTogglingBiometric(true);
    try {
      if (biometricEnabled) { await disableBiometric(); showSuccess('Disabled'); }
      else { if (await enableBiometric()) showSuccess('Enabled'); }
    } catch { showError('Failed'); }
    finally { setTogglingBiometric(false); }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const Row = ({ icon, label, value, onPress, isLoading, chevron = true, color, status }: any) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress || isLoading}
      activeOpacity={0.6}
    >
      <View style={[styles.iconBox, { backgroundColor: color || colors.primary }]}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {value !== undefined && !isLoading && (
          <Text style={[styles.rowSubtext, { color: colors.textSecondary }]} numberOfLines={1}>{value}</Text>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : status ? (
        <View style={[styles.statusBadge, { backgroundColor: '#34C75920' }]}>
          <Text style={[styles.statusText, { color: '#34C759' }]}>{status}</Text>
        </View>
      ) : null}
      {chevron && onPress && !isLoading && (
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  const Toggle = ({ icon, label, value, onValueChange, isLoading, color }: any) => (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: color || colors.primary }]}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      )}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Close Button */}
      <View style={styles.closeRow}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{(user?.email?.[0] || 'U').toUpperCase()}</Text>
        </View>
        <Text style={[styles.email, { color: colors.text }]}>{user?.email || 'User'}</Text>
        <View style={[styles.badge, { backgroundColor: colors.card }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {user?.plan === 'trial' ? 'Free Trial' : user?.plan || 'Free'}
          </Text>
        </View>
      </View>

      {/* Bio */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ABOUT YOU</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.bioInput, { color: colors.text, borderColor: colors.border }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Brief bio for Aria (e.g., 'I'm a realtor in Miami specializing in luxury homes')"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          onBlur={saveSettings}
        />
      </View>

      {/* Aria Voice */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ARIA VOICE</Text>
      <View style={[styles.section, { backgroundColor: colors.card, paddingVertical: 12 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voiceScroll}>
          {VOICES.map((voice) => (
            <TouchableOpacity
              key={voice.id}
              style={[
                styles.voiceChip,
                {
                  backgroundColor: selectedVoice === voice.id ? colors.primary : colors.background,
                  borderColor: selectedVoice === voice.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => { setSelectedVoice(voice.id); saveSettings(); }}
            >
              <Text style={[styles.voiceName, { color: selectedVoice === voice.id ? '#fff' : colors.text }]}>
                {voice.name}
              </Text>
              <Text style={[styles.voiceAccent, { color: selectedVoice === voice.id ? 'rgba(255,255,255,0.7)' : colors.textTertiary }]}>
                {voice.accent}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={[styles.row, { borderBottomWidth: 0, marginTop: 8 }]}>
          <View style={[styles.iconBox, { backgroundColor: '#FF9500' }]}>
            <Ionicons name="call" size={16} color="#fff" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Auto Callback</Text>
          <Switch
            value={autoCallback}
            onValueChange={(v) => { setAutoCallback(v); saveSettings(); }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Device Sync */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DEVICE</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Row
          icon="people"
          label="Contacts"
          value={contactCount}
          onPress={syncContacts}
          isLoading={syncing === 'contacts'}
          color="#5856D6"
        />
        <Row
          icon="calendar"
          label="Calendar"
          value={calendarCount}
          onPress={syncCalendar}
          isLoading={syncing === 'calendar'}
          color="#FF9500"
        />
      </View>

      {/* Google */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>GOOGLE</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Row
          icon="logo-google"
          label={googleConnected ? 'Google Account' : 'Connect Google'}
          value={googleConnected ? googleEmail : undefined}
          status={googleConnected ? 'Connected' : undefined}
          onPress={googleConnected ? disconnectGoogle : connectGoogle}
          isLoading={syncing === 'google'}
          color="#4285F4"
        />
        {googleConnected && (
          <>
            <Row
              icon="people"
              label="Google Contacts"
              onPress={() => syncGoogle('contacts')}
              isLoading={syncing === 'google-contacts'}
              color="#34A853"
            />
            <Row
              icon="calendar"
              label="Google Calendar"
              onPress={() => syncGoogle('calendar')}
              isLoading={syncing === 'google-calendar'}
              color="#EA4335"
            />
          </>
        )}
      </View>

      {/* Shopify */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>SHOPIFY</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Row
          icon="storefront"
          label={shopifyConnected ? 'Shopify Store' : 'Connect Shopify'}
          value={shopifyConnected ? shopifyStore : undefined}
          status={shopifyConnected ? 'Connected' : undefined}
          onPress={shopifyConnected ? disconnectShopify : connectShopify}
          isLoading={syncing === 'shopify'}
          color="#95BF47"
        />
        {shopifyConnected && (
          <Row
            icon="people"
            label="Sync Customers"
            onPress={syncShopifyCustomers}
            isLoading={syncing === 'shopify-customers'}
            color="#5C6AC4"
          />
        )}
      </View>

      {/* QuickBooks */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>QUICKBOOKS</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Row
          icon="calculator"
          label={quickbooksConnected ? 'QuickBooks Online' : 'Connect QuickBooks'}
          status={quickbooksConnected ? 'Connected' : undefined}
          onPress={quickbooksConnected ? disconnectQuickbooks : connectQuickbooks}
          isLoading={syncing === 'quickbooks'}
          color="#2CA01C"
        />
        {quickbooksConnected && (
          <Row
            icon="sync"
            label="Sync Data"
            onPress={syncQuickbooks}
            isLoading={syncing === 'quickbooks-sync'}
            color="#0077C5"
          />
        )}
      </View>

      {/* Preferences */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PREFERENCES</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Toggle
          icon="moon"
          label="Dark Mode"
          value={isDark}
          onValueChange={toggleTheme}
          color="#5856D6"
        />
        {biometricAvailable && (
          <Toggle
            icon="finger-print"
            label={biometricType}
            value={biometricEnabled}
            onValueChange={handleBiometric}
            isLoading={togglingBiometric}
            color="#FF2D55"
          />
        )}
      </View>

      {/* Feedback & Support */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>FEEDBACK & SUPPORT</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Row
          icon="chatbox-ellipses"
          label="Send Feedback"
          onPress={() => Linking.openURL('mailto:feedback@voiceflow-crm.com?subject=App Feedback')}
          color="#5856D6"
        />
        <Row
          icon="star"
          label="Rate the App"
          onPress={() => Alert.alert('Rate Us', 'Thanks for your support! Rating will be available when the app is live on the App Store.')}
          color="#FF9500"
        />
        <Row
          icon="help-circle"
          label="Help & FAQ"
          onPress={() => Linking.openURL('https://voiceflow-crm.com/help')}
          color="#34C759"
        />
        <Row
          icon="bug"
          label="Report a Bug"
          onPress={() => Linking.openURL('mailto:support@voiceflow-crm.com?subject=Bug Report')}
          color="#FF3B30"
        />
      </View>

      {/* Account */}
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Row
          icon="log-out"
          label="Sign Out"
          onPress={handleLogout}
          chevron={false}
          color="#FF3B30"
        />
      </View>

      <Text style={[styles.version, { color: colors.textTertiary }]}>v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 20, paddingBottom: 40 },
  closeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  header: { alignItems: 'center', paddingVertical: 20 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '600', color: '#fff' },
  email: { fontSize: 17, fontWeight: '500', marginBottom: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 16 },
  rowSubtext: { fontSize: 13, marginTop: 2 },
  rowValue: { fontSize: 15 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  bioInput: {
    padding: 16,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  voiceScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  voiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 70,
  },
  voiceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  voiceAccent: {
    fontSize: 11,
    marginTop: 2,
  },
  version: { textAlign: 'center', fontSize: 12, marginTop: 32 },
});
