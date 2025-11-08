import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    try {
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
          name: process.env.SMTP_FROM_NAME || 'VoiceFlow CRM',
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
    const subject = 'Welcome to VoiceFlow CRM!';
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
            <h1>Welcome to VoiceFlow CRM! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName || 'there'},</h2>
            <p>Thank you for signing up for VoiceFlow CRM! We're excited to have you on board.</p>
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
            <p>&copy; ${new Date().getFullYear()} VoiceFlow CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to VoiceFlow CRM!

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
            <p>&copy; ${new Date().getFullYear()} VoiceFlow CRM. All rights reserved.</p>
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
            <p>&copy; ${new Date().getFullYear()} VoiceFlow CRM. All rights reserved.</p>
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
            <p>&copy; ${new Date().getFullYear()} VoiceFlow CRM. All rights reserved.</p>
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
}

export default new EmailService();
