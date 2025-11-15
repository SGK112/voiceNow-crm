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

// Debug: Log webhook URL at startup
console.log(`🔍 DEBUG: WEBHOOK_URL loaded as: ${process.env.WEBHOOK_URL}`);

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
import { apiMonitoring, errorTracking } from './middleware/monitoring.js';

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
import knowledgeBaseRoutes from './routes/knowledgeBase.js';
import publicChatRoutes from './routes/publicChat.js';
import integrationRoutes from './routes/integrations.js';
import agentLibraryRoutes from './routes/agentLibrary.js';
import businessProfileRoutes from './routes/businessProfile.js';
import communityAgentRoutes from './routes/communityAgents.js';
import invoiceRoutes from './routes/invoices.js';
import extensionRoutes from './routes/extensions.js';
import quickbooksRoutes from './routes/quickbooks.js';
import marketplaceRoutes from './routes/marketplace.js';
import userIntegrationRoutes from './routes/userIntegrations.js';
import phoneNumberRoutes from './routes/phoneNumbers.js';
import monitoringRoutes from './routes/monitoring.js';
import smsToCallRoutes from './routes/sms-to-call.js';
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
app.use(apiMonitoring); // Track API requests and response times

// Monitoring and health check routes
app.use('/api/monitoring', monitoringRoutes);

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
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/public', publicChatRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/agent-library', agentLibraryRoutes);
app.use('/api/business-profile', businessProfileRoutes);
app.use('/api/community-agents', communityAgentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/extensions', extensionRoutes);
app.use('/api/quickbooks', quickbooksRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/user-integrations', userIntegrationRoutes);
app.use('/api/phone-numbers', phoneNumberRoutes);
app.use('/api/sms-to-call', smsToCallRoutes);

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

// Error tracking middleware (must come before error handler)
app.use(errorTracking);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit - log and continue
});

const server = app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   VoiceFlow CRM Server Running         ║
  ║   Port: ${PORT}                        ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}            ║
  ║   API: http://localhost:${PORT}/api    ║
  ╚════════════════════════════════════════╝
  `);

  // Start monthly overage billing cron job
  try {
    startOverageBillingCron();
  } catch (error) {
    console.error('⚠️  Failed to start cron job:', error.message);
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('   Try: lsof -ti:${PORT} | xargs kill');
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received. Closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
