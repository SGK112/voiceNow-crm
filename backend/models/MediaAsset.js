import mongoose from 'mongoose';

/**
 * Media Asset Model
 * Stores all AI-generated images and videos in user's media library
 */
const mediaAssetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Asset metadata
  type: {
    type: String,
    enum: ['image', 'video', 'upscaled', 'background_removed', 'animated'],
    required: true
  },

  url: {
    type: String,
    required: true
  },

  thumbnailUrl: {
    type: String
  },

  // Generation details
  prompt: {
    type: String,
    required: true
  },

  model: {
    type: String,
    required: true
  },

  style: String,

  aspectRatio: String,

  // Organization
  name: {
    type: String,
    default: function() {
      return `Generated ${this.type} - ${new Date().toLocaleDateString()}`;
    }
  },

  description: String,

  tags: [String],

  category: {
    type: String,
    enum: ['product', 'marketing', 'social', 'presentation', 'email', 'agent', 'other'],
    default: 'other'
  },

  folder: {
    type: String,
    default: 'General'
  },

  // Usage tracking
  usedInPosts: [{
    platform: String,
    postId: String,
    postedAt: Date
  }],

  usedByAgents: [{
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VoiceAgent'
    },
    agentName: String,
    conversationId: String,
    usedAt: Date
  }],

  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    sharedAt: Date,
    permissions: {
      type: String,
      enum: ['view', 'use', 'edit'],
      default: 'view'
    }
  }],

  // Engagement metrics
  views: {
    type: Number,
    default: 0
  },

  downloads: {
    type: Number,
    default: 0
  },

  agentReferences: {
    type: Number,
    default: 0
  },

  // AI metadata
  generationDetails: {
    creditsUsed: Number,
    duration: Number,
    generatedAt: Date,
    sourceImageUrl: String, // For image-to-video
    parentAssetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MediaAsset'
    } // For variations
  },

  // Status
  status: {
    type: String,
    enum: ['generating', 'ready', 'processing', 'failed', 'archived'],
    default: 'ready'
  },

  errorMessage: String,

  // Flags
  isFavorite: {
    type: Boolean,
    default: false
  },

  isPublic: {
    type: Boolean,
    default: false
  },

  isArchived: {
    type: Boolean,
    default: false
  },

  // SEO (for public media)
  altText: String,
  seoKeywords: [String]
}, {
  timestamps: true
});

// Indexes
mediaAssetSchema.index({ userId: 1, createdAt: -1 });
mediaAssetSchema.index({ userId: 1, type: 1 });
mediaAssetSchema.index({ userId: 1, category: 1 });
mediaAssetSchema.index({ userId: 1, folder: 1 });
mediaAssetSchema.index({ tags: 1 });
mediaAssetSchema.index({ status: 1 });

// Virtual for usage count
mediaAssetSchema.virtual('totalUsage').get(function() {
  return (this.usedInPosts?.length || 0) +
         (this.usedByAgents?.length || 0) +
         this.views +
         this.downloads;
});

// Method to mark as used by agent
mediaAssetSchema.methods.recordAgentUsage = function(agentId, agentName, conversationId) {
  this.usedByAgents.push({
    agentId,
    agentName,
    conversationId,
    usedAt: new Date()
  });
  this.agentReferences += 1;
  return this.save();
};

// Method to mark as used in post
mediaAssetSchema.methods.recordPostUsage = function(platform, postId) {
  this.usedInPosts.push({
    platform,
    postId,
    postedAt: new Date()
  });
  return this.save();
};

// Static method to get user's library with filters
mediaAssetSchema.statics.getUserLibrary = async function(userId, filters = {}) {
  const query = { userId, isArchived: false };

  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.folder) query.folder = filters.folder;
  if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
  if (filters.isFavorite) query.isFavorite = true;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(filters.limit || 50);
};

// Static method to get agent-accessible media
mediaAssetSchema.statics.getAgentAccessibleMedia = async function(userId, searchQuery) {
  const query = {
    userId,
    status: 'ready',
    isArchived: false
  };

  if (searchQuery) {
    query.$or = [
      { name: new RegExp(searchQuery, 'i') },
      { description: new RegExp(searchQuery, 'i') },
      { tags: new RegExp(searchQuery, 'i') },
      { prompt: new RegExp(searchQuery, 'i') }
    ];
  }

  return this.find(query)
    .select('name description url thumbnailUrl type category tags prompt')
    .sort({ createdAt: -1 })
    .limit(20);
};

const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);

export default MediaAsset;
