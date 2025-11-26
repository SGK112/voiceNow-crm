/**
 * Shopify Routes
 * OAuth flow and API endpoints for Shopify integration
 */

import express from 'express';
import crypto from 'crypto';
import shopifySyncService from '../services/shopifySyncService.js';
import { getOAuthRedirectUri } from '../utils/oauthConfig.js';

const router = express.Router();

// ============================================
// OAUTH FLOW
// ============================================

/**
 * GET /api/shopify/auth/url
 * Get OAuth URL for connecting Shopify store
 * Query params: shop (required) - e.g., "mystore" or "mystore.myshopify.com"
 */
router.get('/auth/url', (req, res) => {
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

    // Store state in session or temporary storage
    // For simplicity, we'll include userId in state (in production, use proper session)
    const stateWithUser = `${state}_${req.user?._id || 'anonymous'}`;

    const redirectUri = getOAuthRedirectUri('shopify');

    const url = shopifySyncService.getOAuthUrl(shop, redirectUri, stateWithUser);

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
  try {
    const { code, shop, state, hmac } = req.query;

    if (!code || !shop) {
      return res.status(400).send('Missing code or shop parameter');
    }

    // Extract userId from state
    const stateParts = state?.split('_') || [];
    const userId = stateParts[stateParts.length - 1];

    if (!userId || userId === 'anonymous') {
      // Redirect to login with shop info
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?shopify_pending=${shop}`);
    }

    // Exchange code for access token
    const { accessToken, scope } = await shopifySyncService.exchangeCodeForToken(shop, code);

    // Store credentials
    await shopifySyncService.storeCredentials(userId, shop, accessToken, scope);

    // Redirect to success page
    const successUrl = process.env.MOBILE_SCHEME
      ? `${process.env.MOBILE_SCHEME}://shopify/success`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?shopify=connected`;

    res.redirect(successUrl);
  } catch (error) {
    console.error('Shopify callback error:', error);
    const errorUrl = process.env.MOBILE_SCHEME
      ? `${process.env.MOBILE_SCHEME}://shopify/error`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?shopify=error`;

    res.redirect(errorUrl);
  }
});

// ============================================
// STATUS & CONNECTION
// ============================================

/**
 * GET /api/shopify/status
 * Get Shopify connection status
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.post('/disconnect', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.get('/products', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.get('/products/:id', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.get('/products/search', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.get('/orders', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.get('/orders/:id', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.get('/orders/lookup/:orderNumber', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.get('/orders/:id/tracking', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.get('/customers', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.get('/customers/search', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.get('/customers/:id/orders', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
router.post('/sync/customers', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await shopifySyncService.syncCustomersToContacts(userId);
    res.json(result);
  } catch (error) {
    console.error('Sync customers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
