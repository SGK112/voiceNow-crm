import Stripe from 'stripe';
import User from '../models/User.js';
import CallLog from '../models/CallLog.js';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


// Plan limits and overage rates
export const PLAN_CONFIG = {
  trial: {
    minutesIncluded: 50,
    overageRatePerMinute: 0, // No overage billing for trial
    name: 'Trial'
  },
  starter: {
    minutesIncluded: 200,
    overageRatePerMinute: 0.60,
    name: 'Starter'
  },
  professional: {
    minutesIncluded: 1000,
    overageRatePerMinute: 0.50,
    name: 'Professional'
  },
  enterprise: {
    minutesIncluded: 5000,
    overageRatePerMinute: 0.40,
    name: 'Enterprise'
  }
};

/**
 * Calculate overage charges for a user
 */
export async function calculateOverageForUser(userId, usageMinutes) {
  const user = await User.findById(userId);
  if (!user || !user.plan) {
    throw new Error('User or plan not found');
  }

  const planConfig = PLAN_CONFIG[user.plan];
  if (!planConfig) {
    throw new Error(`Unknown plan: ${user.plan}`);
  }

  const overageMinutes = Math.max(0, usageMinutes - planConfig.minutesIncluded);
  const overageCharge = overageMinutes * planConfig.overageRatePerMinute;

  return {
    plan: user.plan,
    minutesIncluded: planConfig.minutesIncluded,
    minutesUsed: usageMinutes,
    overageMinutes,
    overageRatePerMinute: planConfig.overageRatePerMinute,
    overageCharge: Math.round(overageCharge * 100) / 100, // Round to 2 decimals
    hasOverage: overageMinutes > 0 && overageCharge > 0
  };
}

/**
 * Add overage charge as invoice item to customer's next invoice
 */
export async function addOverageInvoiceItem(userId, overageData) {
  if (!overageData.hasOverage) {
    console.log(`No overage charges for user ${userId}`);
    return null;
  }

  const user = await User.findById(userId);
  if (!user.stripeCustomerId) {
    throw new Error('User does not have a Stripe customer ID');
  }

  try {
    // Create an invoice item that will be added to the next invoice
    const invoiceItem = await stripe.invoiceItems.create({
      customer: user.stripeCustomerId,
      amount: Math.round(overageData.overageCharge * 100), // Convert to cents
      currency: 'usd',
      description: `AI Voice Minutes Overage - ${overageData.overageMinutes} minutes @ $${overageData.overageRatePerMinute}/min`,
      metadata: {
        type: 'overage',
        userId: userId.toString(),
        plan: overageData.plan,
        overageMinutes: overageData.overageMinutes.toString(),
        minutesUsed: overageData.minutesUsed.toString(),
        minutesIncluded: overageData.minutesIncluded.toString()
      }
    });

    console.log(`✅ Added overage invoice item for user ${userId}: $${overageData.overageCharge}`);
    return invoiceItem;
  } catch (error) {
    console.error(`❌ Failed to add overage invoice item for user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Get usage for a specific month
 */
export async function getMonthlyUsage(userId, year, month) {
  // Create date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  // Query CallLog model for total duration using durationMinutes field
  const result = await CallLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lt: endDate },
        status: 'completed' // Only count completed calls
      }
    },
    {
      $group: {
        _id: null,
        totalMinutes: { $sum: '$durationMinutes' }, // Using durationMinutes field (rounded for billing)
        totalCalls: { $sum: 1 }
      }
    }
  ]);

  return {
    totalMinutes: result[0]?.totalMinutes || 0,
    totalCalls: result[0]?.totalCalls || 0,
    period: {
      start: startDate,
      end: endDate
    }
  };
}

/**
 * Process overage billing for all users (monthly cron job)
 */
export async function processMonthlyOverages() {
  console.log('🔄 Starting monthly overage billing process...');

  const now = new Date();
  const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  try {
    // Find all users with active subscriptions
    const users = await User.find({
      subscriptionStatus: { $in: ['active', 'trialing'] },
      stripeCustomerId: { $exists: true, $ne: null }
    });

    console.log(`Found ${users.length} users with active subscriptions`);

    let processedCount = 0;
    let overageCount = 0;
    let totalOverageAmount = 0;

    for (const user of users) {
      try {
        // Get usage for last month
        const usage = await getMonthlyUsage(user._id, year, lastMonth);

        // Calculate overage
        const overageData = await calculateOverageForUser(user._id, usage.totalMinutes);

        if (overageData.hasOverage) {
          // Add invoice item
          await addOverageInvoiceItem(user._id, overageData);
          overageCount++;
          totalOverageAmount += overageData.overageCharge;
        }

        processedCount++;
      } catch (error) {
        console.error(`Error processing user ${user._id}:`, error.message);
      }
    }

    const summary = {
      processedUsers: processedCount,
      usersWithOverage: overageCount,
      totalOverageAmount: Math.round(totalOverageAmount * 100) / 100,
      period: `${year}-${lastMonth}`
    };

    console.log('✅ Monthly overage billing completed:', summary);
    return summary;
  } catch (error) {
    console.error('❌ Monthly overage billing failed:', error);
    throw error;
  }
}

/**
 * Preview overage charges for current month (for dashboard display)
 */
export async function previewCurrentMonthOverage(userId) {
  const now = new Date();
  const usage = await getMonthlyUsage(userId, now.getFullYear(), now.getMonth() + 1);
  const overageData = await calculateOverageForUser(userId, usage.totalMinutes);

  return {
    ...overageData,
    ...usage,
    isPreview: true,
    message: 'This is a preview of charges that will be billed at the end of the month'
  };
}

export default {
  calculateOverageForUser,
  addOverageInvoiceItem,
  getMonthlyUsage,
  processMonthlyOverages,
  previewCurrentMonthOverage,
  PLAN_CONFIG
};
