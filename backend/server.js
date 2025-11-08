import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST, before any other imports
// Load from parent directory (.env in project root)
dotenv.config({ path: join(__dirname, '../.env') });

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
import dashboardRoutes from './routes/dashboard.js';
import agentRoutes from './routes/agents.js';
import callRoutes from './routes/calls.js';
import leadRoutes from './routes/leads.js';
import workflowRoutes from './routes/workflows.js';
import webhookRoutes from './routes/webhooks.js';
import settingsRoutes from './routes/settings.js';
import campaignRoutes from './routes/campaigns.js';

const app = express();

connectDB();
connectRedis();

app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to allow frontend assets
  crossOriginEmbedderPolicy: false
}));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/billing', subscriptionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/campaigns', campaignRoutes);

app.use('/api', apiLimiter);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = join(__dirname, '../frontend/dist');

  // Serve static files
  app.use(express.static(frontendDistPath));

  // Serve index.html for all non-API routes (SPA fallback)
  app.get('*', (req, res) => {
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
});

export default app;
