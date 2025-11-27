import dotenv from 'dotenv';
import emailService from '../services/emailService.js';

dotenv.config();

async function testPostCallEmail() {
  try {
    const testEmail = 'help.remodely@gmail.com'; // Change this to your email for testing
    const customerName = 'John Doe';
    const customerPhone = '+14802555887';
    const conversationId = 'test_conversation_123';
    const transcript = 'Agent: Hello! Customer: Hi! Agent: What is your email? Customer: john@example.com';

    console.log('📧 Testing post-call emails...\n');

    // Test customer confirmation email
    console.log('1️⃣ Sending customer confirmation email...');
    await emailService.sendEmail({
      to: testEmail,
      subject: 'Thanks for Trying VoiceNow CRM! 🤖',
      text: `Hi ${customerName}!\n\nThanks for taking the time to chat with our AI voice agent! We hope you saw how realistic and helpful VoiceNow CRM can be.\n\n🎯 What's Next?\nStart your FREE 14-day trial of VoiceNow CRM (no credit card needed):\nwww.remodely.ai/signup\n\n💡 What You'll Get with VoiceNow CRM:\n✓ 24/7 AI agents that never miss calls\n✓ Automated lead qualification\n✓ Appointment booking\n✓ Custom workflows (no coding needed)\n✓ Full CRM included\n\n📞 Questions?\nReply to this email or call us anytime!\n\nBest regards,\nThe Remodelee AI Team`,
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
                <a href="https://www.remodely.ai/signup" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                  Start VoiceNow CRM Trial →
                </a>
              </div>

              <h3 style="font-size: 18px; color: #0f172a; margin: 30px 0 15px 0;">💡 What You'll Get with VoiceNow CRM:</h3>
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
                <strong style="color: #0f172a;">The Remodelee AI Team</strong>
              </p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                <a href="https://www.remodely.ai" style="color: #3b82f6; text-decoration: none;">Visit VoiceNow CRM</a> |
                <a href="mailto:help.remodely@gmail.com" style="color: #3b82f6; text-decoration: none;">Contact Support</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    console.log('✅ Customer confirmation email sent!\n');

    // Test business lead alert email
    console.log('2️⃣ Sending business lead alert email...');
    const transcriptSnippet = transcript.substring(0, 500);

    await emailService.sendEmail({
      to: 'help.remodely@gmail.com',
      subject: `🎯 New Demo Lead: ${customerName || 'Unknown'} ${customerPhone ? `(${customerPhone})` : ''}`,
      text: `New demo call completed!\n\nLead Information:\n- Name: ${customerName || 'Not provided'}\n- Phone: ${customerPhone || 'Not provided'}\n- Email: ${testEmail}\n- Conversation ID: ${conversationId}\n\nConversation Snippet:\n${transcriptSnippet}\n\nNext Steps:\n- Follow up with the lead\n- Check if they signed up for trial\n- Provide personalized assistance\n\nView full conversation in CRM dashboard.`,
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
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${testEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Conversation ID:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-family: monospace; font-size: 12px;">${conversationId}</td>
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
                  <li>View full conversation in CRM dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });
    console.log('✅ Business lead alert email sent!\n');

    console.log('🎉 All test emails sent successfully!');
    console.log('Check your inbox at', testEmail);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error sending test emails:', error);
    process.exit(1);
  }
}

testPostCallEmail();
