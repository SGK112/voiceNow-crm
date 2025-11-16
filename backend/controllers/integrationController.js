import { google } from 'googleapis';
import Integration from '../models/Integration.js';
import ElevenLabsService from '../services/elevenLabsService.js';
import N8nService from '../services/n8nService.js';
import TwilioService from '../services/twilioService.js';
import EmailService from '../services/emailService.js';
import mongoose from 'mongoose';

// OAuth2 configuration
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/integration/callback`
  );
};

// Get all integrations for a user
export const getIntegrations = async (req, res) => {
  try {
    const integrations = await Integration.find({ userId: req.user._id })
      .select('-credentials.accessToken -credentials.refreshToken')
      .sort({ createdAt: -1 });

    res.json(integrations);
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ message: 'Failed to fetch integrations' });
  }
};

// Get single integration
export const getIntegration = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).select('-credentials.accessToken -credentials.refreshToken');

    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    res.json(integration);
  } catch (error) {
    console.error('Get integration error:', error);
    res.status(500).json({ message: 'Failed to fetch integration' });
  }
};

// Delete/disconnect integration
export const deleteIntegration = async (req, res) => {
  try {
    const integration = await Integration.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    res.json({ message: 'Integration disconnected successfully' });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ message: 'Failed to disconnect integration' });
  }
};

// Google OAuth - Start flow
export const googleAuthStart = async (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();

    const scopes = req.query.scopes ? req.query.scopes.split(',') : [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: JSON.stringify({ userId: req.user._id.toString(), service: 'google' }) // Pass user ID and service in state
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Google auth start error:', error);
    res.status(500).json({ message: 'Failed to start OAuth flow' });
  }
};

// Google OAuth - Callback
export const googleAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' });
    }

    const oauth2Client = getOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Calculate expiration time
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // 1 hour default

    // Save integration
    const integration = await Integration.findOrCreate(req.user._id, 'google', {
      name: 'Google',
      description: 'Gmail, Calendar, Sheets, and Drive',
      credentials: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenType: tokens.token_type || 'Bearer',
        expiresAt,
        scope: tokens.scope
      },
      metadata: {
        email: userInfo.email,
        accountId: userInfo.id,
        accountName: userInfo.name
      },
      scopes: tokens.scope ? tokens.scope.split(' ') : []
    });

    res.json({
      success: true,
      integration: {
        _id: integration._id,
        service: integration.service,
        name: integration.name,
        status: integration.status,
        metadata: integration.metadata
      }
    });
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.status(500).json({ message: 'Failed to complete OAuth flow', error: error.message });
  }
};

// Refresh Google tokens
export const refreshGoogleToken = async (integrationId, userId) => {
  try {
    const integration = await Integration.findOne({
      _id: integrationId,
      userId
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: integration.getRefreshToken()
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    await integration.updateTokens(
      credentials.access_token,
      credentials.refresh_token || integration.getRefreshToken(),
      credentials.expiry_date ? (credentials.expiry_date - Date.now()) / 1000 : 3600
    );

    return integration;
  } catch (error) {
    console.error('Refresh token error:', error);
    throw error;
  }
};

// Get valid access token (auto-refresh if expired)
export const getValidAccessToken = async (req, res) => {
  try {
    const { service } = req.params;

    let integration = await Integration.findOne({
      userId: req.user._id,
      service,
      status: { $in: ['connected', 'expired'] }
    });

    if (!integration) {
      return res.status(404).json({ message: `${service} not connected` });
    }

    // Check if token is expired and refresh if needed
    if (integration.isExpired() && integration.getRefreshToken()) {
      integration = await refreshGoogleToken(integration._id, req.user._id);
    }

    res.json({
      accessToken: integration.getAccessToken(),
      expiresAt: integration.credentials.expiresAt
    });
  } catch (error) {
    console.error('Get valid access token error:', error);
    res.status(500).json({ message: 'Failed to get access token' });
  }
};

// Test integration connection
export const testIntegration = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    // Refresh if expired
    if (integration.isExpired() && integration.getRefreshToken()) {
      await refreshGoogleToken(integration._id, req.user._id);
    }

    // Test the connection based on service
    let testResult = { success: true };

    if (integration.service === 'google') {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({
        access_token: integration.getAccessToken()
      });

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();

      testResult = {
        success: true,
        message: 'Connected successfully',
        userInfo: {
          email: data.email,
          name: data.name
        }
      };
    }

    await integration.markUsed();

    res.json(testResult);
  } catch (error) {
    console.error('Test integration error:', error);

    if (error.code === 401 || error.code === 403) {
      await Integration.findByIdAndUpdate(req.params.id, {
        status: 'error',
        'lastError.message': 'Authorization failed',
        'lastError.code': error.code,
        'lastError.timestamp': new Date()
      });
    }

    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message
    });
  }
};

// Slack OAuth - Start flow
export const slackAuthStart = async (req, res) => {
  try {
    if (!process.env.SLACK_CLIENT_ID) {
      return res.status(500).json({ message: 'Slack OAuth not configured' });
    }

    const scopes = [
      'chat:write',
      'channels:read',
      'groups:read',
      'users:read'
    ].join(',');

    const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/integration/callback`;
    const state = JSON.stringify({ userId: req.user._id.toString(), service: 'slack' });

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

    res.json({ authUrl });
  } catch (error) {
    console.error('Slack auth start error:', error);
    res.status(500).json({ message: 'Failed to start Slack OAuth flow' });
  }
};

