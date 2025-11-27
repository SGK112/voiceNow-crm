import express from 'express';
import FleetAsset from '../models/FleetAsset.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════
// FLEET MANAGEMENT API ROUTES
// Manages people (crew), places (job sites), and things (equipment)
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/fleet - Get all fleet assets
 * Query params: type (person|place|thing), status, search
 */
router.get('/', async (req, res) => {
  try {
    const { type, status, search, limit = 50, page = 1 } = req.query;
    const userId = req.userId || 'default';

    const filter = { userId };

    if (type) {
      filter.assetType = type;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [assets, total] = await Promise.all([
      FleetAsset.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FleetAsset.countDocuments(filter)
    ]);

    res.json({
      success: true,
      assets: assets.map(a => a.getSummary()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching fleet assets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/fleet/summary - Get fleet summary statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.userId || 'default';

    const [people, places, things, assigned, maintenance] = await Promise.all([
      FleetAsset.countDocuments({ userId, assetType: 'person', status: { $ne: 'inactive' } }),
      FleetAsset.countDocuments({ userId, assetType: 'place', status: { $ne: 'inactive' } }),
      FleetAsset.countDocuments({ userId, assetType: 'thing', status: { $ne: 'inactive' } }),
      FleetAsset.countDocuments({ userId, status: 'assigned' }),
      FleetAsset.countDocuments({ userId, assetType: 'thing', nextMaintenanceDue: { $lte: new Date() } })
    ]);

    res.json({
      success: true,
      summary: {
        people: { total: people, label: 'Crew Members' },
        places: { total: places, label: 'Job Sites' },
        things: { total: things, label: 'Equipment' },
        assigned: { total: assigned, label: 'Currently Assigned' },
        maintenanceDue: { total: maintenance, label: 'Maintenance Due' }
      }
    });
  } catch (error) {
    console.error('Error fetching fleet summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/fleet/:id - Get single fleet asset
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const asset = await FleetAsset.findOne({ _id: req.params.id, userId });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({ success: true, asset });
  } catch (error) {
    console.error('Error fetching fleet asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/fleet - Create new fleet asset
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const { assetType, name, ...data } = req.body;

    if (!assetType || !name) {
      return res.status(400).json({
        success: false,
        message: 'assetType and name are required'
      });
    }

    if (!['person', 'place', 'thing'].includes(assetType)) {
      return res.status(400).json({
        success: false,
        message: 'assetType must be person, place, or thing'
      });
    }

    const asset = new FleetAsset({
      userId,
      assetType,
      name,
      ...data,
      createdBy: userId
    });

    await asset.save();

    res.status(201).json({
      success: true,
      message: `${assetType} "${name}" created successfully`,
      asset: asset.getSummary()
    });
  } catch (error) {
    console.error('Error creating fleet asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/fleet/:id - Update fleet asset
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const asset = await FleetAsset.findOne({ _id: req.params.id, userId });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'userId') {
        asset[key] = req.body[key];
      }
    });

    asset.lastModifiedBy = userId;
    await asset.save();

    res.json({
      success: true,
      message: 'Asset updated successfully',
      asset: asset.getSummary()
    });
  } catch (error) {
    console.error('Error updating fleet asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/fleet/:id - Delete fleet asset
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const asset = await FleetAsset.findOneAndDelete({ _id: req.params.id, userId });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({
      success: true,
      message: `${asset.assetType} "${asset.name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting fleet asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/fleet/:id/location - Update asset location
 */
router.post('/:id/location', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const { latitude, longitude, address, source } = req.body;

    const asset = await FleetAsset.findOne({ _id: req.params.id, userId });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    await asset.updateLocation(latitude, longitude, address, source || 'manual');

    res.json({
      success: true,
      message: 'Location updated successfully',
      currentLocation: asset.currentLocation
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/fleet/:id/assign - Assign asset to job site
 */
router.post('/:id/assign', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const { jobSiteId, jobSiteName, notes, expectedReturn } = req.body;

    const asset = await FleetAsset.findOne({ _id: req.params.id, userId });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    await asset.assignToJobSite(
      jobSiteId,
      jobSiteName,
      { id: userId, name: 'User' },
      notes,
      expectedReturn ? new Date(expectedReturn) : null
    );

    res.json({
      success: true,
      message: `${asset.name} assigned to ${jobSiteName}`,
      currentAssignment: asset.currentAssignment
    });
  } catch (error) {
    console.error('Error assigning asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/fleet/:id/unassign - Remove asset assignment
 */
router.post('/:id/unassign', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const asset = await FleetAsset.findOne({ _id: req.params.id, userId });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Move current assignment to history
    if (asset.currentAssignment && asset.currentAssignment.jobSiteId) {
      asset.assignments.push({
        ...asset.currentAssignment.toObject(),
        endDate: new Date(),
        status: 'completed'
      });
    }

    asset.currentAssignment = null;
    asset.status = 'active';
    await asset.save();

    res.json({
      success: true,
      message: `${asset.name} unassigned successfully`
    });
  } catch (error) {
    console.error('Error unassigning asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/fleet/:id/checkin - Check in asset
 */
router.post('/:id/checkin', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const { location } = req.body;

    const asset = await FleetAsset.findOne({ _id: req.params.id, userId });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    await asset.checkIn(userId, 'User', location);

    res.json({
      success: true,
      message: `${asset.name} checked in successfully`,
      checkInOut: asset.checkInOut
    });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/fleet/:id/checkout - Check out asset
 */
router.post('/:id/checkout', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const { expectedReturn } = req.body;

    const asset = await FleetAsset.findOne({ _id: req.params.id, userId });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    await asset.checkOut(userId, 'User', expectedReturn ? new Date(expectedReturn) : null);

    res.json({
      success: true,
      message: `${asset.name} checked out successfully`,
      checkInOut: asset.checkInOut
    });
  } catch (error) {
    console.error('Error checking out:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/fleet/:id/maintenance - Add maintenance record
 */
router.post('/:id/maintenance', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const asset = await FleetAsset.findOne({ _id: req.params.id, userId });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (asset.assetType !== 'thing') {
      return res.status(400).json({
        success: false,
        message: 'Maintenance records only apply to equipment/things'
      });
    }

    await asset.addMaintenanceRecord(req.body);

    res.json({
      success: true,
      message: 'Maintenance record added',
      maintenanceHistory: asset.maintenanceHistory,
      nextMaintenanceDue: asset.nextMaintenanceDue
    });
  } catch (error) {
    console.error('Error adding maintenance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/fleet/jobsite/:id/assets - Get all assets at a job site
 */
router.get('/jobsite/:id/assets', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const assets = await FleetAsset.getAssetsAtJobSite(userId, req.params.id);

    res.json({
      success: true,
      assets: assets.map(a => a.getSummary())
    });
  } catch (error) {
    console.error('Error fetching job site assets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/fleet/maintenance-due - Get assets needing maintenance
 */
router.get('/reports/maintenance-due', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const assets = await FleetAsset.getAssetsNeedingMaintenance(userId);

    res.json({
      success: true,
      assets: assets.map(a => ({
        ...a.getSummary(),
        nextMaintenanceDue: a.nextMaintenanceDue,
        lastMaintenance: a.maintenanceHistory?.slice(-1)[0]
      }))
    });
  } catch (error) {
    console.error('Error fetching maintenance due:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
