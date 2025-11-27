import mongoose from 'mongoose';

// ═══════════════════════════════════════════════════════════════════
// FLEET ASSET MODEL
// Tracks people (crew), places (job sites), and things (equipment/vehicles)
// ═══════════════════════════════════════════════════════════════════

const locationHistorySchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  address: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['gps', 'manual', 'checkin', 'geofence'],
    default: 'manual'
  }
});

const maintenanceRecordSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['scheduled', 'repair', 'inspection', 'certification', 'other'],
    required: true
  },
  description: String,
  performedBy: String,
  cost: Number,
  date: {
    type: Date,
    default: Date.now
  },
  nextDueDate: Date,
  notes: String,
  attachments: [String]
});

const assignmentSchema = new mongoose.Schema({
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'assignments.assignedToModel'
  },
  assignedToModel: {
    type: String,
    enum: ['FleetAsset', 'Contact']
  },
  assignedToName: String,
  jobSiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FleetAsset'
  },
  jobSiteName: String,
  startDate: Date,
  endDate: Date,
  notes: String,
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  }
});

const fleetAssetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },

  // Asset Type Classification
  assetType: {
    type: String,
    required: true,
    enum: ['person', 'place', 'thing'],
    index: true
  },

  // Common Fields
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'unavailable', 'assigned'],
    default: 'active',
    index: true
  },
  tags: [String],
  notes: String,

  // ═══════════════════════════════════════════════════════════════════
  // PERSON-SPECIFIC FIELDS (Crew Members)
  // ═══════════════════════════════════════════════════════════════════
  person: {
    role: {
      type: String,
      enum: ['owner', 'foreman', 'lead', 'journeyman', 'apprentice', 'laborer', 'specialist', 'subcontractor', 'other']
    },
    skills: [String], // ['framing', 'electrical', 'plumbing', 'hvac', 'roofing', 'concrete', 'drywall', etc.]
    certifications: [{
      name: String,
      issuer: String,
      issueDate: Date,
      expiryDate: Date,
      number: String
    }],
    phone: String,
    email: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    hourlyRate: Number,
    dailyRate: Number,
    availability: {
      type: String,
      enum: ['full-time', 'part-time', 'on-call', 'contract'],
      default: 'full-time'
    },
    // Link to contact if exists
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact'
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // PLACE-SPECIFIC FIELDS (Job Sites)
  // ═══════════════════════════════════════════════════════════════════
  place: {
    siteType: {
      type: String,
      enum: ['residential', 'commercial', 'industrial', 'municipal', 'warehouse', 'office', 'shop', 'yard', 'other']
    },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: {
        type: String,
        default: 'USA'
      }
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    geofenceRadius: {
      type: Number,
      default: 100 // meters
    },
    client: {
      name: String,
      contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
      },
      phone: String,
      email: String
    },
    projectDetails: {
      projectName: String,
      projectNumber: String,
      contractValue: Number,
      startDate: Date,
      estimatedEndDate: Date,
      actualEndDate: Date,
      status: {
        type: String,
        enum: ['planning', 'in-progress', 'on-hold', 'completed', 'cancelled'],
        default: 'planning'
      }
    },
    siteAccess: {
      gateCode: String,
      keyLocation: String,
      accessHours: String,
      specialInstructions: String
    },
    permits: [{
      type: String,
      number: String,
      issueDate: Date,
      expiryDate: Date,
      status: String
    }]
  },

  // ═══════════════════════════════════════════════════════════════════
  // THING-SPECIFIC FIELDS (Equipment/Vehicles)
  // ═══════════════════════════════════════════════════════════════════
  thing: {
    category: {
      type: String,
      enum: ['vehicle', 'heavy-equipment', 'power-tool', 'hand-tool', 'safety-equipment', 'material', 'trailer', 'other']
    },
    make: String,
    model: String,
    year: Number,
    serialNumber: String,
    vin: String,
    licensePlate: String,
    // For vehicles
    mileage: Number,
    fuelType: {
      type: String,
      enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'propane', 'na']
    },
    // For equipment
    hoursUsed: Number,
    purchaseDate: Date,
    purchasePrice: Number,
    currentValue: Number,
    // Insurance/Registration
    insurance: {
      provider: String,
      policyNumber: String,
      expiryDate: Date
    },
    registration: {
      number: String,
      expiryDate: Date
    },
    // Rental info if rented
    isRented: {
      type: Boolean,
      default: false
    },
    rental: {
      company: String,
      rentalStart: Date,
      rentalEnd: Date,
      dailyRate: Number,
      contactPhone: String
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // TRACKING & ASSIGNMENT
  // ═══════════════════════════════════════════════════════════════════

  // Current Location
  currentLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    lastUpdated: Date,
    source: {
      type: String,
      enum: ['gps', 'manual', 'checkin', 'geofence'],
      default: 'manual'
    }
  },

  // Location History
  locationHistory: [locationHistorySchema],

  // Current Assignment
  currentAssignment: {
    jobSiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FleetAsset'
    },
    jobSiteName: String,
    assignedById: String,
    assignedByName: String,
    assignedAt: Date,
    expectedReturn: Date,
    notes: String
  },

  // Assignment History
  assignments: [assignmentSchema],

  // Maintenance Records (for things)
  maintenanceHistory: [maintenanceRecordSchema],
  nextMaintenanceDue: Date,

  // Check-in/Check-out tracking
  checkInOut: {
    isCheckedIn: {
      type: Boolean,
      default: false
    },
    checkedInAt: Date,
    checkedInBy: String,
    checkedInLocation: String,
    checkedOutAt: Date,
    checkedOutBy: String,
    expectedReturn: Date
  },

  // Photo/Document attachments
  photos: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Metadata
  createdBy: String,
  lastModifiedBy: String
}, {
  timestamps: true
});

