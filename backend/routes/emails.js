import express from 'express';
import EmailTracking from '../models/EmailTracking.js';
import { protect } from '../middleware/auth.js';
import emailService from '../services/emailService.js';
import crypto from 'crypto';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { status, relatedContact, relatedDeal } = req.query;
    const filter = { user: req.user._id };

    if (status) filter.status = status;
    if (relatedContact) filter.relatedContact = relatedContact;
    if (relatedDeal) filter.relatedDeal = relatedDeal;

    const emails = await EmailTracking.find(filter)
      .populate('relatedContact', 'name email')
      .populate('relatedDeal', 'title value')
      .sort({ sentAt: -1 })
      .limit(100);

    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await EmailTracking.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalSent: { $sum: 1 },
          opened: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $ifNull: ['$opens', []] } }, 0] }, 1, 0]
            }
          },
          clicked: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $ifNull: ['$clicks', []] } }, 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || { totalSent: 0, opened: 0, clicked: 0 };
    result.openRate = result.totalSent > 0 ? ((result.opened / result.totalSent) * 100).toFixed(2) : 0;
    result.clickRate = result.totalSent > 0 ? ((result.clicked / result.totalSent) * 100).toFixed(2) : 0;

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const email = await EmailTracking.findOne({ _id: req.params.id, user: req.user._id })
      .populate('relatedContact')
      .populate('relatedDeal');

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(email);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/send', protect, async (req, res) => {
  try {
    const { to, subject, body, bodyHtml, relatedContact, relatedDeal, trackingEnabled = true } = req.body;

    const messageId = crypto.randomBytes(16).toString('hex');
    const baseUrl = process.env.BASE_URL || 'https://voiceflow-crm.onrender.com';
    const trackingPixelUrl = trackingEnabled ? `${baseUrl}/api/emails/track/open/${messageId}` : null;

    const emailTracking = new EmailTracking({
      user: req.user._id,
      messageId,
      to: Array.isArray(to) ? to : [{ email: to }],
      from: {
        email: process.env.SMTP_FROM_EMAIL,
        name: req.user.name || 'voicenowcrm.com'
      },
      subject,
      body,
      bodyHtml: trackingEnabled && bodyHtml
        ? `${bodyHtml}<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" />`
        : bodyHtml,
      trackingPixelUrl,
      trackingEnabled,
      relatedContact,
      relatedDeal,
      status: 'queued'
    });

    await emailTracking.save();

    try {
      const recipients = Array.isArray(to) ? to.map(t => t.email || t) : [to];

      await emailService.sendEmail({
        to: recipients,
        subject,
        text: body,
        html: emailTracking.bodyHtml || body
      });

      emailTracking.status = 'sent';
      emailTracking.sentAt = new Date();
      await emailTracking.save();

      res.status(201).json(emailTracking);
    } catch (emailError) {
      emailTracking.status = 'failed';
      emailTracking.errorMessage = emailError.message;
      await emailTracking.save();

      res.status(500).json({ error: 'Failed to send email', details: emailError.message });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/track/open/:messageId', async (req, res) => {
  try {
    const email = await EmailTracking.findOne({ messageId: req.params.messageId });

    if (email) {
      await email.recordOpen(
        req.ip,
        req.headers['user-agent'],
        req.headers['cf-ipcountry'] || 'unknown'
      );
    }

    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(pixel);
  } catch (error) {
    console.error('Error tracking email open:', error);
    res.status(500).end();
  }
});

router.get('/track/click/:messageId', async (req, res) => {
  try {
    const { url } = req.query;
    const email = await EmailTracking.findOne({ messageId: req.params.messageId });

    if (email && url) {
      await email.recordClick(url, req.ip, req.headers['user-agent']);
    }

    res.redirect(url || '/');
  } catch (error) {
    console.error('Error tracking link click:', error);
    res.redirect('/');
  }
});

export default router;
