import express from 'express';
import { protect as auth, generateToken } from '../middleware/auth.js';
import Lead from '../models/Lead.js';
import User from '../models/User.js';
import Contact from '../models/Contact.js';
import Usage from '../models/Usage.js';
import Appointment from '../models/Appointment.js';
import UserIntegration from '../models/UserIntegration.js';
import googleSyncService from '../services/googleSyncService.js';
import crypto from 'crypto';
import { getOAuthRedirectUri } from '../utils/oauthConfig.js';

const router = express.Router();

// ============================================
// MOBILE GOOGLE OAUTH ENDPOINTS
// ============================================

// Store pending OAuth states (in production use Redis)
const pendingOAuthStates = new Map();

// @desc    Get Google OAuth URL for mobile
// @route   GET /api/mobile/auth/google/url
// @access  Public
router.get('/auth/google/url', (req, res) => {
  try {
    // Generate unique state for security
    const state = crypto.randomBytes(32).toString('hex');
    const redirectUri = getOAuthRedirectUri('google-mobile');

    // Check if extended scopes are requested (for Gmail, Calendar, Contacts sync)
    const extended = req.query.extended === 'true';

    // Store state with expiration (5 minutes)
    pendingOAuthStates.set(state, {
      created: Date.now(),
      expires: Date.now() + 5 * 60 * 1000,
      extended // Track if extended scopes were requested
    });

    // Clean up expired states
    for (const [key, value] of pendingOAuthStates.entries()) {
      if (Date.now() > value.expires) {
        pendingOAuthStates.delete(key);
      }
    }

    // Basic scopes for auth
    const basicScopes = 'openid email profile';

    // Extended scopes for Gmail, Calendar, Contacts
    const extendedScopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/contacts.readonly'
    ].join(' ');

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', extended ? extendedScopes : basicScopes);
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');

    console.log('📱 Mobile OAuth URL generated:', {
      state: state.substring(0, 8) + '...',
      redirectUri,
      extended
    });

    res.json({
      success: true,
      url: googleAuthUrl.toString(),
      state,
      extended
    });
  } catch (error) {
    console.error('Generate OAuth URL error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate OAuth URL' });
  }
});

