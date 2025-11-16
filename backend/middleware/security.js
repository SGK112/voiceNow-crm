import crypto from 'crypto';
import { parsePhoneNumber } from 'libphonenumber-js';
import mongoSanitize from 'express-mongo-sanitize';
import { getRedisClient } from '../config/redis.js';

/**
 * Sanitize MongoDB queries to prevent NoSQL injection
 */
export const sanitizeQuery = (data) => {
  return mongoSanitize.sanitize(data);
};

/**
 * Validate and format phone numbers
 * Prevents toll fraud and premium rate number calls
 */
export const validatePhoneNumber = (phone, defaultCountry = 'US') => {
  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry);

    if (!phoneNumber.isValid()) {
      throw new Error('Invalid phone number format');
    }

    // Block premium rate numbers to prevent toll fraud
    const type = phoneNumber.getType();
    const blockedTypes = ['PREMIUM_RATE', 'SHARED_COST', 'VOICEMAIL'];

    if (blockedTypes.includes(type)) {
      throw new Error(`Phone number type ${type} is not allowed`);
    }

    // Return E.164 format (+1234567890)
    return phoneNumber.format('E.164');
  } catch (error) {
    throw new Error(`Phone validation failed: ${error.message}`);
  }
};

/**
 * Verify webhook signatures for replay attack protection
 */
export const verifyWebhookSignature = (payload, signature, secret, timestamp) => {
  // Reject webhooks older than 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp);

  if (currentTime - webhookTime > 300) {
    throw new Error('Webhook timestamp too old - possible replay attack');
  }

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid webhook signature');
  }

  return true;
};

/**
 * Generate OAuth state parameter for CSRF protection
 */
export const generateOAuthState = async (userId, credentialType) => {
  const state = crypto.randomBytes(32).toString('hex');
  const redis = getRedisClient();

  if (redis) {
    // Store state in Redis with 10-minute expiry
    await redis.setEx(`oauth:state:${state}`, 600, JSON.stringify({
      userId,
      credentialType,
      timestamp: Date.now()
    }));
  }

  return state;
};

/**
 * Verify OAuth state parameter
 */
export const verifyOAuthState = async (state, userId) => {
  const redis = getRedisClient();

  if (!redis) {
    throw new Error('Redis not available for OAuth state verification');
  }

  const stateData = await redis.get(`oauth:state:${state}`);

  if (!stateData) {
    throw new Error('Invalid or expired OAuth state');
  }

  const parsedState = JSON.parse(stateData);

  if (parsedState.userId !== userId) {
    throw new Error('OAuth state user mismatch');
  }

  // Delete state after verification (one-time use)
  await redis.del(`oauth:state:${state}`);

  return parsedState;
};

/**
 * Mask sensitive data for logging
 */
export const maskSensitiveData = (data) => {
  const masked = { ...data };
  const sensitiveFields = [
    'password',
    'apiKey',
    'api_key',
    'secret',
    'token',
    'authorization',
    'ssn',
    'credit_card',
    'creditCard'
  ];

  Object.keys(masked).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      if (typeof masked[key] === 'string' && masked[key].length > 4) {
        // Show last 4 characters only
        masked[key] = `***${masked[key].slice(-4)}`;
      } else {
        masked[key] = '***REDACTED***';
      }
    }
  });

  return masked;
};

/**
 * Generate request ID for tracking
 */
export const requestIdMiddleware = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Secure error handler - don't expose internals
 */
export const secureErrorResponse = (error, req) => {
  // Log full error server-side
  console.error('[Error]', {
    requestId: req.id,
    path: req.path,
    method: req.method,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    user: req.user?.userId
  });

  // Return sanitized error to client
  const statusCode = error.statusCode || 500;
  const message = statusCode < 500
    ? error.message // Client errors - safe to expose
    : 'An internal server error occurred'; // Server errors - hide details

  return {
    error: message,
    requestId: req.id,
    timestamp: new Date().toISOString()
  };
};

/**
 * Check user call budget to prevent unlimited billing
 */
export const checkCallBudget = async (userId, durationMinutes = 1) => {
  // TODO: Implement actual budget checking logic
  // This is a placeholder for the security requirement

  const usage = {
    callMinutes: 0,
    callCost: 0
  };

  const limit = {
    callMinutes: 1000,
    callCost: 500
  };

  if (usage.callMinutes + durationMinutes > limit.callMinutes) {
    throw new Error('Monthly call minute limit exceeded. Please upgrade your plan.');
  }

  if (usage.callCost + (durationMinutes * 0.10) > limit.callCost) {
    throw new Error('Monthly call cost limit exceeded. Please upgrade your plan.');
  }

  return true;
};

/**
 * ElevenLabs webhook signature verification
 */
export const verifyElevenLabsWebhook = (req) => {
  const signature = req.headers['x-elevenlabs-signature'];
  const timestamp = req.headers['x-elevenlabs-timestamp'];
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  if (!signature || !timestamp || !secret) {
    throw new Error('Missing webhook verification headers');
  }

  const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  return verifyWebhookSignature(payload, signature, secret, timestamp);
};

/**
 * Twilio webhook signature verification
 */
export const verifyTwilioWebhook = (req) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!signature || !authToken) {
    throw new Error('Missing Twilio webhook signature');
  }

  // Twilio uses different signature algorithm
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(url + JSON.stringify(req.body), 'utf-8'))
    .digest('base64');

  if (signature !== expectedSignature) {
    throw new Error('Invalid Twilio webhook signature');
  }

  return true;
};

export default {
  sanitizeQuery,
  validatePhoneNumber,
  verifyWebhookSignature,
  generateOAuthState,
  verifyOAuthState,
  maskSensitiveData,
  requestIdMiddleware,
  secureErrorResponse,
  checkCallBudget,
  verifyElevenLabsWebhook,
  verifyTwilioWebhook
};
