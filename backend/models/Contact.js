import mongoose from 'mongoose';

const conversationHistorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['call', 'sms', 'email'],
    required: true
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, { _id: true });

const contactSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  company: {
    type: String,
    trim: true
  },
  notes: {
    type: String
  },
  avatar: {
    type: String
  },

  // Conversation tracking
  conversationHistory: [conversationHistorySchema],

  // Last interaction tracking
  lastInteraction: {
    type: Date
  },
  lastInteractionType: {
    type: String,
    enum: ['call', 'sms', 'email']
  },

  // Statistics
  totalCalls: {
    type: Number,
    default: 0
  },
  totalSMS: {
    type: Number,
    default: 0
  },
  totalEmails: {
    type: Number,
    default: 0
  },

  // Tags for categorization
  tags: [String],

  // Link to Lead if this contact becomes a lead
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },

  // Import source
  importSource: {
    type: String,
    enum: ['manual', 'phone', 'csv', 'api', 'lead'],
    default: 'manual'
  },
  importBatchId: String,

  // Custom fields
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Language Preferences for Translation Services
  languagePreferences: {
    // Contact's native/primary language
    nativeLanguage: {
      type: String,
      default: null
    },
    // Preferred language for communication with this contact
    preferredLanguage: {
      type: String,
      default: null
    },
    // Other languages the contact speaks/understands
    otherLanguages: [{
      code: String,
      proficiency: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced', 'fluent', 'native'],
        default: 'intermediate'
      }
    }],
    // Detected language from past conversations (auto-detected)
    detectedLanguage: {
      code: String,
      confidence: Number,
      detectedAt: Date
    },
    // Automatically translate messages to/from this contact
    autoTranslate: {
      type: Boolean,
      default: false
    },
    // Translation formality level preference for this contact
    formalityLevel: {
      type: String,
      enum: ['informal', 'neutral', 'formal'],
      default: 'neutral'
    },
    // Notes about language/communication style with this contact
    languageNotes: String
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
contactSchema.index({ user: 1, isDeleted: 1 });
contactSchema.index({ user: 1, name: 1 });
contactSchema.index({ user: 1, phone: 1 });
contactSchema.index({ user: 1, email: 1 });
contactSchema.index({ user: 1, lastInteraction: -1 });

// Method to add conversation history
contactSchema.methods.addConversation = function(type, direction, content, metadata = {}) {
  this.conversationHistory.push({
    type,
    direction,
    content,
    timestamp: new Date(),
    metadata
  });

  // Update last interaction
  this.lastInteraction = new Date();
  this.lastInteractionType = type;

  // Update statistics
  if (type === 'call') this.totalCalls++;
  else if (type === 'sms') this.totalSMS++;
  else if (type === 'email') this.totalEmails++;

  return this.save();
};

// Method to check if contact exists by phone
contactSchema.statics.findByPhone = function(userId, phone) {
  return this.findOne({ user: userId, phone, isDeleted: false });
};

// Method to search contacts
contactSchema.statics.searchContacts = function(userId, query) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    user: userId,
    isDeleted: false,
    $or: [
      { name: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
      { company: searchRegex }
    ]
  }).sort({ name: 1 });
};

// Method to update language preferences
contactSchema.methods.updateLanguagePreferences = function(preferences) {
  if (!this.languagePreferences) {
    this.languagePreferences = {};
  }

  const allowedFields = [
    'nativeLanguage', 'preferredLanguage', 'otherLanguages',
    'autoTranslate', 'formalityLevel', 'languageNotes'
  ];

  for (const field of allowedFields) {
    if (preferences[field] !== undefined) {
      this.languagePreferences[field] = preferences[field];
    }
  }

  return this.save();
};

// Method to update detected language (auto-detected from conversations)
contactSchema.methods.updateDetectedLanguage = function(languageCode, confidence) {
  if (!this.languagePreferences) {
    this.languagePreferences = {};
  }

  this.languagePreferences.detectedLanguage = {
    code: languageCode,
    confidence: confidence,
    detectedAt: new Date()
  };

  return this.save();
};

// Method to get contact's effective language (preferred > detected > native > default)
contactSchema.methods.getEffectiveLanguage = function() {
  const prefs = this.languagePreferences || {};
  return prefs.preferredLanguage
    || prefs.detectedLanguage?.code
    || prefs.nativeLanguage
    || 'en';
};

// Static method to find contacts by language
contactSchema.statics.findByLanguage = function(userId, languageCode) {
  return this.find({
    user: userId,
    isDeleted: false,
    $or: [
      { 'languagePreferences.nativeLanguage': languageCode },
      { 'languagePreferences.preferredLanguage': languageCode },
      { 'languagePreferences.otherLanguages.code': languageCode },
      { 'languagePreferences.detectedLanguage.code': languageCode }
    ]
  }).sort({ name: 1 });
};

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
