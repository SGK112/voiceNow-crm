/**
 * AppSettingsService - Voice-controlled app settings
 * Allows ARIA to control app settings like dark mode, brightness, etc.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules, Appearance } from 'react-native';
// expo-brightness removed - not installed, causes crash
import * as Haptics from 'expo-haptics';
import { DeviceEventEmitter } from 'react-native';

// Settings keys
const SETTINGS_KEYS = {
  THEME: 'app_theme',
  BRIGHTNESS: 'app_brightness',
  HAPTIC_FEEDBACK: 'app_haptic_feedback',
  NOTIFICATIONS_ENABLED: 'app_notifications_enabled',
  VOICE_ACTIVATION: 'app_voice_activation',
  AUTO_BRIGHTNESS: 'app_auto_brightness',
  SCREEN_TIMEOUT: 'app_screen_timeout',
  FONT_SIZE: 'app_font_size',
  REDUCE_MOTION: 'app_reduce_motion',
};

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  brightness: number; // 0-1
  hapticFeedback: boolean;
  notificationsEnabled: boolean;
  voiceActivation: boolean;
  autoBrightness: boolean;
  screenTimeout: number; // seconds
  fontSize: 'small' | 'medium' | 'large';
  reduceMotion: boolean;
}

// Event emitter for settings changes
export type SettingsChangeCallback = (setting: keyof AppSettings, value: any) => void;
const settingsListeners: SettingsChangeCallback[] = [];

class AppSettingsService {
  private settings: AppSettings = {
    theme: 'light',
    brightness: 0.8,
    hapticFeedback: true,
    notificationsEnabled: true,
    voiceActivation: true,
    autoBrightness: true,
    screenTimeout: 60,
    fontSize: 'medium',
    reduceMotion: false,
  };

  constructor() {
    this.loadSettings();
  }

  // Load settings from AsyncStorage
  async loadSettings(): Promise<AppSettings> {
    try {
      const [
        theme,
        brightness,
        hapticFeedback,
        notificationsEnabled,
        voiceActivation,
        autoBrightness,
        screenTimeout,
        fontSize,
        reduceMotion,
      ] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEYS.THEME),
        AsyncStorage.getItem(SETTINGS_KEYS.BRIGHTNESS),
        AsyncStorage.getItem(SETTINGS_KEYS.HAPTIC_FEEDBACK),
        AsyncStorage.getItem(SETTINGS_KEYS.NOTIFICATIONS_ENABLED),
        AsyncStorage.getItem(SETTINGS_KEYS.VOICE_ACTIVATION),
        AsyncStorage.getItem(SETTINGS_KEYS.AUTO_BRIGHTNESS),
        AsyncStorage.getItem(SETTINGS_KEYS.SCREEN_TIMEOUT),
        AsyncStorage.getItem(SETTINGS_KEYS.FONT_SIZE),
        AsyncStorage.getItem(SETTINGS_KEYS.REDUCE_MOTION),
      ]);

      this.settings = {
        theme: (theme as AppSettings['theme']) || 'light',
        brightness: brightness ? parseFloat(brightness) : 0.8,
        hapticFeedback: hapticFeedback !== 'false',
        notificationsEnabled: notificationsEnabled !== 'false',
        voiceActivation: voiceActivation !== 'false',
        autoBrightness: autoBrightness !== 'false',
        screenTimeout: screenTimeout ? parseInt(screenTimeout) : 60,
        fontSize: (fontSize as AppSettings['fontSize']) || 'medium',
        reduceMotion: reduceMotion === 'true',
      };

      return this.settings;
    } catch (error) {
      console.error('[AppSettings] Error loading settings:', error);
      return this.settings;
    }
  }

  // Get current settings
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  // Get a specific setting
  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  // Update a setting
  async setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    this.settings[key] = value;
    await this.saveSetting(key, value);
    this.notifyListeners(key, value);
    await this.applySetting(key, value);
  }

  // Save a setting to AsyncStorage
  private async saveSetting(key: keyof AppSettings, value: any): Promise<void> {
    try {
      const storageKey = SETTINGS_KEYS[key.toUpperCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '') as keyof typeof SETTINGS_KEYS];
      if (storageKey) {
        await AsyncStorage.setItem(storageKey, String(value));
      }
    } catch (error) {
      console.error(`[AppSettings] Error saving ${key}:`, error);
    }
  }

  // Apply a setting (trigger side effects)
  private async applySetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    try {
      switch (key) {
        case 'theme':
          DeviceEventEmitter.emit('themeChange', value);
          break;
        case 'brightness':
          // Brightness control disabled - expo-brightness not installed
          console.log('Brightness control not available');
          break;
        case 'hapticFeedback':
          if (value) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          break;
        // Add more setting applications as needed
      }
    } catch (error) {
      console.error(`[AppSettings] Error applying ${key}:`, error);
    }
  }

  // Notify listeners of setting changes
  private notifyListeners(setting: keyof AppSettings, value: any): void {
    settingsListeners.forEach(callback => callback(setting, value));
  }

  // Subscribe to settings changes
  addListener(callback: SettingsChangeCallback): () => void {
    settingsListeners.push(callback);
    return () => {
      const index = settingsListeners.indexOf(callback);
      if (index > -1) {
        settingsListeners.splice(index, 1);
      }
    };
  }

  // ==========================================
  // Voice Command Handlers for ARIA
  // ==========================================

  /**
   * Toggle dark mode on/off
   * Voice: "Turn on dark mode" / "Turn off dark mode" / "Enable dark mode" / "Disable dark mode"
   */
  async setDarkMode(enabled: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const newTheme = enabled ? 'dark' : 'light';
      await this.setSetting('theme', newTheme);
      return {
        success: true,
        message: enabled ? 'Dark mode is now on. Your eyes will thank you.' : 'Dark mode is off. Back to the light side.',
      };
    } catch (error) {
      return { success: false, message: 'Failed to change theme settings.' };
    }
  }

  /**
   * Set screen brightness
   * Voice: "Turn up brightness" / "Dim the screen" / "Set brightness to 50%"
   */
  async setBrightness(level: number | 'up' | 'down' | 'max' | 'min'): Promise<{ success: boolean; message: string }> {
    try {
      let newBrightness: number;

      if (typeof level === 'number') {
        newBrightness = Math.max(0.1, Math.min(1, level));
      } else {
        const current = this.settings.brightness;
        switch (level) {
          case 'up':
            newBrightness = Math.min(1, current + 0.2);
            break;
          case 'down':
            newBrightness = Math.max(0.1, current - 0.2);
            break;
          case 'max':
            newBrightness = 1;
            break;
          case 'min':
            newBrightness = 0.1;
            break;
          default:
            newBrightness = current;
        }
      }

      // Disable auto brightness when manually setting
      await this.setSetting('autoBrightness', false);
      await this.setSetting('brightness', newBrightness);
      // Brightness.setBrightnessAsync removed - expo-brightness not installed

      const percent = Math.round(newBrightness * 100);
      return {
        success: true,
        message: `Brightness setting saved (${percent}%). Note: System brightness control not available.`,
      };
    } catch (error) {
      return { success: false, message: 'Failed to adjust brightness. Need brightness permissions.' };
    }
  }

  /**
   * Toggle haptic feedback
   * Voice: "Turn off vibrations" / "Enable haptic feedback"
   */
  async setHapticFeedback(enabled: boolean): Promise<{ success: boolean; message: string }> {
    try {
      await this.setSetting('hapticFeedback', enabled);
      return {
        success: true,
        message: enabled ? 'Haptic feedback is on. You\'ll feel the vibes.' : 'Haptic feedback is off. Silent mode.',
      };
    } catch (error) {
      return { success: false, message: 'Failed to change haptic settings.' };
    }
  }

  /**
   * Toggle notifications
   * Voice: "Turn off notifications" / "Enable notifications"
   */
  async setNotifications(enabled: boolean): Promise<{ success: boolean; message: string }> {
    try {
      await this.setSetting('notificationsEnabled', enabled);
      return {
        success: true,
        message: enabled ? 'Notifications are back on.' : 'Notifications muted. Peace and quiet.',
      };
    } catch (error) {
      return { success: false, message: 'Failed to change notification settings.' };
    }
  }

  /**
   * Toggle voice activation
   * Voice: "Turn off voice activation" / "Enable always listening"
   */
  async setVoiceActivation(enabled: boolean): Promise<{ success: boolean; message: string }> {
    try {
      await this.setSetting('voiceActivation', enabled);
      return {
        success: true,
        message: enabled ? 'Voice activation is on. Just say my name.' : 'Voice activation is off. Tap to talk.',
      };
    } catch (error) {
      return { success: false, message: 'Failed to change voice activation settings.' };
    }
  }

  /**
   * Set font size
   * Voice: "Make text bigger" / "Smaller font" / "Large text"
   */
  async setFontSize(size: 'small' | 'medium' | 'large' | 'bigger' | 'smaller'): Promise<{ success: boolean; message: string }> {
    try {
      let newSize: AppSettings['fontSize'];

      if (size === 'bigger') {
        newSize = this.settings.fontSize === 'small' ? 'medium' : 'large';
      } else if (size === 'smaller') {
        newSize = this.settings.fontSize === 'large' ? 'medium' : 'small';
      } else if (size === 'small' || size === 'medium' || size === 'large') {
        newSize = size;
      } else {
        newSize = 'medium';
      }

      await this.setSetting('fontSize', newSize);
      return {
        success: true,
        message: `Font size set to ${newSize}.`,
      };
    } catch (error) {
      return { success: false, message: 'Failed to change font size.' };
    }
  }

  /**
   * Toggle reduce motion
   * Voice: "Reduce animations" / "Enable animations"
   */
  async setReduceMotion(enabled: boolean): Promise<{ success: boolean; message: string }> {
    try {
      await this.setSetting('reduceMotion', enabled);
      return {
        success: true,
        message: enabled ? 'Animations reduced. Keeping it simple.' : 'Full animations are back.',
      };
    } catch (error) {
      return { success: false, message: 'Failed to change motion settings.' };
    }
  }

  /**
   * Get current settings summary (for ARIA to report)
   */
  getSettingsSummary(): string {
    const s = this.settings;
    return `Current settings: Theme is ${s.theme}, brightness at ${Math.round(s.brightness * 100)}%, ` +
           `haptic feedback ${s.hapticFeedback ? 'on' : 'off'}, ` +
           `notifications ${s.notificationsEnabled ? 'enabled' : 'muted'}, ` +
           `font size ${s.fontSize}.`;
  }

  /**
   * Process a voice command for settings
   * Returns action result or null if not a settings command
   */
  async processVoiceCommand(command: string): Promise<{ success: boolean; message: string } | null> {
    const cmd = command.toLowerCase();

    // Dark mode commands
    if (cmd.includes('dark mode') || cmd.includes('darkmode')) {
      if (cmd.includes('on') || cmd.includes('enable') || cmd.includes('turn on') || cmd.includes('switch to dark')) {
        return this.setDarkMode(true);
      } else if (cmd.includes('off') || cmd.includes('disable') || cmd.includes('turn off')) {
        return this.setDarkMode(false);
      } else if (cmd.includes('toggle')) {
        return this.setDarkMode(this.settings.theme !== 'dark');
      }
    }

    // Light mode commands
    if (cmd.includes('light mode') || cmd.includes('lightmode')) {
      return this.setDarkMode(false);
    }

    // Brightness commands
    if (cmd.includes('brightness') || cmd.includes('screen light') || cmd.includes('dim')) {
      if (cmd.includes('up') || cmd.includes('brighter') || cmd.includes('increase')) {
        return this.setBrightness('up');
      } else if (cmd.includes('down') || cmd.includes('dimmer') || cmd.includes('decrease') || cmd.includes('dim')) {
        return this.setBrightness('down');
      } else if (cmd.includes('max') || cmd.includes('full') || cmd.includes('100')) {
        return this.setBrightness('max');
      } else if (cmd.includes('min') || cmd.includes('low')) {
        return this.setBrightness('min');
      } else {
        // Try to extract percentage
        const percentMatch = cmd.match(/(\d+)\s*%?/);
        if (percentMatch) {
          const percent = parseInt(percentMatch[1]);
          return this.setBrightness(percent / 100);
        }
      }
    }

    // "Turn the lights off/on" commands (screen brightness)
    if ((cmd.includes('light') || cmd.includes('lights')) && !cmd.includes('mode')) {
      if (cmd.includes('off') || cmd.includes('down')) {
        return this.setBrightness('min');
      } else if (cmd.includes('on') || cmd.includes('up')) {
        return this.setBrightness('max');
      }
    }

    // Haptic/vibration commands
    if (cmd.includes('haptic') || cmd.includes('vibrat')) {
      if (cmd.includes('off') || cmd.includes('disable')) {
        return this.setHapticFeedback(false);
      } else if (cmd.includes('on') || cmd.includes('enable')) {
        return this.setHapticFeedback(true);
      }
    }

    // Notification commands
    if (cmd.includes('notification')) {
      if (cmd.includes('off') || cmd.includes('mute') || cmd.includes('disable') || cmd.includes('silent')) {
        return this.setNotifications(false);
      } else if (cmd.includes('on') || cmd.includes('enable') || cmd.includes('unmute')) {
        return this.setNotifications(true);
      }
    }

    // Voice activation commands
    if (cmd.includes('voice') && cmd.includes('activation')) {
      if (cmd.includes('off') || cmd.includes('disable')) {
        return this.setVoiceActivation(false);
      } else if (cmd.includes('on') || cmd.includes('enable')) {
        return this.setVoiceActivation(true);
      }
    }

    // Font size commands
    if (cmd.includes('font') || cmd.includes('text size')) {
      if (cmd.includes('bigger') || cmd.includes('larger') || cmd.includes('increase')) {
        return this.setFontSize('bigger');
      } else if (cmd.includes('smaller') || cmd.includes('decrease')) {
        return this.setFontSize('smaller');
      } else if (cmd.includes('large') || cmd.includes('big')) {
        return this.setFontSize('large');
      } else if (cmd.includes('small')) {
        return this.setFontSize('small');
      } else if (cmd.includes('normal') || cmd.includes('medium') || cmd.includes('default')) {
        return this.setFontSize('medium');
      }
    }

    // Animation/motion commands
    if (cmd.includes('animation') || cmd.includes('motion')) {
      if (cmd.includes('reduce') || cmd.includes('off') || cmd.includes('disable')) {
        return this.setReduceMotion(true);
      } else if (cmd.includes('enable') || cmd.includes('on')) {
        return this.setReduceMotion(false);
      }
    }

    // Settings summary
    if (cmd.includes('settings') && (cmd.includes('what') || cmd.includes('show') || cmd.includes('current'))) {
      return {
        success: true,
        message: this.getSettingsSummary(),
      };
    }

    return null; // Not a settings command
  }
}

export const appSettingsService = new AppSettingsService();
export default appSettingsService;