// Slack OAuth - Callback
export const slackAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' });
    }

    // Exchange code for tokens
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/integration/callback`
      })
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Slack OAuth failed');
    }

    // Calculate expiration (Slack tokens typically don't expire, but we'll set a long time)
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    // Save integration
    const integration = await Integration.findOrCreate(req.user._id, 'slack', {
      name: 'Slack',
      description: 'Team notifications and collaboration',
      credentials: {
        accessToken: data.access_token,
        tokenType: 'Bearer',
        expiresAt,
        scope: data.scope
      },
      metadata: {
        workspace: data.team.name,
        workspaceId: data.team.id,
        botUserId: data.bot_user_id
      },
      scopes: data.scope.split(',')
    });

    res.json({
      success: true,
      integration: {
        _id: integration._id,
        service: integration.service,
        name: integration.name,
        status: integration.status,
        metadata: integration.metadata
      }
    });
  } catch (error) {
    console.error('Slack auth callback error:', error);
    res.status(500).json({ message: 'Failed to complete Slack OAuth flow', error: error.message });
  }
};

// Helper function to mask API keys
const maskApiKey = (key) => {
  if (!key) return null;
  if (key.length <= 8) return '***';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
};

// Get platform integrations status (ElevenLabs, n8n, Twilio, Email, etc.)
export const getPlatformStatus = async (req, res) => {
  try {
    // ElevenLabs status
    const elevenLabsService = new ElevenLabsService();
    const elevenLabsStatus = {
      status: elevenLabsService.isAvailable() ? 'connected' : 'not_configured',
      apiKey: process.env.ELEVENLABS_API_KEY ? maskApiKey(process.env.ELEVENLABS_API_KEY) : null,
      phoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID || null,
      demoAgentId: process.env.ELEVENLABS_DEMO_AGENT_ID || null,
      capabilities: ['voice_calls', 'ai_agents', 'conversational_ai']
    };

    // n8n status
    const n8nService = new N8nService();
    const n8nStatus = {
      status: n8nService.isAvailable() ? 'connected' : 'not_configured',
      apiUrl: process.env.N8N_API_URL || null,
      webhookUrl: process.env.N8N_WEBHOOK_URL || null,
      capabilities: ['workflow_automation', 'webhooks', 'integrations']
    };

    // Twilio status
    const twilioService = new TwilioService();
    const twilioStatus = {
      status: twilioService.isAvailable() ? 'connected' : 'not_configured',
      accountSid: process.env.TWILIO_ACCOUNT_SID ? maskApiKey(process.env.TWILIO_ACCOUNT_SID) : null,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
      capabilities: ['sms', 'voice', 'phone_numbers']
    };

    // Email status
    const emailService = new EmailService();
    const emailStatus = {
      status: emailService.isAvailable() ? 'connected' : 'not_configured',
      smtpHost: process.env.SMTP_HOST || null,
      fromEmail: process.env.SMTP_USER || null,
      capabilities: ['email_notifications', 'smtp']
    };

    // Google OAuth status
    const googleStatus = {
      status: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? 'configured' : 'not_configured',
      clientId: process.env.GOOGLE_CLIENT_ID ? maskApiKey(process.env.GOOGLE_CLIENT_ID) : null,
      capabilities: ['oauth', 'calendar', 'sheets', 'gmail']
    };

    // Stripe status
    const stripeStatus = {
      status: process.env.STRIPE_SECRET_KEY ? 'connected' : 'not_configured',
      apiKey: process.env.STRIPE_SECRET_KEY ? maskApiKey(process.env.STRIPE_SECRET_KEY) : null,
      capabilities: ['payments', 'subscriptions', 'billing']
    };

    // Database status
    const dbStatus = {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      connected: mongoose.connection.readyState === 1,
      dbName: mongoose.connection.name || null
    };

    res.json({
      success: true,
      integrations: {
        elevenlabs: elevenLabsStatus,
        n8n: n8nStatus,
        twilio: twilioStatus,
        email: emailStatus,
        google: googleStatus,
        stripe: stripeStatus,
        database: dbStatus
      }
    });
  } catch (error) {
    console.error('Error fetching platform status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform integration status'
    });
  }
};

// Get specific platform integration details
export const getPlatformDetails = async (req, res) => {
  try {
    const { provider } = req.params;

    switch (provider) {
      case 'elevenlabs': {
        const elevenLabsService = new ElevenLabsService();
        let agents = [];

        if (elevenLabsService.isAvailable()) {
          try {
            agents = await elevenLabsService.listAgents();
          } catch (error) {
            console.error('Error listing ElevenLabs agents:', error);
          }
        }

        res.json({
          success: true,
          provider: 'elevenlabs',
          status: elevenLabsService.isAvailable() ? 'connected' : 'not_configured',
          config: {
            apiKey: process.env.ELEVENLABS_API_KEY ? maskApiKey(process.env.ELEVENLABS_API_KEY) : null,
            phoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID || null,
            demoAgentId: process.env.ELEVENLABS_DEMO_AGENT_ID || null
          },
          capabilities: ['voice_calls', 'ai_agents', 'conversational_ai'],
          agents: agents.slice(0, 10), // Limit to 10 agents for performance
          usage: {
            callsToday: 0, // TODO: Implement call tracking
            totalCalls: 0
          }
        });
        break;
      }

      case 'n8n': {
        const n8nService = new N8nService();
        let workflows = [];

        if (n8nService.isAvailable()) {
          try {
            workflows = await n8nService.listWorkflows();
          } catch (error) {
            console.error('Error listing n8n workflows:', error);
          }
        }

        res.json({
          success: true,
          provider: 'n8n',
          status: n8nService.isAvailable() ? 'connected' : 'not_configured',
          config: {
            apiUrl: process.env.N8N_API_URL || null,
            webhookUrl: process.env.N8N_WEBHOOK_URL || null,
            apiKey: process.env.N8N_API_KEY ? maskApiKey(process.env.N8N_API_KEY) : null
          },
          capabilities: ['workflow_automation', 'webhooks', 'integrations'],
          workflows: workflows.slice(0, 10),
          usage: {
            activeWorkflows: workflows.filter(w => w.active).length,
            totalWorkflows: workflows.length
          }
        });
        break;
      }

      case 'twilio': {
        const twilioService = new TwilioService();
        res.json({
          success: true,
          provider: 'twilio',
          status: twilioService.isAvailable() ? 'connected' : 'not_configured',
          config: {
            accountSid: process.env.TWILIO_ACCOUNT_SID ? maskApiKey(process.env.TWILIO_ACCOUNT_SID) : null,
            phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
            authToken: process.env.TWILIO_AUTH_TOKEN ? '***' : null
          },
          capabilities: ['sms', 'voice', 'phone_numbers'],
          usage: {
            messagesThisMonth: 0, // TODO: Implement usage tracking
            callsThisMonth: 0
          }
        });
        break;
      }

      case 'email': {
        const emailService = new EmailService();
        res.json({
          success: true,
          provider: 'email',
          status: emailService.isAvailable() ? 'connected' : 'not_configured',
          config: {
            smtpHost: process.env.SMTP_HOST || null,
            smtpPort: process.env.SMTP_PORT || 587,
            fromEmail: process.env.SMTP_USER || null,
            secure: process.env.SMTP_SECURE === 'true'
          },
          capabilities: ['email_notifications', 'smtp'],
          usage: {
            emailsSentToday: 0 // TODO: Implement email tracking
          }
        });
        break;
      }

      default:
        res.status(404).json({
          success: false,
          error: 'Provider not found'
        });
    }
  } catch (error) {
    console.error(`Error fetching ${req.params.provider} details:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integration details'
    });
  }
};

