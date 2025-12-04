import UserIntegration from '../models/UserIntegration.js';
import N8nService from '../services/n8nService.js';

const n8nService = new N8nService();

/**
 * Get all user integrations
 * GET /api/user-integrations
 */
export const getUserIntegrations = async (req, res) => {
  try {
    const integrations = await UserIntegration.getUserIntegrations(req.user.id);

    // Don't send sensitive credentials to frontend
    const sanitized = integrations.map(int => ({
      _id: int._id,
      service: int.service,
      displayName: int.displayName,
      enabled: int.enabled,
      status: int.status,
      lastError: int.lastError,
      connectedAt: int.connectedAt,
      lastUsed: int.lastUsed,
      usageCount: int.usageCount,
      // Partial credential info for display
      credentialInfo: getCredentialDisplayInfo(int)
    }));

    res.json({
      success: true,
      integrations: sanitized
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integrations',
      error: error.message
    });
  }
};

/**
 * Get credential display info (safe for frontend)
 */
function getCredentialDisplayInfo(integration) {
  const { service, credentials } = integration;

  switch (service) {
    case 'twilio':
      return {
        accountSid: credentials.accountSid ? `***${credentials.accountSid.slice(-4)}` : null,
        from: credentials.from
      };
    case 'openai':
    case 'anthropic':
      return {
        apiKey: credentials.apiKey ? `***${credentials.apiKey.slice(-4)}` : null,
        organization: credentials.organization
      };
    case 'gmail':
    case 'smtp':
      return {
        email: credentials.email
      };
    case 'slack':
      return {
        webhookUrl: credentials.webhookUrl ? `***${credentials.webhookUrl.slice(-10)}` : null,
        channelId: credentials.channelId
      };
    default:
      return { connected: true };
  }
}

/**
 * Connect Twilio integration
 * POST /api/user-integrations/twilio
 */
export const connectTwilio = async (req, res) => {
  try {
    const { accountSid, authToken, from, displayName } = req.body;

    if (!accountSid || !authToken || !from) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: accountSid, authToken, from'
      });
    }

    // Test credentials by making a test call to Twilio API
    try {
      const testResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
          }
        }
      );

      if (!testResponse.ok) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Twilio credentials'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to verify Twilio credentials',
        error: error.message
      });
    }

    // Create credential in n8n
    const n8nCredentialName = `twilio-${req.user.id}`;
    let n8nCredentialId;

    try {
      const n8nCred = await n8nService.createCredential({
        name: n8nCredentialName,
        type: 'twilioApi',
        data: {
          accountSid,
          authToken
        }
      });
      n8nCredentialId = n8nCred.id;
    } catch (error) {
      console.error('Error creating n8n credential:', error);
      // Continue anyway, can be created later
    }

    // Save to database
    const integration = await UserIntegration.findOneAndUpdate(
      { userId: req.user.id, service: 'twilio' },
      {
        userId: req.user.id,
        service: 'twilio',
        credentials: { accountSid, authToken, from },
        displayName: displayName || 'My Twilio Account',
        status: 'connected',
        connectedAt: new Date(),
        n8nCredentialId,
        n8nCredentialName
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Twilio connected successfully',
      integration: {
        _id: integration._id,
        service: integration.service,
        displayName: integration.displayName,
        credentialInfo: getCredentialDisplayInfo(integration)
      }
    });
  } catch (error) {
    console.error('Error connecting Twilio:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Twilio',
      error: error.message
    });
  }
};

/**
 * Connect OpenAI integration
 * POST /api/user-integrations/openai
 */
export const connectOpenAI = async (req, res) => {
  try {
    const { apiKey, organization, displayName } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: apiKey'
      });
    }

    // Test API key
    try {
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Organization': organization || ''
        }
      });

      if (!testResponse.ok) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OpenAI API key'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to verify OpenAI API key',
        error: error.message
      });
    }

    // Create credential in n8n
    const n8nCredentialName = `openai-${req.user.id}`;
    let n8nCredentialId;

    try {
      const n8nCred = await n8nService.createCredential({
        name: n8nCredentialName,
        type: 'openAiApi',
        data: {
          apiKey,
          organization: organization || ''
        }
      });
      n8nCredentialId = n8nCred.id;
    } catch (error) {
      console.error('Error creating n8n credential:', error);
    }

    // Save to database
    const integration = await UserIntegration.findOneAndUpdate(
      { userId: req.user.id, service: 'openai' },
      {
        userId: req.user.id,
        service: 'openai',
        credentials: { apiKey, organization },
        displayName: displayName || 'My OpenAI Account',
        status: 'connected',
        connectedAt: new Date(),
        n8nCredentialId,
        n8nCredentialName
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'OpenAI connected successfully',
      integration: {
        _id: integration._id,
        service: integration.service,
        displayName: integration.displayName,
        credentialInfo: getCredentialDisplayInfo(integration)
      }
    });
  } catch (error) {
    console.error('Error connecting OpenAI:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect OpenAI',
      error: error.message
    });
  }
};

