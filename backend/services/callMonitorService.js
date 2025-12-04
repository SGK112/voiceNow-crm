import ElevenLabsService from './elevenLabsService.js';
import emailService from './emailService.js';

/**
 * Call Monitor Service
 *
 * Automatically monitors calls and sends post-call emails without requiring webhooks.
 * This is a fallback solution when webhooks aren't accessible (e.g., development without ngrok).
 */

class CallMonitorService {
  constructor() {
    this.elevenLabsService = new ElevenLabsService();
    this.monitoredCalls = new Map(); // callId -> { phone, metadata, lastChecked }
    this.processedCalls = new Set(); // Set of callIds that have been processed
    this.isRunning = false;
    this.pollInterval = null;
    this.POLL_FREQUENCY = 10000; // Check every 10 seconds
  }

  /**
   * Register a call to be monitored
   */
  registerCall(callId, phoneNumber, metadata = {}) {
    console.log(`📝 Registering call ${callId} for monitoring`);

    this.monitoredCalls.set(callId, {
      phone: phoneNumber,
      metadata: metadata,
      registeredAt: new Date(),
      lastChecked: null,
      checkCount: 0
    });

    // Start monitoring if not already running
    if (!this.isRunning) {
      this.startMonitoring();
    }
  }

  /**
   * Start the monitoring loop
   */
  startMonitoring() {
    if (this.isRunning) {
      console.log('⚠️  Call monitoring already running');
      return;
    }

    console.log('🚀 Starting call monitoring service...');
    this.isRunning = true;

    this.pollInterval = setInterval(async () => {
      await this.checkCalls();
    }, this.POLL_FREQUENCY);

    console.log(`✅ Call monitoring active (checking every ${this.POLL_FREQUENCY / 1000}s)`);
  }

  /**
   * Stop the monitoring loop
   */
  stopMonitoring() {
    if (!this.isRunning) return;

    console.log('🛑 Stopping call monitoring service...');
    this.isRunning = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    console.log('✅ Call monitoring stopped');
  }

  /**
   * Check all monitored calls
   */
  async checkCalls() {
    if (this.monitoredCalls.size === 0) {
      // No calls to monitor, stop the service
      if (this.isRunning) {
        this.stopMonitoring();
      }
      return;
    }

    // Skip if webhooks are configured (preferred method)
    if (process.env.WEBHOOK_URL && process.env.WEBHOOK_URL.length > 0) {
      console.log(`⚠️  Webhooks configured - skipping call monitoring (webhooks handle post-call emails)`);
      this.stopMonitoring();
      this.monitoredCalls.clear();
      return;
    }

    console.log(`🔍 Checking ${this.monitoredCalls.size} monitored calls...`);

    for (const [callId, callData] of this.monitoredCalls.entries()) {
      try {
        // Skip if already processed
        if (this.processedCalls.has(callId)) {
          this.monitoredCalls.delete(callId);
          continue;
        }

        // Update check metadata
        callData.lastChecked = new Date();
        callData.checkCount++;

        // Stop checking after 5 minutes (30 checks at 10s intervals)
        if (callData.checkCount > 30) {
          console.log(`⏱️  Call ${callId} timed out after 5 minutes, removing from monitoring`);
          this.monitoredCalls.delete(callId);
          continue;
        }

        // Fetch call details from ElevenLabs
        const callDetails = await this.elevenLabsService.getCallDetails(callId);

        console.log(`   Call ${callId} status: ${callDetails.status || 'unknown'}`);

        // Check if call is completed
        if (callDetails.status === 'completed' || callDetails.status === 'ended') {
          console.log(`   ✅ Call ${callId} completed! Processing...`);
          await this.processCompletedCall(callId, callDetails, callData);

          // Mark as processed and remove from monitoring
          this.processedCalls.add(callId);
          this.monitoredCalls.delete(callId);
        }

      } catch (error) {
        console.error(`   ❌ Error checking call ${callId}:`, error.message);

        // If error persists for too many checks, remove the call
        if (callData.checkCount > 10) {
          console.log(`   Removing call ${callId} due to persistent errors`);
          this.monitoredCalls.delete(callId);
        }
      }
    }
  }

  /**
   * Process a completed call - send emails
   */
  async processCompletedCall(callId, callDetails, callData) {
    try {
      console.log(`📧 Processing completed call ${callId}...`);

      // Fetch transcript
      let transcript = '';
      try {
        const transcriptData = await this.elevenLabsService.getCallTranscript(callId);
        transcript = this.formatTranscript(transcriptData);
      } catch (error) {
        console.error('   Error fetching transcript:', error.message);
        transcript = 'Transcript not available';
      }

      // Extract customer info
      const customerName = callData.metadata?.customer_name || callData.metadata?.lead_name || 'there';
      const customerPhone = callData.phone || callData.metadata?.customer_phone;
      let customerEmail = callData.metadata?.customer_email || this.extractEmailFromTranscript(transcript);

      console.log(`   Customer: ${customerName}`);
      console.log(`   Phone: ${customerPhone}`);
      console.log(`   Email: ${customerEmail || 'Not provided'}`);

      // Send customer confirmation email
      if (customerEmail) {
        try {
          await this.sendCustomerEmail(customerEmail, customerName);
          console.log(`   ✅ Customer confirmation email sent to ${customerEmail}`);
        } catch (error) {
          console.error(`   ❌ Error sending customer email:`, error.message);
        }
      } else {
        console.log(`   ⚠️  No email found, skipping customer confirmation`);
      }

      // Send business lead alert
      try {
        await this.sendBusinessEmail(customerName, customerPhone, customerEmail, callId, transcript);
        console.log(`   ✅ Business lead alert sent`);
      } catch (error) {
        console.error(`   ❌ Error sending business email:`, error.message);
      }

      console.log(`✅ Call ${callId} processing complete!`);

    } catch (error) {
      console.error(`❌ Error processing completed call ${callId}:`, error.message);
    }
  }

