import express from 'express';
import UserProfile from '../models/UserProfile.js';
import { ariaMemoryService } from '../services/ariaMemoryService.js';
import { deviceIntegrationService } from '../services/deviceIntegrationService.js';

const router = express.Router();

/**
 * GET /api/profile/:userId
 * Get user profile
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    let profile = await UserProfile.findOne({ userId });

    if (!profile) {
      // Create default profile if doesn't exist
      profile = await UserProfile.create({ userId });
    }

    res.json({
      success: true,
      profile: profile.getFullProfile()
    });
  } catch (error) {
    console.error('L [PROFILE] Get error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/profile/:userId/personal
 * Update personal information
 */
router.put('/:userId/personal', async (req, res) => {
  try {
    const { userId } = req.params;
    const personalInfo = req.body;

    let profile = await UserProfile.findOne({ userId });
    if (!profile) {
      profile = await UserProfile.create({ userId });
    }

    profile.personalInfo = {
      ...profile.personalInfo,
      ...personalInfo
    };

    await profile.save();

    // Store name in Aria's memory
    if (personalInfo.firstName || personalInfo.fullName) {
      const name = personalInfo.fullName || personalInfo.firstName;
      await ariaMemoryService.storeMemory(userId, 'user_name', name, {
        category: 'personal',
        importance: 10,
        source: 'profile'
      });
    }

    res.json({
      success: true,
      profile: profile.getFullProfile()
    });
  } catch (error) {
    console.error('L [PROFILE] Update personal info error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/profile/:userId/preferences
 * Update contact preferences
 */
router.put('/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    profile.contactPreferences = {
      ...profile.contactPreferences,
      ...preferences
    };

    await profile.save();

    res.json({
      success: true,
      profile: profile.getFullProfile()
    });
  } catch (error) {
    console.error('L [PROFILE] Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/profile/:userId/aria
 * Update Aria preferences
 */
router.put('/:userId/aria', async (req, res) => {
  try {
    const { userId } = req.params;
    const ariaPreferences = req.body;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    profile.ariaPreferences = {
      ...profile.ariaPreferences,
      ...ariaPreferences
    };

    await profile.save();

    // Store preferences in Aria's memory
    await ariaMemoryService.storeMemory(userId, 'aria_preferences', JSON.stringify(ariaPreferences), {
      category: 'preference',
      importance: 8,
      source: 'profile'
    });

    res.json({
      success: true,
      profile: profile.getFullProfile()
    });
  } catch (error) {
    console.error('L [PROFILE] Update Aria preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/profile/:userId/permissions
 * Update device permissions
 */
router.put('/:userId/permissions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionType, granted } = req.body;

    if (!permissionType) {
      return res.status(400).json({
        success: false,
        error: 'permissionType is required'
      });
    }

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    await profile.updatePermission(permissionType, granted);

    res.json({
      success: true,
      profile: profile.getFullProfile()
    });
  } catch (error) {
    console.error('L [PROFILE] Update permissions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/profile/:userId/accounts
 * Add connected account
 */
router.post('/:userId/accounts', async (req, res) => {
  try {
    const { userId } = req.params;
    const { provider, accountData } = req.body;

    if (!provider || !accountData) {
      return res.status(400).json({
        success: false,
        error: 'provider and accountData are required'
      });
    }

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    await profile.addConnectedAccount(provider, accountData);

    console.log(` [PROFILE] Connected ${provider} account for user ${userId}`);

    res.json({
      success: true,
      profile: profile.getFullProfile()
    });
  } catch (error) {
    console.error('L [PROFILE] Add account error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/profile/:userId/accounts/:provider/:accountId
 * Remove connected account
 */
router.delete('/:userId/accounts/:provider/:accountId', async (req, res) => {
  try {
    const { userId, provider, accountId } = req.params;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    await profile.removeConnectedAccount(provider, accountId);

    console.log(` [PROFILE] Removed ${provider} account for user ${userId}`);

    res.json({
      success: true,
      profile: profile.getFullProfile()
    });
  } catch (error) {
    console.error('L [PROFILE] Remove account error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/profile/:userId/accounts
 * Get connected accounts
 */
router.get('/:userId/accounts', async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    const accounts = profile.connectedAccounts
      .filter(acc => acc.isActive)
      .map(acc => ({
        provider: acc.provider,
        accountName: acc.accountName,
        accountEmail: acc.accountEmail,
        permissions: acc.permissions,
        connectedAt: acc.connectedAt,
        lastSync: acc.lastSync
      }));

    res.json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('L [PROFILE] Get accounts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/profile/:userId/work
 * Update work information
 */
router.put('/:userId/work', async (req, res) => {
  try {
    const { userId } = req.params;
    const workInfo = req.body;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    profile.workInfo = {
      ...profile.workInfo,
      ...workInfo
    };

    await profile.save();

    res.json({
      success: true,
      profile: profile.getFullProfile()
    });
  } catch (error) {
    console.error('L [PROFILE] Update work info error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/profile/:userId/interests
 * Update interests
 */
router.put('/:userId/interests', async (req, res) => {
  try {
    const { userId } = req.params;
    const interests = req.body;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    profile.interests = {
      ...profile.interests,
      ...interests
    };

    await profile.save();

    // Store interests in Aria's memory
    if (interests.topics && interests.topics.length > 0) {
      await ariaMemoryService.storeMemory(
        userId,
        'user_interests',
        interests.topics.join(', '),
        {
          category: 'preference',
          importance: 7,
          source: 'profile'
        }
      );
    }

    res.json({
      success: true,
      profile: profile.getFullProfile()
    });
  } catch (error) {
    console.error('L [PROFILE] Update interests error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/profile/:userId/activity
 * Update user activity timestamp
 */
router.post('/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    await profile.updateActivity();

    res.json({ success: true });
  } catch (error) {
    console.error('❌ [PROFILE] Update activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/profile/:userId/sync/contacts
 * Sync contacts from device
 */
router.post('/:userId/sync/contacts', async (req, res) => {
  try {
    const { userId } = req.params;
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({
        success: false,
        error: 'contacts array is required'
      });
    }

    const result = await deviceIntegrationService.syncContacts(userId, contacts);
    res.json(result);
  } catch (error) {
    console.error('❌ [SYNC] Contacts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/profile/:userId/sync/calendar
 * Sync calendar events from device
 */
router.post('/:userId/sync/calendar', async (req, res) => {
  try {
    const { userId } = req.params;
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'events array is required'
      });
    }

    const result = await deviceIntegrationService.syncCalendar(userId, events);
    res.json(result);
  } catch (error) {
    console.error('❌ [SYNC] Calendar error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/profile/:userId/sync/calls
 * Sync call logs from device
 */
router.post('/:userId/sync/calls', async (req, res) => {
  try {
    const { userId } = req.params;
    const { calls } = req.body;

    if (!calls || !Array.isArray(calls)) {
      return res.status(400).json({
        success: false,
        error: 'calls array is required'
      });
    }

    const result = await deviceIntegrationService.syncCallLogs(userId, calls);
    res.json(result);
  } catch (error) {
    console.error('❌ [SYNC] Calls error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/profile/:userId/sync/sms
 * Sync SMS messages from device
 */
router.post('/:userId/sync/sms', async (req, res) => {
  try {
    const { userId } = req.params;
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'messages array is required'
      });
    }

    const result = await deviceIntegrationService.syncSMS(userId, messages);
    res.json(result);
  } catch (error) {
    console.error('❌ [SYNC] SMS error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/profile/:userId/sync/status
 * Get sync status for all integrations
 */
router.get('/:userId/sync/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await deviceIntegrationService.getSyncStatus(userId);
    res.json(result);
  } catch (error) {
    console.error('❌ [SYNC] Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
