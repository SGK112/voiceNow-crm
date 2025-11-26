import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
    title: 'Focus on the Job',
    subtitle: 'Let AI handle your calls while you work on site',
  },
  {
    image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
    title: 'Never Miss a Lead',
    subtitle: '24/7 response - even when you\'re on a ladder',
  },
  {
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1200&q=80',
    title: 'Book More Jobs',
    subtitle: 'Qualify leads instantly, follow up automatically',
  },
];

export default function WelcomeScreen({ navigation }: any) {
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnims = useRef(slides.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;

  // Initial content animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentSlide, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Crossfade background images
  useEffect(() => {
    fadeAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: index === activeIndex ? 1 : 0,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    });
  }, [activeIndex]);

  return (
    <View style={styles.container}>
      {/* Background Images with Crossfade */}
      {slides.map((slide, index) => (
        <Animated.View
          key={index}
          style={[
            styles.backgroundContainer,
            { opacity: fadeAnims[index], zIndex: index === activeIndex ? 1 : 0 },
          ]}
        >
          <Image
            source={{ uri: slide.image }}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        </Animated.View>
      ))}

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: contentFade, transform: [{ translateY: contentSlide }] },
        ]}
      >
        {/* Logo */}
        <View style={styles.topSection}>
          <View style={styles.logoRow}>
            <Ionicons name="radio" size={24} color="#FFFFFF" />
            <Text style={styles.logoText}>VoiceFlow</Text>
          </View>
        </View>

        {/* Dynamic Text */}
        <View style={styles.middleSection}>
          <Text style={styles.mainTitle}>{slides[activeIndex].title}</Text>
          <Text style={styles.subtitle}>{slides[activeIndex].subtitle}</Text>

          {/* Minimal Dots */}
          <View style={styles.dotsContainer}>
            {slides.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setActiveIndex(index)}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <View
                  style={[
                    styles.dot,
                    index === activeIndex && styles.dotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms & Privacy Policy
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: width,
    height: height,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  content: {
    flex: 1,
    zIndex: 3,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    justifyContent: 'space-between',
  },
  topSection: {
    paddingHorizontal: 24,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
    lineHeight: 24,
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  bottomSection: {
    paddingHorizontal: 24,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    gap: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 18,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
});
