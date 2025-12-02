import express from 'express';
import emailService from '../services/emailService.js';
import agentSMSService from '../services/agentSMSService.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Email transporter for follow-up emails
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Webhook for agents to send signup links
 * Triggered when customer says "send me the link" or "sign me up"
 */
router.post('/send-signup-link', async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, call_id } = req.body;

    console.log(`📧 Agent webhook: Send signup link`);
    console.log(`   Customer: ${customer_name || 'Unknown'}`);
    console.log(`   Email: ${customer_email}`);
    console.log(`   Phone: ${customer_phone}`);
    console.log(`   Call ID: ${call_id}`);

    if (!customer_email && !customer_phone) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone is required'
      });
    }

    const signupUrl = `${process.env.FRONTEND_URL || 'https://remodely.ai'}/signup`;

    // Send email if we have it
    if (customer_email) {
      await emailService.sendEmail({
        to: customer_email,
        subject: 'Welcome to Remodely.ai - Your Signup Link',
        html: `
          <h2>Hi ${customer_name || 'there'}!</h2>
          <p>Thanks for your interest in Remodely.ai VoiceNow CRM!</p>
          <p>As we discussed on the call, here's your signup link to get started with your FREE 14-day trial:</p>
          <p style="margin: 30px 0;">
            <a href="${signupUrl}" style="background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Start Your Free Trial →
            </a>
          </p>
          <p><strong>What's Included:</strong></p>
          <ul>
            <li>AI voice agents that handle calls 24/7</li>
            <li>Lead qualification and appointment booking</li>
            <li>Complete CRM with pipeline management</li>
            <li>14-day FREE trial - no credit card required</li>
          </ul>
          <p>If you have any questions, just reply to this email!</p>
          <p>Best,<br>The Remodely.ai Team</p>
        `
      });

      console.log(`   ✅ Email sent to ${customer_email}`);
    }

    // TODO: Send SMS if only phone is provided
    // if (!customer_email && customer_phone) {
    //   await twilioService.sendSMS(customer_phone, `Hi ${customer_name}! Start your free Remodely.ai trial: ${signupUrl}`);
    // }

    res.json({
      success: true,
      message: customer_email
        ? `Signup link sent to ${customer_email}`
        : `Signup link will be sent to ${customer_phone}`,
      signup_url: signupUrl
    });

  } catch (error) {
    console.error('❌ Error in send-signup-link webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send signup link',
      error: error.message
    });
  }
});

/**
 * Webhook for agents to book appointments
 * Triggered when customer wants to schedule a call or demo
 */
router.post('/book-appointment', async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      appointment_date,
      appointment_time,
      appointment_type,
      notes,
      call_id
    } = req.body;

    console.log(`📅 Agent webhook: Book appointment`);
    console.log(`   Customer: ${customer_name || 'Unknown'}`);
    console.log(`   Email: ${customer_email}`);
    console.log(`   Date: ${appointment_date}`);
    console.log(`   Time: ${appointment_time}`);
    console.log(`   Type: ${appointment_type || 'Demo'}`);

    if (!customer_email) {
      return res.status(400).json({
        success: false,
        message: 'Customer email is required for booking'
      });
    }

    if (!appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date and time are required'
      });
    }

    // Send confirmation email
    await emailService.sendEmail({
      to: customer_email,
      subject: `Appointment Confirmed - ${appointment_date} at ${appointment_time}`,
      html: `
        <h2>Hi ${customer_name || 'there'}!</h2>
        <p>Your appointment has been confirmed!</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📅 Appointment Details</h3>
          <p><strong>Date:</strong> ${appointment_date}</p>
          <p><strong>Time:</strong> ${appointment_time}</p>
          <p><strong>Type:</strong> ${appointment_type || 'Demo Call'}</p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>
        <p>We'll call you at ${customer_phone || 'your number'} at the scheduled time.</p>
        <p>Looking forward to speaking with you!</p>
        <p>Best,<br>The Remodely.ai Team</p>
      `
    });

    // Send internal notification
    await emailService.sendEmail({
      to: process.env.SMTP_USER || 'help.remodely@gmail.com',
      subject: `New Appointment Booked - ${appointment_date}`,
      html: `
        <h2>New Appointment Scheduled</h2>
        <p><strong>Customer:</strong> ${customer_name}</p>
        <p><strong>Email:</strong> ${customer_email}</p>
        <p><strong>Phone:</strong> ${customer_phone}</p>
        <p><strong>Date:</strong> ${appointment_date}</p>
        <p><strong>Time:</strong> ${appointment_time}</p>
        <p><strong>Type:</strong> ${appointment_type || 'Demo'}</p>
        <p><strong>Call ID:</strong> ${call_id}</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      `
    });

    console.log(`   ✅ Appointment confirmation sent`);

    res.json({
      success: true,
      message: `Appointment confirmed for ${appointment_date} at ${appointment_time}`,
      appointment: {
        date: appointment_date,
        time: appointment_time,
        type: appointment_type,
        customer_name,
        customer_email
      }
    });

  } catch (error) {
    console.error('❌ Error in book-appointment webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book appointment',
      error: error.message
    });
  }
});