// ═══════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════
fleetAssetSchema.index({ userId: 1, assetType: 1 });
fleetAssetSchema.index({ userId: 1, status: 1 });
fleetAssetSchema.index({ userId: 1, 'currentAssignment.jobSiteId': 1 });
fleetAssetSchema.index({ 'place.coordinates.latitude': 1, 'place.coordinates.longitude': 1 });
fleetAssetSchema.index({ tags: 1 });

// ═══════════════════════════════════════════════════════════════════
// METHODS
// ═══════════════════════════════════════════════════════════════════

/**
 * Update location with history tracking
 */
fleetAssetSchema.methods.updateLocation = function(latitude, longitude, address, source = 'manual') {
  // Save to history
  this.locationHistory.push({
    latitude,
    longitude,
    address,
    source,
    timestamp: new Date()
  });

  // Keep only last 100 location entries
  if (this.locationHistory.length > 100) {
    this.locationHistory = this.locationHistory.slice(-100);
  }

  // Update current location
  this.currentLocation = {
    latitude,
    longitude,
    address,
    lastUpdated: new Date(),
    source
  };

  return this.save();
};

/**
 * Assign asset to a job site
 */
fleetAssetSchema.methods.assignToJobSite = function(jobSiteId, jobSiteName, assignedBy, notes, expectedReturn) {
  // End current assignment if exists
  if (this.currentAssignment && this.currentAssignment.jobSiteId) {
    this.assignments.push({
      ...this.currentAssignment,
      endDate: new Date(),
      status: 'completed'
    });
  }

  // Set new assignment
  this.currentAssignment = {
    jobSiteId,
    jobSiteName,
    assignedById: assignedBy.id,
    assignedByName: assignedBy.name,
    assignedAt: new Date(),
    expectedReturn,
    notes
  };

  this.status = 'assigned';
  return this.save();
};

/**
 * Check in asset
 */
fleetAssetSchema.methods.checkIn = function(userId, userName, location) {
  this.checkInOut = {
    isCheckedIn: true,
    checkedInAt: new Date(),
    checkedInBy: userName,
    checkedInLocation: location,
    checkedOutAt: null,
    checkedOutBy: null,
    expectedReturn: null
  };

  if (location && location.latitude) {
    this.updateLocation(location.latitude, location.longitude, location.address, 'checkin');
  }

  return this.save();
};

/**
 * Check out asset
 */
fleetAssetSchema.methods.checkOut = function(userId, userName, expectedReturn) {
  this.checkInOut.isCheckedIn = false;
  this.checkInOut.checkedOutAt = new Date();
  this.checkInOut.checkedOutBy = userName;
  this.checkInOut.expectedReturn = expectedReturn;

  return this.save();
};

/**
 * Add maintenance record
 */
fleetAssetSchema.methods.addMaintenanceRecord = function(record) {
  this.maintenanceHistory.push(record);
  if (record.nextDueDate) {
    this.nextMaintenanceDue = record.nextDueDate;
  }
  return this.save();
};

/**
 * Get summary info based on asset type
 */
fleetAssetSchema.methods.getSummary = function() {
  const base = {
    id: this._id,
    name: this.name,
    assetType: this.assetType,
    status: this.status,
    currentLocation: this.currentLocation,
    currentAssignment: this.currentAssignment
  };

  switch (this.assetType) {
    case 'person':
      return {
        ...base,
        role: this.person?.role,
        skills: this.person?.skills,
        phone: this.person?.phone,
        availability: this.person?.availability
      };
    case 'place':
      return {
        ...base,
        siteType: this.place?.siteType,
        address: this.place?.address,
        projectStatus: this.place?.projectDetails?.status,
        client: this.place?.client?.name
      };
    case 'thing':
      return {
        ...base,
        category: this.thing?.category,
        make: this.thing?.make,
        model: this.thing?.model,
        isRented: this.thing?.isRented,
        nextMaintenanceDue: this.nextMaintenanceDue
      };
    default:
      return base;
  }
};

// ═══════════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all assets at a specific job site
 */
fleetAssetSchema.statics.getAssetsAtJobSite = function(userId, jobSiteId) {
  return this.find({
    userId,
    'currentAssignment.jobSiteId': jobSiteId
  });
};

/**
 * Get all available assets of a type
 */
fleetAssetSchema.statics.getAvailableAssets = function(userId, assetType) {
  return this.find({
    userId,
    assetType,
    status: { $in: ['active', 'available'] }
  });
};

/**
 * Get assets needing maintenance
 */
fleetAssetSchema.statics.getAssetsNeedingMaintenance = function(userId) {
  const now = new Date();
  return this.find({
    userId,
    assetType: 'thing',
    nextMaintenanceDue: { $lte: now }
  });
};

/**
 * Search assets
 */
fleetAssetSchema.statics.searchAssets = function(userId, query, assetType = null) {
  const searchFilter = {
    userId,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
      { 'person.skills': { $in: [new RegExp(query, 'i')] } },
      { 'thing.make': { $regex: query, $options: 'i' } },
      { 'thing.model': { $regex: query, $options: 'i' } },
      { 'place.address.city': { $regex: query, $options: 'i' } }
    ]
  };

  if (assetType) {
    searchFilter.assetType = assetType;
  }

  return this.find(searchFilter);
};

const FleetAsset = mongoose.model('FleetAsset', fleetAssetSchema);

export default FleetAsset;
