import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import contactService from './ContactService';
import CallLogs from 'react-native-call-log';
import SmsAndroid from 'react-native-get-sms-android';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Storage keys
const LAST_CALL_SYNC_KEY = 'last_call_sync_timestamp';

const LAST_SMS_SYNC_KEY = 'last_sms_sync_timestamp';
const SYNC_ENABLED_KEY = 'device_sync_enabled';
const SYNC_PERIOD_KEY = 'device_sync_period';

interface CallLogEntry {
  phoneNumber: string;
  type: 'INCOMING' | 'OUTGOING' | 'MISSED' | 'UNKNOWN';
  duration: number;
  timestamp: string;
  name?: string;
  dateTime: string;
  rawType: number;
}

interface SMSEntry {
  address: string;
  body: string;
  type: 'inbox' | 'sent';
  date: number;
  read: boolean;
}

type NotificationHooks = {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
}

class DeviceSyncService {
  private syncInProgress = false;
  private notificationHooks: NotificationHooks | null = null;

  setNotificationHooks(hooks: NotificationHooks) {
    this.notificationHooks = hooks;
  }

  // Check if sync is enabled
  async isSyncEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(SYNC_ENABLED_KEY);
      return enabled === 'true';
    } catch {
      return false;
    }
  }

  // Enable/disable sync
  async setSyncEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  // Set sync period in days
  async setSyncPeriod(days: number): Promise<void> {
    await AsyncStorage.setItem(SYNC_PERIOD_KEY, days.toString());
  }

  // Get sync period in days
  async getSyncPeriod(): Promise<number> {
    const period = await AsyncStorage.getItem(SYNC_PERIOD_KEY);
    return period ? parseInt(period, 10) : 7; // Default to 7 days
  }

  // Request necessary permissions
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // iOS doesn't allow reading call history or SMS
      // We can only access contacts
      const { status } = await Contacts.requestPermissionsAsync();
      return status === 'granted';
    }

    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        ]);

        const callLogGranted = grants[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === 'granted';
        const smsGranted = grants[PermissionsAndroid.PERMISSIONS.READ_SMS] === 'granted';
        const contactsGranted = grants[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] === 'granted';

        console.log('Permissions granted:', { callLogGranted, smsGranted, contactsGranted });

        return callLogGranted || smsGranted;
      } catch (err) {
        console.error('Permission request error:', err);
        this.notificationHooks?.showError('Failed to get sync permissions.');
        return false;
      }
    }

    return false;
  }

  // Check current permission status
  async checkPermissions(): Promise<{ callLog: boolean; sms: boolean; contacts: boolean }> {
    if (Platform.OS === 'ios') {
      const { status } = await Contacts.getPermissionsAsync();
      return {
        callLog: false, // iOS doesn't allow this
        sms: false, // iOS doesn't allow this
        contacts: status === 'granted',
      };
    }

    if (Platform.OS === 'android') {
      const callLog = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
      const sms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      const contacts = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
      return { callLog, sms, contacts };
    }

    return { callLog: false, sms: false, contacts: false };
  }

  private async createContactMap() {
    const { data: contacts } = await contactService.getContacts();
    if (!contacts) return new Map();

    const contactMap = new Map();
    for (const contact of contacts) {
      if (contact.phone) {
        const normalizedPhone = this.normalizePhoneNumber(contact.phone);
        if (normalizedPhone) {
          contactMap.set(normalizedPhone, contact);
        }
      }
    }
    return contactMap;
  }

  // Main sync function - call this on app focus
  async syncDeviceData(): Promise<{ calls: number; sms: number }> {
    if (this.syncInProgress) {
      this.notificationHooks?.showInfo('Sync already in progress.');
      return { calls: 0, sms: 0 };
    }

    const enabled = await this.isSyncEnabled();
    if (!enabled) {
      return { calls: 0, sms: 0 };
    }

    this.syncInProgress = true;
    let callsSynced = 0;
    let smsSynced = 0;

    try {
      const permissions = await this.checkPermissions();
      const contactMap = await this.createContactMap();

      if (Platform.OS === 'android') {
        if (permissions.callLog) {
          callsSynced = await this.syncCallHistory(contactMap);
        }
        if (permissions.sms) {
          smsSynced = await this.syncSMSHistory(contactMap);
        }
      }

      if(callsSynced > 0 || smsSynced > 0) {
        this.notificationHooks?.showSuccess(`Synced ${callsSynced} calls and ${smsSynced} messages.`);
      }

      return { calls: callsSynced, sms: smsSynced };
    } catch (error) {
      console.error('Sync error:', error);
      this.notificationHooks?.showError('Device sync failed.');
      return { calls: 0, sms: 0 };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync call history (Android only)
  private async syncCallHistory(contactMap: Map<string, any>): Promise<number> {
    if (Platform.OS !== 'android') return 0;

    try {
      // Get last sync timestamp
      const syncPeriodDays = await this.getSyncPeriod();
      const lastSyncStr = await AsyncStorage.getItem(LAST_CALL_SYNC_KEY);
      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : Date.now() - (syncPeriodDays * 24 * 60 * 60 * 1000);

      const callLogs = await this.getCallLogs(lastSync);

      let syncedCount = 0;

      for (const call of callLogs) {
        // Find matching contact by phone number
        const normalizedPhone = this.normalizePhoneNumber(call.phoneNumber);
        if (!normalizedPhone) continue;

        const matchingContact = contactMap.get(normalizedPhone);

        if (matchingContact) {
          // Log the call to the contact
          const direction = call.type === 'INCOMING' || call.type === 'MISSED' ? 'incoming' : 'outgoing';
          const content = call.type === 'MISSED'
            ? 'Missed call'
            : `${direction === 'incoming' ? 'Incoming' : 'Outgoing'} call (${this.formatDuration(call.duration)})`;

          await contactService.addConversation(
            matchingContact._id,
            'call',
            direction,
            content,
            {
              duration: call.duration,
              callType: call.type,
              syncedFromDevice: true,
              originalTimestamp: parseInt(call.timestamp, 10),
            }
          );
          syncedCount++;
        }
      }

      // Update last sync timestamp
      await AsyncStorage.setItem(LAST_CALL_SYNC_KEY, Date.now().toString());

      return syncedCount;
    } catch (error) {
      console.error('Error syncing call history:', error);
      this.notificationHooks?.showError('Failed to sync call history.');
      return 0;
    }
  }

  // Sync SMS history (Android only)
  private async syncSMSHistory(contactMap: Map<string, any>): Promise<number> {
    if (Platform.OS !== 'android') return 0;

    try {
      // Get last sync timestamp
      const syncPeriodDays = await this.getSyncPeriod();
      const lastSyncStr = await AsyncStorage.getItem(LAST_SMS_SYNC_KEY);
      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : Date.now() - (syncPeriodDays * 24 * 60 * 60 * 1000);

      const messages = await this.getSMSMessages(lastSync);

      let syncedCount = 0;

      for (const sms of messages) {
        // Find matching contact by phone number
        const normalizedPhone = this.normalizePhoneNumber(sms.address);
        if (!normalizedPhone) continue;
        
        const matchingContact = contactMap.get(normalizedPhone);

        if (matchingContact) {
          // Log the SMS to the contact
          const direction = sms.type === 'inbox' ? 'incoming' : 'outgoing';
          const preview = sms.body.length > 50 ? sms.body.substring(0, 50) + '...' : sms.body;

          await contactService.addConversation(
            matchingContact._id,
            'sms',
            direction,
            preview,
            {
              fullMessage: sms.body,
              read: sms.read,
              syncedFromDevice: true,
              originalTimestamp: sms.date,
            }
          );
          syncedCount++;
        }
      }

      // Update last sync timestamp
      await AsyncStorage.setItem(LAST_SMS_SYNC_KEY, Date.now().toString());

      return syncedCount;
    } catch (error) {
      console.error('Error syncing SMS history:', error);
      this.notificationHooks?.showError('Failed to sync SMS history.');
      return 0;
    }
  }

  // Placeholder - would need native module like react-native-call-log
  private async getCallLogs(sinceTimestamp: number): Promise<CallLogEntry[]> {
    const logs = await CallLogs.load(-1, { minTimestamp: sinceTimestamp });
    return logs;
  }

  // Placeholder - would need native module like react-native-get-sms-android
  private async getSMSMessages(sinceTimestamp: number): Promise<SMSEntry[]> {
    const filter = {
      box: '', // 'inbox' or 'sent'
      minDate: sinceTimestamp,
    };

    return new Promise((resolve, reject) => {
      SmsAndroid.list(
        JSON.stringify(filter),
        (fail) => {
          console.error('Failed to get SMS messages:', fail);
          reject(fail);
        },
        (count, smsList) => {
          const messages = JSON.parse(smsList);
          resolve(messages.map(m => ({
            address: m.address,
            body: m.body,
            type: m.type === 1 ? 'inbox' : 'sent',
            date: m.date,
            read: m.read === 1,
          })));
        }
      );
    });
  }

  // Normalize phone number for comparison
  private normalizePhoneNumber(phone: string): string | null {
    const phoneNumber = parsePhoneNumberFromString(phone, 'US');
    if (phoneNumber) {
      return phoneNumber.format('E.164');
    }
    return null;
  }

  // Format call duration
  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }

  // Show setup instructions
  showSetupInstructions(): void {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'iOS Limitations',
        'Due to iOS privacy restrictions, the app cannot automatically read your call history or text messages.\n\nIncoming communications from contacts will be logged when you interact with them through the app.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Setup Required',
        'To enable automatic sync of incoming calls and texts, the app needs to install additional native modules:\n\n' +
        '1. react-native-call-log\n' +
        '2. react-native-get-sms-android\n\n' +
        'Would you like to enable manual sync permissions for now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: () => this.requestPermissions() },
        ]
      );
    }
  }
}

export const deviceSyncService = new DeviceSyncService();
export default deviceSyncService;
