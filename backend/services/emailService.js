import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure environment variables are loaded before initializing email service
// Note: server.js already loads .env, but load it here too in case emailService is used standalone
if (!process.env.SMTP_USER) {
  dotenv.config({ path: join(__dirname, '../../.env') });
}

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    try {
      // Check if SMTP credentials are configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn('⚠️  SMTP credentials not configured - email functionality will be disabled');
        this.transporter = null;
        return;
      }

      // Create transporter using Gmail SMTP with app password
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD // Gmail app password
        },
        tls: {
          rejectUnauthorized: false // For development, remove in production
        }
      });

      console.log('✅ Email service initialized with Gmail SMTP');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
    }
  }

  /**
   * Send a single email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content
   * @param {Array} options.attachments - Email attachments
   */
  async sendEmail({ to, subject, text, html, attachments = [] }) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'VoiceNow CRM',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
        },
        to,
        subject,
        text,
        html,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✉️  Email sent:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('❌ Email send failed:', error.message);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(userEmail, userName) {
    const subject = 'Welcome to VoiceNow CRM!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to VoiceNow CRM! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName || 'there'},</h2>
            <p>Thank you for signing up for VoiceNow CRM! We're excited to have you on board.</p>
            <p>With VoiceFlow, you can:</p>
            <ul>
              <li>🤖 Deploy AI-powered voice agents</li>
              <li>📞 Manage and track all your calls</li>
              <li>👥 Convert calls into qualified leads</li>
              <li>⚡ Automate workflows with n8n</li>
              <li>📊 Track performance with analytics</li>
            </ul>
            <p>Get started by setting up your first voice agent!</p>
            <a href="${process.env.CLIENT_URL}/dashboard" class="button">Go to Dashboard</a>
          </div>
          <div class="footer">
            <p>Questions? Reply to this email or visit our support center.</p>
            <p>&copy; ${new Date().getFullYear()} VoiceNow CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to VoiceNow CRM!

      Hi ${userName || 'there'},

      Thank you for signing up! We're excited to have you on board.

      Visit your dashboard: ${process.env.CLIENT_URL}/dashboard

      Questions? Reply to this email anytime.
    `;

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  /**
   * Send call summary email
   */
  async sendCallSummary({ to, leadName, callDuration, callDate, transcript, nextSteps }) {
    const subject = `Call Summary - ${leadName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📞 Call Summary</h1>
          </div>
          <div class="content">
            <h2>Thank you for your time, ${leadName}!</h2>
            <p>Here's a summary of our conversation:</p>

            <div class="info-box">
              <strong>Call Date:</strong> ${callDate}<br>
              <strong>Duration:</strong> ${callDuration}
            </div>

            ${transcript ? `
            <div class="info-box">
              <strong>Call Transcript:</strong><br>
              ${transcript}
            </div>
            ` : ''}

            ${nextSteps ? `
            <div class="info-box">
              <strong>Next Steps:</strong><br>
              ${nextSteps}
            </div>
            ` : ''}

            <p>If you have any questions or need assistance, please don't hesitate to reach out!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VoiceNow CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Call Summary - ${leadName}

      Thank you for your time!

      Call Date: ${callDate}
      Duration: ${callDuration}

      ${transcript ? `Transcript:\n${transcript}\n\n` : ''}
      ${nextSteps ? `Next Steps:\n${nextSteps}` : ''}

      Questions? Reply to this email anytime.
    `;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation({ to, leadName, appointmentDate, appointmentTime, meetingLink }) {
    const subject = `Appointment Confirmed - ${appointmentDate} at ${appointmentTime}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-box { background: white; padding: 20px; margin: 20px 0; border: 2px solid #10b981; border-radius: 8px; text-align: center; }
          .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Appointment Confirmed!</h1>
          </div>
          <div class="content">
            <h2>Hi ${leadName},</h2>
            <p>Your appointment has been successfully scheduled.</p>

            <div class="appointment-box">
              <h3>📅 ${appointmentDate}</h3>
              <h3>🕐 ${appointmentTime}</h3>
              ${meetingLink ? `<a href="${meetingLink}" class="button">Join Meeting</a>` : ''}
            </div>

            <p>We've added this to your calendar. Looking forward to speaking with you!</p>
            <p>If you need to reschedule, please reply to this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VoiceNow CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Appointment Confirmed!

      Hi ${leadName},

      Your appointment has been scheduled:

      Date: ${appointmentDate}
      Time: ${appointmentTime}
      ${meetingLink ? `Meeting Link: ${meetingLink}` : ''}

      Looking forward to speaking with you!
    `;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder({ to, leadName, amountDue, dueDate, invoiceUrl }) {
    const subject = `Payment Reminder - $${amountDue} due ${dueDate}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .payment-box { background: white; padding: 20px; margin: 20px 0; border: 2px solid #f59e0b; border-radius: 8px; text-align: center; }
          .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 Payment Reminder</h1>
          </div>
          <div class="content">
            <h2>Hi ${leadName},</h2>
            <p>This is a friendly reminder about your upcoming payment.</p>

            <div class="payment-box">
              <h3>Amount Due: $${amountDue}</h3>
              <p>Due Date: ${dueDate}</p>
              ${invoiceUrl ? `<a href="${invoiceUrl}" class="button">View Invoice</a>` : ''}
            </div>

            <p>If you've already made this payment, please disregard this reminder.</p>
            <p>Have questions? Reply to this email or contact our billing team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VoiceNow CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Payment Reminder

      Hi ${leadName},

      Amount Due: $${amountDue}
      Due Date: ${dueDate}
      ${invoiceUrl ? `Invoice: ${invoiceUrl}` : ''}

      Questions? Reply to this email.
    `;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send new signup notification to sales team
   */
  async sendNewSignupNotification(userEmail, companyName) {
    const subject = `🎉 NEW SIGNUP: ${companyName || userEmail}`;
    const signupTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/Phoenix',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f0fdf4; padding: 30px; border: 1px solid #22c55e; border-top: none; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #22c55e; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .cta { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Customer Signed Up!</h1>
          </div>
          <div class="content">
            <p>Great news! A new customer just created an account on VoiceNow CRM.</p>

            <div class="info-box">
              <p><strong>📧 Email:</strong> ${userEmail}</p>
              <p><strong>🏢 Company:</strong> ${companyName || 'Not provided'}</p>
              <p><strong>📅 Signup Time:</strong> ${signupTime} MST</p>
              <p><strong>📋 Plan:</strong> Trial (30 minutes)</p>
            </div>

            <p><strong>Recommended Actions:</strong></p>
            <ul>
              <li>Send a personalized welcome message</li>
              <li>Schedule an onboarding call</li>
              <li>Monitor their first agent creation</li>
            </ul>

            <a href="https://voiceflow-crm.onrender.com" class="cta">View Dashboard</a>
          </div>
          <div class="footer">
            <p>VoiceNow CRM - New Signup Notification</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      🎉 NEW SIGNUP!

      Email: ${userEmail}
      Company: ${companyName || 'Not provided'}
      Time: ${signupTime} MST
      Plan: Trial (30 minutes)
    `;

    return this.sendEmail({
      to: 'help.voicenowcrm@gmail.com',
      subject,
      html,
      text
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userEmail, resetCode, companyName) {
    const subject = 'Password Reset Code - VoiceNow CRM';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: white; padding: 20px; margin: 20px 0; border: 2px solid #ef4444; border-radius: 8px; text-align: center; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ef4444; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${companyName ? companyName : 'there'},</p>
            <p>You requested to reset your password for VoiceNow CRM.</p>
            <p>Use the code below to reset your password:</p>

            <div class="code-box">
              <div class="code">${resetCode}</div>
            </div>

            <p><strong>This code expires in 15 minutes.</strong></p>
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VoiceNow CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request

      Hi ${companyName ? companyName : 'there'},

      You requested to reset your password for VoiceNow CRM.

      Your reset code: ${resetCode}

      This code expires in 15 minutes.

      If you didn't request this, please ignore this email.
    `;

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  /**
   * Send password changed confirmation email
   */
  async sendPasswordChangedEmail(userEmail, companyName) {
    const subject = 'Password Changed Successfully - VoiceNow CRM';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: white; padding: 20px; margin: 20px 0; border: 2px solid #10b981; border-radius: 8px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 6px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Changed Successfully</h1>
          </div>
          <div class="content">
            <p>Hi ${companyName ? companyName : 'there'},</p>
            <p>This confirms that your VoiceNow CRM password has been successfully changed.</p>

            <div class="alert-box">
              <p style="margin: 0;"><strong>🔒 Your account is now secured with your new password.</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Changed on: ${new Date().toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>

            <div class="warning">
              <strong>⚠️ Didn't make this change?</strong><br>
              If you did not change your password, please contact our support team immediately at ${process.env.HELP_DESK_EMAIL || 'help.voicenowcrm@gmail.com'} or reset your password again.
            </div>

            <p>Thank you for using VoiceNow CRM!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} VoiceNow CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Changed Successfully

      Hi ${companyName ? companyName : 'there'},

      This confirms that your VoiceNow CRM password has been successfully changed.

      Changed on: ${new Date().toLocaleString()}

      ⚠️ Didn't make this change?
      If you did not change your password, please contact support immediately at ${process.env.HELP_DESK_EMAIL || 'help.voicenowcrm@gmail.com'}

      Thank you for using VoiceNow CRM!
    `;

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  /**
   * Send help desk notification for human agent support
   */
  async sendHelpDeskNotification({
    userName,
    userEmail,
    userMessage,
    conversationHistory = [],
    urgency = 'normal',
    category = 'general'
  }) {
    const urgencyColors = {
      low: '#10b981',
      normal: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    };

    const urgencyLabels = {
      low: 'Low Priority',
      normal: 'Normal',
      high: 'High Priority',
      urgent: 'URGENT'
    };

    const subject = `[${urgencyLabels[urgency]}] Help Desk Request from ${userName || userEmail}`;

    const conversationHtml = conversationHistory.length > 0
      ? `
        <div class="info-box">
          <strong>Recent Conversation:</strong><br><br>
          ${conversationHistory.map(msg => `
            <div style="margin: 10px 0; padding: 10px; background: ${msg.role === 'user' ? '#eff6ff' : '#f8fafc'}; border-radius: 6px;">
              <strong>${msg.role === 'user' ? '👤 Customer' : '🤖 AI'}:</strong><br>
              ${msg.content}
            </div>
          `).join('')}
        </div>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; background: #ffffff; }
          .header {
            background: linear-gradient(135deg, ${urgencyColors[urgency]} 0%, ${urgencyColors[urgency]}dd 100%);
            color: white;
            padding: 25px;
            text-align: center;
            border-radius: 12px 12px 0 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 12px 12px;
            border: 1px solid #e5e7eb;
          }
          .info-box {
            background: white;
            padding: 20px;
            margin: 15px 0;
            border-left: 4px solid ${urgencyColors[urgency]};
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: ${urgencyColors[urgency]}20;
            color: ${urgencyColors[urgency]};
            margin: 5px 5px 5px 0;
          }
          .action-buttons {
            margin-top: 25px;
            text-align: center;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background: ${urgencyColors[urgency]};
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 5px;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 13px;
          }
          .timestamp {
            font-size: 13px;
            color: #6b7280;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🆘 Help Desk Request</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.95; font-size: 15px;">${urgencyLabels[urgency]} Support Needed</p>
          </div>
          <div class="content">
            <div style="margin-bottom: 20px;">
              <span class="badge">Category: ${category.toUpperCase()}</span>
              <span class="badge">Urgency: ${urgencyLabels[urgency]}</span>
            </div>

            <div class="info-box">
              <strong>👤 Customer Information:</strong><br>
              <strong>Name:</strong> ${userName || 'Not provided'}<br>
              <strong>Email:</strong> ${userEmail || 'Not provided'}<br>
              <div class="timestamp">Request received: ${new Date().toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</div>
            </div>

            <div class="info-box">
              <strong>💬 Customer Message:</strong><br><br>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; font-size: 15px; line-height: 1.6;">
                ${userMessage}
              </div>
            </div>

            ${conversationHtml}

            <div class="action-buttons">
              <a href="mailto:${userEmail}" class="button">📧 Reply to Customer</a>
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/app/support" class="button" style="background: #6b7280;">🎫 View in Dashboard</a>
            </div>

            <div style="margin-top: 25px; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <strong>⚡ Action Required:</strong> A customer is requesting human support. Please respond as soon as possible to maintain our service quality.
            </div>
          </div>
          <div class="footer">
            <p><strong>VoiceNow CRM Help Desk</strong></p>
            <p>This is an automated notification from your VoiceNow CRM system.</p>
            <p>&copy; ${new Date().getFullYear()} VoiceNow CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      HELP DESK REQUEST - ${urgencyLabels[urgency]}

      Customer Information:
      - Name: ${userName || 'Not provided'}
      - Email: ${userEmail || 'Not provided'}
      - Category: ${category}
      - Time: ${new Date().toLocaleString()}

      Customer Message:
      ${userMessage}

      ${conversationHistory.length > 0 ? `
      Recent Conversation:
      ${conversationHistory.map(msg => `${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.content}`).join('\n\n')}
      ` : ''}

      Action Required: Please respond to the customer as soon as possible.

      Reply to: ${userEmail}
    `;

    // Send to help desk email
    const helpDeskEmail = process.env.HELP_DESK_EMAIL || 'help.voicenowcrm@gmail.com';

    return this.sendEmail({
      to: helpDeskEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Verify email service connection
   */
  async verifyConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service verification failed:', error.message);
      return false;
    }
  }

  /**
   * Generate an iCalendar (.ics) calendar invite attachment
   * @param {Object} options - Calendar event details
   * @param {string} options.title - Event title
   * @param {string} options.description - Event description
   * @param {Date} options.startTime - Event start time
   * @param {Date} options.endTime - Event end time
   * @param {string} options.location - Event location (optional)
   * @param {string} options.organizerEmail - Organizer email (defaults to SMTP_USER)
   * @param {string} options.organizerName - Organizer name (defaults to SMTP_FROM_NAME)
   */
  generateCalendarInvite({ title, description, startTime, endTime, location, organizerEmail, organizerName }) {
    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const now = new Date();
    const organizerEmailAddr = organizerEmail || process.env.SMTP_USER || 'no-reply@voiceflowcrm.com';
    const organizerNameValue = organizerName || process.env.SMTP_FROM_NAME || 'VoiceNow CRM';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//VoiceNow CRM//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(startTime)}`,
      `DTEND:${formatDate(endTime)}`,
      `DTSTAMP:${formatDate(now)}`,
      `ORGANIZER;CN=${organizerNameValue}:mailto:${organizerEmailAddr}`,
      `UID:${now.getTime()}@voiceflowcrm.com`,
      'SEQUENCE:0',
      'STATUS:CONFIRMED',
      `SUMMARY:${title}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      location ? `LOCATION:${location}` : '',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    return {
      filename: 'invite.ics',
      content: icsContent,
      contentType: 'text/calendar; method=REQUEST; charset=UTF-8'
    };
  }

  /**
   * Send email with calendar invite attachment
   * @param {Object} options - Email and calendar details
   */
  async sendEmailWithCalendarInvite({ to, subject, html, text, calendarDetails }) {
    const calendarAttachment = this.generateCalendarInvite(calendarDetails);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      attachments: [calendarAttachment]
    });
  }

  /**
   * Send consultation confirmation with calendar invite
   */
  async sendConsultationConfirmation({ to, leadName, consultationDate, consultationTime, address, companyName, companyEmail }) {
    const subject = `Consultation Scheduled with ${companyName}`;

    // Parse the date and time into a Date object
    const startTime = new Date(consultationDate + ' ' + consultationTime);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour consultation

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .consultation-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Consultation Scheduled!</h1>
          </div>
          <div class="content">
            <h2>Hi ${leadName},</h2>
            <p>Great news! Your consultation with ${companyName} has been scheduled.</p>

            <div class="consultation-box">
              <h3>📅 ${consultationDate}</h3>
              <h3>🕐 ${consultationTime}</h3>
              <p><strong>Location:</strong> ${address}</p>
            </div>

            <p><strong>📎 A calendar invite is attached to this email.</strong> Simply open the attachment to add this appointment to your calendar.</p>

            <p>We look forward to meeting with you! If you need to reschedule, please contact us at ${companyEmail}.</p>
          </div>
          <div class="footer">
            <p>This appointment confirmation was sent by ${companyName}</p>
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Consultation Scheduled!

      Hi ${leadName},

      Your consultation with ${companyName} has been scheduled:

      Date: ${consultationDate}
      Time: ${consultationTime}
      Location: ${address}

      A calendar invite is attached to this email.

      Looking forward to meeting you!
      ${companyName}
      ${companyEmail}
    `;

    return this.sendEmailWithCalendarInvite({
      to,
      subject,
      html,
      text,
      calendarDetails: {
        title: `Consultation with ${companyName}`,
        description: `Free consultation at ${address}`,
        startTime,
        endTime,
        location: address,
        organizerEmail: companyEmail,
        organizerName: companyName
      }
    });
  }
}

export default new EmailService();
