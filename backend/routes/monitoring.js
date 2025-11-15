import express from 'express';
import { getMetrics, resetMetrics } from '../middleware/monitoring.js';
import { getRedisClient } from '../config/redis.js';
import mongoose from 'mongoose';

const router = express.Router();

// Public health check (no auth required)
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  // Check database connection
  try {
    if (mongoose.connection.readyState === 1) {
      health.database = 'connected';
    } else {
      health.database = 'disconnected';
      health.status = 'degraded';
    }
  } catch (error) {
    health.database = 'error';
    health.status = 'unhealthy';
  }

  // Check Redis connection
  try {
    const redis = getRedisClient();
    if (redis && redis.isOpen) {
      await redis.ping();
      health.redis = 'connected';
    } else {
      health.redis = 'disconnected';
      health.status = 'degraded';
    }
  } catch (error) {
    health.redis = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Detailed health check with dependencies
router.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    dependencies: {}
  };

  // MongoDB
  try {
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    health.dependencies.mongodb = {
      status: dbState === 1 ? 'healthy' : 'unhealthy',
      state: states[dbState] || 'unknown',
      host: mongoose.connection.host
    };
    if (dbState !== 1) health.status = 'degraded';
  } catch (error) {
    health.dependencies.mongodb = { status: 'error', message: error.message };
    health.status = 'unhealthy';
  }

  // Redis
  try {
    const redis = getRedisClient();
    if (redis && redis.isOpen) {
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;
      health.dependencies.redis = {
        status: 'healthy',
        latency_ms: latency
      };
    } else {
      health.dependencies.redis = { status: 'disconnected' };
      health.status = 'degraded';
    }
  } catch (error) {
    health.dependencies.redis = { status: 'error', message: error.message };
    health.status = 'degraded';
  }

  // ElevenLabs API
  try {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    health.dependencies.elevenlabs = {
      status: elevenLabsKey ? 'configured' : 'not_configured'
    };
  } catch (error) {
    health.dependencies.elevenlabs = { status: 'error' };
  }

  // Stripe
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    health.dependencies.stripe = {
      status: stripeKey ? 'configured' : 'not_configured'
    };
  } catch (error) {
    health.dependencies.stripe = { status: 'error' };
  }

  // Twilio
  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    health.dependencies.twilio = {
      status: twilioSid ? 'configured' : 'not_configured'
    };
  } catch (error) {
    health.dependencies.twilio = { status: 'error' };
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API Metrics endpoint (requires auth in production)
router.get('/metrics', (req, res) => {
  // In production, you might want to require API key or admin auth
  if (process.env.NODE_ENV === 'production' && !req.query.api_key) {
    return res.status(401).json({ error: 'API key required' });
  }

  const metrics = getMetrics();
  res.json(metrics);
});

// Metrics in Prometheus format (for Prometheus/Grafana)
router.get('/metrics/prometheus', (req, res) => {
  const metrics = getMetrics();

  const prometheusMetrics = `
# HELP api_requests_total Total number of API requests
# TYPE api_requests_total counter
api_requests_total ${metrics.requests.total}

# HELP api_requests_success Total number of successful requests
# TYPE api_requests_success counter
api_requests_success ${metrics.requests.success}

# HELP api_requests_errors Total number of failed requests
# TYPE api_requests_errors counter
api_requests_errors ${metrics.requests.errors}

# HELP api_response_time_avg Average response time in milliseconds
# TYPE api_response_time_avg gauge
api_response_time_avg ${metrics.performance.avg_response_time_ms}

# HELP api_response_time_p95 95th percentile response time in milliseconds
# TYPE api_response_time_p95 gauge
api_response_time_p95 ${metrics.performance.p95_response_time_ms}

# HELP system_memory_used_bytes Memory used by the process
# TYPE system_memory_used_bytes gauge
system_memory_used_bytes ${metrics.system.process.memory_mb * 1024 * 1024}

# HELP system_uptime_seconds System uptime in seconds
# TYPE system_uptime_seconds counter
system_uptime_seconds ${metrics.uptime_seconds}
  `.trim();

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

// Reset metrics (admin only - requires auth)
router.post('/metrics/reset', (req, res) => {
  // In production, require admin authentication
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  resetMetrics();
  res.json({ message: 'Metrics reset successfully' });
});

// Liveness probe (for Kubernetes/Docker)
router.get('/live', (req, res) => {
  res.status(200).json({ alive: true });
});

// Readiness probe (for Kubernetes/Docker)
router.get('/ready', async (req, res) => {
  try {
    // Check if critical dependencies are ready
    const dbReady = mongoose.connection.readyState === 1;

    if (dbReady) {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: 'database not ready' });
    }
  } catch (error) {
    res.status(503).json({ ready: false, reason: error.message });
  }
});

export default router;
