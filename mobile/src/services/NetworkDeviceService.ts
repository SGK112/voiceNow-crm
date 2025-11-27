/**
 * Network Device Service
 * Provides Aria with awareness of network-connected devices
 * Enables discovery and control of computers, printers, speakers, IoT devices
 */

import api from '../utils/api';

export interface NetworkDevice {
  ip: string;
  mac?: string;
  hostname?: string;
  type: 'computer' | 'printer' | 'speaker' | 'smartTV' | 'smartHome' | 'nas' | 'camera' | 'router' | 'unknown';
  vendor?: string;
  capabilities: string[];
  openPorts?: number[];
  online?: boolean;
  latency?: number;
  lastSeen?: string;
  discoveredAt?: string;
}

export interface NetworkInfo {
  interface: string;
  address: string;
  netmask: string;
  subnet: string;
  mac: string;
}

export interface DiscoveryResult {
  success: boolean;
  network?: NetworkInfo;
  devices: NetworkDevice[];
  count: number;
  duration?: number;
  error?: string;
}

export interface DeviceActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

class NetworkDeviceService {
  private cachedDevices: NetworkDevice[] = [];
  private lastScanTime: Date | null = null;
  private isScanning: boolean = false;

  /**
   * Discover all devices on the network
   */
  async discoverDevices(): Promise<DiscoveryResult> {
    if (this.isScanning) {
      return {
        success: false,
        devices: this.cachedDevices,
        count: this.cachedDevices.length,
        error: 'Scan already in progress',
      };
    }

    this.isScanning = true;

    try {
      const response = await api.get('/api/network/discover');
      const result = response.data;

      if (result.success) {
        this.cachedDevices = result.devices;
        this.lastScanTime = new Date();
      }

      return result;
    } catch (error: any) {
      console.error('[NetworkDeviceService] Discovery error:', error);
      return {
        success: false,
        devices: [],
        count: 0,
        error: error.message || 'Failed to discover devices',
      };
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Quick scan - check status of known devices
   */
  async quickScan(): Promise<DiscoveryResult> {
    try {
      const response = await api.get('/api/network/quick-scan');
      const result = response.data;

      if (result.success) {
        // Update cached devices with online status
        for (const device of result.devices) {
          const cached = this.cachedDevices.find(d => d.ip === device.ip);
          if (cached) {
            cached.online = device.online;
            cached.latency = device.latency;
            cached.lastSeen = device.lastSeen;
          }
        }
      }

      return result;
    } catch (error: any) {
      console.error('[NetworkDeviceService] Quick scan error:', error);
      return {
        success: false,
        devices: this.cachedDevices,
        count: this.cachedDevices.length,
        error: error.message,
      };
    }
  }

  /**
   * Get cached devices (no network call)
   */
  getCachedDevices(): NetworkDevice[] {
    return this.cachedDevices;
  }

  /**
   * Get devices from server cache
   */
  async getDevices(): Promise<NetworkDevice[]> {
    try {
      const response = await api.get('/api/network/devices');
      if (response.data.success) {
        this.cachedDevices = response.data.devices;
        return response.data.devices;
      }
      return this.cachedDevices;
    } catch (error) {
      console.error('[NetworkDeviceService] Get devices error:', error);
      return this.cachedDevices;
    }
  }

  /**
   * Get devices by type
   */
  async getDevicesByType(type: NetworkDevice['type']): Promise<NetworkDevice[]> {
    try {
      const response = await api.get(`/api/network/devices/type/${type}`);
      return response.data.success ? response.data.devices : [];
    } catch (error) {
      console.error('[NetworkDeviceService] Get by type error:', error);
      return this.cachedDevices.filter(d => d.type === type);
    }
  }

  /**
   * Get devices by capability
   */
  async getDevicesByCapability(capability: string): Promise<NetworkDevice[]> {
    try {
      const response = await api.get(`/api/network/devices/capability/${capability}`);
      return response.data.success ? response.data.devices : [];
    } catch (error) {
      console.error('[NetworkDeviceService] Get by capability error:', error);
      return this.cachedDevices.filter(d => d.capabilities?.includes(capability));
    }
  }

  /**
   * Get specific device info
   */
  async getDeviceInfo(ip: string): Promise<NetworkDevice | null> {
    try {
      const response = await api.get(`/api/network/devices/${ip}`);
      return response.data.success ? response.data.device : null;
    } catch (error) {
      console.error('[NetworkDeviceService] Get device info error:', error);
      return this.cachedDevices.find(d => d.ip === ip) || null;
    }
  }

  /**
   * Ping a device to check if it's online
   */
  async pingDevice(ip: string): Promise<{ online: boolean; latency?: number }> {
    try {
      const response = await api.post(`/api/network/devices/${ip}/action`, {
        action: 'ping',
      });
      return {
        online: response.data.online || false,
        latency: response.data.latency,
      };
    } catch (error) {
      return { online: false };
    }
  }

  /**
   * Wake up a device using Wake-on-LAN
   */
  async wakeDevice(ipOrMac: string): Promise<DeviceActionResult> {
    try {
      const isMAC = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(ipOrMac);
      const response = await api.post('/api/network/wake', {
        [isMAC ? 'mac' : 'ip']: ipOrMac,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to wake device',
      };
    }
  }

  /**
   * Control a speaker (Sonos, etc.)
   */
  async controlSpeaker(
    ip: string,
    action: 'play' | 'pause' | 'stop' | 'next' | 'previous' | 'setVolume' | 'getVolume',
    volume?: number
  ): Promise<DeviceActionResult> {
    try {
      const response = await api.post('/api/network/sonos', {
        ip,
        action,
        params: { volume },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to control speaker',
      };
    }
  }

  /**
   * Print to a network printer
   */
  async printDocument(ip: string, content: string): Promise<DeviceActionResult> {
    try {
      const response = await api.post('/api/network/print', {
        ip,
        content,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to print',
      };
    }
  }

  /**
   * Make HTTP request to a device
   */
  async sendHttpRequest(
    ip: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      path?: string;
      port?: number;
      data?: any;
      headers?: Record<string, string>;
    }
  ): Promise<DeviceActionResult> {
    try {
      const response = await api.post('/api/network/http', {
        ip,
        ...options,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'HTTP request failed',
      };
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<NetworkInfo[]> {
    try {
      const response = await api.get('/api/network/info');
      return response.data.success ? response.data.networks : [];
    } catch (error) {
      console.error('[NetworkDeviceService] Get network info error:', error);
      return [];
    }
  }

  /**
   * Get time since last scan
   */
  getLastScanTime(): Date | null {
    return this.lastScanTime;
  }

  /**
   * Check if a full scan is needed (older than 5 minutes or no scan)
   */
  needsFullScan(): boolean {
    if (!this.lastScanTime) return true;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastScanTime < fiveMinutesAgo;
  }

  /**
   * Get summary of network for Aria's awareness
   */
  getNetworkSummary(): string {
    if (this.cachedDevices.length === 0) {
      return 'No devices have been discovered yet. Ask me to scan the network.';
    }

    const byType: Record<string, number> = {};
    for (const device of this.cachedDevices) {
      byType[device.type] = (byType[device.type] || 0) + 1;
    }

    const summary = Object.entries(byType)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');

    const lastScan = this.lastScanTime
      ? `Last scan: ${this.getTimeAgo(this.lastScanTime)}`
      : '';

    return `Found ${this.cachedDevices.length} devices: ${summary}. ${lastScan}`;
  }

  /**
   * Format time ago string
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  /**
   * Get printers for quick access
   */
  getPrinters(): NetworkDevice[] {
    return this.cachedDevices.filter(
      d => d.type === 'printer' || d.capabilities?.includes('print')
    );
  }

  /**
   * Get speakers for quick access
   */
  getSpeakers(): NetworkDevice[] {
    return this.cachedDevices.filter(
      d => d.type === 'speaker' || d.capabilities?.includes('sonos') || d.capabilities?.includes('cast')
    );
  }

  /**
   * Get computers for quick access
   */
  getComputers(): NetworkDevice[] {
    return this.cachedDevices.filter(d => d.type === 'computer');
  }

  /**
   * Get smart home devices for quick access
   */
  getSmartHomeDevices(): NetworkDevice[] {
    return this.cachedDevices.filter(
      d => d.type === 'smartHome' || d.type === 'smartTV' || d.capabilities?.includes('homeassistant')
    );
  }
}

// Export singleton instance
const networkDeviceService = new NetworkDeviceService();
export default networkDeviceService;
