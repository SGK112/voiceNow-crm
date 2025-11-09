# VoiceFlow CRM - Implementation Guide

This guide covers implementing Google OAuth, pricing configuration, and personalization features.

---

## 1. Google OAuth Integration for Calendar

### Overview
Allow users to connect their Google Calendar to automatically sync appointments and events.

### Setup Steps

#### A. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Authorized JavaScript origins: `https://voiceflow-crm.onrender.com`
   - Authorized redirect URIs: `https://voiceflow-crm.onrender.com/api/auth/google/callback`
   - Save the **Client ID** and **Client Secret**

#### B. Backend Implementation

**Location**: `/backend/services/googleCalendarService.js`

```javascript
import { google } from 'googleapis';

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL}/api/auth/google/callback`
    );
  }

  // Generate auth URL
  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent'
    });
  }

  // Exchange code for tokens
  async getTokens(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  // List calendar events
  async listEvents(accessToken, refreshToken) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items;
  }

  // Create calendar event
  async createEvent(accessToken, refreshToken, eventData) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const event = {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timezone || 'America/New_York',
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timezone || 'America/New_York',
      },
      attendees: eventData.attendees || [],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return response.data;
  }
}

export default new GoogleCalendarService();
```

**Location**: `/backend/routes/calendar.js`

```javascript
import express from 'express';
import googleCalendarService from '../services/googleCalendarService.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get Google OAuth URL
router.get('/connect/google', protect, (req, res) => {
  const authUrl = googleCalendarService.getAuthUrl();
  res.json({ authUrl });
});

// OAuth callback
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const tokens = await googleCalendarService.getTokens(code);

    // Store tokens in user's record
    const userId = req.session.userId; // or from JWT
    await User.findByIdAndUpdate(userId, {
      googleCalendar: {
        connected: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date
      }
    });

    res.redirect('/app/integrations?success=true');
  } catch (error) {
    res.redirect('/app/integrations?error=true');
  }
});

// Get calendar events
router.get('/events', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.googleCalendar?.connected) {
      return res.status(400).json({ message: 'Google Calendar not connected' });
    }

    const events = await googleCalendarService.listEvents(
      user.googleCalendar.accessToken,
      user.googleCalendar.refreshToken
    );

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create calendar event
router.post('/events', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.googleCalendar?.connected) {
      return res.status(400).json({ message: 'Google Calendar not connected' });
    }

    const event = await googleCalendarService.createEvent(
      user.googleCalendar.accessToken,
      user.googleCalendar.refreshToken,
      req.body
    );

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
```

**Add to `/backend/server.js`**:
```javascript
import calendarRoutes from './routes/calendar.js';
app.use('/api/calendar', calendarRoutes);
```

**Environment Variables** (`.env`):
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

#### C. Frontend Implementation

The Integrations page already has a Google Calendar integration card. Update it to connect:

```javascript
// In frontend/src/pages/Integrations.jsx
const handleConnectGoogleCalendar = async () => {
  try {
    const res = await fetch('/api/calendar/connect/google');
    const { authUrl } = await res.json();
    window.location.href = authUrl; // Redirect to Google OAuth
  } catch (error) {
    alert('Failed to connect Google Calendar');
  }
};
```

---

## 2. Pricing Configuration System

### Overview
Allow users to configure pricing for their services, including price lists, profit margins, and tax rates.

### Database Schema

**Location**: `/backend/models/PricingConfig.js`

```javascript
import mongoose from 'mongoose';

const pricingItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  basePrice: { type: Number, required: true },
  unit: { type: String, default: 'each' }, // each, hour, month, etc.
  category: String,
  taxable: { type: Boolean, default: true }
});

const pricingConfigSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Price Lists
  priceList: [pricingItemSchema],

  // Margins & Markup
  defaultMargin: { type: Number, default: 20 }, // Percentage
  defaultMarkup: { type: Number, default: 25 }, // Percentage

  // Tax Configuration
  taxRates: [{
    name: String, // e.g., "Sales Tax", "VAT"
    rate: Number, // Percentage
    region: String,
    default: Boolean
  }],

  // Discount Templates
  discounts: [{
    name: String,
    type: { type: String, enum: ['percentage', 'fixed'] },
    value: Number,
    conditions: String
  }],

  // Payment Terms
  paymentTerms: [{
    name: String,
    days: Number,
    description: String
  }],

  currency: { type: String, default: 'USD' },
  currencySymbol: { type: String, default: '$' }
}, {
  timestamps: true
});

export default mongoose.model('PricingConfig', pricingConfigSchema);
```

### Backend API

**Location**: `/backend/controllers/pricingController.js`

```javascript
import PricingConfig from '../models/PricingConfig.js';