/**
 * Webhook for agents to collect and store lead information
 * Used when SMS agent collects customer info during the call
 */
router.post('/collect-lead-info', async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      business_type,
      interested_in,
      notes,
      call_id
    } = req.body;

    console.log(`📝 Agent webhook: Collect lead info`);
    console.log(`   Customer: ${customer_name}`);
    console.log(`   Email: ${customer_email}`);
    console.log(`   Phone: ${customer_phone}`);
    console.log(`   Business: ${business_type}`);

    // Send notification to sales team
    await emailService.sendEmail({
      to: process.env.SMTP_USER || 'help.remodely@gmail.com',
      subject: `New Lead: ${customer_name} - ${business_type || 'Unknown Business'}`,
      html: `
        <h2>New Lead Collected by AI Agent</h2>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px;">
          <p><strong>Name:</strong> ${customer_name}</p>
          <p><strong>Email:</strong> ${customer_email || 'Not provided'}</p>
          <p><strong>Phone:</strong> ${customer_phone}</p>
          <p><strong>Business Type:</strong> ${business_type || 'Not specified'}</p>
          <p><strong>Interested In:</strong> ${interested_in || 'General inquiry'}</p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          <p><strong>Call ID:</strong> ${call_id}</p>
        </div>
        <p>Follow up with this lead to close the sale!</p>
      `
    });

    // If we have customer email, send them info
    if (customer_email) {
      const signupUrl = `${process.env.FRONTEND_URL || 'https://remodely.ai'}/signup`;

      await emailService.sendEmail({
        to: customer_email,
        subject: 'Great talking to you - Remodely.ai Info',
        html: `
          <h2>Hi ${customer_name}!</h2>
          <p>Thanks for the great conversation! As promised, here's everything you need to get started with Remodely.ai.</p>
          <p style="margin: 30px 0;">
            <a href="${signupUrl}" style="background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Start Your FREE 14-Day Trial →
            </a>
          </p>
          <p><strong>Perfect for ${business_type || 'your business'}:</strong></p>
          <ul>
            <li>Never miss another call - 24/7 AI coverage</li>
            <li>Book more jobs automatically</li>
            <li>Qualify leads while you work</li>
            <li>Set up in 2-3 hours</li>
          </ul>
          <p>Questions? Just reply to this email!</p>
          <p>Best,<br>The Remodely.ai Team</p>
        `
      });
    }

    console.log(`   ✅ Lead info collected and notifications sent`);

    res.json({
      success: true,
      message: 'Lead information collected successfully',
      lead: {
        customer_name,
        customer_email,
        customer_phone,
        business_type
      }
    });

  } catch (error) {
    console.error('❌ Error in collect-lead-info webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to collect lead info',
      error: error.message
    });
  }
});

// ============================================
// MAX SALES AGENT WEBHOOK TOOLS (ElevenLabs)
// These endpoints are called by the Max Sales Agent during live calls
// ============================================

/**
 * Initiate Demo Call
 * Called when customer wants to hear a demo of the AI voice agent
 * POST /api/agent-webhooks/demo-call
 */
