import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Switch,
  Animated,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import * as Contacts from 'expo-contacts';
import * as Calendar from 'expo-calendar';

const { width } = Dimensions.get('window');
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://192.168.0.151:5001';

// AI Voice Options
const AI_VOICES = [
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female', accent: 'British', description: 'Warm & soothing', preview: 'Warm and soothing British voice' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'Female', accent: 'American', description: 'Soft & friendly', preview: 'Default friendly assistant voice' },
  { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi', gender: 'Female', accent: 'American', description: 'Youthful & animated', preview: 'Energetic and expressive' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'Female', accent: 'English-Swedish', description: 'Seductive & smooth', preview: 'Confident and sophisticated' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male', accent: 'British', description: 'Authoritative & deep', preview: 'Professional British male voice' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'Male', accent: 'Transatlantic', description: 'Intense & hoarse', preview: 'Character voice with depth' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male', accent: 'American', description: 'Articulate & neutral', preview: 'Clean and professional' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'Male', accent: 'American', description: 'Friendly & young', preview: 'Casual young male voice' },
];

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  accentColor?: string;
}

const CollapsibleSection = ({ title, icon, children, defaultExpanded = false, accentColor }: CollapsibleSectionProps) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const color = accentColor || colors.primary;

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={[styles.sectionIconWrapper, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <View style={[styles.expandIcon, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textTertiary}
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.sectionContent, { borderTopColor: colors.border }]}>
          {children}
        </View>
      )}
    </View>
  );
};

// Input Field Component with improved styling
interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  editable?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}

const InputField = ({ label, value, onChangeText, placeholder, icon, editable = true, multiline, keyboardType }: InputFieldProps) => {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        {
          backgroundColor: editable
            ? (focused ? colors.card : colors.backgroundSecondary)
            : colors.backgroundTertiary,
          borderColor: focused ? colors.primary : colors.border,
          borderWidth: focused ? 2 : 1,
        }
      ]}>
        {icon && (
          <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
        )}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            multiline && styles.textArea,
            !editable && { color: colors.textTertiary }
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
};

