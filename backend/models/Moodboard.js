import mongoose from 'mongoose';

const materialItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['countertops', 'tile', 'flooring', 'stone', 'cabinets', 'fixtures', 'paint', 'lighting', 'hardware', 'appliances', 'other'],
    default: 'other'
  },
  supplier: String,
  supplierUrl: String,
  productUrl: String,
  sku: String,
  imageUrl: { type: String, required: true },
  thumbnailUrl: String,
  color: String,
  finish: String,
  material: String, // e.g., quartz, porcelain, marble
  dimensions: {
    width: Number,
    height: Number,
    depth: Number,
    unit: { type: String, default: 'in' }
  },
  pricePerUnit: Number,
  priceUnit: String, // sqft, linear ft, each, etc.
  estimatedTotal: Number,
  quantity: Number,
  notes: String,
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 200 },
    height: { type: Number, default: 200 },
    zIndex: { type: Number, default: 0 }
  },
  addedAt: { type: Date, default: Date.now },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  userAvatar: String,
  content: { type: String, required: true },
  materialItemId: mongoose.Schema.Types.ObjectId, // Optional - comment on specific item
  position: { // For pin comments on the board
    x: Number,
    y: Number
  },
  mentions: [{
    userId: mongoose.Schema.Types.ObjectId,
    userName: String
  }],
  reactions: [{
    userId: mongoose.Schema.Types.ObjectId,
    emoji: String,
    createdAt: { type: Date, default: Date.now }
  }],
  resolved: { type: Boolean, default: false },
  resolvedBy: mongoose.Schema.Types.ObjectId,
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  action: {
    type: String,
    enum: ['created', 'updated', 'added_item', 'removed_item', 'commented', 'shared', 'approved', 'rejected', 'exported', 'duplicated'],
    required: true
  },
  details: String,
  itemName: String,
  createdAt: { type: Date, default: Date.now }
});

const moodboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Basic Info
  name: {
    type: String,
    required: [true, 'Moodboard name is required']
  },
  description: String,
  coverImage: String, // First item or custom cover

  // Categorization
  category: {
    type: String,
    enum: ['kitchen', 'bathroom', 'bedroom', 'living_room', 'outdoor', 'office', 'whole_home', 'commercial', 'other'],
    default: 'other'
  },
  style: {
    type: String,
    enum: ['modern', 'traditional', 'transitional', 'farmhouse', 'coastal', 'industrial', 'minimalist', 'bohemian', 'mediterranean', 'contemporary', 'other'],
    default: 'other'
  },
  tags: [String],

  // Link to Project/Lead/Contact
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  },

  // Materials/Items
  items: [materialItemSchema],

  // Layout Settings
  layout: {
    type: { type: String, enum: ['grid', 'freeform', 'masonry', 'columns'], default: 'grid' },
    columns: { type: Number, default: 3 },
    spacing: { type: Number, default: 16 },
    backgroundColor: { type: String, default: '#ffffff' }
  },

  // Budget Tracking
  budget: {
    estimated: Number,
    materials: { type: Number, default: 0 },
    labor: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },

  // Collaboration & Sharing
  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String, // For external collaborators
    name: String,
    role: {
      type: String,
      enum: ['owner', 'editor', 'commenter', 'viewer'],
      default: 'viewer'
    },
    invitedAt: { type: Date, default: Date.now },
    invitedBy: mongoose.Schema.Types.ObjectId,
    acceptedAt: Date,
    lastViewedAt: Date
  }],

  // Sharing Settings
  sharing: {
    isPublic: { type: Boolean, default: false },
    publicUrl: String, // Unique shareable URL
    publicPassword: String, // Optional password protection
    allowComments: { type: Boolean, default: true },
    allowDownload: { type: Boolean, default: false },
    expiresAt: Date,
    viewCount: { type: Number, default: 0 }
  },

  // Approval Workflow
  approval: {
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'changes_requested', 'approved', 'rejected'],
      default: 'draft'
    },
    submittedAt: Date,
    submittedBy: mongoose.Schema.Types.ObjectId,
    reviewedAt: Date,
    reviewedBy: mongoose.Schema.Types.ObjectId,
    reviewerNotes: String,
    clientApproval: {
      approved: Boolean,
      approvedAt: Date,
      signature: String, // Base64 signature image
      notes: String
    }
  },

  // Comments
  comments: [commentSchema],

  // Activity Log
  activity: [activitySchema],

  // Version History
  versions: [{
    versionNumber: { type: Number, required: true },
    name: String,
    snapshot: mongoose.Schema.Types.Mixed, // Store items state
    createdAt: { type: Date, default: Date.now },
    createdBy: mongoose.Schema.Types.ObjectId,
    notes: String
  }],
  currentVersion: { type: Number, default: 1 },

  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },

  // AI Generated
  aiGenerated: { type: Boolean, default: false },
  aiPrompt: String,

  // Metadata
  lastEditedAt: Date,
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate budget totals before save
moodboardSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.budget.materials = this.items.reduce((sum, item) => {
      return sum + (item.estimatedTotal || 0);
    }, 0);
    this.budget.total = (this.budget.materials || 0) + (this.budget.labor || 0);
  }

  // Set cover image from first item if not set
  if (!this.coverImage && this.items && this.items.length > 0) {
    this.coverImage = this.items[0].imageUrl;
  }

  next();
});

// Generate unique public URL
moodboardSchema.methods.generatePublicUrl = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let url = '';
  for (let i = 0; i < 12; i++) {
    url += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.sharing.publicUrl = url;
  return url;
};

// Add activity log entry
moodboardSchema.methods.logActivity = function(userId, userName, action, details, itemName) {
  this.activity.push({
    userId,
    userName,
    action,
    details,
    itemName
  });
  // Keep only last 100 activities
  if (this.activity.length > 100) {
    this.activity = this.activity.slice(-100);
  }
};

// Check if user has access
moodboardSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  const roles = ['viewer', 'commenter', 'editor', 'owner'];
  const requiredIndex = roles.indexOf(requiredRole);

  // Owner always has access
  if (this.userId.toString() === userId.toString()) {
    return true;
  }

  // Check collaborators
  const collaborator = this.collaborators.find(c =>
    c.userId && c.userId.toString() === userId.toString()
  );

  if (collaborator) {
    const userRoleIndex = roles.indexOf(collaborator.role);
    return userRoleIndex >= requiredIndex;
  }

  // Check if public
  if (this.sharing.isPublic && requiredRole === 'viewer') {
    return true;
  }

  return false;
};

// Indexes
moodboardSchema.index({ userId: 1, status: 1 });
moodboardSchema.index({ projectId: 1 });
moodboardSchema.index({ leadId: 1 });
moodboardSchema.index({ contactId: 1 });
moodboardSchema.index({ 'sharing.publicUrl': 1 });
moodboardSchema.index({ 'collaborators.userId': 1 });
moodboardSchema.index({ 'collaborators.email': 1 });
moodboardSchema.index({ tags: 1 });
moodboardSchema.index({ createdAt: -1 });

const Moodboard = mongoose.model('Moodboard', moodboardSchema);

export default Moodboard;