// @desc    Handle Google OAuth callback (redirect from Google)
// @route   GET /api/mobile/auth/google/callback
// @access  Public
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    console.log('📱 Mobile OAuth callback:', { hasCode: !!code, hasState: !!state, error });

    // Helper to show error page
    const showError = (errorMsg) => {
      const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a0a0b 0%, #1a1a2e 100%);
      min-height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container { text-align: center; padding: 40px; max-width: 400px; }
    .error-icon {
      width: 80px; height: 80px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px; font-size: 40px;
    }
    h1 { font-size: 24px; margin: 0 0 12px; }
    p { color: #9ca3af; margin: 0 0 24px; font-size: 15px; }
    .error-msg { color: #f87171; font-size: 13px; background: rgba(239,68,68,0.1); padding: 12px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">✕</div>
    <h1>Login Failed</h1>
    <p>Something went wrong during sign in.</p>
    <p class="error-msg">${errorMsg}</p>
    <p style="margin-top: 24px;">Please close this window and try again.</p>
  </div>
</body>
</html>`;
      return res.status(400).send(errorHtml);
    };

    if (error) {
      return showError(error);
    }

    if (!code || !state) {
      return showError('Missing authorization code or state parameter');
    }

    // Verify state
    const pendingState = pendingOAuthStates.get(state);
    if (!pendingState) {
      return showError('Invalid or expired session. Please try signing in again.');
    }

    if (Date.now() > pendingState.expires) {
      pendingOAuthStates.delete(state);
      return showError('Session expired. Please try signing in again.');
    }

    pendingOAuthStates.delete(state);

    // Exchange code for tokens - must match the URI used in the auth URL
    const redirectUri = getOAuthRedirectUri('google-mobile');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokens.id_token) {
      console.error('No ID token received:', tokens);
      return res.redirect(`voiceflow-ai://oauth?error=${encodeURIComponent(tokens.error_description || 'token_exchange_failed')}`);
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const userInfo = await userInfoResponse.json();
    const { id: googleId, email, name } = userInfo;

    // Find or create user
    let user = await User.findOne({ googleId });
    let isNewUser = false;

    if (!user) {
      // Check if an email/password account exists with this email
      const existingEmailUser = await User.findOne({ email, googleId: { $exists: false } });

      if (existingEmailUser) {
        // Link existing account to Google
        existingEmailUser.googleId = googleId;
        await existingEmailUser.save();
        user = existingEmailUser;
        console.log(`✅ Linked existing account ${email} to Google ID ${googleId}`);
      } else {
        // Create new user
        const emailExists = await User.findOne({ email });
        const uniqueEmail = emailExists ? `${googleId}@google-account.local` : email;

        user = await User.create({
          email: uniqueEmail,
          googleId,
          company: name || email.split('@')[0],
          plan: 'trial',
          subscriptionStatus: 'trialing'
        });

        isNewUser = true;
        console.log(`✅ Created new account for Google ID ${googleId}`);

        // Create usage record
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        await Usage.create({
          userId: user._id,
          month,
          plan: user.plan,
          minutesIncluded: 30,
          agentsLimit: 1
        });
      }
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Save Google tokens if extended scopes were requested (for Gmail, Calendar, Contacts sync)
    if (pendingState.extended && tokens.refresh_token) {
      try {
        // Calculate token expiration
        const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

        // Upsert Google integration with tokens
        await UserIntegration.findOneAndUpdate(
          { userId: user._id, service: 'gmail' },
          {
            userId: user._id,
            service: 'gmail',
            displayName: `Google (${email})`,
            credentials: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              email: email,
              scope: tokens.scope
            },
            isOAuth: true,
            tokenExpiresAt: expiresAt,
            status: 'connected',
            enabled: true
          },
          { upsert: true, new: true }
        );

        // Also save for calendar
        await UserIntegration.findOneAndUpdate(
          { userId: user._id, service: 'google_calendar' },
          {
            userId: user._id,
            service: 'google_calendar',
            displayName: `Google Calendar (${email})`,
            credentials: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              email: email,
              scope: tokens.scope
            },
            isOAuth: true,
            tokenExpiresAt: expiresAt,
            status: 'connected',
            enabled: true
          },
          { upsert: true, new: true }
        );

        console.log('✅ Saved Google OAuth tokens for extended scopes');
      } catch (tokenSaveError) {
        console.error('Failed to save Google tokens:', tokenSaveError);
      }
    }

    // Build user data for the response
    const userDataObj = {
      _id: user._id,
      email: user.email,
      company: user.company,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      profile: user.profile || {},
      googleConnected: !!pendingState.extended && !!tokens.refresh_token
    };

    console.log('✅ Mobile OAuth successful for:', email);

    // Store the completed OAuth result for polling
    pendingOAuthStates.set(state, {
      ...pendingState,
      completed: true,
      result: { token, user: userDataObj }
    });

    // Build deep link URLs for different scenarios
    const userData = encodeURIComponent(JSON.stringify(userDataObj));
    const appSchemeUrl = `voiceflow-ai://oauth?token=${token}&user=${userData}&state=${state}`;

    // Send HTML page with multiple redirect options
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a0a0b 0%, #1a1a2e 100%);
      min-height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
      max-width: 400px;
    }
    .checkmark {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 {
      font-size: 24px;
      margin: 0 0 12px;
      font-weight: 600;
    }
    p {
      color: #9ca3af;
      margin: 0 0 32px;
      font-size: 15px;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 14px 40px;
      border-radius: 12px;
      text-decoration: none;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
    }
    .hint {
      color: #6b7280;
      font-size: 13px;
      margin-top: 24px;
    }
    .email {
      color: #60a5fa;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">✓</div>
    <h1>Login Successful!</h1>
    <p>Welcome back, <span class="email">${email}</span></p>
    <a href="${appSchemeUrl}" class="btn" id="openApp">Open App</a>
    <p class="hint">You can close this window and return to the app.</p>
  </div>
  <script>
    // Try to open the app automatically after a short delay
    setTimeout(function() {
      window.location.href = "${appSchemeUrl}";
    }, 500);
  </script>
</body>
</html>
    `;
    res.send(html);

  } catch (error) {
    console.error('Mobile OAuth callback error:', error);

    // Show error page instead of redirecting to invalid URL scheme
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a0a0b 0%, #1a1a2e 100%);
      min-height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container { text-align: center; padding: 40px; max-width: 400px; }
    .error-icon {
      width: 80px; height: 80px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px; font-size: 40px;
    }
    h1 { font-size: 24px; margin: 0 0 12px; }
    p { color: #9ca3af; margin: 0 0 24px; font-size: 15px; }
    .error-msg { color: #f87171; font-size: 13px; background: rgba(239,68,68,0.1); padding: 12px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">✕</div>
    <h1>Login Failed</h1>
    <p>Something went wrong during sign in.</p>
    <p class="error-msg">${error.message}</p>
    <p style="margin-top: 24px;">Please close this window and try again.</p>
  </div>
</body>
</html>
    `;
    res.status(500).send(errorHtml);
  }
});

