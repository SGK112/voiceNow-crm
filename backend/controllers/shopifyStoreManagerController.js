/**
 * Shopify Store Manager Controller
 * Handles AI-powered store management operations
 */

import shopifySyncService from '../services/shopifySyncService.js';
import { SHOPIFY_AGENTS } from '../config/fullAgentLibrary.js';

/**
 * Get store manager agent template info
 */
export const getAgentTemplate = async (req, res) => {
  try {
    const template = SHOPIFY_AGENTS['shopify-store-manager'];

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Store manager agent template not found'
      });
    }

    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        features: template.features,
        price: template.price,
        setupQuestions: template.setupQuestions,
        capabilities: template.capabilities,
        exampleCommands: template.exampleCommands,
        requiredIntegrations: template.requiredIntegrations
      }
    });
  } catch (error) {
    console.error('Get agent template error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Execute a natural language command
 */
export const executeCommand = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        message: 'Command is required'
      });
    }

    const result = await shopifySyncService.executeCommand(userId, command);
    res.json(result);
  } catch (error) {
    console.error('Execute command error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get store overview/dashboard
 */
export const getStoreOverview = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const result = await shopifySyncService.getStoreOverview(userId);
    res.json(result);
  } catch (error) {
    console.error('Get store overview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get sales report
 */
export const getSalesReport = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { startDate, endDate } = req.query;

    const result = await shopifySyncService.getSalesReport(userId, {
      startDate,
      endDate
    });
    res.json(result);
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get today's sales
 */
export const getTodaysSales = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const result = await shopifySyncService.getTodaysSales(userId);
    res.json(result);
  } catch (error) {
    console.error('Get today sales error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get top selling products
 */
export const getTopProducts = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { limit, days } = req.query;

    const result = await shopifySyncService.getTopProducts(userId, {
      limit: limit ? parseInt(limit) : 10,
      days: days ? parseInt(days) : 30
    });
    res.json(result);
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get low stock products
 */
export const getLowStock = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { threshold } = req.query;

    const result = await shopifySyncService.getLowStockProducts(
      userId,
      threshold ? parseInt(threshold) : 10
    );
    res.json(result);
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get recent orders
 */
export const getRecentOrders = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { limit } = req.query;

    const result = await shopifySyncService.getRecentOrders(
      userId,
      limit ? parseInt(limit) : 10
    );
    res.json(result);
  } catch (error) {
    console.error('Get recent orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get collections
 */
export const getCollections = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const result = await shopifySyncService.getCollections(userId);
    res.json(result);
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Chat with store manager AI (uses OpenAI to interpret and respond)
 */
export const chatWithManager = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // First, execute the command to get data
    const dataResult = await shopifySyncService.executeCommand(userId, message);

    // Format the response based on the data
    let response = '';

    if (!dataResult.success && dataResult.error) {
      response = `I encountered an error: ${dataResult.error}`;
    } else if (dataResult.message && dataResult.availableCommands) {
      response = dataResult.message + '\n\nAvailable commands:\n' +
        dataResult.availableCommands.map(c => `• ${c}`).join('\n');
    } else if (dataResult.products) {
      response = `Found ${dataResult.count || dataResult.products.length} products:\n\n` +
        dataResult.products.slice(0, 10).map(p =>
          `• ${p.title} - $${p.variants?.[0]?.price || 'N/A'}`
        ).join('\n');
    } else if (dataResult.orders) {
      response = `Here are the orders:\n\n` +
        dataResult.orders.map(o =>
          `• ${o.orderNumber} - ${o.customer} - $${o.total} (${o.status})`
        ).join('\n');
    } else if (dataResult.store && dataResult.metrics) {
      const m = dataResult.metrics;
      response = `📊 Store Overview for ${dataResult.store.name}\n\n` +
        `• Products: ${m.totalProducts}\n` +
        `• Customers: ${m.totalCustomers}\n` +
        `• Orders (30 days): ${m.ordersLast30Days}\n` +
        `• Revenue (30 days): $${m.revenueLast30Days}\n` +
        `• Avg Order Value: $${m.averageOrderValue}\n` +
        `• Pending Fulfillment: ${m.pendingFulfillment}`;
    } else if (dataResult.summary && dataResult.period) {
      const s = dataResult.summary;
      response = `📈 Sales Report (${dataResult.period.start} to ${dataResult.period.end})\n\n` +
        `• Total Orders: ${s.totalOrders}\n` +
        `• Total Revenue: $${s.totalRevenue}\n` +
        `• Items Sold: ${s.totalItems}\n` +
        `• Avg Order Value: $${s.averageOrderValue}`;
    } else if (dataResult.topProducts) {
      response = `🏆 Top Selling Products (${dataResult.period}):\n\n` +
        dataResult.topProducts.map(p =>
          `${p.rank}. ${p.title} - ${p.quantity} sold ($${p.revenue})`
        ).join('\n');
    } else if (dataResult.items && dataResult.lowStockCount !== undefined) {
      response = `⚠️ Low Stock Alert (threshold: ${dataResult.threshold})\n\n` +
        `• Low Stock Items: ${dataResult.lowStockCount}\n` +
        `• Out of Stock: ${dataResult.outOfStockCount}\n\n` +
        dataResult.items.slice(0, 10).map(i =>
          `• ${i.title}${i.variant ? ` (${i.variant})` : ''} - ${i.currentStock} in stock ${i.status === 'OUT_OF_STOCK' ? '❌' : '⚠️'}`
        ).join('\n');
    } else if (dataResult.date && dataResult.summary) {
      const s = dataResult.summary;
      response = `📅 Today's Sales (${dataResult.date})\n\n` +
        `• Total Orders: ${s.totalOrders}\n` +
        `• Paid Orders: ${s.paidOrders}\n` +
        `• Revenue: $${s.revenue}\n` +
        `• Avg Order Value: $${s.averageOrderValue}`;
    } else if (dataResult.collections) {
      response = `📁 Store Collections:\n\n` +
        dataResult.collections.map(c =>
          `• ${c.title} (${c.type}) - ${c.productsCount || 0} products`
        ).join('\n');
    } else if (dataResult.customers) {
      response = `👥 Customers:\n\n` +
        dataResult.customers.map(c =>
          `• ${c.first_name} ${c.last_name} - ${c.email} (${c.orders_count} orders)`
        ).join('\n');
    } else {
      response = JSON.stringify(dataResult, null, 2);
    }

    res.json({
      success: true,
      message: response,
      data: dataResult
    });
  } catch (error) {
    console.error('Chat with manager error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getAgentTemplate,
  executeCommand,
  getStoreOverview,
  getSalesReport,
  getTodaysSales,
  getTopProducts,
  getLowStock,
  getRecentOrders,
  getCollections,
  chatWithManager
};
