# Voice Estimate Builder - Implementation Guide

## Overview

The Voice Estimate Builder is an AI-powered feature that allows users to create professional project estimates through natural voice conversation. The system uses ElevenLabs voice AI to collect project details, pricing information, and client data, then automatically generates polished estimates that can be converted to invoices and synced with QuickBooks.

## Key Features

### 1. Voice-Driven Estimate Creation
- Natural conversation interface using ElevenLabs AI voice agent
- Guided questions to collect all necessary estimate information
- Real-time transcript of the conversation
- AI extracts structured data from natural language

### 2. Professional Estimate Documents
- Automatically generates detailed line items with quantities and pricing
- Calculates subtotals, taxes, and discounts
- Professional formatting ready to send to clients
- Customizable terms and conditions

### 3. QuickBooks Integration
- Direct sync with QuickBooks Online
- Creates customers automatically if they don't exist
- Syncs estimates with proper QuickBooks formatting
- Maintains sync status and error handling

### 4. Invoice Conversion
- One-click conversion from estimate to invoice
- Maintains all line items, pricing, and client information
- Links back to original estimate for reference
- Tracks conversion status

## Architecture

### Backend Components

#### 1. VoiceEstimate Model (`backend/models/VoiceEstimate.js`)
Stores voice-generated estimates with the following key features:
- Voice conversation metadata (conversation ID, transcript, duration)
- Client information collected via voice
- Project details and scope
- Line items with pricing
- Tax and discount calculations
- QuickBooks sync status
- Invoice conversion tracking
- AI processing metadata and confidence scores

Key Methods:
- `markAsReviewed()` - Mark estimate as reviewed by user
- `sendToClient()` - Update status when sent to client
- `acceptEstimate()` / `declineEstimate()` - Client response tracking
- `convertToInvoice()` - Convert accepted estimate to invoice

#### 2. Voice Estimate Routes (`backend/routes/voiceEstimates.js`)
RESTful API endpoints for managing voice estimates:

**POST** `/api/voice-estimates/start-session`
- Creates a new voice estimate session
- Returns estimate ID for tracking

**POST** `/api/voice-estimates/:estimateId/update-from-conversation`
- Updates estimate with data extracted from voice conversation
- Processes AI-extracted information
- Calculates totals and validates data

**GET** `/api/voice-estimates`
- List all voice estimates for authenticated user
- Supports filtering by status
- Pagination support

**GET** `/api/voice-estimates/:estimateId`
- Get single estimate with full details
- Includes related invoice if converted

**PUT** `/api/voice-estimates/:estimateId`
- Update estimate manually
- For corrections or additions after voice session

**POST** `/api/voice-estimates/:estimateId/review`
- Mark estimate as reviewed and approved

**POST** `/api/voice-estimates/:estimateId/send`
- Send estimate to client via email
- Updates status to 'sent'

**POST** `/api/voice-estimates/:estimateId/convert-to-invoice`
- Convert accepted estimate to invoice
- Creates new Invoice record
- Links estimate to invoice

**POST** `/api/voice-estimates/:estimateId/sync-quickbooks`
- Sync estimate to QuickBooks Online
- Creates customer if needed
- Creates estimate in QuickBooks
- Tracks sync status

**GET** `/api/voice-estimates/agent/config`
- Get ElevenLabs agent configuration
- Returns agent ID and settings

#### 3. ElevenLabs Agent Configuration (`backend/config/estimateAgentConfig.js`)
Defines the AI voice agent's behavior:
- Professional, friendly personality
- Structured conversation flow
- Information collection strategy
- Client data requirements
- Project scope gathering
- Line item breakdown process
- Pricing and discount handling
- Review and confirmation steps

Agent Script Features:
- Asks one question at a time to avoid overwhelming users
- Confirms information by repeating it back
- Helps calculate totals during conversation
- Flexible to adapt to different conversation flows
- Provides helpful guidance on pricing

### Frontend Components

#### Voice Estimate Builder Component (`frontend/src/components/VoiceEstimateBuilder.jsx`)

React component that provides the user interface for voice estimate creation:

**Features:**
- ElevenLabs Conversational AI widget integration
- Real-time conversation status tracking
- Live transcript display
- Estimate preview with line items and totals
- Action buttons for review, send, and QuickBooks sync

**Component States:**
- `idle` - Ready to start
- `connecting` - Initializing voice connection
- `active` - Conversation in progress
- `processing` - Extracting data from conversation
- `completed` - Estimate created successfully

**User Flow:**
1. Click "Start Voice Estimate"
2. Have natural conversation with AI agent
3. AI collects all necessary information
4. Review generated estimate
5. Edit if needed
6. Send to client or sync to QuickBooks

### Marketing Page Integration

Added comprehensive demo section to marketing page (`frontend/public/marketing.html`):
- Positioned after voicemail agent demo for logical flow
- Full-width hero section with gradient background
- Interactive demo interface preview
- Feature highlights with icons
- 4-step "How It Works" guide
- Use case examples for different industries
- Clear CTAs for signup

Section includes:
- Visual demo of the voice interface
- Explanation of what information gets collected
- Benefits over manual estimate creation
- QuickBooks integration highlight
- Time savings comparison (3-5 minutes vs 30+ minutes)

## Integration with Existing Systems

### QuickBooks Integration
The voice estimate builder leverages the existing QuickBooks integration:
- Uses `backend/services/quickbooksService.js` for API calls
- Authenticates with OAuth tokens from UserExtension model
- Creates customers and estimates using QuickBooks API v3
- Handles token refresh automatically
- Tracks sync status and errors

