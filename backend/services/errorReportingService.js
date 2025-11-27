/**
 * Error Reporting Service
 * Captures all errors site-wide and sends them to a webhook for real-time monitoring
 * Designed to work with Claude Code for automated debugging
 */

import fetch from 'node-fetch';
import os from 'os';

class ErrorReportingService {
  constructor() {
    // Lazy-load webhook URL to ensure env vars are loaded
    this._webhookUrl = null;
    this.environment = process.env.NODE_ENV || 'development';
    this.serviceName = 'VoiceNow CRM';
    this.errorBuffer = [];
    this.bufferTimeout = null;
    this.maxBufferSize = 10;
    this.bufferDelayMs = 5000; // Send buffered errors every 5 seconds
    this.enabled = true;
    this.errorCounts = {};
    this.lastReportTime = {};
    this.rateLimitMs = 30000; // Rate limit same errors to once per 30 seconds

    console.log('🚨 Error Reporting Service initialized');
    // Defer webhook check until first use
    setTimeout(() => {
      console.log(`   Webhook: ${this.webhookUrl ? 'Configured (' + this.webhookUrl.substring(0, 30) + '...)' : 'Not configured'}`);
    }, 1000);
  }

  // Lazy getter for webhook URL to ensure env vars are loaded
  get webhookUrl() {
    if (this._webhookUrl === null) {
      this._webhookUrl = process.env.WEBHOOK_URL || process.env.ERROR_WEBHOOK_URL || '';
    }
    return this._webhookUrl;
  }

  set webhookUrl(url) {
    this._webhookUrl = url;
  }

  /**
   * Report an error to the webhook
   */
  async reportError(error, context = {}) {
    if (!this.enabled || !this.webhookUrl) {
      return;
    }

    try {
      const errorKey = this.getErrorKey(error);

      // Rate limit duplicate errors
      if (this.isRateLimited(errorKey)) {
        this.errorCounts[errorKey] = (this.errorCounts[errorKey] || 0) + 1;
        return;
      }

      const errorReport = this.formatErrorReport(error, context);

      // Add to buffer for batching
      this.errorBuffer.push(errorReport);

      // Send immediately if buffer is full or it's a critical error
      if (this.errorBuffer.length >= this.maxBufferSize || context.severity === 'critical') {
        await this.flushBuffer();
      } else {
        this.scheduleBufferFlush();
      }

      this.lastReportTime[errorKey] = Date.now();
    } catch (reportError) {
      console.error('Failed to report error:', reportError.message);
    }
  }

