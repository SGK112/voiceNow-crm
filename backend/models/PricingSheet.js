import mongoose from 'mongoose';

const pricingItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    trim: true
  },
  description: {
    type: String
  },
  // Pricing
  unitCost: {
    type: Number,
    required: true
  },
  unitPrice: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    default: 'each',
    enum: ['each', 'sqft', 'linear_ft', 'hour', 'day', 'project', 'pound', 'gallon', 'bundle']
  },
  // Markup
  markupPercent: {
    type: Number,
    default: 20
  },
  // Categorization
  category: {
    type: String,
    required: true,
    enum: [
      'granite', 'quartz', 'marble', 'quartzite', 'porcelain', 'laminate',
      'sink', 'faucet', 'backsplash', 'edge_profile',
      'labor', 'installation', 'demolition', 'plumbing', 'electrical',
      'cabinet', 'flooring', 'tile', 'paint',
      'supplies', 'hardware', 'misc'
    ]
  },
  subcategory: {
    type: String
  },
  // For stone materials
  supplier: {
    type: String
  },
  slabSize: {
    type: String // e.g., "120x60", "130x65"
  },
  thickness: {
    type: String // e.g., "2cm", "3cm"
  },
  finish: {
    type: String // e.g., "polished", "honed", "leathered"
  },
  // Availability
  inStock: {
    type: Boolean,
    default: true
  },
  leadTimeDays: {
    type: Number,
    default: 0
  },
  // Metadata
  notes: {
    type: String
  },
  imageUrl: {
    type: String
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const pricingSheetSchema = new mongoose.Schema({
  // Sheet identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  version: {
    type: String,
    default: '1.0'
  },
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  expirationDate: {
    type: Date
  },
  // Company info
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Pricing items
  items: [pricingItemSchema],
  // Labor rates
  laborRates: {
    standard: { type: Number, default: 65 },
    premium: { type: Number, default: 85 },
    emergency: { type: Number, default: 125 },
    weekend: { type: Number, default: 95 }
  },
  // Default settings
  defaultMarkup: {
    type: Number,
    default: 20
  },
  taxRate: {
    type: Number,
    default: 0 // Tax handled separately
  },
  // Common pricing (quick reference)
  commonPrices: {
    // Countertop sq ft ranges
    level1SqFt: { type: Number, default: 45 },  // Entry level granite/quartz
    level2SqFt: { type: Number, default: 55 },  // Mid-range
    level3SqFt: { type: Number, default: 70 },  // Premium
    level4SqFt: { type: Number, default: 90 },  // Exotic
    level5SqFt: { type: Number, default: 120 }, // Ultra-premium
    // Edge profiles
    standardEdge: { type: Number, default: 0 },
    bullnoseEdge: { type: Number, default: 12 },
    ogeeEdge: { type: Number, default: 15 },
    beveledEdge: { type: Number, default: 10 },
    waterfallEdge: { type: Number, default: 25 },
    // Common items
    sinkCutout: { type: Number, default: 150 },
    cooktopCutout: { type: Number, default: 125 },
    backsplash4Inch: { type: Number, default: 35 }, // per linear ft
    backsplashFull: { type: Number, default: 65 },  // per sq ft
    demolition: { type: Number, default: 250 },     // flat rate
    plumbingDisconnect: { type: Number, default: 125 },
    plumbingReconnect: { type: Number, default: 175 }
  },
  // Status
  active: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Indexes
pricingSheetSchema.index({ name: 1 });
pricingSheetSchema.index({ active: 1, isDefault: 1 });
pricingSheetSchema.index({ 'items.category': 1 });
pricingSheetSchema.index({ 'items.name': 'text', 'items.description': 'text' });

// Methods
pricingSheetSchema.methods.findItem = function(query) {
  const lowerQuery = query.toLowerCase();
  return this.items.filter(item =>
    item.name.toLowerCase().includes(lowerQuery) ||
    (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
    (item.sku && item.sku.toLowerCase().includes(lowerQuery))
  );
};

pricingSheetSchema.methods.getItemsByCategory = function(category) {
  return this.items.filter(item => item.category === category && item.active);
};

pricingSheetSchema.methods.calculatePrice = function(itemName, quantity = 1) {
  const item = this.items.find(i =>
    i.name.toLowerCase() === itemName.toLowerCase() && i.active
  );
  if (!item) return null;
  return {
    item: item.name,
    unitPrice: item.unitPrice,
    quantity,
    total: item.unitPrice * quantity,
    unit: item.unit
  };
};

// Statics
pricingSheetSchema.statics.getDefaultSheet = async function() {
  return await this.findOne({ isDefault: true, active: true });
};

pricingSheetSchema.statics.getActiveSheet = async function() {
  const now = new Date();
  return await this.findOne({
    active: true,
    effectiveDate: { $lte: now },
    $or: [
      { expirationDate: null },
      { expirationDate: { $gte: now } }
    ]
  }).sort({ isDefault: -1, effectiveDate: -1 });
};

const PricingSheet = mongoose.model('PricingSheet', pricingSheetSchema);

export default PricingSheet;