// Get pricing configuration
export const getPricingConfig = async (req, res) => {
  try {
    let config = await PricingConfig.findOne({ userId: req.user._id });

    if (!config) {
      // Create default configuration
      config = await PricingConfig.create({
        userId: req.user._id,
        priceList: [],
        taxRates: [{ name: 'Sales Tax', rate: 8.5, region: 'Default', default: true }],
        paymentTerms: [
          { name: 'Net 30', days: 30, description: 'Payment due in 30 days' },
          { name: 'Net 15', days: 15, description: 'Payment due in 15 days' },
          { name: 'Due on Receipt', days: 0, description: 'Payment due immediately' }
        ]
      });
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update pricing configuration
export const updatePricingConfig = async (req, res) => {
  try {
    const config = await PricingConfig.findOneAndUpdate(
      { userId: req.user._id },
      req.body,
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add price list item
export const addPriceListItem = async (req, res) => {
  try {
    const config = await PricingConfig.findOne({ userId: req.user._id });
    config.priceList.push(req.body);
    await config.save();

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete price list item
export const deletePriceListItem = async (req, res) => {
  try {
    const config = await PricingConfig.findOne({ userId: req.user._id });
    config.priceList.id(req.params.itemId).remove();
    await config.save();

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

**Location**: `/backend/routes/pricing.js`

```javascript
import express from 'express';
import {
  getPricingConfig,
  updatePricingConfig,
  addPriceListItem,
  deletePriceListItem
} from '../controllers/pricingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getPricingConfig);
router.put('/', protect, updatePricingConfig);
router.post('/items', protect, addPriceListItem);
router.delete('/items/:itemId', protect, deletePriceListItem);

export default router;
```

**Add to `/backend/server.js`**:
```javascript
import pricingRoutes from './routes/pricing.js';
app.use('/api/pricing', pricingRoutes);
```

### Frontend UI (Settings Page)

Create a new settings section for pricing configuration in `/frontend/src/pages/Settings.jsx`:

```javascript
// Add pricing configuration tab
<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="pricing">Pricing & Invoicing</TabsTrigger>
  </TabsList>

  <TabsContent value="pricing">
    <Card>
      <CardHeader>
        <CardTitle>Price List</CardTitle>
        <CardDescription>Manage your service and product pricing</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Price list table */}
        {/* Add/Edit/Delete buttons */}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Margins & Markup</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Default Profit Margin (%)</Label>
            <Input type="number" placeholder="20" />
          </div>
          <div>
            <Label>Default Markup (%)</Label>
            <Input type="number" placeholder="25" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Tax Rates</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tax rates configuration */}
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

---

## 3. Personalization & Branding

### Database Schema

**Location**: `/backend/models/BrandSettings.js`

```javascript
import mongoose from 'mongoose';

const brandSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Company Branding
  companyName: String,
  logo: String, // URL to logo
  primaryColor: { type: String, default: '#3B82F6' },
  secondaryColor: { type: String, default: '#10B981' },
  accentColor: { type: String, default: '#F59E0B' },

  // Contact Information
  email: String,
  phone: String,
  website: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },

  // Invoice/Document Branding
  invoicePrefix: { type: String, default: 'INV' },
  estimatePrefix: { type: String, default: 'EST' },
  invoiceFooter: String,
  termsAndConditions: String,

  // Email Signatures
  emailSignature: String,

  // Social Media
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String
  }
}, {
  timestamps: true
});

export default mongoose.model('BrandSettings', brandSettingsSchema);
```

### Backend API

**Location**: `/backend/controllers/brandingController.js`

```javascript
import BrandSettings from '../models/BrandSettings.js';

export const getBrandSettings = async (req, res) => {
  try {
    let settings = await BrandSettings.findOne({ userId: req.user._id });

    if (!settings) {
      settings = await BrandSettings.create({ userId: req.user._id });
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBrandSettings = async (req, res) => {
  try {
    const settings = await BrandSettings.findOneAndUpdate(
      { userId: req.user._id },
      req.body,
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadLogo = async (req, res) => {
  try {
    // Handle file upload (use multer or similar)
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    const settings = await BrandSettings.findOneAndUpdate(
      { userId: req.user._id },
      { logo: logoUrl },
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### Frontend Implementation

Add to Settings page:

```javascript
<TabsContent value="branding">
  <Card>
    <CardHeader>
      <CardTitle>Company Branding</CardTitle>
      <CardDescription>Customize your company's appearance</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Logo Upload */}
      <div>
        <Label>Company Logo</Label>
        <div className="mt-2">
          <input type="file" accept="image/*" />
        </div>
      </div>

      {/* Company Name */}
      <div>
        <Label>Company Name</Label>
        <Input placeholder="Your Company Name" />
      </div>

      {/* Color Scheme */}
      <div>
        <Label>Brand Colors</Label>
        <div className="grid grid-cols-3 gap-4 mt-2">
          <div>
            <Label className="text-sm">Primary</Label>
            <Input type="color" defaultValue="#3B82F6" />
          </div>
          <div>
            <Label className="text-sm">Secondary</Label>
            <Input type="color" defaultValue="#10B981" />
          </div>
          <div>
            <Label className="text-sm">Accent</Label>
            <Input type="color" defaultValue="#F59E0B" />
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Email</Label>
          <Input type="email" placeholder="contact@company.com" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input placeholder="+1 (555) 123-4567" />
        </div>
      </div>

      {/* Save Button */}
      <Button>Save Branding Settings</Button>
    </CardContent>
  </Card>
</TabsContent>
```

---

## Summary of API Endpoints

```
# Calendar
GET    /api/calendar/connect/google      - Get OAuth URL
GET    /api/calendar/auth/google/callback - OAuth callback
GET    /api/calendar/events               - List calendar events
POST   /api/calendar/events               - Create calendar event

# Pricing
GET    /api/pricing                       - Get pricing config
PUT    /api/pricing                       - Update pricing config
POST   /api/pricing/items                 - Add price list item
DELETE /api/pricing/items/:itemId         - Delete price list item

# Branding
GET    /api/branding                      - Get brand settings
PUT    /api/branding                      - Update brand settings
POST   /api/branding/logo                 - Upload logo
```

## Installation Commands

```bash
# Install required packages
cd backend
npm install googleapis
npm install multer  # For file uploads

# Run migrations (if needed)
# The models will auto-create collections in MongoDB
```

---

## Next Steps

1. **Google OAuth**: Set up credentials in Google Cloud Console
2. **Pricing**: Implement the pricing configuration UI in Settings page
3. **Branding**: Add branding tab to Settings page
4. **Test**: Test each integration thoroughly before deploying

The Integrations page already has placeholders for these features - just need to wire up the backend APIs!
