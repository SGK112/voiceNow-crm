/**
 * Shopify Sync Service
 * Handles OAuth, products, orders, customers sync via Shopify Admin API
 */

import 'dotenv/config';
import UserIntegration from '../models/UserIntegration.js';
import Contact from '../models/Contact.js';

class ShopifySyncService {
  constructor() {
    this.clientId = process.env.SHOPIFY_CLIENT_ID;
    this.clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    this.scopes = [
      'read_products',
      'read_orders',
      'read_customers',
      'read_inventory',
      'read_fulfillments',
      'write_orders',
      'write_customers'
    ].join(',');
  }

  /**
   * Generate OAuth URL for Shopify store connection
   */
  getOAuthUrl(shop, redirectUri, state) {
    const shopDomain = this.normalizeShopDomain(shop);
    return `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${this.clientId}` +
      `&scope=${this.scopes}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(shop, code) {
    const shopDomain = this.normalizeShopDomain(shop);

    const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shopify token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      scope: data.scope
    };
  }

  /**
   * Store Shopify credentials for user
   */
  async storeCredentials(userId, shop, accessToken, scope) {
    const shopDomain = this.normalizeShopDomain(shop);

    // Get shop info
    const shopInfo = await this.makeApiRequest(shopDomain, accessToken, '/shop.json');

    await UserIntegration.findOneAndUpdate(
      { userId, service: 'shopify' },
      {
        userId,
        service: 'shopify',
        credentials: {
          accessToken,
          shop: shopDomain,
          scope
        },
        displayName: shopInfo.shop?.name || shopDomain,
        status: 'connected',
        enabled: true,
        isOAuth: true,
        connectedAt: new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Shopify connected for user ${userId}: ${shopDomain}`);
    return { success: true, shop: shopDomain, name: shopInfo.shop?.name };
  }

  /**
   * Make authenticated API request to Shopify
   */
  async makeApiRequest(shop, accessToken, endpoint, method = 'GET', body = null) {
    const url = `https://${shop}/admin/api/2024-01${endpoint}`;

    const options = {
      method,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shopify API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get authenticated client for user
   */
  async getClientForUser(userId) {
    const integration = await UserIntegration.findOne({
      userId,
      service: 'shopify',
      status: 'connected',
      enabled: true
    });

    if (!integration) {
      throw new Error('No Shopify integration found for user');
    }

    return {
      shop: integration.credentials.shop,
      accessToken: integration.credentials.accessToken,
      integration
    };
  }

  // ============================================
  // PRODUCTS
  // ============================================

  /**
   * Get all products from Shopify store
   */
  async getProducts(userId, options = {}) {
    const { shop, accessToken, integration } = await this.getClientForUser(userId);

    const limit = options.limit || 50;
    const params = new URLSearchParams({ limit: limit.toString() });

    if (options.since_id) params.append('since_id', options.since_id);
    if (options.collection_id) params.append('collection_id', options.collection_id);
    if (options.status) params.append('status', options.status);

    const data = await this.makeApiRequest(shop, accessToken, `/products.json?${params}`);

    integration.lastUsed = new Date();
    integration.usageCount += 1;
    await integration.save();

    return {
      success: true,
      products: data.products || [],
      count: data.products?.length || 0
    };
  }

  /**
   * Get single product by ID
   */
  async getProduct(userId, productId) {
    const { shop, accessToken } = await this.getClientForUser(userId);
    const data = await this.makeApiRequest(shop, accessToken, `/products/${productId}.json`);
    return { success: true, product: data.product };
  }

  /**
   * Search products
   */
  async searchProducts(userId, query) {
    const { shop, accessToken } = await this.getClientForUser(userId);
    const params = new URLSearchParams({ title: query, limit: '20' });
    const data = await this.makeApiRequest(shop, accessToken, `/products.json?${params}`);
    return { success: true, products: data.products || [] };
  }

  // ============================================
  // ORDERS
  // ============================================

  /**
   * Get orders from Shopify store
   */
  async getOrders(userId, options = {}) {
    const { shop, accessToken, integration } = await this.getClientForUser(userId);

    const limit = options.limit || 50;
    const params = new URLSearchParams({ limit: limit.toString() });

    if (options.status) params.append('status', options.status);
    if (options.financial_status) params.append('financial_status', options.financial_status);
    if (options.fulfillment_status) params.append('fulfillment_status', options.fulfillment_status);
    if (options.created_at_min) params.append('created_at_min', options.created_at_min);
    if (options.created_at_max) params.append('created_at_max', options.created_at_max);

    const data = await this.makeApiRequest(shop, accessToken, `/orders.json?${params}`);

    integration.lastUsed = new Date();
    integration.usageCount += 1;
    await integration.save();

    return {
      success: true,
      orders: data.orders || [],
      count: data.orders?.length || 0
    };
  }

  /**
   * Get single order by ID
   */
  async getOrder(userId, orderId) {
    const { shop, accessToken } = await this.getClientForUser(userId);
    const data = await this.makeApiRequest(shop, accessToken, `/orders/${orderId}.json`);
    return { success: true, order: data.order };
  }

  /**
   * Get order by order number (what customer sees)
   */
  async getOrderByNumber(userId, orderNumber) {
    const { shop, accessToken } = await this.getClientForUser(userId);
    const params = new URLSearchParams({ name: orderNumber, status: 'any' });
    const data = await this.makeApiRequest(shop, accessToken, `/orders.json?${params}`);

    if (!data.orders?.length) {
      return { success: false, message: 'Order not found' };
    }

    return { success: true, order: data.orders[0] };
  }

  /**
   * Get order fulfillments
   */
  async getOrderFulfillments(userId, orderId) {
    const { shop, accessToken } = await this.getClientForUser(userId);
    const data = await this.makeApiRequest(shop, accessToken, `/orders/${orderId}/fulfillments.json`);
    return { success: true, fulfillments: data.fulfillments || [] };
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  /**
   * Get customers from Shopify store
   */
  async getCustomers(userId, options = {}) {
    const { shop, accessToken, integration } = await this.getClientForUser(userId);

    const limit = options.limit || 50;
    const params = new URLSearchParams({ limit: limit.toString() });

    if (options.since_id) params.append('since_id', options.since_id);
    if (options.created_at_min) params.append('created_at_min', options.created_at_min);

    const data = await this.makeApiRequest(shop, accessToken, `/customers.json?${params}`);

    integration.lastUsed = new Date();
    integration.usageCount += 1;
    await integration.save();

    return {
      success: true,
      customers: data.customers || [],
      count: data.customers?.length || 0
    };
  }

  /**
   * Search customers by email or phone
   */
  async searchCustomer(userId, query) {
    const { shop, accessToken } = await this.getClientForUser(userId);
    const params = new URLSearchParams({ query, limit: '10' });
    const data = await this.makeApiRequest(shop, accessToken, `/customers/search.json?${params}`);
    return { success: true, customers: data.customers || [] };
  }

  /**
   * Get customer orders
   */
  async getCustomerOrders(userId, customerId) {
    const { shop, accessToken } = await this.getClientForUser(userId);
    const data = await this.makeApiRequest(shop, accessToken, `/customers/${customerId}/orders.json`);
    return { success: true, orders: data.orders || [] };
  }

  /**
   * Sync Shopify customers to CRM contacts
   */
  async syncCustomersToContacts(userId) {
    const { customers } = await this.getCustomers(userId, { limit: 250 });

    let imported = 0;
    let skipped = 0;

    for (const customer of customers) {
      const phone = customer.phone || customer.default_address?.phone;
      const email = customer.email;

      if (!phone && !email) {
        skipped++;
        continue;
      }

      // Check for existing contact
      const query = { user: userId, isDeleted: false };
      if (phone) {
        query.phone = phone.replace(/\D/g, '').slice(-10);
      } else if (email) {
        query.email = email;
      }

      const existing = await Contact.findOne(query);

      if (existing) {
        // Update with Shopify ID if not set
        if (!existing.shopifyCustomerId) {
          existing.shopifyCustomerId = customer.id.toString();
          existing.importSource = 'shopify';
          await existing.save();
        }
        skipped++;
        continue;
      }

      // Create new contact
      await Contact.create({
        user: userId,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || email || 'Shopify Customer',
        phone: phone || undefined,
        email: email || undefined,
        company: customer.default_address?.company || undefined,
        address: customer.default_address ?
          `${customer.default_address.address1 || ''}, ${customer.default_address.city || ''}, ${customer.default_address.province || ''} ${customer.default_address.zip || ''}`.trim() : undefined,
        shopifyCustomerId: customer.id.toString(),
        importSource: 'shopify',
        tags: ['shopify-customer'],
        metadata: {
          shopifyOrdersCount: customer.orders_count,
          shopifyTotalSpent: customer.total_spent,
          shopifyVerifiedEmail: customer.verified_email
        }
      });

      imported++;
    }

    return {
      success: true,
      total: customers.length,
      imported,
      skipped,
      message: `Synced ${imported} customers from Shopify (${skipped} skipped)`
    };
  }

  // ============================================
  // INVENTORY
  // ============================================

  /**
   * Get inventory levels
   */
  async getInventoryLevels(userId, inventoryItemIds) {
    const { shop, accessToken } = await this.getClientForUser(userId);
    const params = new URLSearchParams({ inventory_item_ids: inventoryItemIds.join(',') });
    const data = await this.makeApiRequest(shop, accessToken, `/inventory_levels.json?${params}`);
    return { success: true, inventoryLevels: data.inventory_levels || [] };
  }

  // ============================================
  // INTEGRATION STATUS
  // ============================================

  /**
   * Get Shopify integration status for user
   */
  async getIntegrationStatus(userId) {
    const integration = await UserIntegration.findOne({
      userId,
      service: 'shopify'
    }).select('status enabled displayName credentials.shop lastUsed usageCount');

    if (!integration) {
      return { connected: false };
    }

    return {
      connected: integration.status === 'connected' && integration.enabled,
      shop: integration.credentials?.shop,
      storeName: integration.displayName,
      lastUsed: integration.lastUsed,
      usageCount: integration.usageCount
    };
  }

  /**
   * Disconnect Shopify integration
   */
  async disconnect(userId) {
    await UserIntegration.findOneAndUpdate(
      { userId, service: 'shopify' },
      { status: 'disconnected', enabled: false }
    );
    return { success: true, message: 'Shopify disconnected' };
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Normalize shop domain (remove protocol, add .myshopify.com if needed)
   */
  normalizeShopDomain(shop) {
    let domain = shop.toLowerCase().trim();

    // Remove protocol and trailing slashes
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/\/$/, '');

    // Remove any path components
    domain = domain.split('/')[0];

    // If already has .myshopify.com, return as-is
    if (domain.endsWith('.myshopify.com')) {
      return domain;
    }

    // Remove any existing partial .myshopify suffix
    domain = domain.replace(/\.myshopify.*$/, '');

    // Remove "store." prefix if user accidentally included it
    // (Shopify stores don't typically have "store." prefix)
    if (domain.startsWith('store.')) {
      console.log(`[Shopify] Removing 'store.' prefix from domain: ${domain}`);
      domain = domain.replace(/^store\./, '');
    }

    // Add .myshopify.com suffix
    return `${domain}.myshopify.com`;
  }

  /**
   * Format order status for display
   */
  formatOrderStatus(order) {
    const financial = order.financial_status;
    const fulfillment = order.fulfillment_status;

    if (order.cancelled_at) return 'Cancelled';
    if (fulfillment === 'fulfilled') return 'Delivered';
    if (fulfillment === 'partial') return 'Partially Shipped';
    if (financial === 'paid' && !fulfillment) return 'Processing';
    if (financial === 'pending') return 'Payment Pending';
    if (financial === 'refunded') return 'Refunded';

    return 'Unknown';
  }

  /**
   * Get order tracking info
   */
  async getOrderTracking(userId, orderId) {
    const { fulfillments } = await this.getOrderFulfillments(userId, orderId);

    if (!fulfillments.length) {
      return { success: true, tracking: null, message: 'No tracking available yet' };
    }

    const latestFulfillment = fulfillments[fulfillments.length - 1];

    return {
      success: true,
      tracking: {
        number: latestFulfillment.tracking_number,
        url: latestFulfillment.tracking_url,
        company: latestFulfillment.tracking_company,
        status: latestFulfillment.status,
        updatedAt: latestFulfillment.updated_at
      }
    };
  }
}

export default new ShopifySyncService();
