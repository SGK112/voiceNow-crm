# VoiceFlow CRM

AI-powered Voice Agent CRM system with ElevenLabs integration, n8n workflow automation, and Stripe subscriptions.

## Features

- **AI Voice Agents**: 5 pre-configured agents (Lead Gen, Booking, Collections, Promo, Support)
- **Call Management**: Track all calls with transcripts and recordings
- **Lead Management**: Capture and manage leads from voice calls
- **Workflow Automation**: n8n integration for custom workflows
- **Subscription Plans**: Stripe-powered billing (Starter, Professional, Enterprise)
- **Analytics Dashboard**: Real-time metrics and performance tracking

## Tech Stack

### Backend
- Node.js + Express
- MongoDB (database)
- Redis (caching)
- JWT + Google OAuth (authentication)
- Stripe (payments)
- ElevenLabs API (voice agents)

### Frontend
- React 18 + Vite
- React Router
- Tailwind CSS
- shadcn/ui components
- TanStack Query

### Automation
- n8n (workflow automation)
- Pre-built workflow templates

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MongoDB
- Redis

### Environment Setup

1. Copy environment files:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

2. Update `.env` with your credentials:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/voiceflow-crm

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_STARTER_PRICE_ID=price_starter
STRIPE_PROFESSIONAL_PRICE_ID=price_professional
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise

# ElevenLabs
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_LEAD_GEN_AGENT_ID=agent_id_1
ELEVENLABS_BOOKING_AGENT_ID=agent_id_2
ELEVENLABS_COLLECTIONS_AGENT_ID=agent_id_3
ELEVENLABS_PROMO_AGENT_ID=agent_id_4
ELEVENLABS_SUPPORT_AGENT_ID=agent_id_5

# n8n
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_API_KEY=your-n8n-api-key

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@voiceflow.com
```

### Installation

#### Option 1: Docker (Recommended)

```bash
docker-compose up -d
```

This will start:
- MongoDB (port 27017)
- Redis (port 6379)
- Backend API (port 5000)
- Frontend (port 5173)
- n8n (port 5678)

#### Option 2: Manual Installation

```bash
# Install all dependencies
npm run install-all

# Start backend
npm run server

# Start frontend (in another terminal)
cd frontend && npm run dev

# Start MongoDB & Redis manually
mongod
redis-server
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **n8n**: http://localhost:5678 (admin/password)
- **MongoDB**: mongodb://localhost:27017

## API Endpoints

### Authentication
```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/google
GET    /api/auth/me
```

### Agents
```
GET    /api/agents
POST   /api/agents/create
GET    /api/agents/:id
PATCH  /api/agents/:id
DELETE /api/agents/:id
GET    /api/agents/:id/calls
GET    /api/agents/:id/performance
```

### Calls
```
GET    /api/calls
GET    /api/calls/:id
DELETE /api/calls/:id
```

### Leads
```
GET    /api/leads
POST   /api/leads
GET    /api/leads/:id
PATCH  /api/leads/:id
DELETE /api/leads/:id
GET    /api/leads/export
```

### Workflows
```
GET    /api/workflows
POST   /api/workflows
GET    /api/workflows/:id
PATCH  /api/workflows/:id
POST   /api/workflows/:id/activate
DELETE /api/workflows/:id
GET    /api/workflows/templates
```

### Subscription
```
GET    /api/subscription/plans
POST   /api/subscription/create
POST   /api/subscription/cancel
PATCH  /api/subscription/update
GET    /api/subscription/invoices
```

### Webhooks
```
POST   /api/webhooks/elevenlabs
POST   /api/webhooks/n8n
POST   /api/webhooks/stripe
```

## Database Models

- **User**: Company account, subscription, API keys
- **VoiceAgent**: AI agent configuration, performance metrics
- **CallLog**: Call records, transcripts, recordings
- **Lead**: CRM lead data, qualification status
- **N8nWorkflow**: Automation workflows, execution stats
- **SubscriptionPlan**: Pricing tiers, features
- **Usage**: Monthly usage tracking

## Subscription Plans

### Starter - $99/month
- Lead Gen Agent only
- 100 calls/month
- Basic workflows

### Professional - $299/month
- Lead Gen + Booking + SMS
- 500 calls/month
- Advanced workflows
- Priority support

### Enterprise - $999/month
- All agents
- Unlimited calls
- Custom workflows
- Dedicated support

## Pre-built Voice Agents

1. **Sarah - Lead Gen**: Outbound lead qualification
2. **Mike - Appointment Booking**: Schedule appointments with calendar sync
3. **James - Collections**: Payment reminders and follow-ups
4. **Lisa - Promotions**: Upsell and cross-sell campaigns
5. **Alex - Support**: Customer service and ticket routing

## n8n Workflow Templates

- **Save Call to CRM**: Auto-save leads from calls
- **Send SMS After Call**: Twilio SMS confirmation
- **Book Appointment**: Google Calendar integration
- **Update Invoice**: Stripe invoice updates
- **Slack Notification**: Team alerts on new leads
- **Send Email**: SendGrid follow-up emails

## Security Features

- JWT authentication with 30-day expiration
- API key encryption in database
- Webhook signature verification
- Rate limiting on all endpoints
- MongoDB sanitization
- CORS protection
- Helmet security headers

## Development

### Project Structure

```
voiceflow-crm/
├── backend/
│   ├── config/          # Database, Redis config
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, error handling
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # ElevenLabs, Stripe, n8n
│   ├── utils/           # Encryption, helpers
│   └── server.js        # Express app
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Route pages
│   │   ├── context/     # Auth context
│   │   ├── services/    # API client
│   │   ├── lib/         # Utils
│   │   └── styles/      # Tailwind CSS
│   └── vite.config.js
└── docker-compose.yml
```

### Running Tests

```bash
# Backend tests
npm test

# Frontend tests
cd frontend && npm test
```

### Building for Production

```bash
# Build frontend
cd frontend && npm run build

# Start production server
NODE_ENV=production npm start
```

## ElevenLabs Setup

1. Create account at elevenlabs.io
2. Generate API key
3. Create 5 conversational AI agents for each type
4. Copy agent IDs to `.env`
5. Configure webhook URL: `https://your-domain.com/api/webhooks/elevenlabs`

## Stripe Setup

1. Create Stripe account
2. Create 3 subscription products:
   - Starter ($99/month)
   - Professional ($299/month)
   - Enterprise ($999/month)
3. Copy price IDs to `.env`
4. Configure webhook endpoint: `https://your-domain.com/api/webhooks/stripe`

## n8n Setup

1. Access n8n at http://localhost:5678
2. Login with admin/password
3. Import workflow templates from `/api/workflows/templates`
4. Configure credentials (Twilio, SendGrid, Google Calendar)
5. Activate workflows

## Deployment

### Heroku

```bash
heroku create voiceflow-crm
heroku addons:create mongolab
heroku addons:create heroku-redis
heroku config:set NODE_ENV=production
git push heroku main
```

### AWS/DigitalOcean

Use Docker Compose with production `.env` file:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Support

- Documentation: https://docs.voiceflow.com
- Email: support@voiceflow.com
- GitHub Issues: https://github.com/your-org/voiceflow-crm/issues

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Acknowledgments

- ElevenLabs for voice AI
- n8n for workflow automation
- Stripe for payment processing
- shadcn/ui for beautiful components
