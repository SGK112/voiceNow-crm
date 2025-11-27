import { Expo } from 'expo-server-sdk';
import PushToken from '../models/PushToken.js';

export class PushNotificationService {
  constructor() {
    this.expo = new Expo();
  }

  /**
   * Register a push token for a user
   */
  async registerToken(userId, pushToken, platform, deviceInfo = {}) {
    try {
      // Validate push token
      if (!Expo.isExpoPushToken(pushToken)) {
        throw new Error('Invalid Expo push token');
      }

      // Check if token already exists
      let tokenDoc = await PushToken.findOne({ pushToken });

      if (tokenDoc) {
        // Update existing token
        tokenDoc.userId = userId;
        tokenDoc.platform = platform;
        tokenDoc.deviceInfo = deviceInfo;
        tokenDoc.isActive = true;
        tokenDoc.lastUsed = new Date();
        await tokenDoc.save();
        console.log(` [PUSH] Updated token for user: ${userId}`);
      } else {
        // Create new token
        tokenDoc = await PushToken.create({
          userId,
          pushToken,
          platform,
          deviceInfo,
          isActive: true
        });
        console.log(` [PUSH] Registered new token for user: ${userId}`);
      }

      return {
        success: true,
        tokenId: tokenDoc._id
      };
    } catch (error) {
      console.error('L [PUSH] Registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send push notification to a user
   */
  async sendToUser(userId, title, body, data = {}) {
    try {
      // Get user's active tokens
      const tokens = await PushToken.find({
        userId,
        isActive: true
      });

      if (tokens.length === 0) {
