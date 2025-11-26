import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function DotGridBackground() {
  const { colors, isDark } = useTheme();

  // Create dot grid pattern
  const dotSize = 1.5;
  const spacing = 20;
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);

  const dots = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      dots.push(
        <View
          key={`${row}-${col}`}
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.12)',
              top: row * spacing,
              left: col * spacing,
            },
          ]}
        />
      );
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
      {dots}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    borderRadius: 999,
  },
});