  /**
   * Format transcript from ElevenLabs API response
   */
  formatTranscript(transcriptData) {
    if (!transcriptData || !transcriptData.transcript) {
      return 'No transcript available';
    }

    // Join transcript segments
    return transcriptData.transcript
      .map(segment => `${segment.role}: ${segment.message}`)
      .join('\n');
  }

  /**
   * Extract email from transcript
   */
  extractEmailFromTranscript(transcript) {
    if (!transcript) return null;

    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = transcript.match(emailRegex);

    return emails ? emails[0] : null;
  }

  /**
   * Send customer confirmation email
   */
  async sendCustomerEmail(customerEmail, customerName) {
    await emailService.sendEmail({
      to: customerEmail,
      subject: 'Thanks for Trying VoiceNow CRM! 🤖',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Thanks for Trying VoiceNow CRM! 🤖</h1>
            </div>

            <div style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #0f172a;">Hi ${customerName}! 👋</p>

              <p style="font-size: 16px; color: #475569; line-height: 1.6;">
                Thanks for taking the time to chat with our AI voice agent! We hope you saw how realistic and helpful <strong>VoiceNow CRM</strong> can be.
              </p>

              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #1e40af;">🎯 What's Next?</h3>
                <p style="margin: 0; font-size: 16px; color: #3b82f6;">
                  Start your <strong>FREE 14-day trial of VoiceNow CRM</strong> (no credit card needed)
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.voicenowcrm.com/signup" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                  Start Your Free Trial →
                </a>
              </div>

              <h3 style="font-size: 18px; color: #0f172a; margin: 30px 0 15px 0;">💡 What You'll Get:</h3>
              <ul style="color: #475569; font-size: 15px; line-height: 1.8;">
                <li>✓ 24/7 AI agents that never miss calls</li>
                <li>✓ Automated lead qualification</li>
                <li>✓ Appointment booking</li>
                <li>✓ Custom workflows (no coding needed)</li>
                <li>✓ Full CRM included</li>
              </ul>

              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h4 style="margin: 0 0 10px 0; color: #0f172a;">📞 Questions?</h4>
                <p style="margin: 0; color: #64748b;">
                  Reply to this email or call us anytime!
                </p>
              </div>

              <p style="font-size: 15px; color: #64748b; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: #0f172a;">The VoiceNow AI Team</strong>
              </p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                <a href="https://www.voicenowcrm.com" style="color: #3b82f6; text-decoration: none;">Visit VoiceNow CRM</a> |
                <a href="mailto:help.voicenowcrm@gmail.com" style="color: #3b82f6; text-decoration: none;">Contact Support</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });
  }

  /**
   * Send business lead alert email
   */
  async sendBusinessEmail(customerName, customerPhone, customerEmail, callId, transcript) {
    const transcriptSnippet = transcript.substring(0, 500);

    await emailService.sendEmail({
      to: 'help.voicenowcrm@gmail.com',
      subject: `🎯 New Demo Lead: ${customerName || 'Unknown'} ${customerPhone ? `(${customerPhone})` : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🎯 New Demo Lead!</h1>
            </div>

            <div style="padding: 30px;">
              <h2 style="margin: 0 0 20px 0; color: #0f172a;">Lead Information</h2>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Name:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${customerName || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Phone:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${customerPhone || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${customerEmail || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Call ID:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-family: monospace; font-size: 12px;">${callId}</td>
                </tr>
              </table>

              <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">📝 Conversation Snippet</h3>
                <p style="margin: 0; font-size: 14px; color: #475569; font-family: monospace; white-space: pre-wrap;">${transcriptSnippet}</p>
              </div>

              <div style="background-color: #eff6ff; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">✅ Next Steps</h3>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #475569;">
                  <li style="margin-bottom: 8px;">Follow up with the lead within 24 hours</li>
                  <li style="margin-bottom: 8px;">Check if they signed up for trial</li>
                  <li style="margin-bottom: 8px;">Provide personalized assistance</li>
                </ul>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });
  }

  /**
   * Get monitoring stats
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      monitoredCalls: this.monitoredCalls.size,
      processedCalls: this.processedCalls.size,
      pollFrequency: this.POLL_FREQUENCY
    };
  }
}

// Export singleton instance
const callMonitorService = new CallMonitorService();
export default callMonitorService;
