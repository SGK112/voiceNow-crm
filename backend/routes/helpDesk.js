import express from 'express';
import emailService from '../services/emailService.js';

const router = express.Router();

/**
 * POST /api/help-desk/request
 * Submit a help desk request from the marketing chat widget
 * No authentication required - public endpoint
 */
router.post('/request', async (req, res) => {
  try {
    const {
      userName,
      userEmail,
      userMessage,
      conversationHistory = [],
      urgency = 'normal',
      category = 'general'
    } = req.body;

    // Validate required fields
    if (!userMessage || userMessage.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Email is optional but recommended
    if (!userEmail || !userEmail.includes('@')) {
      console.warn('⚠️ Help desk request submitted without valid email');
    }

    // Send help desk notification email
    await emailService.sendHelpDeskNotification({
      userName: userName || 'Anonymous',
      userEmail: userEmail || 'no-email@provided.com',
      userMessage,
      conversationHistory,
      urgency,
      category
    });

    console.log('✅ Help desk notification sent for:', userEmail || 'anonymous user');

    res.json({
      success: true,
      message: 'Your request has been submitted. Our team will get back to you soon.',
      estimatedResponseTime: urgency === 'urgent' ? '1-2 hours' : '4-6 hours'
    });

  } catch (error) {
    console.error('❌ Help desk request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit help desk request. Please try again or email help.remodely@gmail.com directly.'
    });
  }
});

/**
 * POST /api/help-desk/contact
 * Submit a contact form from the marketing page
 * No authentication required - public endpoint
 */
router.post('/contact', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      interest,
      message
    } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Format contact form submission as help desk request
    const formattedMessage = `
Contact Form Submission:

Company: ${company || 'Not provided'}
Phone: ${phone || 'Not provided'}
Interest: ${interest || 'General inquiry'}

Message:
${message}
    `.trim();

    // Send help desk notification
    await emailService.sendHelpDeskNotification({
      userName: name,
      userEmail: email,
      userMessage: formattedMessage,
      conversationHistory: [],
      urgency: 'normal',
      category: interest || 'contact_form'
    });

    console.log('✅ Contact form submission sent for:', email);

    res.json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you within 24 hours.'
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form. Please email help.remodely@gmail.com directly.'
    });
  }
});

export default router;
