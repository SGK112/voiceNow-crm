import {
  previewCurrentMonthOverage,
  getMonthlyUsage,
  calculateOverageForUser,
  PLAN_CONFIG
} from '../services/overageBillingService.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Get current billing usage and overage preview
 */
export const getCurrentUsage = async (req, res) => {
  try {
    const userId = req.user._id;
    const overagePreview = await previewCurrentMonthOverage(userId);

    res.json({
      success: true,
      data: overagePreview
    });
  } catch (error) {
    console.error('Error fetching current usage:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get usage history for a specific month
 */
export const getUsageHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required'
      });
    }

    const usage = await getMonthlyUsage(userId, parseInt(year), parseInt(month));
    const overageData = await calculateOverageForUser(userId, usage.totalMinutes);

    res.json({
      success: true,
      data: {
        ...usage,
        ...overageData
      }
    });
  } catch (error) {
    console.error('Error fetching usage history:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get plan details and limits
 */
export const getPlanDetails = async (req, res) => {
  try {
    const userPlan = req.user.plan;
    const planConfig = PLAN_CONFIG[userPlan];

    if (!planConfig) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    res.json({
      success: true,
      data: {
        currentPlan: userPlan,
        ...planConfig,
        allPlans: PLAN_CONFIG
      }
    });
  } catch (error) {
    console.error('Error fetching plan details:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get upcoming invoice with overage charges
 */
export const getUpcomingInvoice = async (req, res) => {
  try {
    const user = req.user;

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe customer ID found'
      });
    }

    // Get upcoming invoice from Stripe
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: user.stripeCustomerId
    });

    // Parse invoice items to separate subscription and overage charges
    const subscriptionItems = [];
    const overageItems = [];

    upcomingInvoice.lines.data.forEach(line => {
      if (line.metadata?.type === 'overage') {
        overageItems.push(line);
      } else {
        subscriptionItems.push(line);
      }
    });

    res.json({
      success: true,
      data: {
        invoiceId: upcomingInvoice.id,
        amountDue: upcomingInvoice.amount_due / 100,
        currency: upcomingInvoice.currency,
        periodStart: new Date(upcomingInvoice.period_start * 1000),
        periodEnd: new Date(upcomingInvoice.period_end * 1000),
        subscriptionTotal: upcomingInvoice.subtotal / 100,
        overageTotal: overageItems.reduce((sum, item) => sum + item.amount, 0) / 100,
        subscriptionItems: subscriptionItems.map(item => ({
          description: item.description,
          amount: item.amount / 100,
          quantity: item.quantity,
          period: {
            start: new Date(item.period.start * 1000),
            end: new Date(item.period.end * 1000)
          }
        })),
        overageItems: overageItems.map(item => ({
          description: item.description,
          amount: item.amount / 100,
          metadata: item.metadata
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching upcoming invoice:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get invoice history
 */
export const getInvoiceHistory = async (req, res) => {
  try {
    const user = req.user;

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe customer ID found'
      });
    }

    const { limit = 12 } = req.query;

    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: parseInt(limit)
    });

    const invoiceData = invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountPaid: invoice.amount_paid / 100,
      amountDue: invoice.amount_due / 100,
      currency: invoice.currency,
      created: new Date(invoice.created * 1000),
      periodStart: new Date(invoice.period_start * 1000),
      periodEnd: new Date(invoice.period_end * 1000),
      pdfUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url
    }));

    res.json({
      success: true,
      data: {
        invoices: invoiceData,
        hasMore: invoices.has_more
      }
    });
  } catch (error) {
    console.error('Error fetching invoice history:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  getCurrentUsage,
  getUsageHistory,
  getPlanDetails,
  getUpcomingInvoice,
  getInvoiceHistory
};
