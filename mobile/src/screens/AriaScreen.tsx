import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AIOrbButton from '../components/AIOrbButton';
import axios from 'axios';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://192.168.0.151:5001';

// AI Voice Options (same as ProfileScreen)
const AI_VOICES = [
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female', accent: 'British' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'Female', accent: 'American' },
  { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi', gender: 'Female', accent: 'American' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'Female', accent: 'English-Swedish' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male', accent: 'British' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'Male', accent: 'Transatlantic' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male', accent: 'American' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'Male', accent: 'American' },
];

export default function AriaScreen() {
  const { colors, isDark } = useTheme();
  const [showDevTools, setShowDevTools] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL');
  const [voiceStyle, setVoiceStyle] = useState('friendly');
  const orbRef = useRef<any>(null);

  useEffect(() => {
    fetchVoiceSettings();
  }, []);

  const fetchVoiceSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/profile/default`);
      if (response.data.success && response.data.profile?.ariaPreferences) {
        const prefs = response.data.profile.ariaPreferences;
        setSelectedVoice(prefs.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL');
        setVoiceStyle(prefs.voiceStyle || 'friendly');
      }
    } catch (error) {
      console.error('Error fetching voice settings:', error);
    }
  };

  const getSelectedVoice = () => {
    return AI_VOICES.find(v => v.id === selectedVoice) || AI_VOICES[1];
  };

  const voice = getSelectedVoice();
  const genderColor = voice.gender === 'Female' ? '#EC4899' : '#3B82F6';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Main Aria Interface */}
      <View style={styles.ariaContainer}>
        <Text style={[styles.title, { color: colors.primary }]}>ARIA</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your AI Voice Assistant</Text>

        {/* Voice Badge */}
        <View style={[styles.voiceBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.voiceBadgeIcon, { backgroundColor: genderColor + '20' }]}>
            <Ionicons name={voice.gender === 'Female' ? 'woman' : 'man'} size={14} color={genderColor} />
          </View>
          <Text style={[styles.voiceBadgeText, { color: colors.text }]}>
            Speaking as {voice.name}
          </Text>
          <Text style={[styles.voiceBadgeAccent, { color: colors.textTertiary }]}>
            {voice.accent}
          </Text>
        </View>

        {/* Centered Orb */}
        <View style={styles.orbWrapper}>
          <AIOrbButton ref={orbRef} onPress={() => {}} />
        </View>

        <Text style={[styles.hint, { color: colors.textTertiary }]}>Tap to speak with Aria</Text>
      </View>

      {/* Dev Tools Toggle Button */}
      <TouchableOpacity
        style={[styles.devToggleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowDevTools(!showDevTools)}
      >
        <Ionicons name={showDevTools ? 'close' : 'settings-outline'} size={16} color={colors.textSecondary} />
        <Text style={[styles.devToggleText, { color: colors.textSecondary }]}>
          {showDevTools ? 'Hide' : 'Dev Tools'}
        </Text>
      </TouchableOpacity>

      {/* Dev Tools Panel */}
      {showDevTools && (
        <View style={[styles.devToolsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView style={styles.devToolsScroll}>
            <Text style={[styles.devToolsTitle, { color: colors.text }]}>Developer Tools</Text>

            <View style={styles.devSection}>
              <Text style={[styles.devSectionTitle, { color: colors.primary }]}>Voice Activity Detection</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Minimum recording: 1 second</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Silence threshold: 2-3 seconds (adaptive)</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Fallback timer: 20 seconds</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Audio threshold: -35 dB</Text>
            </View>

            <View style={styles.devSection}>
              <Text style={[styles.devSectionTitle, { color: colors.primary }]}>Conversation Memory</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Context window: Last 5 messages</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Auto-continuation: Enabled</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Model: GPT-4o-mini</Text>
            </View>

            <View style={styles.devSection}>
              <Text style={[styles.devSectionTitle, { color: colors.primary }]}>Voice Synthesis</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Voice: {getSelectedVoice().name}</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Accent: {getSelectedVoice().accent}</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Style: {voiceStyle.charAt(0).toUpperCase() + voiceStyle.slice(1)}</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Model: turbo_v2_5</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Optimization: Level 4</Text>
            </View>

            <View style={styles.devSection}>
              <Text style={[styles.devSectionTitle, { color: colors.primary }]}>Quick Tests</Text>
              <TouchableOpacity style={[styles.devButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.devButtonText, { color: colors.text }]}>Test Transcription</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.devButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.devButtonText, { color: colors.text }]}>Test TTS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.devButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.devButtonText, { color: colors.text }]}>View Logs</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.devSection}>
              <Text style={[styles.devSectionTitle, { color: colors.primary }]}>System Info</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Backend: http://192.168.0.151:5001</Text>
              <Text style={[styles.devInfo, { color: colors.textSecondary }]}>Language: English (forced)</Text>
              <Text style={[styles.devInfo, { color: colors.success }]}>Status: Connected</Text>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ariaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  title: {
    fontSize: 64,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    letterSpacing: 2,
  },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 40,
    gap: 8,
  },
  voiceBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  voiceBadgeAccent: {
    fontSize: 12,
  },
  orbWrapper: {
    marginVertical: 40,
  },
  hint: {
    fontSize: 14,
    marginTop: 40,
    fontStyle: 'italic',
  },
  devToggleButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  devToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  devToolsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  devToolsScroll: {
    flex: 1,
    padding: 20,
  },
  devToolsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  devSection: {
    marginBottom: 24,
  },
  devSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  devInfo: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'Courier',
  },
  devButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  devButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
