import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Text, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import {
  mediaDevices,
  RTCPeerConnection,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import api from '../utils/api';

export interface RealtimeUIAction {
  type: 'show_list' | 'confirm_sms' | 'confirm_email' | 'confirm_appointment' | 'confirm_lead' | 'error' | 'agent_switch' | 'conference_started';
  data: any;
}

interface RealtimeOrbButtonProps {
  onPress: () => void;
  onUIAction?: (action: RealtimeUIAction) => void;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onStateChange?: (state: 'idle' | 'listening' | 'thinking' | 'speaking') => void;
  userName?: string;
  agentId?: string; // Voice agent ID (sales, project_manager, support, estimator, aria)
  fullScreen?: boolean; // Use larger orb for immersive full-screen experience
}

const RealtimeOrbButton = forwardRef(({ onPress, onUIAction, onTranscript, onStateChange, userName, agentId = 'aria', fullScreen = false }: RealtimeOrbButtonProps, ref) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());

  // Animation refs
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);

  // Configuration from backend
  const configRef = useRef<{ instructions: string; tools: any[]; voice: string } | null>(null);
  const sessionConfigSentRef = useRef(false);

  // Initialize audio permissions on mount
  useEffect(() => {
    const initAudio = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[REALTIME] Audio permissions not granted');
        }
      } catch (error) {
        console.error('[REALTIME] Failed to initialize audio:', error);
      }
    };
    initAudio();
  }, []);

  // Idle breathing animation
  useEffect(() => {
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
      stopAllAnimations();
      cleanup();
    };
  }, []);

  // Update animations based on state
  useEffect(() => {
    if (isSessionActive) {
      startActiveAnimations();
    } else if (isConnecting) {
      startConnectingAnimations();
    } else {
      stopAllAnimations();
    }
  }, [isSessionActive, isConnecting]);

  const stopAllAnimations = () => {
    animationsRef.current.forEach(anim => anim.stop());
    animationsRef.current = [];
    [ring1, ring2, ring3].forEach(r => r.setValue(0));
    pulseAnim.setValue(1);
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

  const startConnectingAnimations = () => {
    stopAllAnimations();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    animationsRef.current = [pulse];
    pulse.start();
  };

  const startActiveAnimations = () => {
    stopAllAnimations();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );

    const rings = [
      createRingWave(ring1, 0, 1000),
      createRingWave(ring2, 333, 1000),
      createRingWave(ring3, 666, 1000),
    ];

    animationsRef.current = [pulse, ...rings];
    animationsRef.current.forEach(anim => anim.start());
  };

  const cleanup = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    InCallManager.stop();
  };

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');
      console.log('[REALTIME] Starting session...');

      // Get ephemeral token from our backend
      const tokenResponse = await api.post('/api/voice/realtime-token');
      if (!tokenResponse.data.success) {
        throw new Error('Failed to get ephemeral token');
      }
      const ephemeralKey = tokenResponse.data.client_secret.value;
      console.log('[REALTIME] Got ephemeral token');

      // Get configuration (instructions + tools) for the selected agent
      const configResponse = await api.get(`/api/voice/realtime-config?agentId=${agentId}`);
      if (configResponse.data.success) {
        configRef.current = {
          instructions: configResponse.data.instructions,
          tools: configResponse.data.tools,
          voice: configResponse.data.voice,
        };
        console.log(`[REALTIME] Got config for agent '${agentId}' with`, configResponse.data.tools.length, 'tools');
      }

      // Enable audio - use speaker for clear audio
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: true,
        staysActiveInBackground: false,
      });
      InCallManager.start({ media: 'audio' });
      InCallManager.setForceSpeakerphoneOn(true);
      InCallManager.setSpeakerphoneOn(true);

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      pc.addEventListener('connectionstatechange', () => {
        console.log('[REALTIME] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setConnectionStatus('connected');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setConnectionStatus('error');
          stopSession();
        }
      });

      pc.addEventListener('track', (event: any) => {
        console.log('[REALTIME] Got remote track');
        if (event.track) {
          remoteStreamRef.current.addTrack(event.track);
        }
      });

      // Get microphone access
      const stream = await mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      console.log('[REALTIME] Added local audio track');

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.addEventListener('open', () => {
        console.log('[REALTIME] Data channel open');
        setIsSessionActive(true);
        setIsConnecting(false);
        // Reset the session config flag - we'll send config after session.created
        sessionConfigSentRef.current = false;
      });

      dc.addEventListener('message', async (event: any) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeEvent(data);
        } catch (e) {
          console.error('[REALTIME] Failed to parse message:', e);
        }
      });

      dc.addEventListener('close', () => {
        console.log('[REALTIME] Data channel closed');
        setIsSessionActive(false);
      });

      // Create and send offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI Realtime API
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';

      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`SDP exchange failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      peerConnectionRef.current = pc;
      console.log('[REALTIME] Session started successfully');

    } catch (error: any) {
      console.warn('[REALTIME] Failed to start session:', error?.message || error);
      setConnectionStatus('error');
      setIsConnecting(false);
      cleanup();

      // Show user-friendly message
      const errorMsg = error?.message || '';
      if (errorMsg.includes('404')) {
        Alert.alert(
          'Voice Not Available',
          'Real-time voice is not available on this server. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleRealtimeEvent = async (event: any) => {
    // Don't log every event to reduce noise
    if (!event.type.includes('audio') || event.type.includes('done') || event.type.includes('speech')) {
      console.log('[REALTIME] Event:', event.type);
    }

    switch (event.type) {
      case 'session.created':
        console.log('[REALTIME] Session created');
        // Send session config AFTER session is created (avoids voice update conflicts)
        if (!sessionConfigSentRef.current && configRef.current && dataChannelRef.current?.readyState === 'open') {
          sessionConfigSentRef.current = true;
          const agentVoice = configRef.current.voice || 'shimmer';
          console.log(`[REALTIME] Configuring session with voice: ${agentVoice}`);

          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: configRef.current.instructions,
              voice: agentVoice,
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1',
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.6,           // Balanced sensitivity
                prefix_padding_ms: 300,
                silence_duration_ms: 700, // Respond after 0.7s silence
                create_response: true,
              },
              tools: configRef.current.tools,
            },
          };
          dataChannelRef.current.send(JSON.stringify(sessionConfig));
          console.log('[REALTIME] Sent session config');
        }
        onStateChange?.('listening');
        break;

      case 'session.updated':
        console.log('[REALTIME] Session updated');
        break;

      case 'input_audio_buffer.speech_started':
        // User started speaking
        console.log('[REALTIME] User started speaking');
        onStateChange?.('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        // User stopped speaking - AI is thinking
        console.log('[REALTIME] User stopped speaking');
        onStateChange?.('thinking');
        break;

      case 'response.created':
        // AI is generating response
        onStateChange?.('thinking');
        break;

      case 'response.audio.delta':
        // AI is speaking (audio is playing)
        onStateChange?.('speaking');
        break;

      case 'response.done':
        // AI finished responding - back to listening
        onStateChange?.('listening');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        const userText = event.transcript;
        console.log('[REALTIME] User said:', userText);
        setTranscript(userText);
        onTranscript?.(userText, 'user');
        break;

      case 'response.audio_transcript.done':
        // Assistant's response transcribed
        const assistantText = event.transcript;
        console.log('[REALTIME] Assistant said:', assistantText);
        setTranscript(assistantText);
        onTranscript?.(assistantText, 'assistant');
        break;

      case 'response.function_call_arguments.done':
        // Function call from assistant
        console.log('[REALTIME] Function call:', event.name, event.arguments);
        onStateChange?.('thinking');
        await handleFunctionCall(event);
        break;

      case 'error':
        console.error('[REALTIME] Error event:', event.error);
        // Handle specific error codes gracefully
        if (event.error?.code === 'cannot_update_voice') {
          // Voice changes not allowed when audio is present - this is expected during conversation
          console.log('[REALTIME] Voice update skipped (audio present) - continuing with current voice');
        }
        break;

      default:
        // Log other events for debugging
        if (event.type.includes('error')) {
          console.error('[REALTIME] Error:', event);
        }
    }
  };

  const handleFunctionCall = async (event: any) => {
    const { name: functionName, arguments: argsString, call_id } = event;

    try {
      const args = JSON.parse(argsString);
      console.log(`[REALTIME] Executing ${functionName} with args:`, args);

      // Call our backend to execute the function
      const result = await api.post('/api/voice/realtime-tool', {
        functionName,
        arguments: args,
      });

      console.log('[REALTIME] Function result:', result.data);

      // Send result back to OpenAI
      if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
        // Send function output
        const outputEvent = {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: call_id,
            output: JSON.stringify(result.data),
          },
        };
        dataChannelRef.current.send(JSON.stringify(outputEvent));

        // Trigger response
        dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }));
      }

      // Handle special actions
      if (result.data.action === 'switch_agent' && result.data.success) {
        // Update the session with new agent's instructions only
        // Note: Voice cannot be changed mid-conversation when audio is present (OpenAI limitation)
        console.log(`[REALTIME] Switching to agent: ${result.data.newAgent.name}`);

        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
          const sessionUpdate = {
            type: 'session.update',
            session: {
              // Don't include voice here - OpenAI doesn't allow voice changes when audio is present
              instructions: result.data.newAgent.instructions,
            },
          };
          dataChannelRef.current.send(JSON.stringify(sessionUpdate));
          console.log(`[REALTIME] Session updated to ${result.data.newAgent.name} (instructions only, voice changes not allowed mid-session)`);
        }

        // Notify UI about agent switch
        onUIAction?.({
          type: 'agent_switch',
          data: {
            agentId: result.data.newAgentId,
            agentName: result.data.newAgent.name,
            agentIcon: result.data.newAgent.icon,
          },
        });
        return;
      }

      // Notify UI about the action
      if (result.data.success) {
        let uiData = result.data;

        // Transform data for SMS confirmation modal
        if (functionName === 'send_sms') {
          uiData = {
            status: 'sent',
            to: args.to || args.phoneNumber,
            message: args.message || args.body,
            contactName: args.contactName,
            ...result.data
          };
        }

        // Handle conference call action
        if (result.data.action === 'conference_call') {
          onUIAction?.({
            type: 'conference_started',
            data: {
              conferenceId: result.data.conferenceId,
              participants: result.data.participants,
              message: result.data.message,
            },
          });
          return;
        }

        onUIAction?.({
          type: functionName === 'create_lead' ? 'confirm_lead' :
                functionName === 'send_sms' ? 'confirm_sms' :
                functionName === 'schedule_appointment' ? 'confirm_appointment' : 'show_list',
          data: uiData,
        });
      }

    } catch (error: any) {
      console.error('[REALTIME] Function call error:', error);

      // Send error back to OpenAI
      if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
        const errorEvent = {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: call_id,
            output: JSON.stringify({ success: false, error: error.message }),
          },
        };
        dataChannelRef.current.send(JSON.stringify(errorEvent));
        dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }));
      }
    }
  };

  const stopSession = () => {
    console.log('[REALTIME] Stopping session...');
    cleanup();
    setIsSessionActive(false);
    setIsConnecting(false);
    setConnectionStatus('idle');
    setTranscript('');
    onStateChange?.('idle');
  };

  // Commit audio buffer and trigger Aria's response (push-to-talk)
  const commitAndRespond = () => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      console.log('[REALTIME] Committing audio buffer and requesting response...');
      // Commit the audio buffer (tells OpenAI we're done speaking)
      dataChannelRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      // Request a response
      dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }));
      onStateChange?.('thinking');
    }
  };

  // Clear audio buffer (cancel what was recorded)
  const clearBuffer = () => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      console.log('[REALTIME] Clearing audio buffer...');
      dataChannelRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    handlePress: async () => {
      await handlePress();
    },
    stopSession,
    isActive: () => isSessionActive,
    commitAndRespond, // Send recorded audio to Aria
    clearBuffer,      // Clear recorded audio without sending
  }));

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    // Toggle: If active, stop. If stopped, start.
    if (isSessionActive || isConnecting) {
      stopSession();
    } else {
      await startSession();
    }
    onPress();
  };

  // Colors based on state
  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (isSessionActive) return ['#10B981', '#059669', '#047857'] as const; // Green - active
    if (isConnecting) return ['#F59E0B', '#D97706', '#B45309'] as const; // Amber - connecting
    return ['#8B5CF6', '#7C3AED', '#6D28D9'] as const; // Purple - idle
  };

  const getRingColor = () => {
    if (isSessionActive) return '#10B981';
    if (isConnecting) return '#F59E0B';
    return '#8B5CF6';
  };

  // Size multiplier for fullScreen mode
  const sizeMultiplier = fullScreen ? 2.2 : 1;

  // Dynamic sizes
  const containerSize = 220 * sizeMultiplier;
  const orbSize = 70 * sizeMultiplier;
  const ring1Size = 100 * sizeMultiplier;
  const ring2Size = 140 * sizeMultiplier;
  const ring3Size = 180 * sizeMultiplier;
  const highlightTop = 10 * sizeMultiplier;
  const highlightLeft = 12 * sizeMultiplier;
  const highlightWidth = 20 * sizeMultiplier;
  const highlightHeight = 10 * sizeMultiplier;

  const createRingStyle = (ringAnim: Animated.Value) => ({
    transform: [{
      scale: ringAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, fullScreen ? 1.8 : 1.5],
      })
    }],
    opacity: ringAnim.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, fullScreen ? 0.4 : 0.6, 0],
    }),
  });

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]}>
      {/* Expanding rings */}
      <Animated.View style={[styles.ring, { width: ring3Size, height: ring3Size, borderRadius: ring3Size / 2, borderColor: getRingColor() }, createRingStyle(ring3)]} />
      <Animated.View style={[styles.ring, { width: ring2Size, height: ring2Size, borderRadius: ring2Size / 2, borderColor: getRingColor() }, createRingStyle(ring2)]} />
      <Animated.View style={[styles.ring, { width: ring1Size, height: ring1Size, borderRadius: ring1Size / 2, borderColor: getRingColor() }, createRingStyle(ring1)]} />

      {/* Status indicator */}
      {connectionStatus === 'connected' && (
        <View style={[styles.statusBadge, fullScreen && { top: 30, paddingHorizontal: 12, paddingVertical: 4 }]}>
          <Text style={[styles.statusText, fullScreen && { fontSize: 12 }]}>LIVE</Text>
        </View>
      )}

      <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
        <Animated.View
          style={[
            styles.centerOrb,
            {
              width: orbSize,
              height: orbSize,
              borderRadius: orbSize / 2,
              transform: [{ scale: isSessionActive || isConnecting ? pulseAnim : breatheAnim }],
              shadowColor: getRingColor(),
              shadowRadius: fullScreen ? 40 : 20,
            },
          ]}
        >
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.centerOrbGradient, { width: orbSize, height: orbSize, borderRadius: orbSize / 2 }]}
          >
            <View style={[
              styles.orbHighlight,
              {
                top: highlightTop,
                left: highlightLeft,
                width: highlightWidth,
                height: highlightHeight,
                borderRadius: highlightHeight / 2,
              }
            ]} />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      {/* Transcript preview - hidden in fullScreen mode for cleaner look */}
      {!fullScreen && transcript && isSessionActive && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptText} numberOfLines={2}>
            {transcript}
          </Text>
        </View>
      )}
    </View>
  );
});

export default RealtimeOrbButton;

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
    borderRadius: 100,
  },
  ring1: {
    width: 100,
    height: 100,
  },
  ring2: {
    width: 140,
    height: 140,
  },
  ring3: {
    width: 180,
    height: 180,
  },
  centerOrb: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  centerOrbGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbHighlight: {
    position: 'absolute',
    top: 10,
    left: 12,
    width: 20,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    transform: [{ rotate: '-20deg' }],
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  transcriptContainer: {
    position: 'absolute',
    bottom: -30,
    width: 200,
    alignItems: 'center',
  },
  transcriptText: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
  },
});
