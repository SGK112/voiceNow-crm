# Development Guide

This guide covers the technical details for developers working on VoiceNow CRM.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Services](#services)
- [Testing](#testing)
- [Deployment](#deployment)

## Architecture Overview

VoiceNow CRM follows a standard MERN stack architecture with additional services:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────▶│   Express    │────▶│   MongoDB   │
│  Frontend   │◀────│   Backend    │◀────│   Database  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ├──────▶ ElevenLabs API
                           ├──────▶ Twilio API
                           ├──────▶ Stripe API
                           ├──────▶ n8n Workflows
                           └──────▶ Redis Cache
```

### Key Components

- **Frontend**: React 18 with Vite, Tailwind CSS
- **Backend**: Node.js/Express REST API
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for session management
- **AI Voice**: ElevenLabs Conversational AI
- **Workflows**: n8n for automation
- **Payments**: Stripe for billing

## Development Environment

### Required Tools

```bash
# Node.js and npm
node --version  # Should be 18+
npm --version

# MongoDB
mongod --version

# Redis
redis-server --version

# Git
git --version
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5001
API_URL=http://localhost:5001/api
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/voiceflow-crm
# or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voiceflow-crm

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ElevenLabs
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_DEFAULT_VOICE_ID=cjVigY5qzO86Huf0OWal
ELEVENLABS_PHONE_NUMBER_ID=your-phone-number-id
ELEVENLABS_DEMO_AGENT_ID=your-demo-agent-id

# Twilio (Optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# n8n
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Webhooks
WEBHOOK_URL=https://your-domain.com
# For local development, use ngrok:
# WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app

# OpenAI (Optional)
OPENAI_API_KEY=your-openai-api-key
```

### Starting the Development Server

```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev

# Or start them separately:
npm run server  # Backend only (port 5001)
npm run client  # Frontend only (port 5173)
```

## Project Structure

```
voiceflow-crm/
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── ui/            # UI components (buttons, cards, etc.)
│   │   │   ├── VoiceFlowBuilder.jsx
│   │   │   ├── WorkflowStudio.jsx
│   │   │   └── ...
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AgentsUnified.jsx
│   │   │   ├── CRM.jsx
│   │   │   └── ...
│   │   ├── context/           # React context
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── styles/            # Global styles
│   │   └── App.jsx           # Main app component
│   └── public/               # Static files
│       ├── marketing.html    # Landing page
│       └── ...
├── backend/                   # Node.js backend
│   ├── controllers/          # Request handlers
│   │   ├── authController.js
│   │   ├── agentController.js
│   │   └── ...
│   ├── models/               # Mongoose models
│   │   ├── User.js
│   │   ├── VoiceAgent.js
│   │   ├── CallLog.js
│   │   └── ...
│   ├── routes/               # API routes
│   │   ├── auth.js
│   │   ├── agents.js
│   │   ├── calls.js
│   │   └── ...
│   ├── services/             # Business logic
│   │   ├── elevenLabsService.js
│   │   ├── twilioService.js
│   │   ├── stripeService.js
│   │   └── ...
│   ├── middleware/           # Express middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── ...
│   ├── config/               # Configuration
│   │   └── db.js
│   └── server.js            # Entry point
├── scripts/                  # Utility scripts
│   └── setup.js
├── docs/                     # Documentation
├── .env.example             # Example environment variables
├── .gitignore
├── package.json
└── README.md
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST /api/auth/login
Login existing user

#### POST /api/auth/google
Google OAuth authentication

### Agent Management Endpoints

#### POST /api/agent-management/create
Create a new AI voice agent

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "name": "Sales Agent",
  "prompt": "You are a sales professional...",
  "voice_id": "cjVigY5qzO86Huf0OWal",
  "first_message": "Hello! How can I help you?",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "agent_id": "agent_xxx",
    "name": "Sales Agent",
    "conversation_config": {...}
  },
  "webhook_urls": {
    "send_signup_link": "https://...",
    "book_appointment": "https://...",
    "collect_lead_info": "https://..."
  }
}
```

#### GET /api/agent-management/list
List all agents

#### GET /api/agent-management/:agentId
Get agent details

#### DELETE /api/agent-management/:agentId
Delete an agent

### Call Management Endpoints

#### POST /api/calls/test
Initiate a test call

**Request:**
```json
{
  "agent_id": "agent_xxx",
  "phone_number": "+14805555887",
  "test_mode": true
}
```

#### GET /api/calls
List all calls

#### GET /api/calls/:callId
Get call details

## Database Schema

### User Model
```javascript
{
  email: String (unique, required),
  password: String (hashed),
  name: String,
  googleId: String,
  role: String (default: 'user'),
  subscription: {
    status: String,
    planId: String,
    currentPeriodEnd: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### VoiceAgent Model
```javascript
{
  userId: ObjectId (ref: User),
  elevenLabsAgentId: String,
  name: String,
  description: String,
  voiceId: String,
  prompt: String,
  firstMessage: String,
  language: String,
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### CallLog Model
```javascript
{
  userId: ObjectId (ref: User),
  agentId: Mixed (ObjectId or String),
  callerPhone: String,
  direction: String (inbound/outbound),
  status: String,
  duration: Number,
  elevenLabsCallId: String,
  transcript: String,
  metadata: Object,
  createdAt: Date
}
```

## Services

### ElevenLabs Service

Located in `backend/services/elevenLabsService.js`

```javascript
class ElevenLabsService {
  async createAgent(config) { /* ... */ }
  async listAgents() { /* ... */ }
  async initiateCall(agentId, phoneNumber) { /* ... */ }
  async getCallDetails(callId) { /* ... */ }
}
```

### Stripe Service

Located in `backend/services/stripeService.js`

```javascript
class StripeService {
  async createCustomer(user) { /* ... */ }
  async createSubscription(customerId, priceId) { /* ... */ }
  async cancelSubscription(subscriptionId) { /* ... */ }
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.js

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Writing Tests

Example test for an API endpoint:

```javascript
import request from 'supertest';
import app from '../server';
import User from '../models/User';

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('token');
  });

  it('should fail with invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: 'password123'
      });

    expect(response.status).toBe(400);
  });
});
```

## Deployment

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# The build files will be in frontend/dist/
```

### Environment Setup

Make sure all production environment variables are set:
- Use strong JWT_SECRET
- Set NODE_ENV=production
- Use production database URLs
- Configure WEBHOOK_URL to your production domain

### Docker Deployment

```bash
# Build the image
docker build -t voiceflow-crm .

# Run the container
docker run -p 5001:5001 --env-file .env voiceflow-crm
```

### Monitoring

- Use PM2 for process management
- Set up error logging (Sentry, LogRocket)
- Monitor database performance
- Track API response times

## Common Issues

### MongoDB Connection Error
```bash
# Make sure MongoDB is running
mongod

# Or check if service is running
sudo systemctl status mongod
```

### Redis Connection Error
```bash
# Start Redis server
redis-server

# Or check service
sudo systemctl status redis
```

### Port Already in Use
```bash
# Find and kill process on port 5001
lsof -ti:5001 | xargs kill

# Or change PORT in .env
```

## Additional Resources

- [React Documentation](https://react.dev/)
- [Express Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [ElevenLabs API Documentation](https://elevenlabs.io/docs/)
- [Stripe API Documentation](https://stripe.com/docs/api)

## Getting Help

- Check [GitHub Issues](https://github.com/yourusername/voiceflow-crm/issues)
- Join our [Discord](https://discord.gg/voiceflow-crm)
- Email: help.remodely@gmail.com
