import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST, before any other imports
// In production (Render), env vars are injected by the platform
// In development, load from .env file in project root
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: join(__dirname, '../.env') });
}

// Validate environment variables
import { validateEnvironment, getEnvSummary } from './utils/validateEnv.js';
validateEnvironment();
getEnvSummary();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import connectDB from './config/database.js';
import { connectRedis } from './config/redis.js';
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/auth.js';
import subscriptionRoutes from './routes/subscription.js';
import billingRoutes from './routes/billing.js';
import dashboardRoutes from './routes/dashboard.js';
import agentRoutes from './routes/agents.js';
import aiAgentRoutes from './routes/aiAgents.js';
import aiRoutes from './routes/ai.js';
import callRoutes from './routes/calls.js';
import leadRoutes from './routes/leads.js';
import workflowRoutes from './routes/workflows.js';
import webhookRoutes from './routes/webhooks.js';
import settingsRoutes from './routes/settings.js';
import campaignRoutes from './routes/campaigns.js';
import dealRoutes from './routes/deals.js';
import taskRoutes from './routes/tasks.js';
import noteRoutes from './routes/notes.js';
import emailRoutes from './routes/emails.js';
import apiKeyRoutes from './routes/apiKeys.js';
import usageRoutes from './routes/usage.js';
import projectRoutes from './routes/projects.js';
import diagnosticRoutes from './routes/diagnostic.js';
import { startOverageBillingCron } from './jobs/monthlyOverageBilling.js';

const app = express();

// Trust proxy - required for Render deployment
app.set('trust proxy', 1);

connectDB();
connectRedis();

app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to allow frontend assets
  crossOriginEmbedderPolicy: false
}));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// CORS configuration
const corsOptions = process.env.NODE_ENV === 'production'
  ? {
      origin: true, // Allow same-origin requests in production
      credentials: true
    }
  : {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    };

app.use(cors(corsOptions));

app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());

// Health check endpoints (both /health and /api/health for compatibility)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/ai-agents', aiAgentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/diagnostic', diagnosticRoutes);

app.use('/api', apiLimiter);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = join(__dirname, '../frontend/dist');

  // Serve static files (CSS, JS, images, etc.)
  app.use(express.static(frontendDistPath));

  // Serve React app for all other non-API routes (SPA fallback)
  // This must come AFTER all API routes to avoid catching them
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(join(frontendDistPath, 'index.html'));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   VoiceFlow CRM Server Running         ║
  ║   Port: ${PORT}                        ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}            ║
  ║   API: http://localhost:${PORT}/api    ║
  ╚════════════════════════════════════════╝
  `);

  // Start monthly overage billing cron job
  startOverageBillingCron();
});

export default app;
