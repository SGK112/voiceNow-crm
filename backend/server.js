import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST, before any other imports
// In production (Render), env vars are injected by the platform
// In development, load from .env file in project root
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: join(__dirname, '../.env') });
}

// Debug webhook URL only in development
if (process.env.NODE_ENV !== 'production' && process.env.WEBHOOK_URL) {
  console.log('Webhook URL configured');
}

// Validate environment variables
import { validateEnvironment, getEnvSummary } from './utils/validateEnv.js';
validateEnvironment();
getEnvSummary();

// OAuth configuration logging
import { logOAuthConfig } from './utils/oauthConfig.js';

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
import errorReportingService from './services/errorReportingService.js';

import authRoutes from './routes/auth.js';
import subscriptionRoutes from './routes/subscription.js';
import billingRoutes from './routes/billing.js';
import dashboardRoutes from './routes/dashboard.js';
import agentRoutes from './routes/agents.js';
import aiAgentRoutes from './routes/aiAgents.js';
import elevenLabsAgentRoutes from './routes/elevenLabsAgents.js';
import aiRoutes from './routes/ai.js';
import aiCopilotRoutes from './routes/ai-copilot.js';
import callRoutes from './routes/calls.js';
import leadRoutes from './routes/leads.js';
import workflowRoutes from './routes/workflows.js';
import crmWorkflowRoutes from './routes/crm-workflows.js';
import voiceflowDeploymentRoutes from './routes/voiceflowDeployment.js';
import credentialRoutes from './routes/credentials.js';
import webhookRoutes from './routes/webhooks.js';
import agentWebhookRoutes from './routes/agentWebhooks.js';
import agentManagementRoutes from './routes/agentManagement.js';
import settingsRoutes from './routes/settings.js';
import campaignRoutes from './routes/campaigns.js';
import dealRoutes from './routes/deals.js';
import taskRoutes from './routes/tasks.js';
import noteRoutes from './routes/notes.js';
import transactionRoutes from './routes/transactions.js';
import estimateRoutes from './routes/estimates.js';
import appointmentRoutes from './routes/appointments.js';
import aiConversationRoutes from './routes/ai-conversations.js';
import teamMessageRoutes from './routes/team-messages.js';
import dashboardLayoutRoutes from './routes/dashboard-layouts.js';
import emailRoutes from './routes/emails.js';
import apiKeyRoutes from './routes/apiKeys.js';
import usageRoutes from './routes/usage.js';
import projectRoutes from './routes/projects.js';
import diagnosticRoutes from './routes/diagnostic.js';
import knowledgeBaseRoutes from './routes/knowledgeBase.js';
import aiBuilderRoutes from './routes/aiBuilder.js';
import publicChatRoutes from './routes/publicChat.js';
import integrationRoutes from './routes/integrations.js';
import agentLibraryRoutes from './routes/agentLibrary.js';
import workflowMarketplaceRoutes from './routes/workflowMarketplace.js';
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
import helpDeskRoutes from './routes/helpDesk.js';
import n8nSyncRoutes from './routes/n8n-sync.js';
import aiModelsRoutes from './routes/ai-models.js';
import callInitiationRoutes from './routes/callInitiation.js';
import usageCreditsRoutes from './routes/usageCredits.js';
import conversationalAgentsRoutes from './routes/conversationalAgents.js';
import elevenLabsWebhookRoutes from './routes/elevenLabsWebhook.js';
import surpriseGraniteWebhookRoutes from './routes/surpriseGraniteWebhook.js';
import mediaRoutes from './routes/media.js';
import mediaLibraryRoutes from './routes/mediaLibrary.js';
import imageManipulationRoutes from './routes/imageManipulation.js';
import voiceImageRoutes from './routes/voiceImageGeneration.js';
import { setupVoiceImageWebSocket } from './routes/voiceImageWebSocket.js';
import voiceMediaCopilotRoutes from './routes/voiceMediaCopilot.js';
import { setupVoiceMediaCopilotWebSocket } from './routes/voiceMediaCopilotWebSocket.js';
import voicemailAgentRoutes from './routes/voicemailAgent.js';
import copilotRoutes from './routes/copilot.js';
import copilotRevisionRoutes from './routes/copilotRevisions.js';
import demoRoutes from './routes/demo.js';
import studioRoutes from './routes/studio.js';
import voiceEstimateRoutes from './routes/voiceEstimates.js';
import socialMediaAIRoutes from './routes/socialMediaAI.js';
import mobileRoutes from './routes/mobile.js';
import voiceRoutes from './routes/voice.js';
import devCommandsRoutes from './routes/devCommands.js';
import notificationRoutes from './routes/notifications.js';
import profileRoutes from './routes/profile.js';
import voicemailRoutes from './routes/voicemail.js';
import twilioMobileRoutes from './routes/twilioMobile.js';
import contactRoutes from './routes/contacts.js';
import scraperRoutes from './routes/scraper.js';
import ariaRoutes from './routes/aria.js';
import shopifyRoutes from './routes/shopify.js';
import slackRoutes from './routes/slack.js';
import networkDeviceRoutes from './routes/networkDevices.js';
import translationRoutes from './routes/translation.js';
import fleetRoutes from './routes/fleet.js';
import moodboardRoutes from './routes/moodboards.js';
import appSettingsRoutes from './routes/appSettings.js';
import ariaRealtimeCallRoutes from './routes/ariaRealtimeCall.js';
import { setupAriaRealtimeWebSocket } from './services/ariaRealtimeWebSocketSetup.js';
import { startOverageBillingCron } from './jobs/monthlyOverageBilling.js';

