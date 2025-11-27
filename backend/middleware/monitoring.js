import os from 'os';

// Store API metrics in memory
const metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    by_endpoint: {},
    by_status: {}
  },
  response_times: [],
  errors: [],
  uptime: Date.now()
};

// Track response time and request metrics
export const apiMonitoring = (req, res, next) => {
  const start = Date.now();

  // Track request
  metrics.requests.total++;

  // Capture original end function
  const originalEnd = res.end;

  res.end = function(...args) {
    const duration = Date.now() - start;

    // Store response time (keep last 1000)
    metrics.response_times.push(duration);
    if (metrics.response_times.length > 1000) {
      metrics.response_times.shift();
    }

    // Track by endpoint
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    if (!metrics.requests.by_endpoint[endpoint]) {
      metrics.requests.by_endpoint[endpoint] = {
        count: 0,
        avg_response_time: 0,
        total_time: 0
      };
    }
    metrics.requests.by_endpoint[endpoint].count++;
    metrics.requests.by_endpoint[endpoint].total_time += duration;
    metrics.requests.by_endpoint[endpoint].avg_response_time =
      metrics.requests.by_endpoint[endpoint].total_time /
      metrics.requests.by_endpoint[endpoint].count;

    // Track by status code
    const statusCode = res.statusCode;
    metrics.requests.by_status[statusCode] = (metrics.requests.by_status[statusCode] || 0) + 1;

    // Track success/error
    if (statusCode >= 200 && statusCode < 400) {
      metrics.requests.success++;
    } else {
      metrics.requests.errors++;
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};

// Error tracking middleware
export const errorTracking = (err, req, res, next) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    userId: req.user?._id,
    ip: req.ip
  };

  // Store last 100 errors
  metrics.errors.push(errorInfo);
  if (metrics.errors.length > 100) {
    metrics.errors.shift();
  }

  // Log error
  console.error('🚨 ERROR:', errorInfo);

  // Check if critical error (send alert)
  if (shouldSendAlert(errorInfo)) {
    sendErrorAlert(errorInfo).catch(console.error);
  }

  next(err);
};

// Determine if error should trigger alert
function shouldSendAlert(errorInfo) {
  // Alert on 500 errors, database errors, or auth failures
  const criticalPaths = ['/api/auth', '/api/payments', '/api/billing'];
  const isCriticalPath = criticalPaths.some(path => errorInfo.path.startsWith(path));
  const isServerError = errorInfo.statusCode >= 500;

  return isServerError || isCriticalPath;
}

// Send error alert via email/Slack
async function sendErrorAlert(errorInfo) {
  const alertMessage = `
🚨 CRITICAL ERROR DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━
Time: ${errorInfo.timestamp}
Path: ${errorInfo.method} ${errorInfo.path}
Error: ${errorInfo.error}
Status: ${errorInfo.statusCode}
User ID: ${errorInfo.userId || 'N/A'}
IP: ${errorInfo.ip}
━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  console.error(alertMessage);

  // Send email alert if configured
  try {
    if (process.env.ALERT_EMAIL) {
      const emailService = (await import('../services/emailService.js')).default;
      await emailService.sendEmail({
        to: process.env.ALERT_EMAIL,
        subject: `🚨 VoiceNow CRM - Critical Error on ${errorInfo.path}`,
        text: alertMessage,
        html: `<pre>${alertMessage}</pre>`
      });
    }
  } catch (err) {
    console.error('Failed to send email alert:', err.message);
  }

  // Send Slack alert if webhook configured
  try {
    if (process.env.SLACK_ALERT_WEBHOOK) {
      const axios = (await import('axios')).default;
      await axios.post(process.env.SLACK_ALERT_WEBHOOK, {
        text: alertMessage,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 Critical Error Detected'
            }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Time:*\n${errorInfo.timestamp}` },
              { type: 'mrkdwn', text: `*Status:*\n${errorInfo.statusCode}` },
              { type: 'mrkdwn', text: `*Path:*\n${errorInfo.method} ${errorInfo.path}` },
              { type: 'mrkdwn', text: `*User:*\n${errorInfo.userId || 'N/A'}` }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error:*\n\`\`\`${errorInfo.error}\`\`\``
            }
          }
        ]
      });
    }
  } catch (err) {
    console.error('Failed to send Slack alert:', err.message);
  }
}

// Get current metrics
export function getMetrics() {
  const avgResponseTime = metrics.response_times.length > 0
    ? metrics.response_times.reduce((a, b) => a + b, 0) / metrics.response_times.length
    : 0;

  const p95ResponseTime = metrics.response_times.length > 0
    ? metrics.response_times.sort((a, b) => a - b)[Math.floor(metrics.response_times.length * 0.95)]
    : 0;

  return {
    uptime_seconds: Math.floor((Date.now() - metrics.uptime) / 1000),
    requests: {
      total: metrics.requests.total,
      success: metrics.requests.success,
      errors: metrics.requests.errors,
      success_rate: metrics.requests.total > 0
        ? ((metrics.requests.success / metrics.requests.total) * 100).toFixed(2) + '%'
        : '100%',
      by_status: metrics.requests.by_status,
      top_endpoints: Object.entries(metrics.requests.by_endpoint)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([endpoint, data]) => ({
          endpoint,
          count: data.count,
          avg_response_time_ms: Math.round(data.avg_response_time)
        }))
    },
    performance: {
      avg_response_time_ms: Math.round(avgResponseTime),
      p95_response_time_ms: Math.round(p95ResponseTime),
      slow_requests: metrics.response_times.filter(t => t > 1000).length
    },
    recent_errors: metrics.errors.slice(-10).reverse(),
    system: {
      memory: {
        total_mb: Math.round(os.totalmem() / 1024 / 1024),
        free_mb: Math.round(os.freemem() / 1024 / 1024),
        used_mb: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
        usage_percent: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2) + '%'
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        load_avg: os.loadavg().map(l => l.toFixed(2))
      },
      process: {
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptime_seconds: Math.floor(process.uptime())
      }
    }
  };
}

// Reset metrics
export function resetMetrics() {
  metrics.requests = {
    total: 0,
    success: 0,
    errors: 0,
    by_endpoint: {},
    by_status: {}
  };
  metrics.response_times = [];
  metrics.errors = [];
  metrics.uptime = Date.now();
}