router.post('/demo-call', async (req, res) => {
  try {
    const { customer_phone, customer_name, demo_type } = req.body;

    console.log('\n📞 Demo Call Request from Max Sales Agent:');
    console.log('   Customer:', customer_name || 'Unknown');
    console.log('   Phone:', customer_phone);
    console.log('   Demo Type:', demo_type || 'lead_gen');

    if (!customer_phone) {
      return res.json({
        success: false,
        message: 'I need your phone number to initiate the demo call. What number should I call you on?'
      });
    }

    // Demo agent - use ELEVENLABS_DEMO_AGENT_ID from env
    const demoAgentId = process.env.ELEVENLABS_DEMO_AGENT_ID;

    if (!demoAgentId) {
      console.error('   ELEVENLABS_DEMO_AGENT_ID not configured');
      return res.json({
        success: false,
        message: 'Demo agent not configured. Let me send you a link to try the demo yourself instead.'
      });
    }

    const agentId = demoAgentId;
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

    // Initiate outbound call via ElevenLabs Twilio endpoint
    const callResponse = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: agentId,
        agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
        to_number: customer_phone,
        conversation_config_override: {
          agent: {
            first_message: `Hi ${customer_name?.split(' ')[0] || 'there'}! This is a demo of our AI voice agent. I'm here to show you how I can help your business handle calls, qualify leads, and book appointments 24/7. What questions do you have?`
          }
        }
      })
    });

    if (!callResponse.ok) {
      const error = await callResponse.text();
      console.error('   Failed to initiate demo call:', error);
      return res.json({
        success: false,
        message: 'I apologize, there was an issue initiating the demo call. Let me try again or I can send you a link to try it yourself.'
      });
    }

    const callResult = await callResponse.json();
    console.log('   ✅ Demo call initiated:', callResult.conversation_id);

    res.json({
      success: true,
      message: `Great! I'm initiating a demo call to ${customer_phone} right now. You should receive the call within the next 30 seconds. The demo agent will show you exactly how our AI handles customer conversations.`,
      conversation_id: callResult.conversation_id
    });

  } catch (error) {
    console.error('❌ Demo call error:', error);
    res.json({
      success: false,
      message: 'I apologize, there was a technical issue. Let me send you a link to try the demo yourself instead.'
    });
  }
});

/**
 * Send SMS Link
 * Called when customer wants signup/demo/pricing link via text
 * POST /api/agent-webhooks/send-sms
 */
router.post('/send-sms', async (req, res) => {
  try {
    const { customer_phone, customer_name, link_type } = req.body;

    console.log('\n📱 SMS Link Request from Max Sales Agent:');
    console.log('   Customer:', customer_name || 'Unknown');
    console.log('   Phone:', customer_phone);
    console.log('   Link Type:', link_type || 'signup');

    if (!customer_phone) {
      return res.json({
        success: false,
        message: 'I need your phone number to send the text message. What number should I use?'
      });
    }

    // Map link types to URLs and messages
    const linkConfig = {
      signup: {
        url: 'https://remodely.ai/signup',
        message: `Hi ${customer_name?.split(' ')[0] || 'there'}! Here's your link to start your FREE trial with VoiceNow CRM - 50 free minutes, no credit card required: https://remodely.ai/signup - Max from Remodely AI`
      },
      demo: {
        url: 'https://remodely.ai/demo',
        message: `Hi ${customer_name?.split(' ')[0] || 'there'}! Try our AI voice agent demo here: https://remodely.ai/demo - Experience it yourself! - Max from Remodely AI`
      },
      pricing: {
        url: 'https://remodely.ai/#pricing',
        message: `Hi ${customer_name?.split(' ')[0] || 'there'}! Here's our pricing info: https://remodely.ai/#pricing - Starting at just $99/month with a FREE trial! - Max from Remodely AI`
      }
    };

    const config = linkConfig[link_type] || linkConfig.signup;

    // Send SMS via Twilio
    await agentSMSService.sendSMS({
      agentId: 'max-sales-agent',
      to: customer_phone,
      message: config.message,
      userId: null,
      metadata: {
        source: 'max_sales_agent',
        linkType: link_type || 'signup',
        customerName: customer_name,
        timestamp: new Date().toISOString()
      }
    });

    console.log('   ✅ SMS sent successfully');

    res.json({
      success: true,
      message: `Perfect! I just sent the ${link_type || 'signup'} link to ${customer_phone}. You should receive it in the next few seconds. Is there anything else you'd like to know about VoiceNow CRM?`
    });

  } catch (error) {
    console.error('❌ SMS send error:', error);
    res.json({
      success: false,
      message: 'I apologize, there was an issue sending the text. Let me try that again or I can email you instead.'
    });
  }
});

/**
 * Send Follow-Up Email
 * Called when customer wants info via email
 * POST /api/agent-webhooks/send-email
 */