// Aria Background Service - auto-starts on import
import ariaBackgroundService from './services/ariaBackgroundService.js';
import { requestIdMiddleware } from './middleware/security.js';

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
      origin: true, // Allow all origins in development (for mobile app testing)
      credentials: true
    };

app.use(cors(corsOptions));

app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());
app.use(requestIdMiddleware); // Add request ID tracking for security
app.use(apiMonitoring); // Track API requests and response times

// Serve audio files generated for calls
app.use('/audio', express.static('public/audio'));

// Explicit route for demo audio with proper MIME type
app.get('/demo-elevenlabs.mp3', (req, res) => {
  res.setHeader('Content-Type', 'audio/mpeg');
  res.sendFile(join(__dirname, 'public', 'demo-elevenlabs.mp3'));
});

// Serve demo audio files directly with proper MIME types
app.use(express.static('public', {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }
  }
}));

// Direct health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'voiceflow-crm-api'
  });
});

// Monitoring and health check routes
app.use('/api/monitoring', monitoringRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/ai-agents', aiAgentRoutes);
app.use('/api/elevenlabs', elevenLabsAgentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-copilot', aiCopilotRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/crm-workflows', crmWorkflowRoutes);
app.use('/api/voiceflow', voiceflowDeploymentRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/agent-webhooks', agentWebhookRoutes);
app.use('/api/agent-management', agentManagementRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/ai-conversations', aiConversationRoutes);
app.use('/api/team-messages', teamMessageRoutes);
app.use('/api/dashboard-layouts', dashboardLayoutRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/ai-builder', aiBuilderRoutes);
app.use('/api/public', publicChatRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/agent-library', agentLibraryRoutes);
app.use('/api/workflow-marketplace', workflowMarketplaceRoutes);
app.use('/api/business-profile', businessProfileRoutes);
app.use('/api/community-agents', communityAgentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/extensions', extensionRoutes);
app.use('/api/quickbooks', quickbooksRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/user-integrations', userIntegrationRoutes);
app.use('/api/phone-numbers', phoneNumberRoutes);
app.use('/api/usage-credits', usageCreditsRoutes);
app.use('/api/sms-to-call', smsToCallRoutes);
app.use('/api/help-desk', helpDeskRoutes);
app.use('/api/n8n-sync', n8nSyncRoutes);
app.use('/api/ai-models', aiModelsRoutes);
app.use('/api/call-initiation', callInitiationRoutes);
app.use('/api/conversational-agents', conversationalAgentsRoutes);
app.use('/api/elevenlabs-webhook', elevenLabsWebhookRoutes);
app.use('/api/surprise-granite', surpriseGraniteWebhookRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/media-library', mediaLibraryRoutes);
app.use('/api/image-transform', imageManipulationRoutes);
app.use('/api/voice-images', voiceImageRoutes);
app.use('/api/voice-copilot', voiceMediaCopilotRoutes);
app.use('/api/demo', demoRoutes); // Demo routes - no auth required
app.use('/api/studio', studioRoutes); // Studio routes - social media staging
app.use('/api/voicemail-agent', voicemailAgentRoutes); // Voicemail agent demo routes
app.use('/api/copilot', copilotRoutes); // Full-featured Co-Pilot with system integrations
app.use('/api/copilot-revisions', copilotRevisionRoutes); // Voice-controlled code changes with versioning
app.use('/api/voice-estimates', voiceEstimateRoutes); // Voice estimate builder routes
app.use('/api/mobile', mobileRoutes); // Mobile app API endpoints
app.use('/api/social-media', socialMediaAIRoutes); // AI Social Media Post Writer
app.use('/api/voice', voiceRoutes); // Voice conversation endpoints for mobile app
app.use('/api/dev', devCommandsRoutes); // Development command queue for voice-controlled coding
app.use('/api/notifications', notificationRoutes); // Push notification endpoints for mobile app
app.use('/api/profile', profileRoutes); // User profile and preferences
app.use('/api/voicemail', voicemailRoutes); // Interactive voicemail and call monitoring
app.use('/api/twilio', twilioMobileRoutes); // Twilio mobile VoIP and SMS routes
app.use('/api/contacts', contactRoutes); // Unified contacts API for mobile and desktop
app.use('/api/scraper', scraperRoutes); // Web scraping for Aria AI assistant
app.use('/api/aria', ariaRoutes); // Aria AI assistant chat with context-aware responses
app.use('/api/shopify', shopifyRoutes); // Shopify OAuth and e-commerce integration
app.use('/api/slack', slackRoutes); // Slack webhook and notification management
app.use('/api/network', networkDeviceRoutes); // Network device discovery and control for Aria IoT
app.use('/api/translation', translationRoutes); // Translation service for Aria multilingual support
app.use('/api/fleet', fleetRoutes); // Fleet management for people, places, and things
app.use('/api/moodboards', moodboardRoutes); // Design moodboards with sharing and collaboration
app.use('/api/app-settings', appSettingsRoutes); // Voice-controlled app settings via ARIA
app.use('/api/aria-realtime', ariaRealtimeCallRoutes); // ARIA Realtime calls with OpenAI + Twilio

// Error webhook receiver endpoint for Claude Code error monitoring
app.post('/', (req, res) => {
  if (req.headers['x-error-report'] === 'true') {
    const { errorCount, errors, summary } = req.body;
    console.log('\n' + '═'.repeat(60));
    console.log('🚨 ERROR REPORT RECEIVED FROM WEBHOOK');
    console.log('═'.repeat(60));
    console.log(`📊 Total Errors: ${errorCount}`);
    if (summary) {
      console.log(`   Most Common: ${summary.mostCommon}`);
      console.log(`   By Component:`, summary.byComponent);
    }
    if (errors && errors.length > 0) {
      errors.forEach((err, i) => {
        console.log(`\n📍 Error ${i + 1}:`);
        console.log(`   Name: ${err.error?.name}`);
        console.log(`   Message: ${err.error?.message}`);
        console.log(`   Component: ${err.context?.component}`);
        console.log(`   Action: ${err.context?.action}`);
        if (err.debugHints?.length > 0) {
          console.log(`   Debug Hints:`, err.debugHints.map(h => h.suggestion).join('; '));
        }
      });
    }
    console.log('═'.repeat(60) + '\n');
    return res.json({ received: true, timestamp: new Date().toISOString() });
  }
  res.status(404).json({ error: 'Not found' });
});

app.use('/api', apiLimiter);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = join(__dirname, '../frontend/dist');
  const frontendPublicPath = join(__dirname, '../frontend/public');

  // Serve landing page from frontend/public (before React app)
  // AGGRESSIVE no-cache to prevent CDN/browser caching
  app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vary', '*');
    res.sendFile(join(frontendPublicPath, 'marketing.html'));
  });

  app.get('/marketing', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vary', '*');
    res.sendFile(join(frontendPublicPath, 'marketing.html'));
  });

  app.get('/demo', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(join(frontendPublicPath, 'demo.html'));
  });

  app.get('/studio', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(join(frontendPublicPath, 'studio.html'));
  });

  // Serve static files from frontend/public (images, CSS, JS for marketing page)
  // Add cache control for static assets
  app.use(express.static(frontendPublicPath, {
    setHeaders: (res, path) => {
      // Cache images for 1 hour, but allow revalidation
      if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.mp3')) {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      } else {
        // Don't cache HTML/CSS/JS files
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // Serve static files from build (CSS, JS, images for React app)
  app.use(express.static(frontendDistPath, {
    setHeaders: (res, path) => {
      // Cache hashed files (like main.abc123.js) for 1 year
      if (/\.[a-f0-9]{8}\.(js|css)$/.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // Serve React app for app routes (everything except root, marketing, and static assets)
  // Note: /assets/* is handled by express.static for frontendDistPath above
  app.get(/^\/(?!api|marketing|assets).*/, (req, res) => {
    const requestPath = req.path;
    // If it's a React app route (starts with /login, /dashboard, /auth, /app, etc.)
    if (requestPath.startsWith('/login') || requestPath.startsWith('/dashboard') ||
        requestPath.startsWith('/leads') || requestPath.startsWith('/calls') ||
        requestPath.startsWith('/agents') || requestPath.startsWith('/workflows') ||
        requestPath.startsWith('/settings') || requestPath.startsWith('/auth') ||
        requestPath.startsWith('/app') || requestPath.startsWith('/onboarding') ||
        requestPath.startsWith('/signup') || requestPath.startsWith('/reset-password') ||
        requestPath.startsWith('/forgot-password')) {
      // Prevent caching of index.html so new builds are picked up immediately
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(join(frontendDistPath, 'index.html'));
    } else {
      // For other routes, try to serve from public first, then fall back to React
      const publicFilePath = join(frontendPublicPath, requestPath);
      if (fs.existsSync(publicFilePath) && fs.statSync(publicFilePath).isFile()) {
        res.sendFile(publicFilePath);
      } else {
        // Prevent caching of index.html so new builds are picked up immediately
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(join(frontendDistPath, 'index.html'));
      }
    }
  });
}

// Error tracking middleware (must come before error handler)
app.use(errorTracking);
// Error reporting to webhook for Claude Code monitoring
app.use(errorReportingService.expressErrorHandler());
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   VoiceNow CRM Server Running         ║
  ║   Port: ${PORT}                        ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}            ║
  ║   API: http://localhost:${PORT}/api    ║
  ║   WS: ws://localhost:${PORT}/ws        ║
  ║   Network: http://0.0.0.0:${PORT}      ║
  ╚════════════════════════════════════════╝
  `);

  // Start monthly overage billing cron job
  try {
    startOverageBillingCron();
  } catch (error) {
    console.error('⚠️  Failed to start cron job:', error.message);
  }

  // Log OAuth configuration for debugging
  logOAuthConfig();

  // Initialize Voice-Image WebSocket server
  try {
    setupVoiceImageWebSocket(server);
  } catch (error) {
    console.error('⚠️  Failed to start WebSocket server:', error.message);
  }

  // Initialize Voice Media Copilot WebSocket server
  try {
    setupVoiceMediaCopilotWebSocket(server);
  } catch (error) {
    console.error('⚠️  Failed to start Voice Copilot WebSocket server:', error.message);
  }

  // Initialize ARIA Realtime Call WebSocket server (OpenAI + Twilio)
  try {
    setupAriaRealtimeWebSocket(server);
    console.log('✅ ARIA Realtime WebSocket server initialized');
  } catch (error) {
    console.error('⚠️  Failed to start ARIA Realtime WebSocket server:', error.message);
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
