/**
 * App Settings Routes - Voice-controlled app settings via ARIA
 * Allows backend to send setting commands to the mobile app
 */
import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// In-memory store for pending app commands per user
// In production, use Redis or similar
const pendingCommands = new Map();

// App setting command types
const COMMAND_TYPES = {
  SET_THEME: 'SET_THEME',
  SET_BRIGHTNESS: 'SET_BRIGHTNESS',
  SET_HAPTIC: 'SET_HAPTIC',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  SET_VOICE_ACTIVATION: 'SET_VOICE_ACTIVATION',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  SET_REDUCE_MOTION: 'SET_REDUCE_MOTION',
  NAVIGATE: 'NAVIGATE',
  REFRESH_DATA: 'REFRESH_DATA',
  PLAY_SOUND: 'PLAY_SOUND',
};

/**
 * @desc    Queue a settings command for a user (called by ARIA)
 * @route   POST /api/app-settings/command
 * @access  Private
 */
router.post('/command', protect, async (req, res) => {
  try {
    const { commandType, payload, targetUserId } = req.body;
    const userId = targetUserId || req.user._id.toString();

    if (!commandType) {
      return res.status(400).json({
        success: false,
        message: 'commandType is required'
      });
    }

    // Initialize user's command queue if needed
    if (!pendingCommands.has(userId)) {
      pendingCommands.set(userId, []);
    }

    const command = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: commandType,
      payload: payload || {},
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000), // 1 minute expiry
    };

    pendingCommands.get(userId).push(command);
    console.log(`🎛️ [APP-SETTINGS] Queued ${commandType} command for user ${userId}`);

    res.json({
      success: true,
      message: 'Command queued',
      command: {
        id: command.id,
        type: command.type
      }
    });
  } catch (error) {
    console.error('Error queuing command:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue command',
      error: error.message
    });
  }
});

/**
 * @desc    Poll for pending commands (called by mobile app)
 * @route   GET /api/app-settings/poll
 * @access  Private
 */
router.get('/poll', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const commands = pendingCommands.get(userId) || [];

    // Filter out expired commands
    const now = new Date();
    const validCommands = commands.filter(cmd => cmd.expiresAt > now);

    // Clear the queue after retrieval
    pendingCommands.set(userId, []);

    res.json({
      success: true,
      commands: validCommands
    });
  } catch (error) {
    console.error('Error polling commands:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to poll commands',
      error: error.message
    });
  }
});

/**
 * @desc    Execute a settings command immediately (shortcut)
 * @route   POST /api/app-settings/execute
 * @access  Private
 *
 * This is used when the app is actively connected and we want immediate execution
 */
