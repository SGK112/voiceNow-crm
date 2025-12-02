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

    // Remove common TLD suffixes that users might accidentally include
    // e.g., "surprise-granite.com" should become "surprise-granite"
    // But preserve hyphenated names like "my-store-name"
    domain = domain.replace(/\.(com|net|org|co|io|shop|store)$/i, '');

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

  // ============================================
  // STORE MANAGER - ANALYTICS & REPORTS
  // ============================================

  /**
   * Get store overview/dashboard data
   */
  async getStoreOverview(userId) {
    const { shop, accessToken, integration } = await this.getClientForUser(userId);

    // Get shop info
    const shopData = await this.makeApiRequest(shop, accessToken, '/shop.json');

    // Get recent orders (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ordersParams = new URLSearchParams({
      status: 'any',
      created_at_min: thirtyDaysAgo.toISOString(),
      limit: '250'
    });
    const ordersData = await this.makeApiRequest(shop, accessToken, `/orders.json?${ordersParams}`);

    // Get product count
    const productsCount = await this.makeApiRequest(shop, accessToken, '/products/count.json');

    // Get customer count
    const customersCount = await this.makeApiRequest(shop, accessToken, '/customers/count.json');

    // Calculate metrics
    const orders = ordersData.orders || [];
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const paidOrders = orders.filter(o => o.financial_status === 'paid');
    const pendingOrders = orders.filter(o => o.fulfillment_status === null && o.financial_status === 'paid');

    integration.lastUsed = new Date();
    integration.usageCount += 1;
    await integration.save();

    return {
      success: true,
      store: {
        name: shopData.shop?.name,
        domain: shopData.shop?.domain,
        currency: shopData.shop?.currency,
        timezone: shopData.shop?.timezone
      },
      metrics: {
        totalProducts: productsCount.count || 0,
        totalCustomers: customersCount.count || 0,
        ordersLast30Days: orders.length,
        revenueLast30Days: totalRevenue.toFixed(2),
        paidOrders: paidOrders.length,
        pendingFulfillment: pendingOrders.length,
        averageOrderValue: orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00'
      }
    };
  }

  /**
   * Get sales report for a date range
   */
  async getSalesReport(userId, options = {}) {
    const { shop, accessToken } = await this.getClientForUser(userId);

    // Default to last 7 days
    const endDate = options.endDate ? new Date(options.endDate) : new Date();
    const startDate = options.startDate ? new Date(options.startDate) : new Date(endDate - 7 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      status: 'any',
      created_at_min: startDate.toISOString(),
      created_at_max: endDate.toISOString(),
      limit: '250'
    });

    const data = await this.makeApiRequest(shop, accessToken, `/orders.json?${params}`);
    const orders = data.orders || [];

    // Calculate daily breakdown
    const dailyStats = {};
    orders.forEach(order => {
      const date = order.created_at.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { orders: 0, revenue: 0, items: 0 };
      }
      dailyStats[date].orders += 1;
      dailyStats[date].revenue += parseFloat(order.total_price || 0);
      dailyStats[date].items += order.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    });

    // Calculate totals
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const totalItems = orders.reduce((sum, o) => sum + (o.line_items?.reduce((s, i) => s + i.quantity, 0) || 0), 0);

    return {
      success: true,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      summary: {
        totalOrders: orders.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalItems: totalItems,
        averageOrderValue: orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00'
      },
      dailyBreakdown: Object.entries(dailyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
          date,
          orders: stats.orders,
          revenue: stats.revenue.toFixed(2),
          items: stats.items
        }))
    };
  }

  /**
   * Get top selling products
   */
  async getTopProducts(userId, options = {}) {
    const { shop, accessToken } = await this.getClientForUser(userId);
    const limit = options.limit || 10;
    const days = options.days || 30;

    // Get recent orders
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const params = new URLSearchParams({
      status: 'any',
      financial_status: 'paid',
      created_at_min: startDate.toISOString(),
      limit: '250'
    });

    const data = await this.makeApiRequest(shop, accessToken, `/orders.json?${params}`);
    const orders = data.orders || [];

    // Count product sales
    const productSales = {};
    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const key = item.product_id;
        if (!productSales[key]) {
          productSales[key] = {
            productId: item.product_id,
            title: item.title,
            variant: item.variant_title,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += parseFloat(item.price) * item.quantity;
      });
    });

    // Sort by quantity and take top N
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit)
      .map((p, i) => ({
        rank: i + 1,
        ...p,
        revenue: p.revenue.toFixed(2)
      }));

    return {
      success: true,
      period: `Last ${days} days`,
      topProducts
    };
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(userId, threshold = 10) {
    const { shop, accessToken } = await this.getClientForUser(userId);

    // Get all products with inventory
    const data = await this.makeApiRequest(shop, accessToken, '/products.json?limit=250');
    const products = data.products || [];

    const lowStockItems = [];

    products.forEach(product => {
      product.variants?.forEach(variant => {
        if (variant.inventory_quantity !== null && variant.inventory_quantity <= threshold) {
          lowStockItems.push({
            productId: product.id,
            variantId: variant.id,
            title: product.title,
            variant: variant.title !== 'Default Title' ? variant.title : null,
            sku: variant.sku,
            currentStock: variant.inventory_quantity,
            price: variant.price,
            status: variant.inventory_quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
          });
        }
      });
    });

    // Sort by stock level (lowest first)
    lowStockItems.sort((a, b) => a.currentStock - b.currentStock);

    return {
      success: true,
      threshold,
      lowStockCount: lowStockItems.length,
      outOfStockCount: lowStockItems.filter(i => i.currentStock === 0).length,
      items: lowStockItems
    };
  }

  /**
   * Get recent orders with details
   */
  async getRecentOrders(userId, limit = 10) {
    const { shop, accessToken } = await this.getClientForUser(userId);

    const params = new URLSearchParams({
      status: 'any',
      limit: limit.toString()
    });

    const data = await this.makeApiRequest(shop, accessToken, `/orders.json?${params}`);
    const orders = data.orders || [];

    return {
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.name,
        createdAt: order.created_at,
        customer: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : 'Guest',
        email: order.email,
        total: order.total_price,
        currency: order.currency,
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
        itemCount: order.line_items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
        status: this.formatOrderStatus(order)
      }))
    };
  }

  /**
   * Get today's sales summary
   */
  async getTodaysSales(userId) {
    const { shop, accessToken } = await this.getClientForUser(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const params = new URLSearchParams({
      status: 'any',
      created_at_min: today.toISOString(),
      limit: '250'
    });

    const data = await this.makeApiRequest(shop, accessToken, `/orders.json?${params}`);
    const orders = data.orders || [];

    const paidOrders = orders.filter(o => o.financial_status === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

    return {
      success: true,
      date: today.toISOString().split('T')[0],
      summary: {
        totalOrders: orders.length,
        paidOrders: paidOrders.length,
        pendingOrders: orders.filter(o => o.financial_status === 'pending').length,
        revenue: totalRevenue.toFixed(2),
        averageOrderValue: paidOrders.length > 0 ? (totalRevenue / paidOrders.length).toFixed(2) : '0.00'
      },
      recentOrders: orders.slice(0, 5).map(o => ({
        orderNumber: o.name,
        total: o.total_price,
        status: this.formatOrderStatus(o),
        time: new Date(o.created_at).toLocaleTimeString()
      }))
    };
  }

  /**
   * Get all collections
   */
  async getCollections(userId) {
    const { shop, accessToken } = await this.getClientForUser(userId);

    // Get custom collections
    const customData = await this.makeApiRequest(shop, accessToken, '/custom_collections.json?limit=250');

    // Get smart collections
    const smartData = await this.makeApiRequest(shop, accessToken, '/smart_collections.json?limit=250');

    const collections = [
      ...(customData.custom_collections || []).map(c => ({ ...c, type: 'custom' })),
      ...(smartData.smart_collections || []).map(c => ({ ...c, type: 'smart' }))
    ];

    return {
      success: true,
      collections: collections.map(c => ({
        id: c.id,
        title: c.title,
        handle: c.handle,
        type: c.type,
        productsCount: c.products_count,
        publishedAt: c.published_at
      }))
    };
  }

  /**
   * Execute a store manager command (natural language processing)
   */
  async executeCommand(userId, command) {
    const cmd = command.toLowerCase();

    try {
      // Products
      if (cmd.includes('list') && cmd.includes('product')) {
        return await this.getProducts(userId, { limit: 20 });
      }
      if (cmd.includes('search') && cmd.includes('product')) {
        const match = cmd.match(/search\s+(?:for\s+)?(?:product[s]?\s+)?["']?([^"']+)["']?/i);
        if (match) return await this.searchProducts(userId, match[1].trim());
      }
      if (cmd.includes('low stock') || cmd.includes('restock') || cmd.includes('inventory alert')) {
        const thresholdMatch = cmd.match(/(\d+)/);
        const threshold = thresholdMatch ? parseInt(thresholdMatch[1]) : 10;
        return await this.getLowStockProducts(userId, threshold);
      }

      // Orders
      if (cmd.includes('recent') && cmd.includes('order')) {
        const limitMatch = cmd.match(/(\d+)/);
        return await this.getRecentOrders(userId, limitMatch ? parseInt(limitMatch[1]) : 10);
      }
      if (cmd.includes('today') && (cmd.includes('sale') || cmd.includes('order') || cmd.includes('revenue'))) {
        return await this.getTodaysSales(userId);
      }
      if (cmd.includes('order') && cmd.includes('#')) {
        const orderMatch = cmd.match(/#?(\d+)/);
        if (orderMatch) return await this.getOrderByNumber(userId, orderMatch[1]);
      }

      // Analytics
      if (cmd.includes('top') && cmd.includes('product')) {
        const limitMatch = cmd.match(/top\s+(\d+)/i);
        return await this.getTopProducts(userId, { limit: limitMatch ? parseInt(limitMatch[1]) : 10 });
      }
      if (cmd.includes('sales report') || cmd.includes('revenue report')) {
        return await this.getSalesReport(userId);
      }
      if (cmd.includes('overview') || cmd.includes('dashboard') || cmd.includes('store stats')) {
        return await this.getStoreOverview(userId);
      }

      // Customers
      if (cmd.includes('customer') && (cmd.includes('search') || cmd.includes('find'))) {
        const emailMatch = cmd.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) return await this.searchCustomer(userId, emailMatch[0]);
      }
      if (cmd.includes('list') && cmd.includes('customer')) {
        return await this.getCustomers(userId, { limit: 20 });
      }

      // Collections
      if (cmd.includes('collection')) {
        return await this.getCollections(userId);
      }

      // Default - return overview
      return {
        success: true,
        message: 'Command not recognized. Try: "list products", "show today\'s sales", "low stock items", "recent orders", "top products", "sales report"',
        availableCommands: [
          'list products',
          'search products [name]',
          'low stock items',
          'recent orders',
          'today\'s sales',
          'top 10 products',
          'sales report',
          'store overview',
          'list customers',
          'find customer [email]',
          'order #[number]',
          'collections'
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new ShopifySyncService();
