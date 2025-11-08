# VoiceFlow CRM - Complete Deployment Guide

This guide will walk you through deploying VoiceFlow CRM to production using Render.com (recommended) or alternative platforms.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start - Render.com (Recommended)](#quick-start---rendercom-recommended)
3. [Alternative: Vercel + Railway](#alternative-vercel--railway)
4. [Alternative: Docker Deployment](#alternative-docker-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [DNS Setup](#dns-setup)
7. [Testing Your Deployment](#testing-your-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account with your code pushed
- ✅ Domain name (remodely.ai) with DNS access
- ✅ MongoDB Atlas account (already configured)
- ✅ ElevenLabs API key
- ✅ Twilio account credentials
- ✅ n8n cloud instance (remodely.app.n8n.cloud)
- ✅ Gmail app password for SMTP
- ✅ `.env.production` file configured locally (DO NOT commit this)

---

## Quick Start - Render.com (Recommended)

Render.com is the easiest deployment option with built-in Redis, automatic SSL, and GitHub integration.

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up using your GitHub account
3. Authorize Render to access your repositories

### Step 2: Deploy Backend API

1. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `SGK112/voiceFlow-crm`
   - Name: `voiceflow-crm-backend`
   - Region: Oregon (or closest to your users)
   - Branch: `main`
   - Root Directory: Leave blank
   - Runtime: `Node`
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Plan: Select "Starter" ($7/month)

2. **Add Environment Variables**:

   Click "Advanced" → "Add Environment Variable" and add all variables from your `.env.production` file:

   ```env
   NODE_ENV=production
   PORT=5000
   CLIENT_URL=https://remodely.ai
   API_URL=https://voiceflow-crm-backend.onrender.com

   # MongoDB Atlas
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/voiceflowAI_production?retryWrites=true&w=majority

   # JWT - Generate new secrets using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   JWT_SECRET=<generate-64-char-random-string>
   JWT_EXPIRE=30d
   ENCRYPTION_KEY=<generate-32-char-random-string>

   # Platform Credentials
   ELEVENLABS_API_KEY=<your-elevenlabs-api-key>
   N8N_WEBHOOK_URL=https://remodely.app.n8n.cloud/webhook
   N8N_API_KEY=<your-n8n-api-key>
   TWILIO_ACCOUNT_SID=<your-twilio-sid>
   TWILIO_AUTH_TOKEN=<your-twilio-token>
   TWILIO_PHONE_NUMBER=+16028335307

   # Email (Gmail SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=helpremodely@gmail.com
   SMTP_PASSWORD=<your-gmail-app-password>
   SMTP_FROM_EMAIL=noreply@remodely.ai
   SMTP_FROM_NAME=VoiceFlow CRM

   # Stripe (when ready)
   STRIPE_SECRET_KEY=sk_live_<your-live-key>
   STRIPE_WEBHOOK_SECRET=whsec_<your-live-webhook>
   ```

3. **Add Redis Addon**:
   - In your web service settings, go to "Environment"
   - Click "Add Redis"
   - Select "Starter" plan (Free)
   - This automatically adds `REDIS_URL` environment variable

4. **Deploy**:
   - Click "Create Web Service"
   - Wait 3-5 minutes for deployment
   - Note your backend URL (e.g., `https://voiceflow-crm-backend.onrender.com`)

### Step 3: Deploy Frontend (Option A - Render Static Site)

1. **Create Static Site**:
   - Click "New +" → "Static Site"
   - Connect same repository
   - Name: `voiceflow-crm-frontend`
   - Branch: `main`
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`

2. **Add Environment Variable**:
   ```env
   VITE_API_URL=https://voiceflow-crm-backend.onrender.com
   ```

3. **Deploy**:
   - Click "Create Static Site"
   - Wait 2-3 minutes
   - Note your frontend URL (e.g., `https://voiceflow-crm-frontend.onrender.com`)

### Step 3: Deploy Frontend (Option B - Vercel, Recommended)

Vercel offers better performance for React apps:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy Frontend**:
   ```bash
   cd /Users/homepc/voiceflow-crm/frontend
   vercel --prod
   ```

4. **Configure Environment**:
   - When prompted, set project name: `voiceflow-crm`
   - Add environment variable:
     ```
     VITE_API_URL=https://voiceflow-crm-backend.onrender.com
     ```

5. **Custom Domain**:
   - Go to Vercel dashboard → Your project → Settings → Domains
   - Add domain: `remodely.ai`
   - Follow DNS instructions

---

## Alternative: Vercel + Railway

If you prefer Railway for the backend:

### Backend on Railway

1. **Create Railway Account**: [railway.app](https://railway.app)
2. **New Project**:
   - Click "New Project" → "Deploy from GitHub"
   - Select `voiceFlow-crm` repository
   - Railway auto-detects Node.js

3. **Configure**:
   - Add all environment variables from `.env.production`
   - Add Redis plugin: Click "New" → "Database" → "Redis"
   - Deploy automatically starts

4. **Get URL**:
   - Go to Settings → Generate Domain
   - Note your API URL

### Frontend on Vercel

Follow "Step 3: Option B" above, but use your Railway backend URL.

---

## Alternative: Docker Deployment

For self-hosting on DigitalOcean, AWS, or your own server:

### Step 1: Prepare Server

1. **Create Droplet/Instance**:
   - Ubuntu 22.04 LTS
   - At least 2GB RAM
   - 50GB storage

2. **Install Docker**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Install Docker Compose**:
   ```bash
   sudo apt-get update
   sudo apt-get install docker-compose-plugin
   ```

### Step 2: Clone Repository

```bash
git clone https://github.com/SGK112/voiceFlow-crm.git
cd voiceFlow-crm
```

### Step 3: Configure Environment

```bash
# Copy production environment template
cp .env.production .env.production.local

# Edit with your actual credentials
nano .env.production.local

# Update docker-compose.yml to use .env.production.local
```

### Step 4: Build and Deploy

```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

### Step 5: Setup Nginx Reverse Proxy

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/voiceflow
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name api.remodely.ai;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name remodely.ai www.remodely.ai;

    root /var/www/voiceflow-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/voiceflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d remodely.ai -d www.remodely.ai -d api.remodely.ai
```

---

## Post-Deployment Configuration

### 1. Update Frontend API URL

If using Render for backend, update your frontend environment:

**Vercel**:
```bash
vercel env add VITE_API_URL production
# Enter: https://voiceflow-crm-backend.onrender.com
vercel --prod
```

**Render Static Site**:
- Go to Environment tab
- Update `VITE_API_URL` to your backend URL
- Trigger manual deploy

### 2. Configure CORS

The backend automatically allows your `CLIENT_URL` from environment variables. Verify it's set correctly:

```env
CLIENT_URL=https://remodely.ai
```

### 3. Test Health Endpoint

```bash
curl https://voiceflow-crm-backend.onrender.com/api/health
# Should return: {"status":"ok"}
```

### 4. Update Webhook URLs

**ElevenLabs**:
- Go to ElevenLabs dashboard → Agents
- Update webhook URL to: `https://voiceflow-crm-backend.onrender.com/api/webhooks/elevenlabs/call-completed`

**Stripe** (when ready):
- Go to Stripe dashboard → Developers → Webhooks
- Add endpoint: `https://voiceflow-crm-backend.onrender.com/api/webhooks/stripe`
- Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## DNS Setup

### Option 1: Using Render Domains

If using Render for frontend:

1. **Add Custom Domain**:
   - Go to your static site → Settings → Custom Domain
   - Add `remodely.ai`
   - Render provides DNS records

2. **Update DNS**:
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Add CNAME record:
     ```
     Type: CNAME
     Name: @
     Value: <your-render-domain>.onrender.com
     TTL: 3600
     ```

### Option 2: Using Vercel Domains

1. **Vercel Dashboard**:
   - Settings → Domains → Add `remodely.ai`
   - Follow DNS instructions

2. **Add DNS Records**:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21 (Vercel IP)

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### Backend Subdomain

For API subdomain (`api.remodely.ai`):

```
Type: CNAME
Name: api
Value: voiceflow-crm-backend.onrender.com
TTL: 3600
```

**Wait 5-30 minutes for DNS propagation**.

---

## Testing Your Deployment

### 1. Test Backend

```bash
# Health check
curl https://api.remodely.ai/api/health

# Expected: {"status":"ok","timestamp":"..."}
```

### 2. Test Frontend

```bash
# Visit in browser
open https://remodely.ai

# Should load marketing page
# Click "Get Started" → Should redirect to /login
```

### 3. Test Full Flow

1. **Sign Up**:
   - Go to `https://remodely.ai`
   - Click "Get Started" or navigate to `/login`
   - Click "Create Account"
   - Fill in details and sign up
   - Check email for verification (if enabled)

2. **Create Agent**:
   - Login to dashboard
   - Go to "Agents" page
   - Click "Create Agent"
   - Fill in details
   - Agent should be created in YOUR ElevenLabs account

3. **Make Test Call**:
   - Go to "Leads" page
   - Add a test lead with your phone number
   - Click "Call" → Select agent
   - Initiate call
   - You should receive a call from +16028335307

4. **Check Logs**:
   ```bash
   # Render
   # Go to your service → Logs tab

   # Railway
   # Click on service → Deployments → View Logs

   # Docker
   docker-compose logs -f backend
   ```

---

## Troubleshooting

### Backend Not Starting

**Check logs**:
```bash
# Render: Dashboard → Service → Logs
# Railway: Service → Deployments → Logs
# Docker: docker-compose logs -f backend
```

**Common issues**:
- Missing environment variables
- MongoDB connection string incorrect
- Redis not connected
- Port conflict

### Frontend Not Loading

**Check**:
1. Build completed successfully?
2. `VITE_API_URL` environment variable set?
3. DNS records propagated?

**Test**:
```bash
# Check if files are served
curl -I https://remodely.ai

# Should return 200 OK
```

### CORS Errors

If you see CORS errors in browser console:

1. Check `CLIENT_URL` in backend environment variables
2. Verify it matches your frontend URL exactly (no trailing slash)
3. Restart backend service

### Database Connection Failed

**MongoDB Atlas**:
1. Whitelist Render/Railway IP addresses
   - Render: Add `0.0.0.0/0` (all IPs) in Atlas Network Access
   - Railway: Check their docs for IP ranges
2. Verify connection string is correct
3. Check username/password don't have special characters needing URL encoding

### Redis Connection Issues

**Render**: Redis addon should auto-configure
**Railway**: Use their Redis plugin
**Docker**: Ensure redis container is running:
```bash
docker-compose ps
docker-compose logs redis
```

### Email Not Sending

**Gmail SMTP**:
1. Verify app password is correct (not your regular Gmail password)
2. Enable "Less secure app access" if using old Gmail account
3. Check SMTP credentials in logs (backend will show connection errors)

**Alternative**: Use SendGrid after approval:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<your-sendgrid-api-key>
```

### SSL Certificate Issues

**Render/Vercel**: Automatic SSL, no action needed

**Self-hosted**:
```bash
# Renew certificates
sudo certbot renew

# Check expiry
sudo certbot certificates
```

---

## Monitoring & Maintenance

### 1. Set Up Monitoring

**Render**:
- Built-in metrics in dashboard
- Set up email alerts for service failures

**Railway**:
- Metrics tab shows CPU/RAM usage
- Configure webhooks for alerts

**Self-hosted**:
```bash
# Install monitoring
docker run -d --name prometheus prom/prometheus
docker run -d --name grafana grafana/grafana
```

### 2. Backup Database

MongoDB Atlas has automatic backups. To create manual backup:

```bash
# Using mongodump
mongodump --uri="<your-mongodb-uri>" --out=/backup/$(date +%Y%m%d)
```

### 3. Check Logs Regularly

```bash
# Render: Dashboard → Logs
# Railway: Service → Logs
# Docker:
docker-compose logs --tail=100 -f backend
```

### 4. Update Dependencies

```bash
# Monthly security updates
cd voiceflow-crm
npm audit
npm audit fix

# Test locally first
npm test

# Then deploy
git add .
git commit -m "Update dependencies"
git push
```

---

## Scaling for Growth

### When You Reach 100+ Users

1. **Upgrade Render/Railway Plan**:
   - More CPU/RAM
   - Dedicated Redis instance

2. **Enable CDN**:
   - Cloudflare in front of your domain
   - Cache static assets

3. **Add Load Balancer**:
   - Multiple backend instances
   - Horizontal scaling

4. **Move to Dedicated Infrastructure**:
   - AWS/GCP with Kubernetes
   - Separate database cluster
   - Message queue (RabbitMQ/SQS)

---

## Next Steps

After successful deployment:

1. ✅ **Submit SendGrid Business Plan** (see [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md))
2. ✅ **Set up Stripe Products** for subscription billing
3. ✅ **Create landing page content** (already created at `/`)
4. ✅ **Beta testing** with 5-10 contractors
5. ✅ **Marketing** - SEO, ads, partnerships
6. ✅ **Support system** - Help desk, documentation

---

## Support

If you encounter issues:

1. Check logs first (most errors are logged)
2. Review this guide's troubleshooting section
3. Check platform-specific documentation:
   - [Render Docs](https://render.com/docs)
   - [Vercel Docs](https://vercel.com/docs)
   - [Railway Docs](https://docs.railway.app)
4. Review application logs for specific error messages

---

**Congratulations! Your VoiceFlow CRM is now live! 🚀**

Your platform is ready to onboard customers at **remodely.ai**.
