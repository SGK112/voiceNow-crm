import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const { width, height } = Dimensions.get('window');

interface DotGridBackgroundProps {
  accentColor?: string;
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export default function DotGridBackground({ accentColor = '#3B82F6', state = 'idle' }: DotGridBackgroundProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation based on state
  useEffect(() => {
    const duration = state === 'speaking' ? 600 : state === 'thinking' ? 1000 : state === 'listening' ? 800 : 3000;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [state]);

  // Memoize static dots - only create once
  const dots = useMemo(() => {
    const dotSize = 2;
    const spacing = 32; // Larger spacing = fewer dots
    const cols = Math.ceil(width / spacing);
    const rows = Math.ceil(height / spacing);
    const centerX = width / 2;
    const centerY = height / 2 - 50;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

    const dotElements = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * spacing;
        const y = row * spacing;

        // Distance from center for opacity
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDistance = distance / maxDistance;
        const opacity = 0.05 + (1 - normalizedDistance) * 0.12;

        dotElements.push(
          <View
            key={`${row}-${col}`}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                top: y,
                left: x,
                backgroundColor: accentColor,
                opacity: opacity,
              },
            ]}
          />
        );
      }
    }
    return dotElements;
  }, [accentColor]);

  // Radial glow in center
  const glowSize = width * 1.2;
  const centerX = width / 2;
  const centerY = height / 2 - 50;

  return (
    <View style={styles.container}>
      {/* Base dark background */}
      <View style={styles.darkBg} />

      {/* Animated radial glow - single animated element */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            left: centerX - glowSize / 2,
            top: centerY - glowSize / 2,
            backgroundColor: accentColor,
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.04, state === 'idle' ? 0.1 : 0.18],
            }),
            transform: [{
              scale: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1.05],
              }),
            }],
          },
        ]}
      />

      {/* Static dot grid - no animation on individual dots */}
      {dots}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  darkBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050510',
  },
  glow: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
    borderRadius: 999,
  },
});