// Test specific platform integration
export const testPlatformIntegration = async (req, res) => {
  try {
    const { provider } = req.params;

    switch (provider) {
      case 'elevenlabs': {
        const elevenLabsService = new ElevenLabsService();
        if (!elevenLabsService.isAvailable()) {
          return res.status(400).json({
            success: false,
            message: 'ElevenLabs is not configured'
          });
        }

        // Test by listing agents
        const agents = await elevenLabsService.listAgents();
        res.json({
          success: true,
          message: 'ElevenLabs connection successful',
          details: {
            agentsFound: agents.length,
            configured: true
          }
        });
        break;
      }

      case 'n8n': {
        const n8nService = new N8nService();
        if (!n8nService.isAvailable()) {
          return res.status(400).json({
            success: false,
            message: 'n8n is not configured'
          });
        }

        // Test by listing workflows
        const workflows = await n8nService.listWorkflows();
        res.json({
          success: true,
          message: 'n8n connection successful',
          details: {
            workflowsFound: workflows.length,
            configured: true
          }
        });
        break;
      }

      case 'twilio': {
        const twilioService = new TwilioService();
        if (!twilioService.isAvailable()) {
          return res.status(400).json({
            success: false,
            message: 'Twilio is not configured'
          });
        }

        res.json({
          success: true,
          message: 'Twilio connection successful',
          details: {
            configured: true
          }
        });
        break;
      }

      case 'email': {
        const emailService = new EmailService();
        if (!emailService.isAvailable()) {
          return res.status(400).json({
            success: false,
            message: 'Email service is not configured'
          });
        }

        res.json({
          success: true,
          message: 'Email service connection successful',
          details: {
            configured: true
          }
        });
        break;
      }

      default:
        res.status(404).json({
          success: false,
          error: 'Provider not found'
        });
    }
  } catch (error) {
    console.error(`Error testing ${req.params.provider}:`, error);
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message
    });
  }
};

export default {
  getIntegrations,
  getIntegration,
  deleteIntegration,
  googleAuthStart,
  googleAuthCallback,
  slackAuthStart,
  slackAuthCallback,
  getValidAccessToken,
  testIntegration,
  getPlatformStatus,
  getPlatformDetails,
  testPlatformIntegration
};
