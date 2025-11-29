import mongoose from 'mongoose';

/**
 * Business Profile Model
 *
 * Central repository for all company information.
 * Agents pull from this instead of asking setup questions.
 */

const businessProfileSchema = new mongoose.Schema({
  // Link to user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One profile per user (unique also creates index)
  },

  // Company Information
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  legalName: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  website: {
    type: String,
    trim: true
  },
  taxId: {
    type: String,
    trim: true
  },
  logo: {
    type: String, // URL to uploaded logo
    default: null
  },

  // Business Address
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zip: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      default: 'USA'
    }
  },

  // Billing Address (optional, defaults to business address)
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },

  // Service Area (simple approach for mobile)
  serviceArea: {
    type: {
      type: String,
      enum: ['radius', 'custom'],
      default: 'radius'
    },
    radiusMiles: {
      type: Number,
      default: 25
    },
    // For custom areas, just store zip codes or cities
    customAreas: [{
      type: String,
      trim: true
    }]
  },

  // Business Details
  industry: {
    type: String,
    enum: [
      'general-contractor',
      'remodeling',
      'carpentry',
      'hvac',
      'plumbing',
      'electrical',
      'flooring',
      'roofing',
      'painting',
      'landscaping',
      'other'
    ]
  },
  businessType: {
    type: String,
    enum: ['contractor', 'subcontractor', 'supplier', 'consultant', 'other']
  },
  yearsInBusiness: {
    type: Number,
    min: 0
  },
  numberOfEmployees: {
    type: Number,
    min: 1,
    default: 1
  },

  // Pricing & Procedures
  procedures: {
    // Default margin for quotes (percentage as decimal, e.g., 0.35 = 35%)
    defaultMargin: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.35
    },
    // Payment terms
    paymentTerms: {
      type: String,
      enum: ['due-on-receipt', 'net-15', 'net-30', 'net-60', 'custom'],
      default: 'net-30'
    },
    customPaymentTerms: {
      type: String,
      trim: true
    },
    // Quote approval workflow
    quoteApprovalRequired: {
      type: Boolean,
      default: false
    },
    // Warranty period in months
    warrantyPeriodMonths: {
      type: Number,
      default: 12,
      min: 0
    }
  },

  // Price Sheets (file uploads)
  priceSheets: [{
    filename: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ['pdf', 'csv', 'xlsx', 'xls', 'other']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    fileSize: Number
  }],

  // Team Members (can be synced from integrations or manually added)
  teamMembers: [{
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      lowercase: true
    },
    phone: String,
    role: {
      type: String,
      enum: ['owner', 'manager', 'foreman', 'estimator', 'admin', 'crew', 'other']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Integration Sync Status
  integrationSync: {
    quickbooks: {
      enabled: {
        type: Boolean,
        default: false
      },
      lastSync: Date,
      customerCount: {
        type: Number,
        default: 0
      },
      vendorCount: {
        type: Number,
        default: 0
      }
    },
    google: {
      enabled: {
        type: Boolean,
        default: false
      },
      lastSync: Date,
      contactCount: {
        type: Number,
        default: 0
      }
    }
  },

  // Profile Completion Status
  completionStatus: {
    basicInfo: {
      type: Boolean,
      default: false
    },
    address: {
      type: Boolean,
      default: false
    },
    serviceArea: {
      type: Boolean,
      default: false
    },
    procedures: {
      type: Boolean,
      default: false
    },
    percentComplete: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
// Note: userId already has a unique index from schema definition
businessProfileSchema.index({ 'address.zip': 1 });

// Virtual: Is billing address different?
businessProfileSchema.virtual('hasSeparateBillingAddress').get(function() {
  return this.billingAddress && this.billingAddress.street;
});

// Method: Calculate completion percentage
businessProfileSchema.methods.calculateCompletion = function() {
  let completed = 0;
  let total = 4;

  // Basic info (name, phone, email)
  if (this.companyName && this.phone && this.email) {
    completed++;
    this.completionStatus.basicInfo = true;
  } else {
    this.completionStatus.basicInfo = false;
  }

  // Address
  if (this.address.street && this.address.city && this.address.state && this.address.zip) {
    completed++;
    this.completionStatus.address = true;
  } else {
    this.completionStatus.address = false;
  }

  // Service area
  if (this.serviceArea.radiusMiles || this.serviceArea.customAreas.length > 0) {
    completed++;
    this.completionStatus.serviceArea = true;
  } else {
    this.completionStatus.serviceArea = false;
  }

  // Procedures
  if (this.procedures.defaultMargin && this.procedures.paymentTerms) {
    completed++;
    this.completionStatus.procedures = true;
  } else {
    this.completionStatus.procedures = false;
  }

  this.completionStatus.percentComplete = Math.round((completed / total) * 100);
  return this.completionStatus.percentComplete;
};

// Method: Get service area description
businessProfileSchema.methods.getServiceAreaDescription = function() {
  if (this.serviceArea.type === 'radius') {
    const city = this.address.city || 'business location';
    return `${this.serviceArea.radiusMiles} miles from ${city}`;
  } else if (this.serviceArea.customAreas.length > 0) {
    return this.serviceArea.customAreas.join(', ');
  }
  return 'Not specified';
};

// Method: Get formatted payment terms
businessProfileSchema.methods.getPaymentTermsDisplay = function() {
  if (this.procedures.paymentTerms === 'custom') {
    return this.procedures.customPaymentTerms || 'Custom terms';
  }

  const terms = {
    'due-on-receipt': 'Due on Receipt',
    'net-15': 'Net 15',
    'net-30': 'Net 30',
    'net-60': 'Net 60'
  };

  return terms[this.procedures.paymentTerms] || 'Not specified';
};

// Static: Find or create profile for user
businessProfileSchema.statics.findOrCreateForUser = async function(userId) {
  let profile = await this.findOne({ userId });

  if (!profile) {
    profile = await this.create({
      userId,
      companyName: 'My Company',
      phone: '',
      email: ''
    });
  }

  return profile;
};

// Pre-save hook: Update completion status
businessProfileSchema.pre('save', function(next) {
  this.calculateCompletion();
  next();
});

const BusinessProfile = mongoose.model('BusinessProfile', businessProfileSchema);

export default BusinessProfile;
