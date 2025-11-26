import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import api from '../utils/api';

export interface UIAction {
  type: 'show_list' | 'confirm_sms' | 'confirm_email' | 'confirm_appointment' | 'confirm_memory' | 'error';
  listType?: 'leads' | 'contacts' | 'appointments';
  data: any;
}

interface AIOrbButtonProps {
  onPress: () => void;
  onUIAction?: (action: UIAction) => void;
}

const AIOrbButton = forwardRef(({ onPress, onUIAction }: AIOrbButtonProps, ref) => {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isRecordingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isPlayingAudioRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const meteringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSoundTimeRef = useRef<number>(Date.now());

  // Core animations
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Outer rings - using single animated value per ring for efficiency
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const ring4 = useRef(new Animated.Value(0)).current;
  const ring5 = useRef(new Animated.Value(0)).current;

  // Inner white rings
  const innerRing1 = useRef(new Animated.Value(0)).current;
  const innerRing2 = useRef(new Animated.Value(0)).current;
  const innerRing3 = useRef(new Animated.Value(0)).current;

  // Animation refs to stop them
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);

  // Initialize audio session on mount
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Request permissions
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Audio permissions not granted');
          return;
        }

        // Set initial audio mode for playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };

    initAudio();
  }, []);

  useEffect(() => {
    // Idle breathing animation
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.06,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    breathing.start();

    return () => {
      breathing.stop();
      stopAllRingAnimations();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (recordingRef.current && isRecordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (meteringIntervalRef.current) clearInterval(meteringIntervalRef.current);
    };
  }, []);

  const stopAllRingAnimations = () => {
    animationsRef.current.forEach(anim => anim.stop());
    animationsRef.current = [];
    [ring1, ring2, ring3, ring4, ring5, innerRing1, innerRing2, innerRing3].forEach(r => r.setValue(0));
  };

  const createRingWave = (ringAnim: Animated.Value, delay: number, duration: number) => {
    return Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
  };

  const startRecordingAnimations = () => {
    stopAllRingAnimations();

    // Pulse animation for center orb
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ])
    );

    // Outer rings - staggered expansion
    const outerAnims = [
      createRingWave(ring1, 0, 800),
      createRingWave(ring2, 160, 800),
      createRingWave(ring3, 320, 800),
      createRingWave(ring4, 480, 800),
      createRingWave(ring5, 640, 800),
    ];

    // Inner white rings - faster
    const innerAnims = [
      createRingWave(innerRing1, 0, 500),
      createRingWave(innerRing2, 170, 500),
      createRingWave(innerRing3, 340, 500),
    ];

    animationsRef.current = [pulse, ...outerAnims, ...innerAnims];
    animationsRef.current.forEach(anim => anim.start());
  };

  const startProcessingAnimations = () => {
    stopAllRingAnimations();

    // Slower pulse for processing
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );

    // Outer rings - slower for processing
    const outerAnims = [
      createRingWave(ring1, 0, 1200),
      createRingWave(ring2, 300, 1200),
      createRingWave(ring3, 600, 1200),
      createRingWave(ring4, 900, 1200),
    ];

    // Inner rings - medium speed
    const innerAnims = [
      createRingWave(innerRing1, 0, 700),
      createRingWave(innerRing2, 230, 700),
      createRingWave(innerRing3, 460, 700),
    ];

    animationsRef.current = [pulse, ...outerAnims, ...innerAnims];
    animationsRef.current.forEach(anim => anim.start());
  };

  // Handle state changes
  useEffect(() => {
    if (isRecording) {
      startRecordingAnimations();
    } else if (isListening) {
      startProcessingAnimations();
    } else {
      stopAllRingAnimations();
      pulseAnim.setValue(1);
    }
  }, [isRecording, isListening]);

  // Expose handlePress method to parent via ref
  useImperativeHandle(ref, () => ({
    handlePress: async () => {
      await handlePress();
    }
  }));

  const playAudioResponse = async (audioBase64: string) => {
    try {
      if (isPlayingAudioRef.current) {
        console.warn('Audio already playing, skipping');
        return;
      }

      isPlayingAudioRef.current = true;

      // Stop any existing sound first
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.warn('Failed to unload previous sound:', e);
        }
        soundRef.current = null;
      }

      // Configure audio session for playback - this activates the session
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
          shouldDuckAndroid: true,
        });
      } catch (e) {
        console.warn('Audio mode setup failed:', e);
      }

      // Small delay to ensure audio session is activated
      await new Promise(resolve => setTimeout(resolve, 100));

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mpeg;base64,${audioBase64}` },
        {
          shouldPlay: false,
          volume: 1.0,
        }
      );

      soundRef.current = newSound;

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish && !status.isLooping) {
          isPlayingAudioRef.current = false;
          try {
            soundRef.current?.setOnPlaybackStatusUpdate(null);
          } catch (e) {}

          setTimeout(() => {
            if (isListeningRef.current) {
              startRecording().catch(err => {
                console.error('Failed to start next recording:', err);
                setIsListening(false);
                isListeningRef.current = false;
              });
            }
          }, 100);
        }
      });

      // Ensure sound is loaded before playing
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        await newSound.playAsync();
      } else {
        console.error('Sound not loaded properly');
        isPlayingAudioRef.current = false;
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      isPlayingAudioRef.current = false;
      if (isListening) {
        setTimeout(() => {
          startRecording().catch(err => {
            setIsListening(false);
            isListeningRef.current = false;
          });
        }, 500);
      }
    }
  };

  const startVoiceActivityDetection = () => {
    const recordingStartTime = Date.now();
    let soundLevelHistory: number[] = [];
    let hasSpeechStarted = false;
    let peakLevel = -100; // Track peak audio level

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    lastSoundTimeRef.current = Date.now();

    // FASTER polling - 100ms instead of 200ms
    meteringIntervalRef.current = setInterval(async () => {
      if (!recordingRef.current || !isRecordingRef.current) {
        if (meteringIntervalRef.current) {
          clearInterval(meteringIntervalRef.current);
          meteringIntervalRef.current = null;
        }
        return;
      }

      try {
        const status = await recordingRef.current.getStatusAsync();
        const totalRecordingTime = Date.now() - recordingStartTime;

        // REDUCED minimum recording time - 500ms instead of 1000ms
        if (totalRecordingTime < 500) return;

        if (status.isRecording && status.metering !== undefined) {
          const currentLevel = status.metering;
          peakLevel = Math.max(peakLevel, currentLevel);

          // Smaller history for faster response
          soundLevelHistory.push(currentLevel);
          if (soundLevelHistory.length > 3) soundLevelHistory.shift();

          const avgLevel = soundLevelHistory.reduce((a, b) => a + b, 0) / soundLevelHistory.length;

          // More sensitive threshold: -40dB (was -35dB)
          if (avgLevel > -40) {
            lastSoundTimeRef.current = Date.now();
            hasSpeechStarted = true;
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          } else if (hasSpeechStarted) {
            const silenceDuration = Date.now() - lastSoundTimeRef.current;

            // MUCH FASTER silence detection:
            // - Short utterances (< 3s): 600ms silence (quick responses like "yes", "no")
            // - Medium (3-6s): 700ms silence
            // - Long (> 6s): 800ms silence
            let silenceThreshold = 600;
            if (totalRecordingTime > 6000) silenceThreshold = 800;
            else if (totalRecordingTime > 3000) silenceThreshold = 700;

            if (silenceDuration >= silenceThreshold && !timeoutRef.current) {
              console.log(`[VAD] Silence detected: ${silenceDuration}ms, peak: ${peakLevel}dB, sending...`);
              if (meteringIntervalRef.current) {
                clearInterval(meteringIntervalRef.current);
                meteringIntervalRef.current = null;
              }
              await stopRecordingAndSend();
            }
          }
        }
      } catch (error) {
        // Fallback: send after 2.5 seconds if metering fails
        const recordingDuration = Date.now() - recordingStartTime;
        if (recordingDuration >= 2500 && !timeoutRef.current) {
          if (meteringIntervalRef.current) {
            clearInterval(meteringIntervalRef.current);
            meteringIntervalRef.current = null;
          }
          await stopRecordingAndSend();
        }
      }
    }, 100); // FASTER: 100ms polling
  };

  const startRecording = async () => {
    try {
      if (isRecordingRef.current) return;

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setIsListening(false);
        isListeningRef.current = false;
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Use LOW_QUALITY for faster encoding - speech doesn't need high quality
      const { recording: newRecording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          sampleRate: 16000, // 16kHz is sufficient for speech
          bitRate: 64000,    // Lower bitrate for faster upload
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          sampleRate: 16000,
          bitRate: 64000,
        },
      });

      recordingRef.current = newRecording;
      isRecordingRef.current = true;
      setIsRecording(true);

      startVoiceActivityDetection();
    } catch (error) {
      console.error('Error starting recording:', error);
      isRecordingRef.current = false;
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const stopRecordingAndSend = async () => {
    try {
      if (!recordingRef.current || !isRecordingRef.current) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const currentRecording = recordingRef.current;
      isRecordingRef.current = false;
      recordingRef.current = null;
      setIsRecording(false);

      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();

      if (!uri) {
        setIsListening(false);
        isListeningRef.current = false;
        return;
      }

      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();

      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      try {
        console.log('[MOBILE] Sending audio to backend...');
        const sendStartTime = Date.now();

        const apiResponse = await api.post('/api/voice/process', {
          audioBase64: base64Audio,
          conversationHistory: conversationHistory,
        }, { timeout: 60000 });

        console.log(`[MOBILE] API response received in ${Date.now() - sendStartTime}ms`);

        if (apiResponse.data.success) {
          setConversationHistory(apiResponse.data.conversationHistory);

          // Handle UI action if present (lists, confirmations, drafts)
          if (apiResponse.data.uiAction && onUIAction) {
            console.log('[MOBILE] UI Action received:', apiResponse.data.uiAction.type);
            onUIAction(apiResponse.data.uiAction);
          }

          if (apiResponse.data.audioBase64) {
            await playAudioResponse(apiResponse.data.audioBase64);
          } else if (apiResponse.data.isDevCommand) {
            setIsListening(false);
            isListeningRef.current = false;
          } else {
            if (isListeningRef.current) {
              setTimeout(() => {
                startRecording().catch(() => {
                  setIsListening(false);
                  isListeningRef.current = false;
                });
              }, 500);
            }
          }
        }
      } catch (error: any) {
        console.error('[MOBILE] Error sending to AI:', error?.message || error);
        if (error?.code === 'ECONNABORTED') {
          console.error('[MOBILE] Request timed out - backend may be slow');
        } else if (error?.response) {
          console.error('[MOBILE] Server error:', error.response.status, error.response.data);
        } else if (error?.request) {
          console.error('[MOBILE] No response from server - check network/backend');
        }
        setIsListening(false);
        isListeningRef.current = false;
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      isRecordingRef.current = false;
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const playWakeGreeting = async () => {
    try {
      // Call instant wake greeting endpoint
      const response = await api.post('/api/aria/voice-wake');

      if (response.data.success && response.data.audioResponse) {
        // Play the greeting audio
        const { sound } = await Audio.Sound.createAsync({
          uri: `data:audio/mp3;base64,${response.data.audioResponse}`,
        });

        await sound.playAsync();

        // Clean up after playing
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      }
    } catch (error) {
      console.error('Wake greeting error:', error);
      // Silently fail - user can still use the orb
    }
  };

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    if (isListening) {
      // End conversation
      if (isRecordingRef.current && recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {}
        isRecordingRef.current = false;
        recordingRef.current = null;
      }

      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {}
        soundRef.current = null;
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (meteringIntervalRef.current) clearInterval(meteringIntervalRef.current);
      timeoutRef.current = null;
      meteringIntervalRef.current = null;

      setIsListening(false);
      isListeningRef.current = false;
      setIsRecording(false);
      setConversationHistory([]);
    } else {
      // Start conversation with instant greeting
      setIsListening(true);
      isListeningRef.current = true;

      // Play instant wake greeting (non-blocking)
      playWakeGreeting();

      // Start recording in parallel
      await startRecording();
    }
    onPress();
  };

  // Colors based on state
  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (isRecording) return ['#10B981', '#059669', '#047857', '#065F46'] as const; // Green
    if (isListening) return ['#F59E0B', '#D97706', '#B45309', '#92400E'] as const; // Amber
    return ['#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6'] as const; // Purple
  };

  const getRingColor = () => {
    if (isRecording) return '#10B981';
    if (isListening) return '#F59E0B';
    return '#8B5CF6';
  };

  // Interpolations for ring animations (scale and opacity from single value)
  const createRingStyle = (ringAnim: Animated.Value, baseSize: number) => ({
    transform: [{
      scale: ringAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
      })
    }],
    opacity: ringAnim.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 0.8, 0],
    }),
  });

  const createInnerRingStyle = (ringAnim: Animated.Value) => ({
    transform: [{
      scale: ringAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.1, 1],
      })
    }],
    opacity: ringAnim.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [0, 0.9, 0],
    }),
  });

  return (
    <View style={styles.container}>
      {/* Outer expanding rings */}
      <Animated.View style={[styles.ring, styles.ring5, { borderColor: getRingColor() }, createRingStyle(ring5, 200)]} />
      <Animated.View style={[styles.ring, styles.ring4, { borderColor: getRingColor() }, createRingStyle(ring4, 165)]} />
      <Animated.View style={[styles.ring, styles.ring3, { borderColor: getRingColor() }, createRingStyle(ring3, 130)]} />
      <Animated.View style={[styles.ring, styles.ring2, { borderColor: getRingColor() }, createRingStyle(ring2, 100)]} />
      <Animated.View style={[styles.ring, styles.ring1, { borderColor: getRingColor() }, createRingStyle(ring1, 75)]} />

      {/* Static base ring when idle */}
      {!isListening && !isRecording && (
        <Animated.View
          style={[
            styles.baseRing,
            {
              transform: [{ scale: breatheAnim }],
              borderColor: getRingColor(),
              opacity: 0.4,
            },
          ]}
        />
      )}

      <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
        {/* Center orb */}
        <Animated.View
          style={[
            styles.centerOrb,
            {
              transform: [{ scale: isRecording || isListening ? pulseAnim : breatheAnim }],
              shadowColor: getRingColor(),
            },
          ]}
        >
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.centerOrbGradient}
          >
            {/* Inner white voice rings */}
            <Animated.View style={[styles.innerRing, styles.innerRing3, createInnerRingStyle(innerRing3)]} />
            <Animated.View style={[styles.innerRing, styles.innerRing2, createInnerRingStyle(innerRing2)]} />
            <Animated.View style={[styles.innerRing, styles.innerRing1, createInnerRingStyle(innerRing1)]} />

            {/* Highlight */}
            <View style={styles.orbHighlight} />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      {/* Status dots */}
      {(isListening || isRecording) && (
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getRingColor() }]} />
          <View style={[styles.statusDot, styles.statusDotCenter, { backgroundColor: getRingColor() }]} />
          <View style={[styles.statusDot, { backgroundColor: getRingColor() }]} />
        </View>
      )}
    </View>
  );
});

export default AIOrbButton;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 220,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  ring1: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
  },
  ring2: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  ring3: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  ring4: {
    width: 165,
    height: 165,
    borderRadius: 82.5,
  },
  ring5: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  baseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  centerOrb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  centerOrbGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  innerRing1: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
  },
  innerRing2: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  innerRing3: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  orbHighlight: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 16,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    transform: [{ rotate: '-20deg' }],
  },
  statusContainer: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusDotCenter: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