router.post('/send-email', async (req, res) => {
  try {
    const { customer_email, customer_name, email_type } = req.body;

    console.log('\n📧 Email Request from Max Sales Agent:');
    console.log('   Customer:', customer_name || 'Unknown');
    console.log('   Email:', customer_email);
    console.log('   Email Type:', email_type || 'info');

    if (!customer_email) {
      return res.json({
        success: false,
        message: 'I need your email address to send the information. What email should I use?'
      });
    }

    const name = customer_name?.split(' ')[0] || 'there';

    // Email content based on type
    const emailContent = {
      info: {
        subject: `VoiceNow CRM Information - As Promised!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">VoiceNow CRM</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI-Powered Business Automation</p>
            </div>
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${name}!</h2>
              <p style="color: #4b5563; line-height: 1.6;">Great speaking with you! Here's the information about VoiceNow CRM as promised.</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1f2937; margin-top: 0;">What VoiceNow CRM Does For You:</h3>
                <ul style="color: #4b5563;">
                  <li>AI voice agents that handle calls 24/7</li>
                  <li>Qualify leads and book appointments automatically</li>
                  <li>Never miss another customer call</li>
                  <li>Complete CRM with pipeline management</li>
                </ul>
              </div>
              <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">Ready to Get Started?</h3>
                <p style="color: #4b5563; margin-bottom: 20px;">Start your free trial with 50 minutes of AI voice calls - no credit card required!</p>
                <a href="https://remodely.ai/signup" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Start Free Trial</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">Questions? Just reply to this email!<br><br>Best,<br><strong>Max</strong><br>Remodely AI Sales Team</p>
            </div>
          </div>
        `
      },
      pricing: {
        subject: `VoiceNow CRM Pricing - Starting at $99/month`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">VoiceNow CRM Pricing</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${name}!</h2>
              <p style="color: #4b5563;">Here's our pricing information as promised:</p>
              <div style="display: grid; gap: 20px; margin: 20px 0;">
                <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb;">
                  <h3 style="margin: 0; color: #1f2937;">Starter - $99/month</h3>
                  <p style="color: #6b7280; margin: 5px 0 0 0;">100 minutes included, perfect for small businesses</p>
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #3b82f6;">
                  <h3 style="margin: 0; color: #3b82f6;">Pro - $199/month (Most Popular)</h3>
                  <p style="color: #6b7280; margin: 5px 0 0 0;">500 minutes included, advanced features</p>
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb;">
                  <h3 style="margin: 0; color: #1f2937;">Enterprise - Custom</h3>
                  <p style="color: #6b7280; margin: 5px 0 0 0;">Unlimited minutes, dedicated support</p>
                </div>
              </div>
              <p style="color: #059669; font-weight: 600;">All plans include a FREE 14-day trial with 50 minutes!</p>
              <a href="https://remodely.ai/signup" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 15px;">Start Free Trial</a>
            </div>
          </div>
        `
      },
      demo_followup: {
        subject: `Thanks for the Demo - Ready to Get Started?`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">Thanks for Trying Our Demo!</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${name}!</h2>
              <p style="color: #4b5563; line-height: 1.6;">Thank you for taking the time to experience our AI voice agent demo! I hope it gave you a sense of how powerful our technology can be for your business.</p>
              <p style="color: #4b5563; line-height: 1.6;">Ready to put this to work for your own business? Start your free trial today and get 50 minutes to try it with your actual customers.</p>
              <a href="https://remodely.ai/signup" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">Start Free Trial</a>
              <p style="color: #6b7280; font-size: 14px;">Questions? Just reply to this email or call us at (602) 833-7194!<br><br>Best,<br><strong>Max</strong><br>Remodely AI Sales Team</p>
            </div>
          </div>
        `
      }
    };

    const content = emailContent[email_type] || emailContent.info;

    // Send email
    await emailTransporter.sendMail({
      from: `"Max from Remodely AI" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: customer_email,
      subject: content.subject,
      html: content.html
    });

    // Notify sales team
    await emailTransporter.sendMail({
      from: `"VoiceNow CRM" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: 'help.remodely@gmail.com',
      subject: `📧 Email sent to ${customer_name || customer_email} (${email_type || 'info'})`,
      html: `<p>Max Sales Agent sent a ${email_type || 'info'} email to ${customer_email}</p><p>Customer Name: ${customer_name || 'Unknown'}</p>`
    });

    console.log('   ✅ Email sent successfully');

    res.json({
      success: true,
      message: `Done! I've sent the ${email_type || 'information'} email to ${customer_email}. Check your inbox - it should arrive within a minute. Is there anything else I can help you with?`
    });

  } catch (error) {
    console.error('❌ Email send error:', error);
    res.json({
      success: false,
      message: 'I apologize, there was an issue sending the email. Let me try again or I can text you the link instead.'
    });
  }
});