// Voice Card Component
interface VoiceCardProps {
  voice: typeof AI_VOICES[0];
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

const VoiceCard = ({ voice, selected, onSelect, disabled }: VoiceCardProps) => {
  const { colors } = useTheme();
  const genderIcon = voice.gender === 'Female' ? 'woman' : 'man';
  const genderColor = voice.gender === 'Female' ? '#EC4899' : '#3B82F6';

  return (
    <TouchableOpacity
      style={[
        styles.voiceOptionCard,
        {
          backgroundColor: selected ? colors.primary + '12' : colors.backgroundSecondary,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
        },
        disabled && { opacity: 0.6 },
      ]}
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.voiceCardHeader}>
        <View style={[styles.voiceAvatar, { backgroundColor: genderColor + '20' }]}>
          <Ionicons name={genderIcon} size={20} color={genderColor} />
        </View>
        {selected && (
          <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text style={[styles.voiceName, { color: selected ? colors.primary : colors.text }]}>
        {voice.name}
      </Text>
      <Text style={[styles.voiceAccent, { color: colors.textSecondary }]}>
        {voice.accent}
      </Text>
      <Text style={[styles.voiceDescription, { color: colors.textTertiary }]}>
        {voice.description}
      </Text>
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { showSuccess, showError, showInfo } = useNotification();
  const { user, logout, biometricAvailable, biometricEnabled, biometricType, enableBiometric, disableBiometric } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<'contacts' | 'calendar' | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [togglingBiometric, setTogglingBiometric] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Aria preferences
  const [voiceStyle, setVoiceStyle] = useState('friendly');
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL'); // Default to Bella
  const [autoCallback, setAutoCallback] = useState(false);
  const [interactiveVoicemail, setInteractiveVoicemail] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/profile/default`);

      if (response.data.success) {
        const p = response.data.profile;
        setProfile(p);

        if (p.personalInfo) {
          setFirstName(p.personalInfo.firstName || '');
          setLastName(p.personalInfo.lastName || '');
          setEmail(p.personalInfo.email || '');
          setPhone(p.personalInfo.phone || '');
          setBio(p.personalInfo.bio || '');
        }

        if (p.workInfo) {
          setCompany(p.workInfo.company || '');
          setJobTitle(p.workInfo.jobTitle || '');
        }

        if (p.ariaPreferences) {
          setVoiceStyle(p.ariaPreferences.voiceStyle || 'friendly');
          setSelectedVoice(p.ariaPreferences.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL');
          setAutoCallback(p.ariaPreferences.autoCallBack?.enabled || false);
          setInteractiveVoicemail(p.ariaPreferences.interactiveVoicemail?.enabled || false);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);

      await axios.put(`${API_URL}/api/profile/default/personal`, {
        firstName, lastName, email, phone, bio,
      });

      await axios.put(`${API_URL}/api/profile/default/work`, {
        company, jobTitle,
      });

      await axios.put(`${API_URL}/api/profile/default/aria`, {
        voiceStyle,
        elevenLabsVoiceId: selectedVoice,
        autoCallBack: { enabled: autoCallback },
        interactiveVoicemail: { enabled: interactiveVoicemail },
      });

      showSuccess('Profile saved successfully!');
      setEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const syncContacts = async () => {
    try {
      setSyncing('contacts');
      showInfo('Syncing contacts...');

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        showError('Contacts permission denied');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });

      const formattedContacts = data.slice(0, 100).map(contact => ({
        id: contact.id,
        name: contact.name || 'Unknown',
        phone: contact.phoneNumbers?.[0]?.number || '',
        email: contact.emails?.[0]?.email || '',
      }));

      await axios.post(`${API_URL}/api/profile/default/sync/contacts`, { contacts: formattedContacts });
      showSuccess(`Synced ${formattedContacts.length} contacts`);
      fetchProfile();
    } catch (error) {
      console.error('Error syncing contacts:', error);
      showError('Failed to sync contacts');
    } finally {
      setSyncing(null);
    }
  };

  const syncCalendar = async () => {
    try {
      setSyncing('calendar');
      showInfo('Syncing calendar...');

      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        showError('Calendar permission denied');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      let allEvents: any[] = [];
      for (const calendar of calendars) {
        const events = await Calendar.getEventsAsync([calendar.id], now, weekFromNow);
        allEvents = allEvents.concat(events);
      }

      await axios.post(`${API_URL}/api/profile/default/sync/calendar`, {
        events: allEvents.map(e => ({
          id: e.id, title: e.title, startDate: e.startDate, endDate: e.endDate, location: e.location,
        })),
      });

      showSuccess(`Synced ${allEvents.length} events`);
      fetchProfile();
    } catch (error) {
      console.error('Error syncing calendar:', error);
      showError('Failed to sync calendar');
    } finally {
      setSyncing(null);
    }
  };

  const getInitials = () => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return first + last || 'U';
  };

  const getSelectedVoiceName = () => {
    const voice = AI_VOICES.find(v => v.id === selectedVoice);
    return voice?.name || 'Bella';
  };

  const handleBiometricToggle = async () => {
    try {
      setTogglingBiometric(true);
      if (biometricEnabled) {
        await disableBiometric();
        showSuccess(`${biometricType} disabled`);
      } else {
        const success = await enableBiometric();
        if (success) {
          showSuccess(`${biometricType} enabled for quick login`);
        } else {
          showError(`Failed to enable ${biometricType}`);
        }
      }
    } catch (error) {
      showError(`Failed to toggle ${biometricType}`);
    } finally {
      setTogglingBiometric(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient
            colors={isDark
              ? ['#3B82F6', '#8B5CF6']
              : [colors.primary, '#6366F1']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCardGradient}
          />

          <View style={styles.profileContent}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#FFFFFF20', '#FFFFFF10']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </LinearGradient>
              {editing && (
                <TouchableOpacity style={styles.editAvatarBtn}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.userName}>
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Your Name'}
            </Text>
            <Text style={styles.userRole}>
              {jobTitle || company
                ? `${jobTitle}${jobTitle && company ? ' at ' : ''}${company}`
                : 'Add your role'}
            </Text>

            {!editing ? (
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => setEditing(true)}
              >
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
                <Text style={styles.editProfileBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditing(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                      <Text style={[styles.saveBtnText, { color: colors.primary }]}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {profile?.permissions?.contacts?.contactCount || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Contacts</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="mic" size={20} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: colors.text }]}>{getSelectedVoiceName()}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>AI Voice</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.text }]}>{isDark ? 'Dark' : 'Light'}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Theme</Text>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.appearanceRow}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <View style={[styles.sectionIconWrapper, { backgroundColor: isDark ? '#8B5CF620' : '#F59E0B20' }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#8B5CF6' : '#F59E0B'} />
            </View>
            <View style={styles.appearanceContent}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
              <Text style={[styles.appearanceSubtitle, { color: colors.textTertiary }]}>
                {isDark ? 'Dark mode enabled' : 'Light mode enabled'}
              </Text>
            </View>
            <View style={[styles.themeToggle, { backgroundColor: isDark ? '#8B5CF630' : colors.backgroundTertiary }]}>
              <Animated.View style={[
                styles.themeToggleKnob,
                {
                  backgroundColor: isDark ? '#8B5CF6' : colors.primary,
                  transform: [{ translateX: isDark ? 24 : 0 }],
                }
              ]}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={14}
                  color="#FFFFFF"
                />
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Biometric Authentication Section - Only show if device supports it */}
        {biometricAvailable && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.appearanceRow}
              onPress={handleBiometricToggle}
              activeOpacity={0.7}
              disabled={togglingBiometric}
            >
              <View style={[styles.sectionIconWrapper, { backgroundColor: '#3B82F620' }]}>
                <Ionicons
                  name={biometricType === 'Face ID' ? 'scan' : 'finger-print'}
                  size={20}
                  color="#3B82F6"
                />
              </View>
              <View style={styles.appearanceContent}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{biometricType}</Text>
                <Text style={[styles.appearanceSubtitle, { color: colors.textTertiary }]}>
                  {biometricEnabled ? 'Quick login enabled' : 'Tap to enable quick login'}
                </Text>
              </View>
              {togglingBiometric ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <View style={[styles.themeToggle, { backgroundColor: biometricEnabled ? '#3B82F630' : colors.backgroundTertiary }]}>
                  <Animated.View style={[
                    styles.themeToggleKnob,
                    {
                      backgroundColor: biometricEnabled ? '#3B82F6' : colors.textTertiary,
                      transform: [{ translateX: biometricEnabled ? 24 : 0 }],
                    }
                  ]}>
                    <Ionicons
                      name={biometricEnabled ? 'checkmark' : 'close'}
                      size={14}
                      color="#FFFFFF"
                    />
                  </Animated.View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Personal Information */}
        <CollapsibleSection title="Personal Information" icon="person" defaultExpanded={editing} accentColor={colors.primary}>
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <InputField
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                editable={editing}
              />
            </View>
            <View style={styles.inputHalf}>
              <InputField
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                editable={editing}
              />
            </View>
          </View>

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            icon="mail-outline"
            editable={editing}
            keyboardType="email-address"
          />

          <InputField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 123-4567"
            icon="call-outline"
            editable={editing}
            keyboardType="phone-pad"
          />

          <InputField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell Aria about yourself..."
            editable={editing}
            multiline
          />
        </CollapsibleSection>

        {/* Work Information */}
        <CollapsibleSection title="Work Information" icon="briefcase" accentColor="#10B981">
          <InputField
            label="Company"
            value={company}
            onChangeText={setCompany}
            placeholder="Company name"
            icon="business-outline"
            editable={editing}
          />

          <InputField
            label="Job Title"
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder="Your role"
            icon="id-card-outline"
            editable={editing}
          />
        </CollapsibleSection>

        {/* Aria Voice Settings */}
        <CollapsibleSection title="Aria Voice Settings" icon="mic" defaultExpanded={true} accentColor="#8B5CF6">
          {/* Voice Personality */}
          <Text style={[styles.subsectionLabel, { color: colors.textSecondary }]}>Voice Personality</Text>
          <View style={styles.voiceStyleGrid}>
            {[
              { id: 'professional', icon: 'briefcase', label: 'Professional', color: '#3B82F6' },
              { id: 'friendly', icon: 'happy', label: 'Friendly', color: '#10B981' },
              { id: 'casual', icon: 'cafe', label: 'Casual', color: '#F59E0B' },
              { id: 'energetic', icon: 'flash', label: 'Energetic', color: '#EF4444' },
            ].map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.voiceStyleCard,
                  {
                    backgroundColor: voiceStyle === style.id ? style.color + '15' : colors.backgroundSecondary,
                    borderColor: voiceStyle === style.id ? style.color : colors.border,
                    borderWidth: voiceStyle === style.id ? 2 : 1,
                  },
                  !editing && styles.voiceCardDisabled,
                ]}
                onPress={() => editing && setVoiceStyle(style.id)}
                disabled={!editing}
              >
                <Ionicons
                  name={style.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={voiceStyle === style.id ? style.color : colors.textTertiary}
                />
                <Text style={[
                  styles.voiceStyleText,
                  { color: voiceStyle === style.id ? style.color : colors.textSecondary }
                ]}>
                  {style.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AI Voice Selection */}
          <Text style={[styles.subsectionLabel, { color: colors.textSecondary, marginTop: 20 }]}>
            AI Voice
          </Text>
          <Text style={[styles.subsectionHint, { color: colors.textTertiary }]}>
            Choose the voice Aria will use when speaking to you
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.voiceCarousel}
            contentContainerStyle={styles.voiceCarouselContent}
          >
            {AI_VOICES.map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                selected={selectedVoice === voice.id}
                onSelect={() => editing && setSelectedVoice(voice.id)}
                disabled={!editing}
              />
            ))}
          </ScrollView>

          {/* Voice Settings Toggles */}
          <View style={[styles.settingsGroup, { borderTopColor: colors.border }]}>
            <View style={styles.settingItem}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="call" size={18} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Auto Callback</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>
                  Automatically call back missed callers
                </Text>
              </View>
              <Switch
                value={autoCallback}
                onValueChange={setAutoCallback}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={autoCallback ? colors.primary : colors.textTertiary}
                disabled={!editing}
              />
            </View>

            <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

            <View style={styles.settingItem}>
              <View style={[styles.settingIcon, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="recording" size={18} color="#10B981" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Interactive Voicemail</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>
                  Allow AI to handle voicemail interactions
                </Text>
              </View>
              <Switch
                value={interactiveVoicemail}
                onValueChange={setInteractiveVoicemail}
                trackColor={{ false: colors.border, true: '#10B98160' }}
                thumbColor={interactiveVoicemail ? '#10B981' : colors.textTertiary}
                disabled={!editing}
              />
            </View>
          </View>
        </CollapsibleSection>

        {/* Device Integrations */}
        <CollapsibleSection title="Device Integrations" icon="sync" accentColor="#06B6D4">
          <View style={[styles.integrationCard, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={[styles.integrationIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="people" size={22} color={colors.primary} />
            </View>
            <View style={styles.integrationInfo}>
              <Text style={[styles.integrationTitle, { color: colors.text }]}>Contacts</Text>
              <Text style={[styles.integrationSubtitle, { color: colors.textTertiary }]}>
                {profile?.permissions?.contacts?.contactCount || 0} contacts synced
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.syncBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={syncContacts}
              disabled={syncing !== null}
            >
              {syncing === 'contacts' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="sync" size={16} color={colors.primary} />
                  <Text style={[styles.syncBtnText, { color: colors.primary }]}>Sync</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.integrationCard, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={[styles.integrationIcon, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="calendar" size={22} color="#10B981" />
            </View>
            <View style={styles.integrationInfo}>
              <Text style={[styles.integrationTitle, { color: colors.text }]}>Calendar</Text>
              <Text style={[styles.integrationSubtitle, { color: colors.textTertiary }]}>
                {profile?.permissions?.calendar?.lastSync
                  ? `Last sync: ${new Date(profile.permissions.calendar.lastSync).toLocaleDateString()}`
                  : 'Not synced yet'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.syncBtn, { backgroundColor: '#10B98115' }]}
              onPress={syncCalendar}
              disabled={syncing !== null}
            >
              {syncing === 'calendar' ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <>
                  <Ionicons name="sync" size={16} color="#10B981" />
                  <Text style={[styles.syncBtnText, { color: '#10B981' }]}>Sync</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </CollapsibleSection>

        {/* About */}
        <CollapsibleSection title="About" icon="information-circle" accentColor={colors.textSecondary}>
          <View style={styles.aboutItem}>
            <View style={[styles.aboutIcon, { backgroundColor: colors.info + '15' }]}>
              <Ionicons name="logo-react" size={18} color={colors.info} />
            </View>
            <Text style={[styles.aboutLabel, { color: colors.text }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: colors.textTertiary }]}>1.0.0</Text>
          </View>
          <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.aboutItem}>
            <View style={[styles.aboutIcon, { backgroundColor: colors.textSecondary + '15' }]}>
              <Ionicons name="document-text" size={18} color={colors.textSecondary} />
            </View>
            <Text style={[styles.aboutLabel, { color: colors.text }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.aboutItem}>
            <View style={[styles.aboutIcon, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            </View>
            <Text style={[styles.aboutLabel, { color: colors.text }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </CollapsibleSection>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: () => logout(),
                },
              ]
            );
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* Account Info */}
        {user && (
          <Text style={[styles.accountEmail, { color: colors.textTertiary }]}>
            Signed in as {user.email}
          </Text>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },

  // Profile Card
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  profileCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  profileContent: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF40',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF60',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#FFFFFFCC',
    marginBottom: 20,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF30',
    gap: 8,
  },
  editProfileBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF30',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
  },

  // Appearance Row
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  appearanceContent: {
    flex: 1,
    marginLeft: 12,
  },
  appearanceSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Theme Toggle
  themeToggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    padding: 4,
  },
  themeToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Card
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  expandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    paddingTop: 16,
  },

  // Input
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  // Voice Style
  subsectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subsectionHint: {
    fontSize: 13,
    marginBottom: 16,
    marginTop: -8,
  },
  voiceStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  voiceStyleCard: {
    width: (width - 72) / 2,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  voiceCardDisabled: {
    opacity: 0.6,
  },
  voiceStyleText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },

  // Voice Carousel
  voiceCarousel: {
    marginHorizontal: -16,
    marginBottom: 20,
  },
  voiceCarouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  voiceOptionCard: {
    width: 130,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  voiceCardHeader: {
    position: 'relative',
    marginBottom: 10,
  },
  voiceAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  voiceName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  voiceAccent: {
    fontSize: 11,
    marginBottom: 4,
  },
  voiceDescription: {
    fontSize: 10,
    textAlign: 'center',
  },

  // Settings Group
  settingsGroup: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    marginLeft: 48,
    marginVertical: 8,
  },

  // Integrations
  integrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  integrationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  integrationSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  syncBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // About
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  aboutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aboutLabel: {
    flex: 1,
    fontSize: 15,
  },
  aboutValue: {
    fontSize: 14,
  },
  aboutDivider: {
    height: 1,
    marginLeft: 48,
  },

  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountEmail: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 8,
  },

  bottomSpacer: {
    height: 40,
  },
});
