import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import twilioService, { CallState } from '../services/TwilioService';

interface CallScreenProps {
  route: {
    params: {
      mode: 'outgoing' | 'incoming';
      phoneNumber: string;
      contactName?: string;
      contactId?: string;
      callSid?: string;
    };
  };
  navigation: any;
}

export default function CallScreen({ route, navigation }: CallScreenProps) {
  const { colors } = useTheme();
  const { mode, phoneNumber, contactName, contactId, callSid } = route.params;

  const [callState, setCallState] = useState<CallState>({
    status: mode === 'incoming' ? 'ringing' : 'connecting',
    direction: mode,
    to: mode === 'outgoing' ? phoneNumber : undefined,
    from: mode === 'incoming' ? phoneNumber : undefined,
    callSid,
  });
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isKeypadVisible, setIsKeypadVisible] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to call state changes
  useEffect(() => {
    const unsubscribe = twilioService.addCallStateListener((state) => {
      setCallState(state);

      // Auto close screen when call ends
      if (state.status === 'disconnected' || state.status === 'idle') {
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Start call if outgoing
  useEffect(() => {
    if (mode === 'outgoing') {
      twilioService.makeCall(phoneNumber, contactId, contactName);
    }
  }, []);

  // Pulse animation for ringing state
  useEffect(() => {
    if (callState.status === 'ringing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Vibrate for incoming calls
      if (mode === 'incoming' && Platform.OS !== 'web') {
        const vibratePattern = [1000, 2000];
        const vibrateInterval = setInterval(() => {
          Vibration.vibrate(vibratePattern);
        }, 3000);
        return () => clearInterval(vibrateInterval);
      }

      return () => pulse.stop();
    }
  }, [callState.status, mode, pulseAnim]);

  // Duration timer
  useEffect(() => {
    if (callState.status === 'connected') {
      durationInterval.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [callState.status]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    await twilioService.endCall(callState.callSid);
  };

  const handleAnswerCall = async () => {
    if (callState.callSid) {
      await twilioService.answerCall(callState.callSid);
    }
  };

  const handleRejectCall = async () => {
    if (callState.callSid) {
      await twilioService.rejectCall(callState.callSid);
    }
    navigation.goBack();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual mute functionality with Twilio Voice SDK
  };

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
    // TODO: Implement actual speaker toggle with Twilio Voice SDK
  };

  const getStatusText = (): string => {
    switch (callState.status) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return mode === 'incoming' ? 'Incoming call...' : 'Ringing...';
      case 'connected':
        return formatDuration(duration);
      case 'disconnected':
        return 'Call ended';
      default:
        return '';
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['*', '0', '#'],
    ];

    return (
      <View style={styles.keypadContainer}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.keypadKey, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => {
                  // TODO: Send DTMF tones
                  console.log('DTMF:', key);
                }}
              >
                <Text style={[styles.keypadKeyText, { color: colors.text }]}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Call Info Section */}
      <View style={styles.callInfo}>
        <Animated.View
          style={[
            styles.avatarContainer,
            {
              transform: [{ scale: callState.status === 'ringing' ? pulseAnim : 1 }],
            },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {contactName ? getInitials(contactName) : '?'}
            </Text>
          </View>
          {callState.status === 'ringing' && (
            <View style={[styles.pulseRing, { borderColor: colors.primary }]} />
          )}
        </Animated.View>

        <Text style={[styles.callerName, { color: colors.text }]}>
          {contactName || twilioService.formatPhoneNumber(phoneNumber)}
        </Text>

        {contactName && (
          <Text style={[styles.callerPhone, { color: colors.textSecondary }]}>
            {twilioService.formatPhoneNumber(phoneNumber)}
          </Text>
        )}

        <Text style={[styles.callStatus, { color: colors.textTertiary }]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Controls Section */}
      {isKeypadVisible ? (
        renderKeypad()
      ) : (
        <View style={styles.controlsContainer}>
          {callState.status === 'connected' && (
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  { backgroundColor: isMuted ? colors.error : colors.backgroundSecondary },
                ]}
                onPress={toggleMute}
              >
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={28}
                  color={isMuted ? '#fff' : colors.text}
                />
                <Text style={[styles.controlLabel, { color: isMuted ? '#fff' : colors.textSecondary }]}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.controlButton,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
                onPress={() => setIsKeypadVisible(true)}
              >
                <Ionicons name="keypad" size={28} color={colors.text} />
                <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>Keypad</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.controlButton,
                  { backgroundColor: isSpeaker ? colors.primary : colors.backgroundSecondary },
                ]}
                onPress={toggleSpeaker}
              >
                <Ionicons
                  name={isSpeaker ? 'volume-high' : 'volume-medium'}
                  size={28}
                  color={isSpeaker ? '#fff' : colors.text}
                />
                <Text style={[styles.controlLabel, { color: isSpeaker ? '#fff' : colors.textSecondary }]}>
                  Speaker
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {callState.status === 'ringing' && mode === 'incoming' ? (
          <View style={styles.incomingActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleRejectCall}
            >
              <Ionicons name="close" size={36} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.answerButton]}
              onPress={handleAnswerCall}
            >
              <Ionicons name="call" size={36} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.outgoingActions}>
            {isKeypadVisible && (
              <TouchableOpacity
                style={[styles.hideKeypadButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setIsKeypadVisible(false)}
              >
                <Text style={[styles.hideKeypadText, { color: colors.text }]}>Hide</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.endCallButton]}
              onPress={handleEndCall}
            >
              <Ionicons name="call" size={36} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 40,
  },
  callInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    top: -10,
    left: -10,
    opacity: 0.3,
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  callerPhone: {
    fontSize: 18,
    marginBottom: 16,
  },
  callStatus: {
    fontSize: 16,
  },
  controlsContainer: {
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  keypadContainer: {
    paddingHorizontal: 60,
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  keypadKey: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadKeyText: {
    fontSize: 28,
    fontWeight: '500',
  },
  actionContainer: {
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  outgoingActions: {
    alignItems: 'center',
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  endCallButton: {
    backgroundColor: '#ef4444',
  },
  hideKeypadButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
  },
  hideKeypadText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
