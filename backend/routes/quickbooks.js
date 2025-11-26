import express from 'express';
const router = express.Router();
import { protect as auth } from '../middleware/auth.js';
import { UserExtension, Extension } from '../models/Extension.js';
import qbService from '../services/quickbooksService.js';
import crypto from 'crypto';
import Invoice from '../models/Invoice.js';
import Lead from '../models/Lead.js';
import OAuthState from '../models/OAuthState.js';

// Step 1: Initiate OAuth flow
router.get('/connect', auth, async (req, res) => {
  try {
    // Generate random state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in MongoDB (works across local/production)
    await OAuthState.create({
      state,
      userId: req.user.userId,
      service: 'quickbooks',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Get authorization URL
    const authUrl = qbService.getAuthorizationUrl(state);

    res.json({ authUrl });
  } catch (error) {
    console.error('QB Connect error:', error);
    res.status(500).json({ message: 'Failed to initiate QuickBooks connection' });
  }
});

// Step 2: Handle OAuth callback
router.get('/callback', async (req, res) => {
  // HTML success page for mobile browsers
  const successHtml = (companyName) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>QuickBooks Connected</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #2CA01C 0%, #0077C5 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          max-width: 400px;
          margin: 20px;
        }
        .success-icon { font-size: 64px; margin-bottom: 20px; }
        h1 { margin: 0 0 10px 0; font-size: 24px; }
        p { margin: 10px 0; opacity: 0.9; }
        .company-name { font-weight: bold; color: #90EE90; }
        .instruction {
          margin-top: 30px;
          padding: 15px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✓</div>
        <h1>QuickBooks Connected!</h1>
        <p>Your QuickBooks account${companyName ? ` <span class="company-name">${companyName}</span>` : ''} is now connected.</p>
        <div class="instruction">
          You can close this window and return to the VoiceFlow AI app.
        </div>
      </div>
    </body>
    </html>
  `;

  // HTML error page
  const errorHtml = (message) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Connection Failed</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          max-width: 400px;
          margin: 20px;
        }
        .error-icon { font-size: 64px; margin-bottom: 20px; }
        h1 { margin: 0 0 10px 0; font-size: 24px; }
        p { margin: 10px 0; opacity: 0.9; }
        .error-msg { font-size: 12px; opacity: 0.7; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">✕</div>
        <h1>Connection Failed</h1>
        <p>We couldn't connect your QuickBooks account.</p>
        <p class="error-msg">${message}</p>
        <p>Please close this window and try again.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { code, state, realmId, error } = req.query;

    // Handle user cancellation
    if (error) {
      return res.status(400).send(errorHtml(`User cancelled: ${error}`));
    }

    // Verify state token from MongoDB
    const storedState = await OAuthState.findOneAndDelete({
      state,
      service: 'quickbooks',
      expiresAt: { $gt: new Date() }
    });

    if (!storedState) {
      return res.status(400).send(errorHtml('Invalid or expired state token. Please try connecting again.'));
    }

    const userId = storedState.userId;

    // Exchange code for tokens
    const tokens = await qbService.getTokens(code);

    // Find QuickBooks extension
    let qbExtension = await Extension.findOne({ slug: 'quickbooks-online' });

    // Create extension if it doesn't exist
    if (!qbExtension) {
      qbExtension = await Extension.create({
        name: 'QuickBooks Online',
        slug: 'quickbooks-online',
        description: 'Sync invoices, customers, and payments with QuickBooks Online',
        category: 'accounting',
        icon: 'receipt',
        status: 'active',
        stats: { activeInstalls: 0 }
      });
    }

    // Create or update user extension
    let userExtension = await UserExtension.findOne({
      user: userId,
      extension: qbExtension._id
    });

    if (!userExtension) {
      userExtension = new UserExtension({
        user: userId,
        extension: qbExtension._id,
        status: 'active'
      });
    }

    // Encrypt and store tokens (in production, use proper encryption)
    userExtension.credentials = {
      realmId: realmId
    };

    userExtension.oauth = {
      accessToken: tokens.access_token,  // TODO: Encrypt in production
      refreshToken: tokens.refresh_token,  // TODO: Encrypt in production
      expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
      tokenType: tokens.token_type,
      scope: tokens.scope?.split(' ') || []
    };

    userExtension.status = 'active';
    userExtension.syncStatus = {
      status: 'idle',
      lastSyncAt: null
    };

    await userExtension.save();

    // Update extension stats
    qbExtension.stats.activeInstalls += 1;
    await qbExtension.save();

    console.log(`✅ QuickBooks connected for user ${userId}: realmId ${realmId}`);

    // Send success HTML page (works for mobile and web)
    res.send(successHtml());
  } catch (error) {
    console.error('QB Callback error:', error);
    res.status(500).send(errorHtml(error.message || 'Unknown error'));
  }
});

// Disconnect QuickBooks
router.post('/disconnect', auth, async (req, res) => {
  try {
    const qbExtension = await Extension.findOne({ slug: 'quickbooks-online' });

    const userExtension = await UserExtension.findOne({
      user: req.user.userId,
      extension: qbExtension._id
    }).select('+oauth');

    if (!userExtension) {
      return res.status(404).json({ message: 'QuickBooks not connected' });
    }

    // Revoke token
    if (userExtension.oauth?.refreshToken) {
      try {
        await qbService.revokeToken(userExtension.oauth.refreshToken);
      } catch (error) {
        console.error('Token revocation error:', error);
        // Continue anyway
      }
    }

    // Delete user extension
    await userExtension.deleteOne();

    // Update stats
    if (qbExtension) {
      qbExtension.stats.activeInstalls = Math.max(0, qbExtension.stats.activeInstalls - 1);
      await qbExtension.save();
    }

    res.json({ message: 'QuickBooks disconnected successfully' });
  } catch (error) {
    console.error('QB Disconnect error:', error);
    res.status(500).json({ message: 'Failed to disconnect QuickBooks' });
  }
});

// Manually trigger sync
router.post('/sync', auth, async (req, res) => {
  try {
    const qbExtension = await Extension.findOne({ slug: 'quickbooks-online' });

    const userExtension = await UserExtension.findOne({
      user: req.user.userId,
      extension: qbExtension._id
    }).select('+oauth +credentials');

    if (!userExtension) {
      return res.status(404).json({ message: 'QuickBooks not connected' });
    }

    // Check if token needs refresh
    if (new Date() > userExtension.oauth.expiresAt) {
      const newTokens = await qbService.refreshToken(userExtension.oauth.refreshToken);

      userExtension.oauth.accessToken = newTokens.access_token;
      userExtension.oauth.refreshToken = newTokens.refresh_token;
      userExtension.oauth.expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));

      await userExtension.save();
    }

    // Update sync status
    userExtension.syncStatus.status = 'syncing';
    await userExtension.save();

    // Queue background job to sync
    // TODO: Use Bull or Bee-Queue to queue sync job
    // For now, trigger immediate sync
    const syncResult = await performSync(
      userExtension.credentials.realmId,
      userExtension.oauth.accessToken,
      req.user.userId
    );

    // Update sync status
    userExtension.syncStatus = {
      status: 'success',
      lastSyncAt: new Date(),
      syncedEntities: syncResult.entities
    };
    await userExtension.save();

    res.json({
      message: 'Sync completed successfully',
      result: syncResult
    });
  } catch (error) {
    console.error('QB Sync error:', error);

    // Update sync status to error
    const qbExtension = await Extension.findOne({ slug: 'quickbooks-online' });
    const userExtension = await UserExtension.findOne({
      user: req.user.userId,
      extension: qbExtension._id
    });

    if (userExtension) {
      userExtension.syncStatus.status = 'error';
      userExtension.syncStatus.error = error.message;
      await userExtension.save();
    }

    res.status(500).json({ message: 'Sync failed', error: error.message });
  }
});

// Get sync status
router.get('/status', auth, async (req, res) => {
  try {
    const qbExtension = await Extension.findOne({ slug: 'quickbooks-online' });

    const userExtension = await UserExtension.findOne({
      user: req.user.userId,
      extension: qbExtension._id
    });

    if (!userExtension) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      status: userExtension.status,
      syncStatus: userExtension.syncStatus,
      lastSyncAt: userExtension.syncStatus.lastSyncAt
    });
  } catch (error) {
    console.error('QB Status error:', error);
    res.status(500).json({ message: 'Failed to get status' });
  }
});

// Webhook endpoint (receive updates from QuickBooks)
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['intuit-signature'];
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const webhookToken = process.env.QB_WEBHOOK_TOKEN;
    const isValid = qbService.verifyWebhookSignature(payload, signature, webhookToken);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const { eventNotifications } = req.body;

    // Process each notification
    for (const notification of eventNotifications) {
      const { realmId, dataChangeEvent } = notification;

      // Find user extension by realmId
      const userExtension = await UserExtension.findOne({
        'credentials.realmId': realmId
      }).select('+oauth +credentials').populate('user');

      if (!userExtension) continue;

      // Process each entity change
      for (const entity of dataChangeEvent.entities) {
        await handleEntityChange(
          entity,
          realmId,
          userExtension.oauth.accessToken,
          userExtension.user._id
        );
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('QB Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Helper function to perform sync
async function performSync(realmId, accessToken, userId) {

  const entities = [];

  // Sync customers
  const qbCustomers = await qbService.queryCustomers(realmId, accessToken);
  // TODO: Map and save to Lead model
  entities.push({ entity: 'customers', count: qbCustomers.QueryResponse?.Customer?.length || 0 });

  // Sync invoices
  const qbInvoices = await qbService.makeRequest(
    'GET',
    '/query?query=' + encodeURIComponent('SELECT * FROM Invoice'),
    realmId,
    accessToken
  );

  // TODO: Map and save to Invoice model
  entities.push({ entity: 'invoices', count: qbInvoices.QueryResponse?.Invoice?.length || 0 });

  return { entities };
}

// Helper function to handle entity changes from webhook
async function handleEntityChange(entity, realmId, accessToken, userId) {
  const { name, id, operation } = entity;

  if (name === 'Invoice') {

    if (operation === 'Create' || operation === 'Update') {
      const qbInvoice = await qbService.getInvoice(realmId, accessToken, id);
      const crmInvoice = qbService.mapQBInvoiceToCRM(qbInvoice.Invoice);

      // Find and update or create
      await Invoice.findOneAndUpdate(
        { user: userId, quickbooksId: id },
        { ...crmInvoice, quickbooksId: id, syncStatus: 'synced' },
        { upsert: true, new: true }
      );
    } else if (operation === 'Delete') {
      await Invoice.findOneAndUpdate(
        { user: userId, quickbooksId: id },
        { status: 'cancelled' }
      );
    }
  }

  // Handle other entities (Customer, Estimate, Payment)
  // TODO: Implement handlers for other entity types
}

export default router;
