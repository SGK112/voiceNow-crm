/**
 * Network Discovery Service
 * Discovers and interacts with devices on the local network
 * Supports: Computers, Printers, Speakers, Smart Home devices, IoT
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import dgram from 'dgram';
import net from 'net';
import os from 'os';

const execAsync = promisify(exec);

// Device type detection patterns
const DEVICE_PATTERNS = {
  printer: {
    ports: [9100, 515, 631],
    mdns: ['_ipp._tcp', '_printer._tcp', '_pdl-datastream._tcp'],
    manufacturers: ['hp', 'canon', 'epson', 'brother', 'xerox', 'lexmark', 'samsung', 'ricoh'],
  },
  speaker: {
    ports: [8008, 8443, 1400, 3689],
    mdns: ['_googlecast._tcp', '_airplay._tcp', '_sonos._tcp', '_spotify-connect._tcp'],
    manufacturers: ['sonos', 'google', 'apple', 'bose', 'jbl', 'harman'],
  },
  computer: {
    ports: [22, 3389, 5900, 445, 139, 548],
    mdns: ['_ssh._tcp', '_rfb._tcp', '_smb._tcp', '_afpovertcp._tcp'],
    osPatterns: ['windows', 'mac', 'linux', 'darwin'],
  },
  smartTV: {
    ports: [8001, 8002, 9000, 55000],
    mdns: ['_googlecast._tcp', '_airplay._tcp'],
    manufacturers: ['samsung', 'lg', 'sony', 'vizio', 'tcl', 'roku'],
  },
  smartHome: {
    ports: [80, 443, 8080, 8123],
    mdns: ['_hue._tcp', '_homeassistant._tcp', '_matter._tcp'],
    manufacturers: ['philips', 'hue', 'nest', 'ring', 'ecobee', 'wemo', 'lifx'],
  },
  nas: {
    ports: [5000, 5001, 80, 443, 139, 445],
    mdns: ['_smb._tcp', '_afpovertcp._tcp', '_nfs._tcp'],
    manufacturers: ['synology', 'qnap', 'western digital', 'netgear'],
  },
  camera: {
    ports: [554, 8554, 80, 443],
    mdns: ['_rtsp._tcp'],
    manufacturers: ['nest', 'ring', 'arlo', 'wyze', 'eufy', 'hikvision'],
  },
  router: {
    ports: [80, 443, 8080],
    manufacturers: ['netgear', 'asus', 'tp-link', 'linksys', 'ubiquiti', 'cisco'],
  },
};

// Common service ports for scanning
const COMMON_PORTS = [
  22,    // SSH
  80,    // HTTP
  443,   // HTTPS
  445,   // SMB
  515,   // LPD Printer
  548,   // AFP (Apple)
  554,   // RTSP (cameras)
  631,   // IPP/CUPS Printer
  1400,  // Sonos
  3000,  // Node.js apps
  3389,  // RDP
  5000,  // Synology/UPnP
  5353,  // mDNS
  5900,  // VNC
  8000,  // HTTP alt
  8008,  // Google Cast
  8080,  // HTTP proxy
  8123,  // Home Assistant
  8443,  // HTTPS alt
  9000,  // Various
  9100,  // RAW Printer
];

class NetworkDiscoveryService {
  constructor() {
    this.discoveredDevices = new Map();
    this.networkInfo = null;
    this.scanning = false;
  }

  /**
   * Get local network information
   */
  getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const results = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const subnet = this.calculateSubnet(addr.address, addr.netmask);
          results.push({
            interface: name,
            address: addr.address,
            netmask: addr.netmask,
            subnet,
            mac: addr.mac,
          });
        }
      }
    }

    this.networkInfo = results[0] || null;
    return results;
  }

  /**
   * Calculate subnet range from IP and netmask
   */
  calculateSubnet(ip, netmask) {
    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);
    const networkParts = ipParts.map((part, i) => part & maskParts[i]);
    return `${networkParts.join('.')}/24`;
  }

  /**
   * Generate IP range for scanning
   */
  generateIPRange(subnet) {
    const [network] = subnet.split('/');
    const parts = network.split('.').slice(0, 3);
    const ips = [];
    for (let i = 1; i < 255; i++) {
      ips.push(`${parts.join('.')}.${i}`);
    }
    return ips;
  }

  /**
   * Quick ping scan to find live hosts
   */
  async pingHost(ip, timeout = 1000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = new net.Socket();

      const cleanup = () => {
        socket.destroy();
      };

      socket.setTimeout(timeout);
      socket.on('connect', () => {
        cleanup();
        resolve({ alive: true, latency: Date.now() - start });
      });
      socket.on('timeout', () => {
        cleanup();
        resolve({ alive: false });
      });
      socket.on('error', () => {
        cleanup();
        resolve({ alive: false });
      });

      // Try common ports
      socket.connect(80, ip);
    });
  }

  /**
   * ARP scan for faster discovery (macOS/Linux)
   */
  async arpScan() {
    try {
      const { stdout } = await execAsync('arp -a', { timeout: 10000 });
      const devices = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        // Parse ARP output: hostname (IP) at MAC on interface
        const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:]+)/i);
        if (match) {
          const [, ip, mac] = match;
          if (mac && mac !== '(incomplete)' && mac !== 'ff:ff:ff:ff:ff:ff') {
            const hostname = line.split('(')[0].trim() || null;
            devices.push({
              ip,
              mac: mac.toUpperCase(),
              hostname: hostname !== '?' ? hostname : null,
              vendor: this.lookupVendor(mac),
            });
          }
        }
      }

      return devices;
    } catch (error) {
      console.error('ARP scan error:', error.message);
      return [];
    }
  }

  /**
   * mDNS/Bonjour discovery
   */
  async mdnsDiscover(timeout = 5000) {
    return new Promise((resolve) => {
      const devices = [];
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      socket.on('message', (msg, rinfo) => {
        try {
          // Parse mDNS response (simplified)
          const device = {
            ip: rinfo.address,
            port: rinfo.port,
            mdns: true,
            raw: msg.toString('hex').substring(0, 100),
          };
          devices.push(device);
        } catch (e) {
          // Ignore parse errors
        }
      });

      socket.on('error', (err) => {
        console.error('mDNS error:', err);
      });

      socket.bind(5353, () => {
        socket.addMembership('224.0.0.251');

        // Send mDNS query for common services
        const query = Buffer.from([
          0x00, 0x00, // Transaction ID
          0x00, 0x00, // Flags (standard query)
          0x00, 0x01, // Questions: 1
          0x00, 0x00, // Answer RRs
          0x00, 0x00, // Authority RRs
          0x00, 0x00, // Additional RRs
          // Query for _services._dns-sd._udp.local
          0x09, 0x5f, 0x73, 0x65, 0x72, 0x76, 0x69, 0x63, 0x65, 0x73,
          0x07, 0x5f, 0x64, 0x6e, 0x73, 0x2d, 0x73, 0x64,
          0x04, 0x5f, 0x75, 0x64, 0x70,
          0x05, 0x6c, 0x6f, 0x63, 0x61, 0x6c,
          0x00,
          0x00, 0x0c, // Type: PTR
          0x00, 0x01, // Class: IN
        ]);

        socket.send(query, 0, query.length, 5353, '224.0.0.251');
      });

      setTimeout(() => {
        socket.close();
        resolve(devices);
      }, timeout);
    });
  }

  /**
   * Port scan a specific host
   */
  async scanPorts(ip, ports = COMMON_PORTS, timeout = 500) {
    const openPorts = [];

    const scanPort = (port) => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);

        socket.on('connect', () => {
          openPorts.push(port);
          socket.destroy();
          resolve(true);
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });

        socket.on('error', () => {
          socket.destroy();
          resolve(false);
        });

        socket.connect(port, ip);
      });
    };

    // Scan in parallel batches
    const batchSize = 10;
    for (let i = 0; i < ports.length; i += batchSize) {
      const batch = ports.slice(i, i + batchSize);
      await Promise.all(batch.map(scanPort));
    }

    return openPorts;
  }

  /**
   * Identify device type based on open ports and other info
   */
  identifyDeviceType(device) {
    const { openPorts = [], vendor = '', hostname = '' } = device;
    const scores = {};

    // Score based on ports
    for (const [type, patterns] of Object.entries(DEVICE_PATTERNS)) {
      scores[type] = 0;
      for (const port of patterns.ports || []) {
        if (openPorts.includes(port)) {
          scores[type] += 10;
        }
      }
    }

    // Score based on vendor/manufacturer
    const lowerVendor = (vendor || '').toLowerCase();
    const lowerHostname = (hostname || '').toLowerCase();
    for (const [type, patterns] of Object.entries(DEVICE_PATTERNS)) {
      for (const mfr of patterns.manufacturers || []) {
        if (lowerVendor.includes(mfr) || lowerHostname.includes(mfr)) {
          scores[type] += 20;
        }
      }
    }

    // Find highest scoring type
    let bestType = 'unknown';
    let bestScore = 0;
    for (const [type, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    return bestScore > 0 ? bestType : 'unknown';
  }

  /**
   * Get device capabilities based on open ports
   */
  getDeviceCapabilities(device) {
    const capabilities = [];
    const { openPorts = [] } = device;

    if (openPorts.includes(22)) capabilities.push('ssh');
    if (openPorts.includes(80) || openPorts.includes(443) || openPorts.includes(8080)) capabilities.push('web');
    if (openPorts.includes(3389)) capabilities.push('rdp');
    if (openPorts.includes(5900)) capabilities.push('vnc');
    if (openPorts.includes(445) || openPorts.includes(139)) capabilities.push('smb');
    if (openPorts.includes(548)) capabilities.push('afp');
    if (openPorts.includes(9100) || openPorts.includes(631) || openPorts.includes(515)) capabilities.push('print');
    if (openPorts.includes(554)) capabilities.push('rtsp');
    if (openPorts.includes(8008)) capabilities.push('cast');
    if (openPorts.includes(1400)) capabilities.push('sonos');
    if (openPorts.includes(8123)) capabilities.push('homeassistant');

    return capabilities;
  }

  /**
   * Lookup vendor from MAC address (simplified OUI lookup)
   */
  lookupVendor(mac) {
    if (!mac) return null;

    const oui = mac.toUpperCase().replace(/[:-]/g, '').substring(0, 6);

    // Common OUI prefixes
    const vendors = {
      'AABBCC': 'Apple',
      '00A040': 'Apple',
      '3C15C2': 'Apple',
      '00163E': 'Apple',
      '001451': 'Apple',
      '40B395': 'Apple',
      '64A5C3': 'Apple',
      '2CF0A2': 'Apple',
      '3CE072': 'Apple',
      'F0D1A9': 'Apple',
      '94F6A3': 'Apple',
      '9CFC01': 'Apple',
      'F4F15A': 'Apple',
      'CC20E8': 'Apple',
      '0C4DE9': 'Apple',
      '38C986': 'Apple',
      '949426': 'Apple',
      'B8E856': 'Apple',
      '000A27': 'Apple',
      '001CB3': 'Apple',
      '001D4F': 'Apple',
      '001E52': 'Apple',
      '001EC2': 'Apple',
      '001F5B': 'Apple',
      '001FF3': 'Apple',
      '00219': 'Apple',
      '002312': 'Apple',
      '00236C': 'Apple',
      '0023DF': 'Apple',
      '002436': 'Apple',
      '002500': 'Apple',
      '00254B': 'Apple',
      '0025BC': 'Apple',
      '002608': 'Apple',
      '00264A': 'Apple',
      '0026B0': 'Apple',
      '0026BB': 'Apple',
      'B827EB': 'Raspberry Pi',
      'DC26B': 'Raspberry Pi',
      'E45F01': 'Raspberry Pi',
      '28CDC': 'Raspberry Pi',
      '001999': 'Google',
      'F4F5D8': 'Google',
      '54602': 'Google',
      '940013': 'Sonos',
      '000E58': 'Sonos',
      '5CAAFD': 'Sonos',
      '001788': 'Philips Hue',
      'ECB5FA': 'Philips Hue',
      '00178': 'Philips',
      'FCECDA': 'Ubiquiti',
      '802AA8': 'Ubiquiti',
      'F09FC2': 'Ubiquiti',
      '245A4C': 'Ubiquiti',
      '001D7E': 'Synology',
      '0011321': 'Synology',
      '30B5C2': 'TP-Link',
      '50C7BF': 'TP-Link',
      'B0BE76': 'TP-Link',
      '00224D': 'Netgear',
      'A42B8C': 'Netgear',
      '001F33': 'Netgear',
      '28107B': 'D-Link',
      'F0DEF1': 'ASUS',
      '0015F2': 'ASUS',
      '485D36': 'Vizio',
      '00E091': 'LG',
      '5CDC96': 'HP',
      '3C4A92': 'HP',
      '000130': 'HP',
      '08002B': 'HP',
      '00179A': 'Canon',
      '0019D1': 'Intel',
      '001B21': 'Intel',
      '001E67': 'Intel',
      '0021': 'Dell',
      '001143': 'Dell',
      'F01FAF': 'Dell',
      '000BCD': 'Samsung',
      'BC851F': 'Samsung',
      '94C6': 'Samsung',
      'B8F6B1': 'Samsung',
      '001E4F': 'Dell',
      '2C768A': 'Hewlett Packard',
      '001322': 'Epson',
      '0000B4': 'Brother',
      '30055C': 'Brother',
      'E0B94D': 'Roku',
      'B0A7B9': 'Roku',
      'D83134': 'Roku',
      '84D473': 'Epson',
      '005056': 'VMware',
      '000C29': 'VMware',
      '001C42': 'Parallels',
      '080027': 'VirtualBox',
    };

    return vendors[oui] || null;
  }

  /**
   * Full network scan - discover all devices
   */
  async discoverDevices(options = {}) {
    if (this.scanning) {
      return { error: 'Scan already in progress' };
    }

    this.scanning = true;
    const startTime = Date.now();

    try {
      // Get network info
      const networks = this.getNetworkInfo();
      if (!networks.length) {
        throw new Error('No network interface found');
      }

      const network = networks[0];
      console.log(`[NetworkDiscovery] Scanning network: ${network.subnet}`);

      // Step 1: ARP scan (fastest)
      console.log('[NetworkDiscovery] Running ARP scan...');
      const arpDevices = await this.arpScan();
      console.log(`[NetworkDiscovery] ARP found ${arpDevices.length} devices`);

      // Step 2: mDNS discovery
      console.log('[NetworkDiscovery] Running mDNS discovery...');
      const mdnsDevices = await this.mdnsDiscover(3000);
      console.log(`[NetworkDiscovery] mDNS found ${mdnsDevices.length} devices`);

      // Merge ARP and mDNS results
      const deviceMap = new Map();
      for (const device of arpDevices) {
        deviceMap.set(device.ip, device);
      }
      for (const device of mdnsDevices) {
        if (deviceMap.has(device.ip)) {
          deviceMap.get(device.ip).mdns = true;
        } else {
          deviceMap.set(device.ip, device);
        }
      }

      // Step 3: Port scan each device
      const devices = [];
      console.log(`[NetworkDiscovery] Port scanning ${deviceMap.size} devices...`);

      const scanPromises = Array.from(deviceMap.values()).map(async (device) => {
        const openPorts = await this.scanPorts(device.ip, options.ports || COMMON_PORTS, 300);
        device.openPorts = openPorts;
        device.type = this.identifyDeviceType(device);
        device.capabilities = this.getDeviceCapabilities(device);
        device.discoveredAt = new Date().toISOString();
        return device;
      });

      const scannedDevices = await Promise.all(scanPromises);

      // Filter out devices with no open ports (likely offline or firewalled)
      const activeDevices = scannedDevices.filter(d => d.openPorts.length > 0 || d.hostname);

      // Store discovered devices
      for (const device of activeDevices) {
        this.discoveredDevices.set(device.ip, device);
      }

      const duration = Date.now() - startTime;
      console.log(`[NetworkDiscovery] Scan complete in ${duration}ms. Found ${activeDevices.length} active devices`);

      return {
        success: true,
        network,
        devices: activeDevices,
        count: activeDevices.length,
        duration,
      };

    } catch (error) {
      console.error('[NetworkDiscovery] Scan error:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.scanning = false;
    }
  }

  /**
   * Quick scan - just check known/cached devices
   */
  async quickScan() {
    const devices = Array.from(this.discoveredDevices.values());
    const results = [];

    for (const device of devices) {
      const ping = await this.pingHost(device.ip, 500);
      if (ping.alive) {
        device.online = true;
        device.latency = ping.latency;
        device.lastSeen = new Date().toISOString();
        results.push(device);
      } else {
        device.online = false;
      }
    }

    return results;
  }

  /**
   * Get cached devices
   */
  getCachedDevices() {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get device by IP
   */
  getDevice(ip) {
    return this.discoveredDevices.get(ip);
  }

  /**
   * Send Wake-on-LAN magic packet
   */
  async wakeOnLan(mac) {
    return new Promise((resolve, reject) => {
      if (!mac) {
        return reject(new Error('MAC address required'));
      }

      const cleanMac = mac.replace(/[:-]/g, '');
      if (cleanMac.length !== 12) {
        return reject(new Error('Invalid MAC address'));
      }

      // Build magic packet: 6 x 0xFF + 16 x MAC
      const macBuffer = Buffer.from(cleanMac, 'hex');
      const magicPacket = Buffer.alloc(102);

      // Fill with 0xFF header
      for (let i = 0; i < 6; i++) {
        magicPacket[i] = 0xff;
      }

      // Repeat MAC 16 times
      for (let i = 0; i < 16; i++) {
        macBuffer.copy(magicPacket, 6 + i * 6);
      }

      const socket = dgram.createSocket('udp4');
      socket.on('error', (err) => {
        socket.close();
        reject(err);
      });

      socket.bind(() => {
        socket.setBroadcast(true);
        socket.send(magicPacket, 0, 102, 9, '255.255.255.255', (err) => {
          socket.close();
          if (err) {
            reject(err);
          } else {
            resolve({ success: true, message: `Wake-on-LAN sent to ${mac}` });
          }
        });
      });
    });
  }

  /**
   * Execute command on remote device via SSH
   */
  async executeSSH(ip, command, credentials) {
    // This would require ssh2 library - placeholder for now
    console.log(`[NetworkDiscovery] SSH execution requested: ${ip} - ${command}`);
    return {
      success: false,
      error: 'SSH execution requires additional configuration',
      note: 'Add ssh2 library and configure credentials',
    };
  }

  /**
   * Print to network printer
   */
  async printToDevice(ip, content, options = {}) {
    return new Promise((resolve, reject) => {
      const device = this.discoveredDevices.get(ip);
      if (!device) {
        return reject(new Error('Device not found'));
      }

      if (!device.capabilities.includes('print')) {
        return reject(new Error('Device does not support printing'));
      }

      // Try RAW printing on port 9100
      const socket = new net.Socket();
      socket.setTimeout(10000);

      socket.on('connect', () => {
        socket.write(content);
        socket.end();
      });

      socket.on('close', () => {
        resolve({ success: true, message: 'Print job sent' });
      });

      socket.on('error', (err) => {
        reject(err);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });

      socket.connect(9100, ip);
    });
  }

  /**
   * Control Sonos speaker
   */
  async controlSonos(ip, action, params = {}) {
    const device = this.discoveredDevices.get(ip);
    if (!device || !device.capabilities.includes('sonos')) {
      throw new Error('Device not found or not a Sonos speaker');
    }

    const axios = (await import('axios')).default;

    const soapActions = {
      play: {
        service: 'AVTransport',
        action: 'Play',
        args: '<InstanceID>0</InstanceID><Speed>1</Speed>',
      },
      pause: {
        service: 'AVTransport',
        action: 'Pause',
        args: '<InstanceID>0</InstanceID>',
      },
      stop: {
        service: 'AVTransport',
        action: 'Stop',
        args: '<InstanceID>0</InstanceID>',
      },
      next: {
        service: 'AVTransport',
        action: 'Next',
        args: '<InstanceID>0</InstanceID>',
      },
      previous: {
        service: 'AVTransport',
        action: 'Previous',
        args: '<InstanceID>0</InstanceID>',
      },
      setVolume: {
        service: 'RenderingControl',
        action: 'SetVolume',
        args: `<InstanceID>0</InstanceID><Channel>Master</Channel><DesiredVolume>${params.volume || 50}</DesiredVolume>`,
      },
      getVolume: {
        service: 'RenderingControl',
        action: 'GetVolume',
        args: '<InstanceID>0</InstanceID><Channel>Master</Channel>',
      },
    };

    const soapAction = soapActions[action];
    if (!soapAction) {
      throw new Error(`Unknown action: ${action}`);
    }

    const endpoint = soapAction.service === 'AVTransport'
      ? '/MediaRenderer/AVTransport/Control'
      : '/MediaRenderer/RenderingControl/Control';

    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${soapAction.action} xmlns:u="urn:schemas-upnp-org:service:${soapAction.service}:1">
      ${soapAction.args}
    </u:${soapAction.action}>
  </s:Body>
</s:Envelope>`;

    try {
      const response = await axios.post(`http://${ip}:1400${endpoint}`, soapBody, {
        headers: {
          'Content-Type': 'text/xml; charset="utf-8"',
          'SOAPAction': `"urn:schemas-upnp-org:service:${soapAction.service}:1#${soapAction.action}"`,
        },
        timeout: 5000,
      });

      return {
        success: true,
        action,
        response: response.data,
      };
    } catch (error) {
      throw new Error(`Sonos control failed: ${error.message}`);
    }
  }

  /**
   * Control Google Cast device
   */
  async controlCast(ip, action, params = {}) {
    // Google Cast uses a proprietary protocol
    // For full support, would need castv2-client library
    console.log(`[NetworkDiscovery] Cast control requested: ${ip} - ${action}`);
    return {
      success: false,
      error: 'Cast control requires additional setup',
      note: 'Add castv2-client library for full Chromecast support',
    };
  }

  /**
   * Make HTTP request to device
   */
  async httpRequest(ip, options = {}) {
    const axios = (await import('axios')).default;

    const {
      method = 'GET',
      path = '/',
      port = 80,
      data = null,
      headers = {},
      timeout = 5000,
    } = options;

    const protocol = port === 443 || port === 8443 ? 'https' : 'http';
    const url = `${protocol}://${ip}:${port}${path}`;

    try {
      const response = await axios({
        method,
        url,
        data,
        headers,
        timeout,
        // Allow self-signed certs for local devices
        httpsAgent: new (await import('https')).Agent({ rejectUnauthorized: false }),
      });

      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }
}

// Export singleton instance
const networkDiscoveryService = new NetworkDiscoveryService();
export default networkDiscoveryService;