/**
 * Connect Slack integration
 * POST /api/user-integrations/slack
 */
export const connectSlack = async (req, res) => {
  try {
    const { webhookUrl, channelId, displayName } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: webhookUrl'
      });
    }

    // Test webhook
    try {
      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '✅ VoiceNow CRM integration test - your Slack is connected!'
        })
      });

      if (!testResponse.ok) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Slack webhook URL'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to verify Slack webhook',
        error: error.message
      });
    }

    // Save to database
    const integration = await UserIntegration.findOneAndUpdate(
      { userId: req.user.id, service: 'slack' },
      {
        userId: req.user.id,
        service: 'slack',
        credentials: { webhookUrl, channelId },
        displayName: displayName || 'My Slack Workspace',
        status: 'connected',
        connectedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Slack connected successfully',
      integration: {
        _id: integration._id,
        service: integration.service,
        displayName: integration.displayName,
        credentialInfo: getCredentialDisplayInfo(integration)
      }
    });
  } catch (error) {
    console.error('Error connecting Slack:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Slack',
      error: error.message
    });
  }
};

/**
 * Connect SMTP/Email integration
 * POST /api/user-integrations/smtp
 */
export const connectSMTP = async (req, res) => {
  try {
    const { host, port, user, password, email, displayName } = req.body;

    if (!host || !port || !user || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: host, port, user, password'
      });
    }

    // Create credential in n8n
    const n8nCredentialName = `smtp-${req.user.id}`;
    let n8nCredentialId;

    try {
      const n8nCred = await n8nService.createCredential({
        name: n8nCredentialName,
        type: 'smtp',
        data: {
          host,
          port: parseInt(port),
          user,
          password,
          secure: port == 465
        }
      });
      n8nCredentialId = n8nCred.id;
    } catch (error) {
      console.error('Error creating n8n credential:', error);
    }

    // Save to database
    const integration = await UserIntegration.findOneAndUpdate(
      { userId: req.user.id, service: 'smtp' },
      {
        userId: req.user.id,
        service: 'smtp',
        credentials: { host, port, user, password, email: email || user },
        displayName: displayName || 'My Email Account',
        status: 'connected',
        connectedAt: new Date(),
        n8nCredentialId,
        n8nCredentialName
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Email account connected successfully',
      integration: {
        _id: integration._id,
        service: integration.service,
        displayName: integration.displayName,
        credentialInfo: getCredentialDisplayInfo(integration)
      }
    });
  } catch (error) {
    console.error('Error connecting SMTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect email account',
      error: error.message
    });
  }
};

/**
 * Disconnect integration
 * DELETE /api/user-integrations/:service
 */
export const disconnectIntegration = async (req, res) => {
  try {
    const { service } = req.params;

    const integration = await UserIntegration.findOneAndDelete({
      userId: req.user.id,
      service
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Delete credential from n8n if exists
    if (integration.n8nCredentialId) {
      try {
        await n8nService.deleteCredential(integration.n8nCredentialId);
      } catch (error) {
        console.error('Error deleting n8n credential:', error);
      }
    }

    res.json({
      success: true,
      message: `${service} disconnected successfully`
    });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect integration',
      error: error.message
    });
  }
};

/**
 * Test integration
 * POST /api/user-integrations/:service/test
 */
export const testIntegration = async (req, res) => {
  try {
    const { service } = req.params;

    const integration = await UserIntegration.getUserCredential(req.user.id, service);

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    let testResult;

    switch (service) {
      case 'slack':
        testResult = await fetch(integration.credentials.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: '✅ Test from VoiceNow CRM - integration working!'
          })
        });
        break;

      // Add other service tests as needed

      default:
        return res.status(400).json({
          success: false,
          message: 'Test not available for this service'
        });
    }

    if (testResult && testResult.ok) {
      await integration.recordUsage();

      res.json({
        success: true,
        message: 'Integration test successful'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Integration test failed'
      });
    }
  } catch (error) {
    console.error('Error testing integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test integration',
      error: error.message
    });
  }
};