/**
 * Send Booking Link
 * Called when customer wants to schedule a consultation
 * POST /api/agent-webhooks/send-booking
 */
router.post('/send-booking', async (req, res) => {
  try {
    const { customer_phone, customer_name } = req.body;

    console.log('\n📅 Booking Link Request from Max Sales Agent:');
    console.log('   Customer:', customer_name || 'Unknown');
    console.log('   Phone:', customer_phone);

    if (!customer_phone) {
      return res.json({
        success: false,
        message: 'I need your phone number to send the booking link. What number should I text?'
      });
    }

    const name = customer_name?.split(' ')[0] || 'there';
    const bookingUrl = 'https://calendly.com/remodely/consultation';

    // Send SMS with booking link
    await agentSMSService.sendSMS({
      agentId: 'max-sales-agent',
      to: customer_phone,
      message: `Hi ${name}! Here's your link to book a personalized consultation call: ${bookingUrl} - Pick a time that works best for you and we'll show you exactly how VoiceNow CRM can transform your business! - Max from Remodely AI`,
      userId: null,
      metadata: {
        source: 'max_sales_agent',
        type: 'booking_link',
        customerName: customer_name,
        timestamp: new Date().toISOString()
      }
    });

    // Notify sales team
    await emailTransporter.sendMail({
      from: `"VoiceNow CRM" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: 'help.remodely@gmail.com',
      subject: `📅 Booking link sent to ${customer_name || customer_phone}`,
      html: `<p>Max Sales Agent sent a booking link to:</p><p>Name: ${customer_name || 'Unknown'}<br>Phone: ${customer_phone}</p><p>Booking URL: ${bookingUrl}</p>`
    });

    console.log('   ✅ Booking link sent successfully');

    res.json({
      success: true,
      message: `I've sent the booking link to ${customer_phone}. You can pick any time that works for you, and we'll have a personalized conversation about how VoiceNow CRM fits your specific needs. Is there anything else I can help with right now?`
    });

  } catch (error) {
    console.error('❌ Booking link error:', error);
    res.json({
      success: false,
      message: 'I apologize, there was an issue sending the booking link. Would you like me to try again or provide you the link directly?'
    });
  }
});

// ============================================
// END OF MAX SALES AGENT WEBHOOK TOOLS
// ============================================

/**
 * Post-call notification webhook
 * Triggered after every call ends to notify team
 */
router.post('/post-call-notification', async (req, res) => {
  try {
    const {
      call_id,
      customer_name,
      customer_email,
      customer_phone,
      call_duration,
      call_outcome,
      transcript,
      interested,
      business_type,
      notes
    } = req.body;

    console.log(`📞 Post-call notification for call: ${call_id}`);
    console.log(`   Customer: ${customer_name || 'Unknown'}`);
    console.log(`   Duration: ${call_duration || 'N/A'}`);
    console.log(`   Outcome: ${call_outcome || 'Unknown'}`);

    // Send notification to help.remodely@gmail.com
    await emailService.sendEmail({
      to: 'help.remodely@gmail.com',
      subject: `New Call Completed - ${customer_name || 'Unknown Customer'}`,
      html: `
        <h2>📞 Call Summary</h2>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> ${customer_name || 'Not provided'}</p>
          <p><strong>Email:</strong> ${customer_email || 'Not provided'}</p>
          <p><strong>Phone:</strong> ${customer_phone || 'Not provided'}</p>
          <p><strong>Business Type:</strong> ${business_type || 'Not specified'}</p>
        </div>

        <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Call Details</h3>
          <p><strong>Call ID:</strong> ${call_id}</p>
          <p><strong>Duration:</strong> ${call_duration || 'Unknown'}</p>
          <p><strong>Outcome:</strong> ${call_outcome || 'Completed'}</p>
          <p><strong>Interested:</strong> ${interested ? '✅ YES' : '❌ NO'}</p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>

        ${transcript ? `
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Call Transcript</h3>
          <p style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${transcript}</p>
        </div>
        ` : ''}

        <p><strong>Action Required:</strong> ${interested ? 'Follow up with this hot lead!' : 'Lead may need nurturing.'}</p>

        <p>View full details in the VoiceNow CRM dashboard.</p>
      `
    });

    console.log(`   ✅ Post-call notification sent to help.remodely@gmail.com`);

    res.json({
      success: true,
      message: 'Post-call notification sent successfully'
    });

  } catch (error) {
    console.error('❌ Error in post-call-notification webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send post-call notification',
      error: error.message
    });
  }
});

export default router;
