# VoiceFlow CRM

**Platform-as-a-Service: AI Voice Agents for Contractors**

A complete SaaS platform providing AI-powered voice calling, lead management, and workflow automation. Users pay monthly subscriptions to use YOUR infrastructure - no API keys required!

🚀 **Ready to Deploy**: Complete platform with frontend, backend, and deployment configurations.

## Business Model

**Platform-as-a-Service** - You own all infrastructure, users just sign up and pay:

| Plan | Price | Agents | Calls/Month | Revenue Potential |
|------|-------|--------|-------------|-------------------|
| Trial | Free (14 days) | 1 | 10 | Lead generation |
| Starter | $99/month | 1 | 100 | $9,900/100 users |
| Professional | $299/month | 5 | 500 | $14,950/50 users |
| Enterprise | $999/month | Unlimited | Unlimited | $9,990/10 users |

**Total MRR** (100 customers): **$23,910/month**
**Costs**: ~$2,000/month
**Profit Margin**: ~94%

## Features

### Platform Features (You Provide)
- ✅ **AI Voice Agents**: ElevenLabs conversational AI (YOUR account)
- ✅ **Phone Service**: Twilio voice & SMS (YOUR number: +16028335307)
- ✅ **Email Automation**: Gmail SMTP / SendGrid (YOUR account)
- ✅ **Workflow Automation**: n8n cloud instance (YOUR workflows)
- ✅ **Infrastructure**: MongoDB Atlas, Redis, hosting

### User Features (They Get)
- ✅ **Zero Setup**: No API keys needed - just sign up and start calling
- ✅ **Pre-built Agent Templates**: 5 ready-to-use voice agents
- ✅ **Custom Agent Creator**: Build agents with custom scripts & guardrails
- ✅ **Lead Management**: Track leads, calls, and conversions
- ✅ **Call Analytics**: Transcripts, recordings, success metrics
- ✅ **Usage Dashboard**: Monitor calls and limits

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

## 🚀 Quick Start

**Want to get your platform live?** See [QUICK_START.md](QUICK_START.md) for the fastest path to deployment!

### Deploy to Production (Recommended)

Choose your deployment platform:

**Option 1: Render.com** (Easiest - 15 min)
```bash
# 1. Push to GitHub (already done ✅)
# 2. Sign up at render.com with GitHub
# 3. Create Web Service → Connect repo → Add environment variables
# 4. Create Static Site for frontend
# Deploy complete! 🎉
```

**Option 2: Vercel + Render** (Best performance - 20 min)
```bash
cd frontend
vercel login
vercel --prod
# Then deploy backend to Render as above
```

**Option 3: Docker** (Self-hosted - 30 min)
```bash
git clone https://github.com/SGK112/voiceFlow-crm.git
cd voiceFlow-crm
cp .env.production .env.production.local
# Edit .env.production.local with your credentials
docker-compose up -d
```

📖 **Complete Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed step-by-step instructions.

### Local Development

**Prerequisites**:
- Node.js 20+
- MongoDB (or use MongoDB Atlas)
- Redis (local or cloud)

**Setup**:

1. Clone and install:

```bash
git clone https://github.com/SGK112/voiceFlow-crm.git
cd voiceFlow-crm

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
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

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Fastest way to get your platform live
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment walkthrough
- **[DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md)** - Production setup & SendGrid business plan
- **[PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md)** - Business model & revenue projections
- **[HOW_IT_WORKS.md](HOW_IT_WORKS.md)** - System architecture & data flow

## Project Status

✅ **Ready for Production Deployment**

- [x] Platform-as-a-Service architecture implemented
- [x] Subscription limits enforced (agents & calls per plan)
- [x] User API keys removed (users use platform credentials)
- [x] Production environment configured
- [x] Frontend built and optimized
- [x] Marketing landing page created
- [x] Deployment configurations ready (Render, Vercel, Docker)
- [x] Comprehensive documentation

**Next Steps**:
1. Deploy to production (see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md))
2. Configure DNS for remodely.ai
3. Submit SendGrid business plan
4. Set up Stripe products
5. Beta test with 5-10 contractors

## Revenue Potential

**100 customers** = **$23,910 MRR** (~94% profit margin)
**300 customers** = **$74,720 MRR** (~$896K/year)

See [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md) for detailed projections.

## Support

- **GitHub**: [SGK112/voiceFlow-crm](https://github.com/SGK112/voiceFlow-crm)
- **Issues**: Use GitHub Issues for bugs and feature requests
- **Documentation**: All docs are in this repository

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
