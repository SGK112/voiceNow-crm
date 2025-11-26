import EventEmitter from 'events';
import UserProfile from '../models/UserProfile.js';
import { pushNotificationService } from './pushNotificationService.js';
import twilio from 'twilio';

/**
 * Call Monitoring Service
 *
 * Monitors live call data from the mobile app
 * Handles missed calls and triggers interactive voicemail callbacks
 */
export class CallMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.activeMonitors = new Map(); // userId -> monitor data
    this.missedCalls = new Map(); // userId -> array of missed calls
    this.callbackQueue = new Map(); // userId -> array of pending callbacks

    // Twilio client for making calls
    this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;
  }

  /**
   * Start monitoring calls for a user
   */
  async startMonitoring(userId, phoneNumber) {
    try {
