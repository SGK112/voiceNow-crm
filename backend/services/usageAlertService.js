import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import User from '../models/User.js';
import { PLAN_CONFIG } from './overageBillingService.js';

class UsageAlertService {
  constructor() {
    // Initialize Twilio
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    // Initialize email transporter (Gmail API or SMTP)
    this.emailTransporter = this.createEmailTransporter();
  }

  /**
   * Create email transporter - Gmail API (preferred) or SMTP fallback
   */
  createEmailTransporter() {
    // Use Gmail API if credentials are available
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground' // Redirect URL
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
      });

      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.GMAIL_USER || process.env.SMTP_FROM_EMAIL,
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        },
      });
    }

    // Fallback to SMTP
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  /**
   * Send SMS notification
   */
  async sendSMS(to, message) {
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioNumber,
        to: to,
      });

      console.log(`✅ SMS sent to ${to}: ${result.sid}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send SMS to ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(to, subject, html) {
    try {
      const result = await this.emailTransporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: to,
        subject: subject,
        html: html,
      });

      console.log(`✅ Email sent to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Send usage alert at specific thresholds (80%, 100%)
   */
  async sendUsageAlert(userId, usagePercentage, usageData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const planConfig = PLAN_CONFIG[user.plan];
      if (!planConfig) {
        throw new Error(`Unknown plan: ${user.plan}`);
      }

      // Determine alert level
      let alertLevel = '';
      let alertMessage = '';
      let alertColor = '';

      if (usagePercentage >= 100) {
        alertLevel = 'OVERAGE';
        alertColor = 'red';
        alertMessage = `You've exceeded your ${planConfig.name} plan limit of ${planConfig.minutesIncluded} minutes. You've used ${usageData.minutesUsed} minutes this month. Overage charges: $${usageData.overageCharge.toFixed(2)} at $${planConfig.overageRatePerMinute}/min.`;
      } else if (usagePercentage >= 80) {
        alertLevel = 'WARNING';
        alertColor = 'orange';
        alertMessage = `You've used ${usagePercentage.toFixed(0)}% (${usageData.minutesUsed}/${planConfig.minutesIncluded} minutes) of your ${planConfig.name} plan this month. Consider upgrading to avoid overage charges.`;
      }

      if (!alertLevel) {
        return; // No alert needed
      }

      // Send SMS if user has phone number
      if (user.phone) {
        const smsMessage = `VoiceFlow CRM ${alertLevel}: ${alertMessage}`;
        await this.sendSMS(user.phone, smsMessage);
      }

      // Send email
      const emailSubject = `VoiceFlow CRM - ${alertLevel}: ${usagePercentage.toFixed(0)}% of Monthly Usage Limit`;
      const emailHtml = this.generateUsageAlertEmail(user, alertLevel, alertMessage, usageData, planConfig, alertColor);
      await this.sendEmail(user.email, emailSubject, emailHtml);

      console.log(`✅ Usage alert sent to user ${userId} - ${alertLevel} at ${usagePercentage.toFixed(0)}%`);
      return { success: true, alertLevel, usagePercentage };
    } catch (error) {
      console.error(`❌ Failed to send usage alert for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate HTML email for usage alerts
   */
  generateUsageAlertEmail(user, alertLevel, message, usageData, planConfig, color) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${color === 'red' ? '#dc2626' : '#f97316'}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
          .alert-box { background-color: white; padding: 20px; border-left: 4px solid ${color === 'red' ? '#dc2626' : '#f97316'}; margin: 20px 0; border-radius: 5px; }
          .stats { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .stat-row:last-child { border-bottom: none; }
          .button { background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ ${alertLevel}: Usage Alert</h1>
          </div>
          <div class="content">
            <p>Hi ${user.email.split('@')[0]},</p>

            <div class="alert-box">
              <strong>${message}</strong>
            </div>

            <div class="stats">
              <h3>Current Usage Summary</h3>
              <div class="stat-row">
                <span><strong>Plan:</strong></span>
                <span>${planConfig.name}</span>
              </div>
              <div class="stat-row">
                <span><strong>Minutes Used:</strong></span>
                <span>${usageData.minutesUsed} / ${planConfig.minutesIncluded}</span>
              </div>
              <div class="stat-row">
                <span><strong>Usage Percentage:</strong></span>
                <span>${((usageData.minutesUsed / planConfig.minutesIncluded) * 100).toFixed(1)}%</span>
              </div>
              ${usageData.overageMinutes > 0 ? `
              <div class="stat-row">
                <span><strong>Overage Minutes:</strong></span>
                <span style="color: #dc2626;">${usageData.overageMinutes} minutes</span>
              </div>
              <div class="stat-row">
                <span><strong>Overage Charge:</strong></span>
                <span style="color: #dc2626;">$${usageData.overageCharge.toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="stat-row">
                <span><strong>Total Calls:</strong></span>
                <span>${usageData.totalCalls}</span>
              </div>
            </div>

            ${alertLevel === 'WARNING' ? `
              <p><strong>What you can do:</strong></p>
              <ul>
                <li>Upgrade to a higher plan to get more included minutes at a better rate</li>
                <li>Monitor your usage in the dashboard</li>
                <li>Overage charges: $${planConfig.overageRatePerMinute}/minute beyond your limit</li>
              </ul>
            ` : `
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Your overage charges will be added to your next invoice</li>
                <li>Consider upgrading to a plan with more included minutes</li>
                <li>View detailed usage breakdown in your dashboard</li>
              </ul>
            `}

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/billing" class="button">View Billing Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from VoiceFlow CRM.</p>
            <p>You can manage notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test SMS functionality
   */
  async testSMS(phoneNumber) {
    const testMessage = 'VoiceFlow CRM Test: SMS notifications are working! You will receive usage alerts when you reach 80% and 100% of your monthly limit.';
    return await this.sendSMS(phoneNumber, testMessage);
  }

  /**
   * Test email functionality
   */
  async testEmail(email) {
    const subject = 'VoiceFlow CRM - Test Email Notification';
    const html = `
      <h2>Email Notifications Test</h2>
      <p>This is a test email from VoiceFlow CRM.</p>
      <p>Your email notifications are working correctly! You will receive alerts when:</p>
      <ul>
        <li>You reach 80% of your monthly usage limit</li>
        <li>You exceed 100% and incur overage charges</li>
      </ul>
    `;
    return await this.sendEmail(email, subject, html);
  }
}

export default new UsageAlertService();
