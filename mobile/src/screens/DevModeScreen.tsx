import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

export default function DevModeScreen() {
  const { colors } = useTheme();
  const [command, setCommand] = useState('');
  const [showTranscription, setShowTranscription] = useState(true);
  const [commandHistory, setCommandHistory] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const sendCommand = async () => {
    if (!command.trim()) {
      Alert.alert('Error', 'Please enter a command');
      return;
    }

    try {
      setIsProcessing(true);

      const response = await api.post('/api/dev/command', {
        command: command.trim(),
        transcription: `Manual input: ${command.trim()}`
      });

      if (response.data.success) {
        setCommandHistory([
          {
            id: response.data.commandId,
            command: command.trim(),
            timestamp: new Date().toLocaleTimeString(),
            status: 'sent'
          },
          ...commandHistory
        ]);

        Alert.alert('Success', 'Command sent to Claude Code! Check your screen for changes.');
        setCommand('');
      }
    } catch (error) {
      console.error('Error sending command:', error);
      Alert.alert('Error', 'Failed to send command');
    } finally {
      setIsProcessing(false);
    }
  };

  const quickCommands = [
    'Change the title to VoiceFlow CRM',
    'Make the orb button bigger',
    'Change background to dark blue',
    'Add a welcome message',
    'Make the title text green'
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="code-slash" size={24} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Dev Mode</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Control your app with text commands</Text>
      </View>

      {/* Show Transcription Toggle */}
      <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingContent}>
          <Ionicons name="mic-outline" size={20} color={colors.primary} />
          <Text style={[styles.settingLabel, { color: colors.text }]}>Show Voice Transcriptions</Text>
        </View>
        <Switch
          value={showTranscription}
          onValueChange={setShowTranscription}
          trackColor={{ false: colors.border, true: colors.primary + '60' }}
          thumbColor={showTranscription ? colors.primary : colors.textTertiary}
        />
      </View>

      {/* Manual Command Input */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Send Command</Text>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          Type a command for Claude Code to execute on your app
        </Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="e.g., Change the title to VoIP"
          placeholderTextColor={colors.placeholder}
          value={command}
          onChangeText={setCommand}
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            isProcessing && { backgroundColor: colors.backgroundTertiary }
          ]}
          onPress={sendCommand}
          disabled={isProcessing}
        >
          <Ionicons name={isProcessing ? 'hourglass-outline' : 'send'} size={18} color="#FFFFFF" />
          <Text style={styles.sendButtonText}>
            {isProcessing ? 'Sending...' : 'Send Command'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Commands */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Commands</Text>
        {quickCommands.map((cmd, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.quickCommand, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setCommand(cmd)}
          >
            <Text style={[styles.quickCommandText, { color: colors.text }]}>{cmd}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Command History */}
      {commandHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Commands</Text>
          {commandHistory.slice(0, 5).map((item, index) => (
            <View key={index} style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.historyContent}>
                <Text style={[styles.historyCommand, { color: colors.text }]}>{item.command}</Text>
                <Text style={[styles.historyTime, { color: colors.textTertiary }]}>{item.timestamp}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="checkmark" size={14} color={colors.success} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Instructions */}
      <View style={[styles.instructionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.instructionsHeader}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={[styles.instructionsTitle, { color: colors.text }]}>How It Works</Text>
        </View>
        <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
          1. Type your command above or select a quick command{'\n'}
          2. Tap "Send Command"{'\n'}
          3. Claude Code will execute the change{'\n'}
          4. Your app will reload in 1-2 seconds{'\n\n'}
          You can also use voice by saying "Claude, [your command]" on the home screen!
        </Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerIcon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickCommand: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  quickCommandText: {
    fontSize: 14,
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  historyContent: {
    flex: 1,
  },
  historyCommand: {
    fontSize: 14,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 60,
  },
});