// @desc    Complete OAuth with state (for polling approach)
// @route   GET /api/mobile/auth/google/complete/:state
// @access  Public
router.get('/auth/google/complete/:state', async (req, res) => {
  try {
    const { state } = req.params;
    const pendingState = pendingOAuthStates.get(state);

    if (!pendingState) {
      return res.json({ success: false, status: 'not_found' });
    }

    if (pendingState.completed) {
      // OAuth completed, return the result
      const result = { ...pendingState.result };
      pendingOAuthStates.delete(state);
      return res.json({ success: true, status: 'completed', ...result });
    }

    if (Date.now() > pendingState.expires) {
      pendingOAuthStates.delete(state);
      return res.json({ success: false, status: 'expired' });
    }

    return res.json({ success: false, status: 'pending' });
  } catch (error) {
    console.error('Check OAuth status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get mobile app settings
// @route   GET /api/mobile/settings
// @access  Private
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const settings = {
      voiceAgentEnabled: true,
      smsAgentEnabled: true,
      aiPersonality: user.aiPersonality || 'professional',
      businessName: user.businessName || user.name || 'My Business',
      businessType: user.businessType || 'contractor',
      businessHours: {
        enabled: true,
        start: '9:00 AM',
        end: '5:00 PM',
        timezone: 'America/New_York'
      },
      autoReplyEnabled: false,
      qualificationQuestions: [
        'What type of project are you interested in?',
        'What is your timeline?',
        'What is your budget range?'
      ],
      notificationsEnabled: true
    };

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update mobile app settings
// @route   PUT /api/mobile/settings
// @access  Private
router.put('/settings', auth, async (req, res) => {
  try {
    const { aiPersonality, businessName, businessType, autoReplyEnabled } = req.body;

    const user = await User.findById(req.user.id);

    if (aiPersonality) user.aiPersonality = aiPersonality;
    if (businessName) user.businessName = businessName;
    if (businessType) user.businessType = businessType;

    await user.save();

    const settings = {
      voiceAgentEnabled: true,
      smsAgentEnabled: true,
      aiPersonality: user.aiPersonality,
      businessName: user.businessName,
      businessType: user.businessType,
      autoReplyEnabled: autoReplyEnabled || false,
      notificationsEnabled: true
    };

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Report missed call
// @route   POST /api/mobile/call-missed
// @access  Private
router.post('/call-missed', auth, async (req, res) => {
  try {
    const { phone, contactName, timestamp } = req.body;

    // Create lead from missed call
    const lead = await Lead.create({
      user: req.user.id,
      name: contactName || 'Unknown',
      phone,
      source: 'call',
      status: 'new',
      notes: `Missed call detected at ${new Date(timestamp).toLocaleString()}`
    });

    const call = {
      _id: lead._id,
      phone,
      contactName,
      type: 'missed',
      timestamp,
      status: 'pending',
      leadCreated: true,
      leadId: lead._id
    };

    res.json({ success: true, call });
  } catch (error) {
    console.error('Report missed call error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Start AI callback
// @route   POST /api/mobile/start-ai-call
// @access  Private
router.post('/start-ai-call', auth, async (req, res) => {
  try {
    const { phone, contactName } = req.body;

    // In production, this would trigger Twilio to call the number
    // with ElevenLabs AI agent

    // For now, simulate successful callback initiation
    console.log(`AI callback initiated for ${phone}`);

    res.json({
      success: true,
      message: 'AI callback initiated',
      phone,
      contactName,
      callId: Date.now().toString()
    });
  } catch (error) {
    console.error('Start AI call error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get call history
// @route   GET /api/mobile/call-history
// @access  Public (for testing) - TODO: Add auth in production
router.get('/call-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // For testing without auth, get all call leads
    // In production, filter by req.user.id
    const userId = req.user?.id;

    const leads = await Lead.find({
      ...(userId && { user: userId }),
      source: 'call'
    })
    .sort({ createdAt: -1 })
    .limit(limit);

    const calls = leads.map(lead => ({
      _id: lead._id,
      phone: lead.phone,
      contactName: lead.name,
      type: 'ai_handled',
      duration: 120, // Mock duration
      transcript: lead.notes,
      aiConfidence: 85,
      leadCreated: true,
      leadId: lead._id,
      timestamp: lead.createdAt,
      status: 'completed'
    }));

    res.json({ success: true, calls });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get recent missed calls
// @route   GET /api/mobile/recent-missed-calls
// @access  Private
router.get('/recent-missed-calls', auth, async (req, res) => {
  try {
    // This would check for new missed calls in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentLeads = await Lead.find({
      user: req.user.id,
      source: 'call',
      status: 'new',
      createdAt: { $gte: oneHourAgo }
    }).limit(5);

    const calls = recentLeads.map(lead => ({
      _id: lead._id,
      phone: lead.phone,
      contactName: lead.name,
      timestamp: lead.createdAt
    }));

    res.json({ success: true, calls });
  } catch (error) {
    console.error('Get recent missed calls error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Process incoming SMS
// @route   POST /api/mobile/sms-received
// @access  Private
router.post('/sms-received', auth, async (req, res) => {
  try {
    const { phone, message, timestamp } = req.body;

    // Find or create lead
    let lead = await Lead.findOne({ user: req.user.id, phone });

    if (!lead) {
      lead = await Lead.create({
        user: req.user.id,
        name: 'SMS Lead',
        phone,
        source: 'sms',
        status: 'new',
        notes: `SMS: ${message}`
      });
    } else {
      lead.notes = (lead.notes || '') + `\n\nSMS (${new Date(timestamp).toLocaleString()}): ${message}`;
      await lead.save();
    }

    // Generate AI reply
    const aiReply = generateSMSReply(message);

    res.json({
      success: true,
      aiReply,
      leadId: lead._id,
      leadCreated: !lead.notes.includes('SMS:')
    });
  } catch (error) {
    console.error('Process SMS error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Send SMS reply
// @route   POST /api/mobile/sms-reply
// @access  Private
router.post('/sms-reply', auth, async (req, res) => {
  try {
    const { phone, message, aiGenerated, timestamp } = req.body;

    // Log the reply to the lead
    const lead = await Lead.findOne({ user: req.user.id, phone });

    if (lead) {
      lead.notes = (lead.notes || '') + `\n\nReply (${new Date(timestamp).toLocaleString()}): ${message}`;
      if (aiGenerated) {
        lead.notes += ' [AI Generated]';
      }
      await lead.save();
    }

    res.json({ success: true, message: 'SMS logged' });
  } catch (error) {
    console.error('SMS reply error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get SMS threads
// @route   GET /api/mobile/sms-threads
// @access  Public (for testing) - TODO: Add auth in production
router.get('/sms-threads', async (req, res) => {
  try {
    // For testing without auth, get all SMS leads
    // In production, filter by req.user.id
    const userId = req.user?.id;

    const leads = await Lead.find({
      ...(userId && { user: userId }),
      source: 'sms'
    })
    .sort({ updatedAt: -1 })
    .limit(50);

    const threads = leads.map(lead => ({
      phone: lead.phone,
      contactName: lead.name,
      lastMessage: getLastMessage(lead.notes),
      lastMessageTime: lead.updatedAt,
      unreadCount: 0,
      messages: parseMessages(lead.notes)
    }));

    res.json({ success: true, threads });
  } catch (error) {
    console.error('Get SMS threads error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get mobile stats
// @route   GET /api/mobile/stats
// @access  Public (for testing) - TODO: Add auth in production
router.get('/stats', async (req, res) => {
  try {
    // For testing without auth, get stats for all users
    // In production, this should require auth and filter by req.user.id
    const totalLeads = await Lead.countDocuments({});
    const callLeads = await Lead.countDocuments({ source: 'call' });
    const smsLeads = await Lead.countDocuments({ source: 'sms' });
    const wonLeads = await Lead.countDocuments({ status: 'won' });

    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    const stats = {
      calls: callLeads,
      messages: smsLeads,
      leads: totalLeads,
      conversionRate: `${conversionRate}%`,
      activeLeads: await Lead.countDocuments({
        status: { $in: ['new', 'contacted', 'qualified'] }
      })
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get recent CRM activity
// @route   GET /api/mobile/recent-activity
// @access  Public (for testing)
router.get('/recent-activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const activity = [];

    // Get recent leads
    const recentLeads = await Lead.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name phone source status createdAt');

    for (const lead of recentLeads) {
      const timeAgo = getTimeAgo(lead.createdAt);
      activity.push({
        type: lead.source === 'call' ? 'call' : lead.source === 'sms' ? 'message' : 'lead',
        title: `New ${lead.source === 'call' ? 'call' : lead.source === 'sms' ? 'message' : 'lead'} from ${lead.name}`,
        description: `${lead.phone} • Status: ${lead.status}`,
        timeAgo,
        timestamp: lead.createdAt
      });
    }

    // Sort by timestamp
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, activity: activity.slice(0, limit) });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Helper function to format time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

// @desc    Get all leads (for mobile app testing)
// @route   GET /api/mobile/leads
// @access  Public (for testing) - TODO: Add auth in production
router.get('/leads', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const leads = await Lead.find({})
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, leads });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Helper functions
function generateSMSReply(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('quote')) {
    return "Thanks for your interest! I'd be happy to provide a quote. Could you tell me more about your project? What type of work are you looking to have done?";
  }

  if (lowerMessage.includes('available') || lowerMessage.includes('schedule')) {
    return "I have availability this week. What days work best for you? I can typically schedule consultations Monday-Friday between 9 AM and 5 PM.";
  }

  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return "You're welcome! Let me know if you have any other questions. I'm here to help!";
  }

  return "Thanks for reaching out! I'd be happy to help. Could you provide more details about what you're looking for?";
}

function getLastMessage(notes) {
  if (!notes) return '';
  const messages = notes.split('\n').filter(line => line.includes('SMS:') || line.includes('Reply:'));
  return messages.length > 0 ? messages[messages.length - 1].replace(/SMS:|Reply:|\[.*?\]/g, '').trim() : '';
}

function parseMessages(notes) {
  if (!notes) return [];

  const lines = notes.split('\n');
  const messages = [];

  lines.forEach(line => {
    if (line.includes('SMS:')) {
      const content = line.substring(line.indexOf('SMS:') + 4).trim();
      messages.push({
        _id: Date.now().toString(),
        type: 'incoming',
        content,
        timestamp: new Date().toISOString(),
        aiGenerated: false,
        status: 'read'
      });
    } else if (line.includes('Reply:')) {
      const content = line.substring(line.indexOf('Reply:') + 6).replace(/\[.*?\]/g, '').trim();
      const aiGenerated = line.includes('[AI Generated]');
      messages.push({
        _id: Date.now().toString(),
        type: 'outgoing',
        content,
        timestamp: new Date().toISOString(),
        aiGenerated,
        status: 'sent'
      });
    }
  });

  return messages;
}

// ============================================
// CONTACT MANAGEMENT ENDPOINTS
// ============================================

// @desc    Get all contacts
// @route   GET /api/mobile/contacts
// @access  Private
router.get('/contacts', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const contacts = await Contact.find({
      user: userId,
      isDeleted: false
    })
    .sort({ name: 1 })
    .limit(500);

    res.json({
      success: true,
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get single contact by ID
// @route   GET /api/mobile/contacts/:id
// @access  Private
router.get('/contacts/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contact = await Contact.findOne({
      _id: req.params.id,
      user: userId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({ success: true, contact });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create new contact
// @route   POST /api/mobile/contacts
// @access  Private
router.post('/contacts', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, email, company, notes } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Check if contact with same phone already exists
    const existingContact = await Contact.findOne({
      user: userId,
      phone,
      isDeleted: false
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'A contact with this phone number already exists'
      });
    }

    // Create contact
    const contact = await Contact.create({
      user: userId,
      name,
      phone,
      email: email || undefined,
      company: company || undefined,
      notes: notes || undefined,
      importSource: 'manual'
    });

    res.status(201).json({
      success: true,
      contact,
      message: 'Contact created successfully'
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Update contact
// @route   PUT /api/mobile/contacts/:id
// @access  Private
router.put('/contacts/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, email, company, notes } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Find contact
    const contact = await Contact.findOne({
      _id: req.params.id,
      user: userId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Check if phone is being changed to one that already exists
    if (phone !== contact.phone) {
      const existingContact = await Contact.findOne({
        user: userId,
        phone,
        isDeleted: false,
        _id: { $ne: req.params.id }
      });

      if (existingContact) {
        return res.status(400).json({
          success: false,
          message: 'A contact with this phone number already exists'
        });
      }
    }

    // Update contact
    contact.name = name;
    contact.phone = phone;
    contact.email = email || undefined;
    contact.company = company || undefined;
    contact.notes = notes || undefined;

    await contact.save();

    res.json({
      success: true,
      contact,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Delete contact (soft delete)
// @route   DELETE /api/mobile/contacts/:id
// @access  Private
router.delete('/contacts/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: userId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Soft delete
    contact.isDeleted = true;
    await contact.save();

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Bulk import contacts
// @route   POST /api/mobile/contacts/import
// @access  Private
router.post('/contacts/import', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Contacts array is required'
      });
    }

    const importBatchId = Date.now().toString();
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    // Process each contact
    for (const contactData of contacts) {
      try {
        // Skip if missing required fields
        if (!contactData.name || !contactData.phone) {
          results.skipped++;
          continue;
        }

        // Check if contact already exists
        const existing = await Contact.findOne({
          user: userId,
          phone: contactData.phone,
          isDeleted: false
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create contact
        await Contact.create({
          user: userId,
          name: contactData.name,
          phone: contactData.phone,
          email: contactData.email || undefined,
          company: contactData.company || undefined,
          notes: contactData.notes || undefined,
          importSource: 'phone',
          importBatchId
        });

        results.imported++;
      } catch (err) {
        results.errors.push({
          contact: contactData.name,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors,
      message: `Successfully imported ${results.imported} contact(s). ${results.skipped} skipped (duplicates or invalid).`
    });
  } catch (error) {
    console.error('Import contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Search contacts
// @route   GET /api/mobile/contacts/search/:query
// @access  Private
router.get('/contacts/search/:query', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.params;

    const contacts = await Contact.searchContacts(userId, query);

    res.json({
      success: true,
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Search contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Add conversation to contact
// @route   POST /api/mobile/contacts/:id/conversation
// @access  Private
router.post('/contacts/:id/conversation', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, direction, content, metadata } = req.body;

    if (!type || !direction || !content) {
      return res.status(400).json({
        success: false,
        message: 'Type, direction, and content are required'
      });
    }

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: userId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await contact.addConversation(type, direction, content, metadata);

    res.json({
      success: true,
      contact,
      message: 'Conversation added successfully'
    });
  } catch (error) {
    console.error('Add conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// ARIA-CONTACTS INTEGRATION ENDPOINTS
// ============================================

// @desc    Get contacts summary for Aria (simplified format)
// @route   GET /api/mobile/aria/contacts
// @access  Private
router.get('/aria/contacts', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 100;

    const contacts = await Contact.find({
      user: userId,
      isDeleted: false
    })
    .select('name phone email company tags lastInteraction lastInteractionType')
    .sort({ lastInteraction: -1, name: 1 })
    .limit(limit);

    // Format for Aria's context
    const ariaContacts = contacts.map(c => ({
      name: c.name,
      phone: c.phone,
      email: c.email,
      company: c.company,
      tags: c.tags,
      lastContact: c.lastInteraction ? new Date(c.lastInteraction).toLocaleDateString() : 'Never'
    }));

    res.json({
      success: true,
      contacts: ariaContacts,
      count: ariaContacts.length,
      summary: `You have ${ariaContacts.length} contacts in your CRM.`
    });
  } catch (error) {
    console.error('Get aria contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Search contacts for Aria (by name, phone, or company)
// @route   GET /api/mobile/aria/contacts/search
// @access  Private
router.get('/aria/contacts/search', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = req.query.q || '';

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const contacts = await Contact.find({
      user: userId,
      isDeleted: false,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { company: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name phone email company notes tags lastInteraction conversationHistory')
    .limit(10);

    const results = contacts.map(c => ({
      id: c._id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      company: c.company,
      notes: c.notes,
      tags: c.tags,
      lastContact: c.lastInteraction ? new Date(c.lastInteraction).toLocaleDateString() : 'Never',
      recentHistory: c.conversationHistory?.slice(-3) || []
    }));

    res.json({
      success: true,
      contacts: results,
      count: results.length,
      summary: results.length > 0
        ? `Found ${results.length} contact(s) matching "${query}": ${results.map(c => c.name).join(', ')}`
        : `No contacts found matching "${query}"`
    });
  } catch (error) {
    console.error('Search aria contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get contact details by phone for Aria
// @route   GET /api/mobile/aria/contacts/by-phone/:phone
// @access  Private
router.get('/aria/contacts/by-phone/:phone', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const phone = req.params.phone;

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');

    const contact = await Contact.findOne({
      user: userId,
      isDeleted: false,
      $or: [
        { phone: phone },
        { phone: { $regex: normalizedPhone } }
      ]
    });

    if (!contact) {
      return res.json({
        success: true,
        found: false,
        message: `No contact found with phone ${phone}`
      });
    }

    res.json({
      success: true,
      found: true,
      contact: {
        id: contact._id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
        notes: contact.notes,
        tags: contact.tags,
        lastInteraction: contact.lastInteraction,
        totalCalls: contact.totalCalls,
        totalSMS: contact.totalSMS,
        recentHistory: contact.conversationHistory?.slice(-5) || []
      }
    });
  } catch (error) {
    console.error('Get contact by phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create contact from Aria conversation
// @route   POST /api/mobile/aria/contacts
// @access  Private
router.post('/aria/contacts', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, email, company, notes, source } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Check for existing contact
    const existing = await Contact.findOne({
      user: userId,
      phone: phone,
      isDeleted: false
    });

    if (existing) {
      return res.json({
        success: true,
        created: false,
        message: `Contact already exists: ${existing.name}`,
        contact: existing
      });
    }

    const contact = await Contact.create({
      user: userId,
      name,
      phone,
      email,
      company,
      notes,
      importSource: source || 'aria',
      tags: ['aria-created']
    });

    res.status(201).json({
      success: true,
      created: true,
      contact,
      message: `Contact "${name}" created successfully`
    });
  } catch (error) {
    console.error('Create aria contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Add note to contact from Aria
// @route   POST /api/mobile/aria/contacts/:id/note
// @access  Private
router.post('/aria/contacts/:id/note', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const contact = await Contact.findOne({
      _id: req.params.id,
      user: userId,
      isDeleted: false
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Add to conversation history as a note
    await contact.addConversation('note', 'outgoing', note, {
      source: 'aria',
      timestamp: new Date().toISOString()
    });

    // Also append to notes field
    contact.notes = contact.notes
      ? `${contact.notes}\n\n[Aria ${new Date().toLocaleDateString()}]: ${note}`
      : `[Aria ${new Date().toLocaleDateString()}]: ${note}`;

    await contact.save();

    res.json({
      success: true,
      message: `Note added to ${contact.name}'s record`,
      contact
    });
  } catch (error) {
    console.error('Add aria note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Import calendar events
// @route   POST /api/mobile/calendar/import
// @access  Private
router.post('/calendar/import', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No events provided'
      });
    }

    let imported = 0;
    const errors = [];

    for (const event of events) {
      try {
        // Check if appointment already exists (by title and start time)
        const existing = await Appointment.findOne({
          userId,
          title: event.title,
          startTime: new Date(event.startDate)
        });

        if (existing) {
          console.log(`Skipping duplicate event: ${event.title}`);
          continue;
        }

        // Calculate duration in minutes
        const startTime = new Date(event.startDate);
        const endTime = new Date(event.endDate);
        const duration = Math.round((endTime - startTime) / 60000);

        // Try to find contact by location or notes
        let leadId = null;
        if (event.location || event.notes) {
          // Simple search for phone number in location or notes
          const searchText = `${event.location || ''} ${event.notes || ''}`;
          const phoneMatch = searchText.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);

          if (phoneMatch) {
            const lead = await Lead.findOne({
              user: userId,
              $or: [
                { phone: phoneMatch[0] },
                { phoneNumber: phoneMatch[0] }
              ]
            });
            if (lead) leadId = lead._id;
          }
        }

        // Create appointment data
        const appointmentData = {
          userId,
          title: event.title,
          description: event.notes || event.location || '',
          type: 'meeting',
          startTime,
          endTime,
          location: event.location || '',
          status: new Date() > startTime ? 'completed' : 'scheduled',
          notes: `Imported from calendar. ${event.notes || ''}`,
          aiScheduled: false,
          reminderSent: new Date() > startTime,
          metadata: {
            imported: true,
            importDate: new Date(),
            originalEventId: event.id
          }
        };

        // Only add leadId if we found one
        if (leadId) {
          appointmentData.leadId = leadId;
        }

        const appointment = await Appointment.create(appointmentData);

        imported++;
      } catch (err) {
        console.error(`Error importing event ${event.title}:`, err);
        errors.push({ title: event.title, error: err.message });
      }
    }

    res.json({
      success: true,
      imported,
      total: events.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} of ${events.length} events`
    });
  } catch (error) {
    console.error('Calendar import error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get calendar events
// @route   GET /api/mobile/calendar-events
// @access  Private
router.get('/calendar-events', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, upcoming = true } = req.query;

    const query = { userId };

    // If upcoming, only get future events
    if (upcoming === 'true' || upcoming === true) {
      query.startTime = { $gte: new Date() };
    }

    const events = await Appointment.find(query)
      .sort({ startTime: 1 })
      .limit(parseInt(limit))
      .lean();

    // Format events for the frontend
    const formattedEvents = events.map(event => ({
      id: event._id,
      title: event.title,
      startDate: event.startTime,
      endDate: event.endTime,
      location: event.location,
      notes: event.notes || event.description,
      type: event.type,
      status: event.status
    }));

    res.json({
      success: true,
      events: formattedEvents,
      count: formattedEvents.length
    });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ============================================
// GOOGLE SYNC ENDPOINTS
// ============================================

// @desc    Get Google integration status
// @route   GET /api/mobile/google/status
// @access  Private
router.get('/google/status', auth, async (req, res) => {
  try {
    const status = await googleSyncService.getIntegrationStatus(req.user.id);
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('Get Google status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Sync Google Contacts
// @route   POST /api/mobile/google/sync/contacts
// @access  Private
router.post('/google/sync/contacts', auth, async (req, res) => {
  try {
    const result = await googleSyncService.syncContacts(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Google Contacts sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync contacts'
    });
  }
});

// @desc    Sync Google Calendar
// @route   POST /api/mobile/google/sync/calendar
// @access  Private
router.post('/google/sync/calendar', auth, async (req, res) => {
  try {
    const { timeMin, timeMax } = req.body;
    const result = await googleSyncService.syncCalendarEvents(req.user.id, { timeMin, timeMax });
    res.json(result);
  } catch (error) {
    console.error('Google Calendar sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync calendar'
    });
  }
});

// @desc    Create Google Calendar event
// @route   POST /api/mobile/google/calendar/event
// @access  Private
router.post('/google/calendar/event', auth, async (req, res) => {
  try {
    const { title, description, startTime, endTime, location, attendees, timezone } = req.body;

    if (!title || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'Title and start time are required'
      });
    }

    const result = await googleSyncService.createCalendarEvent(req.user.id, {
      title,
      description,
      startTime,
      endTime: endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000),
      location,
      attendees,
      timezone
    });

    res.json(result);
  } catch (error) {
    console.error('Create Google event error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create calendar event'
    });
  }
});

// @desc    Get recent Gmail messages
// @route   GET /api/mobile/google/gmail/recent
// @access  Private
router.get('/google/gmail/recent', auth, async (req, res) => {
  try {
    const { maxResults, query } = req.query;
    const result = await googleSyncService.getRecentEmails(req.user.id, {
      maxResults: parseInt(maxResults) || 20,
      query
    });
    res.json(result);
  } catch (error) {
    console.error('Get Gmail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch emails'
    });
  }
});

// @desc    Send email via Gmail
// @route   POST /api/mobile/google/gmail/send
// @access  Private
router.post('/google/gmail/send', auth, async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'To, subject, and body are required'
      });
    }

    const result = await googleSyncService.sendEmail(req.user.id, { to, subject, body });
    res.json(result);
  } catch (error) {
    console.error('Send Gmail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send email'
    });
  }
});

// @desc    Disconnect Google integration
// @route   POST /api/mobile/google/disconnect
// @access  Private
router.post('/google/disconnect', auth, async (req, res) => {
  try {
    const result = await googleSyncService.disconnectGoogle(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Disconnect Google error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to disconnect Google'
    });
  }
});

// @desc    Full sync (contacts + calendar)
// @route   POST /api/mobile/google/sync/all
// @access  Private
router.post('/google/sync/all', auth, async (req, res) => {
  try {
    const results = {
      contacts: null,
      calendar: null
    };

    // Try contacts sync
    try {
      results.contacts = await googleSyncService.syncContacts(req.user.id);
    } catch (err) {
      results.contacts = { success: false, error: err.message };
    }

    // Try calendar sync
    try {
      results.calendar = await googleSyncService.syncCalendarEvents(req.user.id);
    } catch (err) {
      results.calendar = { success: false, error: err.message };
    }

    res.json({
      success: true,
      results,
      message: 'Sync completed'
    });
  } catch (error) {
    console.error('Full Google sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete sync'
    });
  }
});

export default router;
