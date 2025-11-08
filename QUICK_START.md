# VoiceFlow CRM - Quick Start Guide

**Your Platform-as-a-Service is Ready to Deploy! 🚀**

## What You Have

✅ **Complete Platform-as-a-Service Application**
- Users don't need API keys - you provide everything
- Subscription-based business model with usage limits
- Full-stack React + Node.js application
- MongoDB Atlas database configured
- ElevenLabs AI voice agents integration
- Twilio voice & SMS (+16028335307)
- n8n workflow automation
- Email notifications via Gmail SMTP
- Marketing landing page at `/`

## Your Credentials (Platform Owned)

All users share these platform credentials:

| Service | Status |
|---------|--------|
| **ElevenLabs API** | ✅ Configured |
| **Twilio** | ✅ Configured (+16028335307) |
| **MongoDB Atlas** | ✅ Configured |
| **n8n Cloud** | ✅ Configured (remodely.app.n8n.cloud) |
| **Gmail SMTP** | ✅ Configured (helpremodely@gmail.com) |
| **SendGrid** | ⏳ Pending approval |
| **Stripe** | ⏳ Need to set up products |

## Subscription Plans

| Plan | Price | Agents | Calls/Month |
|------|-------|--------|-------------|
| **Trial** | Free (14 days) | 1 | 10 |
| **Starter** | $99/month | 1 | 100 |
| **Professional** | $299/month | 5 | 500 |
| **Enterprise** | $999/month | Unlimited | Unlimited |

## Project Structure

```
voiceflow-crm/
├── backend/              # Node.js/Express API
│   ├── controllers/      # Business logic (updated for platform model)
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── services/        # ElevenLabs, Email, etc.
│   └── server.js        # Entry point
├── frontend/            # React + Vite
│   ├── src/
│   │   ├── pages/       # Dashboard, Agents, Leads, Settings
│   │   └── components/  # UI components
│   ├── public/
│   │   └── index.html   # Marketing landing page
│   └── dist/            # Production build (generated)
├── .env.production      # Production credentials (NOT in git)
├── render.yaml          # Render.com deployment config
├── vercel.json          # Vercel deployment config
├── Dockerfile           # Docker production build
├── docker-compose.yml   # Docker orchestration
└── Documentation/
    ├── DEPLOYMENT_GUIDE.md      # Complete deployment steps
    ├── DEPLOYMENT_SETUP.md      # Production setup & SendGrid plan
    ├── PLATFORM_ARCHITECTURE.md # Business model explanation
    └── HOW_IT_WORKS.md         # System architecture
```

## Quick Deploy - Choose Your Path

### 🌟 Option 1: Render.com (Recommended - Easiest)

**Time: ~15 minutes**

1. **Sign up**: [render.com](https://render.com) with GitHub
2. **Deploy Backend**:
   - New Web Service → Connect `SGK112/voiceFlow-crm`
   - Build: `cd backend && npm install`
   - Start: `cd backend && npm start`
   - Add Redis addon (free)
   - Copy all environment variables from `.env.production`
3. **Deploy Frontend**:
   - New Static Site → Same repo
   - Build: `cd frontend && npm install && npm run build`
   - Publish: `frontend/dist`
   - Set `VITE_API_URL` to your backend URL

**Cost**: ~$7-15/month

### 🚀 Option 2: Vercel (Frontend) + Render (Backend)

**Time: ~20 minutes**

1. **Backend on Render** (same as above)
2. **Frontend on Vercel**:
   ```bash
   cd frontend
   vercel login
   vercel --prod
   ```

**Cost**: ~$7/month (Vercel frontend is free)

### 🐳 Option 3: Docker (Self-Hosted)

**Time: ~30 minutes**

For DigitalOcean, AWS, or your own server:

```bash
# On your server
git clone https://github.com/SGK112/voiceFlow-crm.git
cd voiceFlow-crm

# Configure production environment
cp .env.production .env.production.local
nano .env.production.local  # Add your credentials

# Build and run
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

**Cost**: $12-24/month (server cost)

## DNS Configuration

After deployment, point your domain to the services:

### For Render/Vercel:

```
# Main site (frontend)
Type: CNAME
Name: @
Value: <your-frontend-url>.onrender.com (or cname.vercel-dns.com)

# API (backend)
Type: CNAME
Name: api
Value: <your-backend-url>.onrender.com
```

### URLs:
- **Frontend**: `https://remodely.ai`
- **Backend API**: `https://api.remodely.ai`
- **Marketing Page**: `https://remodely.ai/` (landing page)
- **CRM App**: `https://remodely.ai/login` (dashboard)

## Environment Variables Checklist

Before deploying, verify you have values for these in `.env.production`:

**Required**:
- [ ] `MONGODB_URI` - Your MongoDB Atlas connection string
- [ ] `JWT_SECRET` - Generate random 64-char string
- [ ] `ENCRYPTION_KEY` - Generate random 32-char string
- [ ] `ELEVENLABS_API_KEY` - Your ElevenLabs API key
- [ ] `TWILIO_ACCOUNT_SID` - Your Twilio SID
- [ ] `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- [ ] `SMTP_PASSWORD` - Your Gmail app password
- [ ] `N8N_API_KEY` - Your n8n API key

**Optional (for later)**:
- [ ] `STRIPE_SECRET_KEY` - Stripe live key (when ready)
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- [ ] `AWS_ACCESS_KEY_ID` - For S3 call recordings (optional)

## Generate Secrets

```bash
# JWT Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption Key (32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## After Deployment

### 1. Test the Deployment

```bash
# Test backend health
curl https://api.remodely.ai/api/health
# Should return: {"status":"ok"}

# Test frontend
open https://remodely.ai
# Should show marketing landing page
```

### 2. Create First User

1. Go to `https://remodely.ai`
2. Click "Get Started" → Navigate to `/login`
3. Click "Sign Up"
4. Create your admin account
5. Login to dashboard

### 3. Create Test Agent

1. Go to "Agents" page
2. Click "Create Agent"
3. Choose "Lead Generation" type
4. Customize name and script
5. Click "Create"
6. Agent is created in YOUR ElevenLabs account ✅

### 4. Test Voice Call

1. Go to "Leads" page
2. Add a test lead with your phone number
3. Click "Call" → Select agent
4. Click "Initiate Call"
5. You should receive a call from +16028335307 ✅

## Next Steps for Launch

### Week 1: Technical Setup
- [ ] Deploy to production (follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md))
- [ ] Set up monitoring (Render/Vercel dashboards)
- [ ] Configure custom domain (remodely.ai)
- [ ] Test complete user flow
- [ ] Set up error tracking (Sentry optional)

