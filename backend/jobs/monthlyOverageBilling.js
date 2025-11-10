import cron from 'node-cron';
import { processMonthlyOverages } from '../services/overageBillingService.js';

/**
 * Monthly overage billing cron job
 * Runs on the 1st day of each month at 2:00 AM
 * Format: minute hour day-of-month month day-of-week
 */
export function startOverageBillingCron() {
  // Run at 2:00 AM on the 1st of every month
  const cronSchedule = '0 2 1 * *';

  console.log('📅 Scheduling monthly overage billing job...');
  console.log(`   Schedule: ${cronSchedule} (1st of month at 2:00 AM)`);

  const job = cron.schedule(cronSchedule, async () => {
    console.log(`\n🕐 ${new Date().toISOString()} - Running monthly overage billing...`);

    try {
      const result = await processMonthlyOverages();
      console.log('✅ Monthly overage billing completed successfully');
      console.log(`   Processed: ${result.processedUsers} users`);
      console.log(`   With overage: ${result.usersWithOverage} users`);
      console.log(`   Total amount: $${result.totalOverageAmount}`);
    } catch (error) {
      console.error('❌ Monthly overage billing failed:', error.message);

      // TODO: Send alert to admin (email, Slack, etc.)
      // For now, just log the error
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust to your timezone
  });

  // For testing: also allow manual trigger via environment variable
  if (process.env.RUN_OVERAGE_BILLING_ON_START === 'true') {
    console.log('⚡ Running overage billing immediately (test mode)...');
    processMonthlyOverages()
      .then(result => console.log('Test billing completed:', result))
      .catch(error => console.error('Test billing failed:', error));
  }

  return job;
}

/**
 * Run overage billing manually (for testing or manual triggers)
 */
export async function runOverageBillingNow() {
  console.log('⚡ Manually triggering overage billing...');
  return await processMonthlyOverages();
}

export default {
  startOverageBillingCron,
  runOverageBillingNow
};