router.post('/execute', protect, async (req, res) => {
  try {
    const { action, value } = req.body;

    // Map action strings to commands
    const actionToCommand = {
      // Theme commands
      'dark_mode_on': { type: COMMAND_TYPES.SET_THEME, payload: { theme: 'dark' } },
      'dark_mode_off': { type: COMMAND_TYPES.SET_THEME, payload: { theme: 'light' } },
      'toggle_theme': { type: COMMAND_TYPES.SET_THEME, payload: { theme: 'toggle' } },

      // Brightness commands
      'brightness_up': { type: COMMAND_TYPES.SET_BRIGHTNESS, payload: { action: 'up' } },
      'brightness_down': { type: COMMAND_TYPES.SET_BRIGHTNESS, payload: { action: 'down' } },
      'brightness_max': { type: COMMAND_TYPES.SET_BRIGHTNESS, payload: { level: 1 } },
      'brightness_min': { type: COMMAND_TYPES.SET_BRIGHTNESS, payload: { level: 0.1 } },
      'brightness_set': { type: COMMAND_TYPES.SET_BRIGHTNESS, payload: { level: value } },

      // Haptic commands
      'haptic_on': { type: COMMAND_TYPES.SET_HAPTIC, payload: { enabled: true } },
      'haptic_off': { type: COMMAND_TYPES.SET_HAPTIC, payload: { enabled: false } },

      // Notification commands
      'notifications_on': { type: COMMAND_TYPES.SET_NOTIFICATIONS, payload: { enabled: true } },
      'notifications_off': { type: COMMAND_TYPES.SET_NOTIFICATIONS, payload: { enabled: false } },

      // Font size commands
      'font_bigger': { type: COMMAND_TYPES.SET_FONT_SIZE, payload: { action: 'bigger' } },
      'font_smaller': { type: COMMAND_TYPES.SET_FONT_SIZE, payload: { action: 'smaller' } },
      'font_large': { type: COMMAND_TYPES.SET_FONT_SIZE, payload: { size: 'large' } },
      'font_small': { type: COMMAND_TYPES.SET_FONT_SIZE, payload: { size: 'small' } },
      'font_medium': { type: COMMAND_TYPES.SET_FONT_SIZE, payload: { size: 'medium' } },

      // Navigation commands
      'navigate_contacts': { type: COMMAND_TYPES.NAVIGATE, payload: { screen: 'Contacts' } },
      'navigate_leads': { type: COMMAND_TYPES.NAVIGATE, payload: { screen: 'Leads' } },
      'navigate_settings': { type: COMMAND_TYPES.NAVIGATE, payload: { screen: 'Settings' } },
      'navigate_home': { type: COMMAND_TYPES.NAVIGATE, payload: { screen: 'Home' } },

      // Misc
      'refresh': { type: COMMAND_TYPES.REFRESH_DATA, payload: {} },
    };

    if (!action || !actionToCommand[action]) {
      return res.status(400).json({
        success: false,
        message: `Unknown action: ${action}`,
        validActions: Object.keys(actionToCommand)
      });
    }

    const command = actionToCommand[action];
    const userId = req.user._id.toString();

    // Queue the command
    if (!pendingCommands.has(userId)) {
      pendingCommands.set(userId, []);
    }

    const fullCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...command,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    };

    pendingCommands.get(userId).push(fullCommand);
    console.log(`🎛️ [APP-SETTINGS] Executed ${action} for user ${userId}`);

    // Return success with confirmation message
    const messages = {
      'dark_mode_on': 'Dark mode is now on. Your eyes will thank you.',
      'dark_mode_off': 'Dark mode is off. Back to the light side.',
      'toggle_theme': 'Theme toggled.',
      'brightness_up': 'Brightness increased.',
      'brightness_down': 'Brightness decreased.',
      'brightness_max': 'Brightness at maximum.',
      'brightness_min': 'Brightness at minimum.',
      'brightness_set': `Brightness set to ${Math.round((value || 0) * 100)}%.`,
      'haptic_on': 'Haptic feedback is on.',
      'haptic_off': 'Haptic feedback is off.',
      'notifications_on': 'Notifications are enabled.',
      'notifications_off': 'Notifications are muted.',
      'font_bigger': 'Text size increased.',
      'font_smaller': 'Text size decreased.',
      'font_large': 'Text size set to large.',
      'font_small': 'Text size set to small.',
      'font_medium': 'Text size set to medium.',
      'navigate_contacts': 'Opening contacts...',
      'navigate_leads': 'Opening leads...',
      'navigate_settings': 'Opening settings...',
      'navigate_home': 'Going home...',
      'refresh': 'Refreshing data...',
    };

    res.json({
      success: true,
      message: messages[action] || 'Command executed.',
      command: fullCommand
    });
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute command',
      error: error.message
    });
  }
});

/**
 * @desc    Get supported commands list
 * @route   GET /api/app-settings/commands
 * @access  Public
 */
router.get('/commands', (req, res) => {
  res.json({
    success: true,
    commandTypes: COMMAND_TYPES,
    voiceExamples: [
      // Theme
      { phrase: 'Turn on dark mode', action: 'dark_mode_on' },
      { phrase: 'Switch to light mode', action: 'dark_mode_off' },
      { phrase: 'Toggle the theme', action: 'toggle_theme' },

      // Brightness
      { phrase: 'Turn up the brightness', action: 'brightness_up' },
      { phrase: 'Dim the screen', action: 'brightness_down' },
      { phrase: 'Turn the lights off', action: 'brightness_min' },
      { phrase: 'Max brightness', action: 'brightness_max' },

      // Haptic
      { phrase: 'Turn off vibrations', action: 'haptic_off' },
      { phrase: 'Enable haptic feedback', action: 'haptic_on' },

      // Notifications
      { phrase: 'Mute notifications', action: 'notifications_off' },
      { phrase: 'Turn on notifications', action: 'notifications_on' },

      // Font
      { phrase: 'Make the text bigger', action: 'font_bigger' },
      { phrase: 'Smaller font please', action: 'font_smaller' },

      // Navigation
      { phrase: 'Show my contacts', action: 'navigate_contacts' },
      { phrase: 'Go to settings', action: 'navigate_settings' },
      { phrase: 'Open leads', action: 'navigate_leads' },
    ]
  });
});

export default router;
