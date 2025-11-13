import { google } from 'googleapis';
import Integration from '../models/Integration.js';

// OAuth2 configuration
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google/callback`
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
      state: req.user._id.toString() // Pass user ID in state
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

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${req.user._id.toString()}`;

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

export default {
  getIntegrations,
  getIntegration,
  deleteIntegration,
  googleAuthStart,
  googleAuthCallback,
  slackAuthStart,
  slackAuthCallback,
  getValidAccessToken,
  testIntegration
};