  /**
   * Format error into a structured report
   */
  formatErrorReport(error, context = {}) {
    const stack = error.stack || new Error().stack;
    const stackLines = stack.split('\n').slice(0, 10);

    // Extract file and line info from stack
    const fileMatch = stack.match(/at\s+.*\((.+):(\d+):(\d+)\)/);
    const fileInfo = fileMatch ? {
      file: fileMatch[1],
      line: parseInt(fileMatch[2]),
      column: parseInt(fileMatch[3])
    } : null;

    return {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      service: this.serviceName,

      // Error details
      error: {
        name: error.name || 'Error',
        message: error.message,
        code: error.code,
        stack: stackLines,
        ...fileInfo && { location: fileInfo }
      },

      // Context for debugging
      context: {
        ...context,
        component: context.component || 'unknown',
        action: context.action || 'unknown',
        userId: context.userId || 'anonymous',
        agentId: context.agentId,
        requestId: context.requestId,
        input: context.input ? this.sanitizeInput(context.input) : undefined
      },

      // System info
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        nodeVersion: process.version,
        memory: {
          total: Math.round(os.totalmem() / 1024 / 1024) + 'MB',
          free: Math.round(os.freemem() / 1024 / 1024) + 'MB',
          usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        },
        uptime: Math.round(process.uptime()) + 's'
      },

      // Suggested fix context for Claude Code
      debugHints: this.generateDebugHints(error, context),

      // Repeat count if this error was rate-limited
      repeatCount: this.errorCounts[this.getErrorKey(error)] || 0
    };
  }

  /**
   * Generate debugging hints for Claude Code
   */
  generateDebugHints(error, context) {
    const hints = [];

    // MongoDB errors
    if (error.message?.includes('Cast to ObjectId')) {
      hints.push({
        type: 'mongodb_cast_error',
        suggestion: 'A string is being used where a MongoDB ObjectId is expected. Check if "default" or other placeholder values are being passed to User.findById() or similar.',
        searchPattern: 'findById\\(.*default.*\\)|findById\\(.*\\\'default\\\'.*\\)'
      });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      hints.push({
        type: 'jwt_error',
        suggestion: 'JWT token validation failed. The token may be expired, malformed, or signed with wrong secret.',
        searchPattern: 'jwt.verify|JWT_SECRET'
      });
    }

    // Twilio errors
    if (error.message?.includes("params['to']")) {
      hints.push({
        type: 'twilio_missing_param',
        suggestion: 'Twilio SMS/call requires a "to" phone number. Check if contact has a valid phone number.',
        searchPattern: 'sendSMS|twilioClient'
      });
    }

    // API/Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      hints.push({
        type: 'network_error',
        suggestion: 'Connection failed. External service may be down or network issue.',
        searchPattern: context.action || 'fetch|axios'
      });
    }

    // OpenAI errors
    if (error.message?.includes('openai') || error.message?.includes('rate limit')) {
      hints.push({
        type: 'openai_error',
        suggestion: 'OpenAI API error. Could be rate limiting, invalid API key, or model availability.',
        searchPattern: 'openai|OPENAI_API_KEY'
      });
    }

    // Replicate errors
    if (error.message?.includes('replicate') || context.component === 'image_generation') {
      hints.push({
        type: 'replicate_error',
        suggestion: 'Replicate API error. Check API token and model availability.',
        searchPattern: 'replicate|REPLICATE_API_TOKEN'
      });
    }

    // Generic hints based on component
    if (context.component === 'realtime_voice') {
      hints.push({
        type: 'realtime_voice',
        suggestion: 'Error in realtime voice processing. Check WebRTC connection and OpenAI Realtime API.',
        files: ['routes/voice.js', 'components/RealtimeOrbButton.tsx']
      });
    }

    if (context.component === 'aria') {
      hints.push({
        type: 'aria_error',
        suggestion: 'Error in Aria AI assistant. Check ariaCapabilities.js and related services.',
        files: ['utils/ariaCapabilities.js', 'services/ariaCRMService.js']
      });
    }

    return hints;
  }

  /**
   * Sanitize sensitive input data
   */
  sanitizeInput(input) {
    if (typeof input === 'string') {
      return input.substring(0, 500);
    }

    if (typeof input === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        // Hide sensitive fields
        if (['password', 'token', 'apiKey', 'secret', 'authorization'].some(s => key.toLowerCase().includes(s))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'string') {
          sanitized[key] = value.substring(0, 200);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Get unique key for error deduplication
   */
  getErrorKey(error) {
    return `${error.name}:${error.message?.substring(0, 100)}`;
  }

  /**
   * Check if error is rate-limited
   */
  isRateLimited(errorKey) {
    const lastTime = this.lastReportTime[errorKey];
    if (!lastTime) return false;
    return (Date.now() - lastTime) < this.rateLimitMs;
  }

  /**
   * Schedule buffer flush
   */
  scheduleBufferFlush() {
    if (this.bufferTimeout) return;

    this.bufferTimeout = setTimeout(() => {
      this.flushBuffer();
    }, this.bufferDelayMs);
  }

  /**
   * Send buffered errors to webhook
   */
  async flushBuffer() {
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }

    if (this.errorBuffer.length === 0) return;

    const errors = [...this.errorBuffer];
    this.errorBuffer = [];

    try {
      const payload = {
        type: 'error_report',
        source: 'voiceflow_crm',
        timestamp: new Date().toISOString(),
        errorCount: errors.length,
        errors: errors,
        summary: this.generateSummary(errors)
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Error-Report': 'true',
          'X-Source': 'voiceflow-crm'
        },
        body: JSON.stringify(payload),
        timeout: 10000
      });

      if (!response.ok) {
        console.error(`Error webhook failed: ${response.status}`);
      } else {
        console.log(`📤 Sent ${errors.length} error(s) to webhook`);
      }
    } catch (err) {
      console.error('Failed to send errors to webhook:', err.message);
      // Re-add errors to buffer if send failed
      this.errorBuffer.unshift(...errors.slice(0, 5));
    }
  }

  /**
   * Generate summary of errors for quick review
   */
  generateSummary(errors) {
    const byComponent = {};
    const byType = {};

    for (const err of errors) {
      const component = err.context?.component || 'unknown';
      const type = err.error?.name || 'Error';

      byComponent[component] = (byComponent[component] || 0) + 1;
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      totalErrors: errors.length,
      byComponent,
      byType,
      mostCommon: Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0],
      criticalCount: errors.filter(e => e.context?.severity === 'critical').length
    };
  }

  /**
   * Create Express error handler middleware
   */
  expressErrorHandler() {
    return (err, req, res, next) => {
      this.reportError(err, {
        component: 'express',
        action: `${req.method} ${req.path}`,
        requestId: req.headers['x-request-id'],
        userId: req.user?.id || req.user?._id,
        input: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: req.body
        },
        severity: res.statusCode >= 500 ? 'critical' : 'error'
      });

      next(err);
    };
  }

  /**
   * Wrap async functions to auto-report errors
   */
  wrapAsync(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        await this.reportError(error, context);
        throw error;
      }
    };
  }

  /**
   * Report Aria-specific errors
   */
  async reportAriaError(error, ariaContext = {}) {
    await this.reportError(error, {
      component: 'aria',
      action: ariaContext.action || 'aria_operation',
      agentId: ariaContext.agentId || 'aria',
      userId: ariaContext.userId,
      conversationId: ariaContext.conversationId,
      input: ariaContext.userMessage,
      toolCalled: ariaContext.toolName,
      toolArgs: ariaContext.toolArgs,
      severity: ariaContext.severity || 'error'
    });
  }

  /**
   * Report voice/realtime API errors
   */
  async reportVoiceError(error, voiceContext = {}) {
    await this.reportError(error, {
      component: 'realtime_voice',
      action: voiceContext.action || 'voice_operation',
      agentId: voiceContext.agentId,
      userId: voiceContext.userId,
      sessionId: voiceContext.sessionId,
      functionName: voiceContext.functionName,
      severity: 'error'
    });
  }

  /**
   * Enable/disable error reporting
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`Error reporting ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update webhook URL
   */
  setWebhookUrl(url) {
    this.webhookUrl = url;
    console.log(`Error webhook URL updated: ${url ? 'Set' : 'Cleared'}`);
  }
}

// Singleton instance
const errorReportingService = new ErrorReportingService();

// Set up global unhandled error capturing
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  errorReportingService.reportError(error, {
    component: 'process',
    action: 'uncaughtException',
    severity: 'critical'
  });
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  console.error('Unhandled Rejection:', error);
  errorReportingService.reportError(error, {
    component: 'process',
    action: 'unhandledRejection',
    severity: 'critical'
  });
});

export default errorReportingService;
export { ErrorReportingService };
