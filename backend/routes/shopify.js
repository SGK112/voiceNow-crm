/**
 * Shopify Routes
 * OAuth flow and API endpoints for Shopify integration
 */

import express from 'express';
import crypto from 'crypto';
import shopifySyncService from '../services/shopifySyncService.js';
import { getOAuthRedirectUri } from '../utils/oauthConfig.js';
import { protect as auth } from '../middleware/auth.js';
import OAuthState from '../models/OAuthState.js';
import * as storeManagerController from '../controllers/shopifyStoreManagerController.js';

const router = express.Router();

// ============================================
// OAUTH FLOW
// ============================================

/**
 * GET /api/shopify/auth/url
 * Get OAuth URL for connecting Shopify store
 * Query params: shop (required) - e.g., "mystore" or "mystore.myshopify.com"
 */
router.get('/auth/url', auth, async (req, res) => {
  try {
    const { shop } = req.query;

    if (!shop) {
      return res.status(400).json({ success: false, message: 'Shop domain is required' });
    }

    if (!process.env.SHOPIFY_CLIENT_ID) {
      return res.status(500).json({ success: false, message: 'Shopify not configured' });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Store state in MongoDB (works across local/production servers)
    await OAuthState.create({
      state,
      userId: req.user.userId || req.user._id,
      service: 'shopify',
      metadata: { shop: shopifySyncService.normalizeShopDomain(shop) },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    const redirectUri = getOAuthRedirectUri('shopify');

    const url = shopifySyncService.getOAuthUrl(shop, redirectUri, state);

    res.json({
      success: true,
      url,
      shop: shopifySyncService.normalizeShopDomain(shop)
    });
  } catch (error) {
    console.error('Shopify auth URL error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shopify/auth/callback
 * OAuth callback from Shopify
 */
router.get('/auth/callback', async (req, res) => {
  // HTML success page for mobile browsers
  const successHtml = (storeName) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Shopify Connected</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        .success-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 { margin: 0 0 10px 0; font-size: 24px; }
        p { margin: 10px 0; opacity: 0.9; }
        .store-name { font-weight: bold; color: #4ade80; }
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
        <h1>Shopify Connected!</h1>
        <p>Your store <span class="store-name">${storeName}</span> is now connected.</p>
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
        <p>We couldn't connect your Shopify store.</p>
        <p class="error-msg">${message}</p>
        <p>Please close this window and try again.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { code, shop, state, hmac } = req.query;

    if (!code || !shop) {
      return res.status(400).send(errorHtml('Missing code or shop parameter'));
    }

    // Look up state from MongoDB
    const storedState = await OAuthState.findOneAndDelete({
      state,
      service: 'shopify',
      expiresAt: { $gt: new Date() }
    });

    if (!storedState) {
      return res.status(400).send(errorHtml('Invalid or expired state token. Please try connecting again.'));
    }

    const userId = storedState.userId;

    if (!userId) {
      return res.status(400).send(errorHtml('Please log in to the app first, then try connecting Shopify again.'));
    }

    // Exchange code for access token
    const { accessToken, scope } = await shopifySyncService.exchangeCodeForToken(shop, code);

    // Store credentials
    const result = await shopifySyncService.storeCredentials(userId, shop, accessToken, scope);

    // Send success HTML page
    res.send(successHtml(result.name || shop));
  } catch (error) {
    console.error('Shopify callback error:', error);
    res.status(500).send(errorHtml(error.message || 'Unknown error'));
  }
});

// ============================================
// STATUS & CONNECTION
// ============================================

/**
 * GET /api/shopify/status
 * Get Shopify connection status
 */
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const status = await shopifySyncService.getIntegrationStatus(userId);
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('Shopify status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/shopify/disconnect
 * Disconnect Shopify store
 */
router.post('/disconnect', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    await shopifySyncService.disconnect(userId);
    res.json({ success: true, message: 'Shopify disconnected' });
  } catch (error) {
    console.error('Shopify disconnect error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// PRODUCTS
// ============================================

/**
 * GET /api/shopify/products
 * Get products from connected store
 */
router.get('/products', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { limit, status, collection_id } = req.query;
    const result = await shopifySyncService.getProducts(userId, {
      limit: limit ? parseInt(limit) : 50,
      status,
      collection_id
    });

    res.json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shopify/products/:id
 * Get single product
 */
router.get('/products/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const result = await shopifySyncService.getProduct(userId, req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shopify/products/search
 * Search products by title
 */
router.get('/products/search', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query required' });
    }

    const result = await shopifySyncService.searchProducts(userId, q);
    res.json(result);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// ORDERS
// ============================================

/**
 * GET /api/shopify/orders
 * Get orders from connected store
 */
router.get('/orders', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { limit, status, financial_status, fulfillment_status } = req.query;
    const result = await shopifySyncService.getOrders(userId, {
      limit: limit ? parseInt(limit) : 50,
      status,
      financial_status,
      fulfillment_status
    });

    res.json(result);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shopify/orders/:id
 * Get single order by ID
 */
router.get('/orders/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const result = await shopifySyncService.getOrder(userId, req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shopify/orders/lookup/:orderNumber
 * Lookup order by order number (e.g., #1001)
 */
router.get('/orders/lookup/:orderNumber', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const orderNumber = req.params.orderNumber.replace('#', '');
    const result = await shopifySyncService.getOrderByNumber(userId, orderNumber);
    res.json(result);
  } catch (error) {
    console.error('Lookup order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shopify/orders/:id/tracking
 * Get order tracking info
 */
router.get('/orders/:id/tracking', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const result = await shopifySyncService.getOrderTracking(userId, req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// CUSTOMERS
// ============================================

/**
 * GET /api/shopify/customers
 * Get customers from connected store
 */
router.get('/customers', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { limit } = req.query;
    const result = await shopifySyncService.getCustomers(userId, {
      limit: limit ? parseInt(limit) : 50
    });

    res.json(result);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shopify/customers/search
 * Search customers by email/phone
 */
router.get('/customers/search', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query required' });
    }

    const result = await shopifySyncService.searchCustomer(userId, q);
    res.json(result);
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/shopify/customers/:id/orders
 * Get orders for a specific customer
 */
router.get('/customers/:id/orders', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const result = await shopifySyncService.getCustomerOrders(userId, req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/shopify/sync/customers
 * Sync Shopify customers to CRM contacts
 */
router.post('/sync/customers', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const result = await shopifySyncService.syncCustomersToContacts(userId);
    res.json(result);
  } catch (error) {
    console.error('Sync customers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// STORE MANAGER AI AGENT
// ============================================

/**
 * GET /api/shopify/store-manager/template
 * Get the store manager agent template configuration
 */
router.get('/store-manager/template', auth, storeManagerController.getAgentTemplate);

/**
 * POST /api/shopify/store-manager/command
 * Execute a natural language command
 */
router.post('/store-manager/command', auth, storeManagerController.executeCommand);

/**
 * POST /api/shopify/store-manager/chat
 * Chat with the store manager AI
 */
router.post('/store-manager/chat', auth, storeManagerController.chatWithManager);

/**
 * GET /api/shopify/store-manager/overview
 * Get store overview/dashboard data
 */
router.get('/store-manager/overview', auth, storeManagerController.getStoreOverview);

/**
 * GET /api/shopify/store-manager/sales-report
 * Get sales report for date range
 */
router.get('/store-manager/sales-report', auth, storeManagerController.getSalesReport);

/**
 * GET /api/shopify/store-manager/today
 * Get today's sales summary
 */
router.get('/store-manager/today', auth, storeManagerController.getTodaysSales);

/**
 * GET /api/shopify/store-manager/top-products
 * Get top selling products
 */
router.get('/store-manager/top-products', auth, storeManagerController.getTopProducts);

/**
 * GET /api/shopify/store-manager/low-stock
 * Get low stock products
 */
router.get('/store-manager/low-stock', auth, storeManagerController.getLowStock);

/**
 * GET /api/shopify/store-manager/recent-orders
 * Get recent orders
 */
router.get('/store-manager/recent-orders', auth, storeManagerController.getRecentOrders);

/**
 * GET /api/shopify/store-manager/collections
 * Get all collections
 */
router.get('/store-manager/collections', auth, storeManagerController.getCollections);

export default router;
