import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import contactService from './ContactService';

// Storage keys
const LAST_CALL_SYNC_KEY = 'last_call_sync_timestamp';
const LAST_SMS_SYNC_KEY = 'last_sms_sync_timestamp';
const SYNC_ENABLED_KEY = 'device_sync_enabled';

interface CallLogEntry {
  phoneNumber: string;
  type: 'incoming' | 'outgoing' | 'missed';
  duration: number;
  timestamp: number;
  name?: string;
}

interface SMSEntry {
  address: string;
  body: string;
  type: 'inbox' | 'sent';
  date: number;
  read: boolean;
}

class DeviceSyncService {
  private syncInProgress = false;

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

  // Main sync function - call this on app focus
  async syncDeviceData(): Promise<{ calls: number; sms: number }> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return { calls: 0, sms: 0 };
    }

    const enabled = await this.isSyncEnabled();
    if (!enabled) {
      console.log('Device sync is disabled');
      return { calls: 0, sms: 0 };
    }

    this.syncInProgress = true;
    let callsSynced = 0;
    let smsSynced = 0;

    try {
      const permissions = await this.checkPermissions();

      if (Platform.OS === 'android') {
        if (permissions.callLog) {
          callsSynced = await this.syncCallHistory();
        }
        if (permissions.sms) {
          smsSynced = await this.syncSMSHistory();
        }
      }

      // iOS note: We can't access call/SMS history on iOS
      // Would need to use CallKit for call detection (complex setup)

      console.log(`Sync complete: ${callsSynced} calls, ${smsSynced} SMS`);
      return { calls: callsSynced, sms: smsSynced };
    } catch (error) {
      console.error('Sync error:', error);
      return { calls: 0, sms: 0 };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync call history (Android only)
  private async syncCallHistory(): Promise<number> {
    if (Platform.OS !== 'android') return 0;

    try {
      // Get last sync timestamp
      const lastSyncStr = await AsyncStorage.getItem(LAST_CALL_SYNC_KEY);
      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : Date.now() - (7 * 24 * 60 * 60 * 1000); // Default: 7 days ago

      // Use react-native-call-log or similar native module
      // For now, we'll use a placeholder that would need a native module
      const callLogs = await this.getCallLogs(lastSync);

      let syncedCount = 0;
      const contacts = await contactService.getContacts();

      for (const call of callLogs) {
        // Find matching contact by phone number
        const normalizedPhone = this.normalizePhoneNumber(call.phoneNumber);
        const matchingContact = contacts.find(c =>
          this.normalizePhoneNumber(c.phone) === normalizedPhone
        );

        if (matchingContact) {
          // Log the call to the contact
          const direction = call.type === 'incoming' || call.type === 'missed' ? 'incoming' : 'outgoing';
          const content = call.type === 'missed'
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
              originalTimestamp: call.timestamp,
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
      return 0;
    }
  }

  // Sync SMS history (Android only)
  private async syncSMSHistory(): Promise<number> {
    if (Platform.OS !== 'android') return 0;

    try {
      // Get last sync timestamp
      const lastSyncStr = await AsyncStorage.getItem(LAST_SMS_SYNC_KEY);
      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : Date.now() - (7 * 24 * 60 * 60 * 1000);

      // Use react-native-get-sms-android or similar native module
      const messages = await this.getSMSMessages(lastSync);

      let syncedCount = 0;
      const contacts = await contactService.getContacts();

      for (const sms of messages) {
        // Find matching contact by phone number
        const normalizedPhone = this.normalizePhoneNumber(sms.address);
        const matchingContact = contacts.find(c =>
          this.normalizePhoneNumber(c.phone) === normalizedPhone
        );

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
      return 0;
    }
  }

  // Placeholder - would need native module like react-native-call-log
  private async getCallLogs(sinceTimestamp: number): Promise<CallLogEntry[]> {
    // This requires a native module like:
    // - react-native-call-log
    // - react-native-call-detection
    //
    // Example with react-native-call-log:
    // import CallLogs from 'react-native-call-log';
    // const logs = await CallLogs.load(100, { minTimestamp: sinceTimestamp });
    // return logs.map(log => ({
    //   phoneNumber: log.phoneNumber,
    //   type: log.type === 1 ? 'incoming' : log.type === 2 ? 'outgoing' : 'missed',
    //   duration: log.duration,
    //   timestamp: log.timestamp,
    //   name: log.name,
    // }));

    console.log('Call log reading requires native module installation');
    return [];
  }

  // Placeholder - would need native module like react-native-get-sms-android
  private async getSMSMessages(sinceTimestamp: number): Promise<SMSEntry[]> {
    // This requires a native module like:
    // - react-native-get-sms-android
    //
    // Example:
    // import SmsAndroid from 'react-native-get-sms-android';
    // const filter = {
    //   box: '', // both inbox and sent
    //   minDate: sinceTimestamp,
    // };
    // return new Promise((resolve) => {
    //   SmsAndroid.list(JSON.stringify(filter), (fail) => resolve([]), (count, smsList) => {
    //     const messages = JSON.parse(smsList);
    //     resolve(messages.map(m => ({
    //       address: m.address,
    //       body: m.body,
    //       type: m.type === 1 ? 'inbox' : 'sent',
    //       date: m.date,
    //       read: m.read === 1,
    //     })));
    //   });
    // });

    console.log('SMS reading requires native module installation');
    return [];
  }

  // Normalize phone number for comparison
  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10); // Last 10 digits
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
