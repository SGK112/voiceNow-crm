/**
 * Network Devices API Routes
 * Endpoints for Aria to discover and control network devices
 */

import express from 'express';
import networkDiscoveryService from '../services/networkDiscoveryService.js';

const router = express.Router();

/**
 * GET /api/network/discover
 * Perform full network discovery scan
 */
router.get('/discover', async (req, res) => {
  try {
    console.log('[NetworkDevices] Starting network discovery...');
    const result = await networkDiscoveryService.discoverDevices();

    if (result.success) {
      res.json({
        success: true,
        message: `Found ${result.count} devices on the network`,
        network: result.network,
        devices: result.devices,
        duration: result.duration,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[NetworkDevices] Discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/network/quick-scan
 * Quick scan of previously discovered devices
 */
router.get('/quick-scan', async (req, res) => {
  try {
    const devices = await networkDiscoveryService.quickScan();
    res.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/network/devices
 * Get cached list of discovered devices
 */
router.get('/devices', (req, res) => {
  const devices = networkDiscoveryService.getCachedDevices();
  res.json({
    success: true,
    devices,
    count: devices.length,
  });
});

/**
 * GET /api/network/devices/:ip
 * Get details for a specific device
 */
router.get('/devices/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    let device = networkDiscoveryService.getDevice(ip);

    if (!device) {
      // Try to scan this specific IP
      const openPorts = await networkDiscoveryService.scanPorts(ip);
      if (openPorts.length > 0) {
        device = {
          ip,
          openPorts,
          type: networkDiscoveryService.identifyDeviceType({ openPorts }),
          capabilities: networkDiscoveryService.getDeviceCapabilities({ openPorts }),
          discoveredAt: new Date().toISOString(),
        };
      }
    }

    if (device) {
      res.json({
        success: true,
        device,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Device not found or offline',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/network/info
 * Get local network information
 */
router.get('/info', (req, res) => {
  const networks = networkDiscoveryService.getNetworkInfo();
  res.json({
    success: true,
    networks,
  });
});

/**
 * POST /api/network/wake
 * Send Wake-on-LAN packet to a device
 */
router.post('/wake', async (req, res) => {
  try {
    const { mac, ip } = req.body;

    let targetMac = mac;
    if (!targetMac && ip) {
      const device = networkDiscoveryService.getDevice(ip);
      if (device) {
        targetMac = device.mac;
      }
    }

    if (!targetMac) {
      return res.status(400).json({
        success: false,
        error: 'MAC address required (or IP of known device)',
      });
    }

    const result = await networkDiscoveryService.wakeOnLan(targetMac);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/network/print
 * Print to a network printer
 */
router.post('/print', async (req, res) => {
  try {
    const { ip, content, options } = req.body;

    if (!ip || !content) {
      return res.status(400).json({
        success: false,
        error: 'IP and content required',
      });
    }

    const result = await networkDiscoveryService.printToDevice(ip, content, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/network/sonos
 * Control Sonos speaker
 */
router.post('/sonos', async (req, res) => {
  try {
    const { ip, action, params } = req.body;

    if (!ip || !action) {
      return res.status(400).json({
        success: false,
        error: 'IP and action required',
      });
    }

    const result = await networkDiscoveryService.controlSonos(ip, action, params);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/network/http
 * Make HTTP request to a device
 */
router.post('/http', async (req, res) => {
  try {
    const { ip, method, path, port, data, headers } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP required',
      });
    }

    const result = await networkDiscoveryService.httpRequest(ip, {
      method,
      path,
      port,
      data,
      headers,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/network/devices/:ip/action
 * Perform action on a device based on its capabilities
 */
router.post('/devices/:ip/action', async (req, res) => {
  try {
    const { ip } = req.params;
    const { action, params } = req.body;

    const device = networkDiscoveryService.getDevice(ip);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found. Run discovery first.',
      });
    }

    let result;

    switch (action) {
      case 'wake':
        result = await networkDiscoveryService.wakeOnLan(device.mac);
        break;

      case 'print':
        result = await networkDiscoveryService.printToDevice(ip, params.content, params.options);
        break;

      case 'sonos':
        result = await networkDiscoveryService.controlSonos(ip, params.action, params);
        break;

      case 'http':
        result = await networkDiscoveryService.httpRequest(ip, params);
        break;

      case 'ping':
        const ping = await networkDiscoveryService.pingHost(ip);
        result = { success: true, ...ping };
        break;

      case 'scan':
        const ports = await networkDiscoveryService.scanPorts(ip);
        result = { success: true, openPorts: ports };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`,
          availableActions: ['wake', 'print', 'sonos', 'http', 'ping', 'scan'],
        });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/network/devices/type/:type
 * Get devices by type (printer, speaker, computer, etc.)
 */
router.get('/devices/type/:type', (req, res) => {
  const { type } = req.params;
  const devices = networkDiscoveryService.getCachedDevices();
  const filtered = devices.filter(d => d.type === type.toLowerCase());

  res.json({
    success: true,
    type,
    devices: filtered,
    count: filtered.length,
  });
});

/**
 * GET /api/network/devices/capability/:capability
 * Get devices by capability (ssh, print, cast, etc.)
 */
router.get('/devices/capability/:capability', (req, res) => {
  const { capability } = req.params;
  const devices = networkDiscoveryService.getCachedDevices();
  const filtered = devices.filter(d => d.capabilities?.includes(capability.toLowerCase()));

  res.json({
    success: true,
    capability,
    devices: filtered,
    count: filtered.length,
  });
});

export default router;
