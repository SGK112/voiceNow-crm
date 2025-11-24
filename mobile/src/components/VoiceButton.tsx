import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

export default function VoiceButton() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const handleVoicePress = async () => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
      stopPulse();

      // For now, simulate AI response
      setIsProcessing(true);
      setTimeout(() => {
        speakResponse("I'm your AI assistant. How can I help you today?");
        setIsProcessing(false);
      }, 1000);
    } else {
      // Start listening
      setIsListening(true);
      startPulse();

      // Request microphone permissions
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('Microphone permission is required for voice chat');
          setIsListening(false);
          stopPulse();
          return;
        }

        // Configure audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        // In a production app, you would start recording here
        console.log('Voice recording started...');
      } catch (error) {
        console.error('Error starting voice:', error);
        setIsListening(false);
        stopPulse();
      }
    }
  };

  const speakResponse = (text: string) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleVoicePress}
        style={styles.buttonContainer}
      >
        <Animated.View
          style={[
            styles.button,
            isListening && styles.buttonListening,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Ionicons
            name={isListening ? 'stop-circle' : 'mic'}
            size={32}
            color="#ffffff"
          />
        </Animated.View>
      </TouchableOpacity>

      {isListening && (
        <View style={styles.statusContainer}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Listening...</Text>
        </View>
      )}

      {isProcessing && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Processing...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    alignItems: 'center',
  },
  buttonContainer: {
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1e40af',
  },
  buttonListening: {
    backgroundColor: '#ef4444',
    borderColor: '#991b1b',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