### Week 2: Business Setup
- [ ] Submit SendGrid business plan (see [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md))
- [ ] Create Stripe products:
  - Starter: $99/month
  - Professional: $299/month
  - Enterprise: $999/month
- [ ] Set up payment webhooks
- [ ] Create terms of service & privacy policy

### Week 3: Marketing
- [ ] Update landing page copy
- [ ] Create demo video (record agent call)
- [ ] Set up analytics (Google Analytics)
- [ ] Prepare social media content
- [ ] Create help documentation

### Week 4: Beta Launch
- [ ] Invite 5-10 beta users (contractors you know)
- [ ] Collect feedback
- [ ] Fix critical issues
- [ ] Prepare case studies
- [ ] Plan public launch

## Revenue Projections

### Conservative (100 customers in 6 months):
- 50 Starter ($99) = $4,950/month
- 30 Professional ($299) = $8,970/month
- 10 Enterprise ($999) = $9,990/month
- **Total MRR: $23,910/month**
- **Costs: ~$2,000/month**
- **Profit: ~$21,910/month**

### Optimistic (300 customers in 12 months):
- 150 Starter = $14,850/month
- 100 Professional = $29,900/month
- 30 Enterprise = $29,970/month
- **Total MRR: $74,720/month**
- **Annual Revenue: ~$896,640**

## Support Resources

### Documentation
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Complete deployment walkthrough
- [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) - Production setup & SendGrid plan
- [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md) - Business model details
- [HOW_IT_WORKS.md](HOW_IT_WORKS.md) - System architecture

### Platform Dashboards
- **GitHub**: [SGK112/voiceFlow-crm](https://github.com/SGK112/voiceFlow-crm)
- **MongoDB**: [cloud.mongodb.com](https://cloud.mongodb.com)
- **ElevenLabs**: [elevenlabs.io](https://elevenlabs.io)
- **Twilio**: [console.twilio.com](https://console.twilio.com)
- **n8n**: [remodely.app.n8n.cloud](https://remodely.app.n8n.cloud)

### Monitoring (After Deployment)
- **Render Dashboard**: Check logs, metrics, and deployments
- **Vercel Dashboard**: Analytics and deployment status
- **MongoDB Atlas**: Database performance and backups

## Common Commands

```bash
# Development
cd /Users/homepc/voiceflow-crm
npm run dev          # Start local development

# Build
cd frontend && npm run build  # Build frontend for production

# Git
git status           # Check changes
git add .            # Stage all changes
git commit -m "..."  # Commit with message
git push             # Push to GitHub (auto-deploys if configured)

# Docker (if self-hosting)
docker-compose up -d              # Start all services
docker-compose logs -f backend    # View backend logs
docker-compose restart backend    # Restart backend
docker-compose down               # Stop all services
```

## Emergency Contacts

### Service Issues
- **Render Support**: support@render.com
- **Vercel Support**: support@vercel.com
- **MongoDB Atlas**: cloud-support@mongodb.com
- **Twilio**: help@twilio.com

### Critical Configs
- **Twilio Phone**: +16028335307
- **Support Email**: helpremodely@gmail.com
- **Domain**: remodely.ai

---

## You're Ready! 🎉

**Everything is built and ready to deploy.**

Choose your deployment method above and follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed step-by-step instructions.

**Estimated time to live**: 15-30 minutes depending on platform choice.

**Questions?** Review the documentation in this repository. Every detail has been documented.

**Good luck with your launch!** 🚀