### Invoice System
Converts estimates to invoices using the existing Invoice model:
- Maps all fields from VoiceEstimate to Invoice
- Preserves line items, pricing, and client information
- Sets default payment terms and due dates
- Links back to original estimate
- Maintains QuickBooks sync compatibility

## Usage Guide

### For End Users

1. **Starting a Voice Estimate:**
   - Navigate to the Voice Estimate Builder
   - Click "Start Voice Estimate"
   - Allow microphone access when prompted

2. **During the Conversation:**
   - Answer the AI's questions naturally
   - Provide client name and contact information
   - Describe the project scope and requirements
   - Break down work into line items
   - Specify quantities and rates for each item
   - Mention any tax rates or discounts
   - Review the summary when AI reads it back

3. **After the Conversation:**
   - Review the generated estimate
   - Edit any fields that need correction
   - Add notes or terms and conditions
   - Click "Send to Client" to email estimate
   - Or click "Sync to QuickBooks" to sync

4. **Converting to Invoice:**
   - When client accepts, open the estimate
   - Click "Convert to Invoice"
   - Review and send invoice to client

### For Developers

**Setting up the ElevenLabs Agent:**

1. Create an ElevenLabs Conversational AI agent
2. Use the configuration from `backend/config/estimateAgentConfig.js`
3. Set the `ELEVENLABS_ESTIMATE_AGENT_ID` environment variable
4. Configure webhook for post-call data extraction (optional)

**Environment Variables:**
```bash
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_ESTIMATE_AGENT_ID=agent_id
WEBHOOK_URL=https://your-domain.com
QB_CLIENT_ID=quickbooks_client_id
QB_CLIENT_SECRET=quickbooks_client_secret
QB_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback
```

**Testing Locally:**

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Test the voice estimate flow:
   - Create an account
   - Navigate to Voice Estimate Builder
   - Start a conversation
   - Provide sample project data
   - Review generated estimate

## API Response Examples

### Start Session Response:
```json
{
  "success": true,
  "estimateId": "673a1234567890abcdef1234",
  "estimateNumber": "VEST-20251100001",
  "message": "Voice estimate session started"
}
```

### Estimate Object:
```json
{
  "_id": "673a1234567890abcdef1234",
  "user": "673a1234567890abcdef5678",
  "estimateNumber": "VEST-20251100001",
  "title": "Kitchen Remodel Estimate",
  "client": {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "(555) 123-4567",
    "company": "Smith Residence"
  },
  "items": [
    {
      "description": "Custom cabinet installation",
      "quantity": 20,
      "rate": 150,
      "amount": 3000,
      "category": "Cabinetry"
    },
    {
      "description": "Granite countertop installation",
      "quantity": 45,
      "rate": 75,
      "amount": 3375,
      "category": "Countertops"
    }
  ],
  "subtotal": 6375,
  "taxRate": 8.5,
  "taxAmount": 541.88,
  "discount": 0,
  "total": 6916.88,
  "status": "draft",
  "aiProcessed": true,
  "aiConfidenceScore": 92,
  "needsReview": true,
  "syncStatus": "pending"
}
```

## Future Enhancements

### Planned Features:
1. **AI-Powered Pricing Suggestions**
   - Analyze historical estimates
   - Suggest market-rate pricing
   - Warn about unusual rates

2. **Multi-Language Support**
   - Support estimates in different languages
   - Automatic translation
   - Regional pricing formats

3. **Voice Template Library**
   - Pre-built conversation templates for common industries
   - Customizable agent scripts
   - Industry-specific questioning flows

4. **Advanced Analytics**
   - Track estimate conversion rates
   - Identify pricing trends
   - Compare voice vs manual estimate creation time

5. **Client Portal**
   - Clients can review estimates online
   - Accept/decline with e-signature
   - Request modifications via voice

6. **Mobile App Integration**
   - Create estimates on-the-go
   - Voice input via smartphone
   - Offline mode with sync

## Troubleshooting

### Common Issues:

**1. Voice connection fails:**
- Check ElevenLabs API key is valid
- Verify agent ID is correct
- Ensure microphone permissions are granted
- Check browser compatibility (Chrome/Firefox recommended)

**2. QuickBooks sync errors:**
- Verify QuickBooks connection is active
- Check OAuth token hasn't expired
- Ensure customer exists or can be created
- Review sync error messages in estimate details

**3. AI extraction accuracy:**
- Speak clearly and at moderate pace
- Provide specific numbers (don't say "around 100")
- Confirm details when AI repeats them back
- Use consistent units (hours, units, etc.)

**4. Invoice conversion fails:**
- Ensure estimate is in 'accepted' or 'reviewed' status
- Check that estimate hasn't already been converted
- Verify all required fields are populated

## Security Considerations

- All voice conversations are encrypted in transit
- Transcripts are stored securely in MongoDB
- QuickBooks OAuth tokens are encrypted
- User authentication required for all estimate operations
- CSRF protection on all API endpoints
- Rate limiting on voice estimate creation

## Performance Optimization

- Estimates are cached in browser during creation
- QuickBooks sync is asynchronous
- AI processing happens in background
- Pagination for estimate lists
- Indexed database queries for fast retrieval

## Support & Documentation

For additional help:
- Review the ElevenLabs documentation: https://elevenlabs.io/docs
- Check QuickBooks API documentation: https://developer.intuit.com
- Contact support for voice agent customization
- See the main VoiceNow CRM documentation

## Conclusion

The Voice Estimate Builder streamlines the estimate creation process, reducing time from 30+ minutes to just 3-5 minutes per estimate. By combining voice AI with CRM integration and QuickBooks sync, it provides a complete solution for professional service businesses, contractors, and consultants to quickly generate accurate, professional estimates.
