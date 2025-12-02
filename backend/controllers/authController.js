import User from '../models/User.js';
import Usage from '../models/Usage.js';
import { generateToken } from '../middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';
import emailService from '../services/emailService.js';
import twilio from 'twilio';
import crypto from 'crypto';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Initialize Twilio client
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset via SMS or Email
 * @body    { email, method: 'sms' | 'email', phone?: string }
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email, method = 'email', phone } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that user doesn't exist
      return res.json({
        message: `Password reset code sent via ${method}`,
        method
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the code before storing
    const hashedCode = crypto
      .createHash('sha256')
      .update(resetCode)
      .digest('hex');

    // Store hashed code and expiration (15 minutes)
    user.resetPasswordToken = hashedCode;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Update user's phone if provided
    if (phone && !user.phone) {
      user.phone = phone;
    }

    await user.save();

    // Send reset code via selected method
    if (method === 'sms') {
      // SMS via Twilio
      const phoneNumber = phone || user.phone;

      if (!phoneNumber) {
        return res.status(400).json({
          message: 'Phone number required for SMS. Please provide a phone number or use email method.'
        });
      }

      if (!twilioClient) {
        return res.status(503).json({
          message: 'SMS service unavailable. Please use email method.'
        });
      }

      try {
        // Use A2P compliant messaging service
        const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGa86452ccc15de86eee32177817a09d90';
        await twilioClient.messages.create({
          body: `Your VoiceNow CRM password reset code is: ${resetCode}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, please ignore this message.`,
          messagingServiceSid: messagingServiceSid,
          to: phoneNumber
        });

        console.log(`✅ Password reset SMS sent to ${phoneNumber}`);
      } catch (smsError) {
        console.error('SMS send error:', smsError);
        return res.status(500).json({
          message: 'Failed to send SMS. Please try email method.'
        });
      }
    } else {
      // Email via SMTP
      try {
        await emailService.sendPasswordResetEmail(user.email, resetCode, user.company);
        console.log(`✅ Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Email send error:', emailError);
        return res.status(500).json({
          message: 'Failed to send email. Please try SMS method or contact support.'
        });
      }
    }

    res.json({
      message: `Password reset code sent via ${method}`,
      method,
      expiresIn: '15 minutes'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

/**
 * @route   POST /api/auth/verify-reset-code
 * @desc    Verify the reset code before allowing password change
 * @body    { email, code }
 * @access  Public
 */
export const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    // Hash the provided code
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      email,
      resetPasswordToken: hashedCode,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset code'
      });
    }

    res.json({
      message: 'Code verified successfully',
      valid: true
    });

  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'Error verifying code' });
  }
};

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with verified code
 * @body    { email, code, newPassword }
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        message: 'Email, code, and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters'
      });
    }

    // Hash the provided code
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      email,
      resetPasswordToken: hashedCode,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset code'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate new token for automatic login
    const token = generateToken(user._id);

    // Send confirmation email
    emailService.sendPasswordChangedEmail(user.email, user.company).catch(err => {
      console.error('Failed to send password changed email:', err);
    });

    res.json({
      message: 'Password reset successful',
      token,
      user: {
        _id: user._id,
        email: user.email,
        company: user.company,
        plan: user.plan
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

export const signup = async (req, res) => {
  try {
    const { email, password, company } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      email,
      password,
      company,
      plan: 'trial',
      subscriptionStatus: 'trialing'
    });

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const planLimits = {
      trial: { minutes: 30, agents: 1 },
      starter: { minutes: 200, agents: 1 },
      professional: { minutes: 1000, agents: 5 },
      enterprise: { minutes: 5000, agents: Infinity }
    };
    const limits = planLimits[user.plan] || planLimits.trial;

    await Usage.create({
      userId: user._id,
      month,
      plan: user.plan,
      minutesIncluded: limits.minutes,
      agentsLimit: limits.agents
    });

    const token = generateToken(user._id);

    // Send welcome email (don't wait for it)
    emailService.sendWelcomeEmail(user.email, user.company).catch(err => {
      console.error('Failed to send welcome email:', err.message);
    });

    // Send NEW SIGNUP notification to sales team (don't wait for it)
    emailService.sendNewSignupNotification(user.email, user.company).catch(err => {
      console.error('Failed to send signup notification:', err.message);
    });

    // Send SMS notification for new signup (don't wait for it)
    if (twilioClient) {
      const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGa86452ccc15de86eee32177817a09d90';
      twilioClient.messages.create({
        body: `🎉 NEW SIGNUP!\n\nEmail: ${user.email}\nCompany: ${user.company || 'Not provided'}\nPlan: Trial\nTime: ${new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' })} MST`,
        messagingServiceSid: messagingServiceSid,
        to: '+16028337194' // Sales notification number
      }).then(() => {
        console.log('✅ Signup SMS notification sent');
      }).catch(err => {
        console.error('Failed to send signup SMS notification:', err.message);
      });
    }

    res.status(201).json({
      _id: user._id,
      email: user.email,
      company: user.company,
      plan: user.plan,
      profile: user.profile || {},
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.googleId && !user.password) {
      return res.status(401).json({ message: 'Please login with Google' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      email: user.email,
      company: user.company,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      profile: user.profile || {},
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ⚠️ DO NOT MODIFY - Google OAuth Handler (Working)
// This handles Google OAuth callback with proper timeout and error handling
// Timeout is set to 20s for Google API calls to prevent hanging
export const googleAuth = async (req, res) => {
  try {
    const { credential, tokenType } = req.body;
    console.log('🔐 Google Auth Request:', { tokenType, hasCredential: !!credential, hasCode: !!req.body.code });

    let googleId, email, name;

    if (tokenType === 'authorization_code') {
      // Handle authorization code from OAuth redirect flow
      const { code, redirectUri } = req.body;
      console.log('📝 Authorization code flow:', { hasCode: !!code, redirectUri });

      // ⚠️ DO NOT MODIFY - Google token exchange with timeout (Working)
      // 20s timeout prevents hanging when Google API is slow
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const tokens = await tokenResponse.json();
        console.log('🎫 Token exchange response:', {
          hasIdToken: !!tokens.id_token,
          hasAccessToken: !!tokens.access_token,
          error: tokens.error,
          errorDescription: tokens.error_description
        });

        if (!tokens.id_token) {
          console.error('❌ No ID token received:', tokens);
          return res.status(400).json({
            message: 'Failed to get ID token from Google',
            details: tokens.error_description || 'No additional details'
          });
        }

        // Verify the ID token
        const ticket = await googleClient.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        googleId = payload.sub;
        email = payload.email;
        name = payload.name;
      } catch (fetchError) {
        clearTimeout(timeout);
        console.error('❌ Google token exchange failed:', fetchError.message);
        return res.status(500).json({
          message: 'Failed to exchange authorization code with Google',
          details: fetchError.name === 'AbortError' ? 'Request timeout' : fetchError.message
        });
      }
    } else if (tokenType === 'access_token') {
      // Handle access token from popup flow (useGoogleLogin)
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${credential}` }
      });
      const userInfo = await response.json();
      googleId = userInfo.id;
      email = userInfo.email;
      name = userInfo.name;
    } else {
      // Handle ID token from iframe flow (GoogleLogin)
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
    }

    // SECURITY FIX: Strict user lookup to prevent data leakage between accounts
    // Always match ONLY by Google ID - never by email for Google OAuth
    let user = await User.findOne({ googleId });
    let isNewUser = false;

    if (!user) {
      // Check if an email/password account exists with this email
      const existingEmailUser = await User.findOne({ email, googleId: { $exists: false } });

      if (existingEmailUser) {
        // Link the existing email/password account to this Google account
        existingEmailUser.googleId = googleId;
        await existingEmailUser.save();
        user = existingEmailUser;
        console.log(`✅ Linked existing account ${email} to Google ID ${googleId}`);
      } else {
        // Create a new user for this Google account
        // If email already exists (from another Google account), make it unique
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
        console.log(`✅ Created new account for Google ID ${googleId} with email ${uniqueEmail}`);
      }

      // Only create usage record for brand new users
      if (isNewUser) {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const planLimits = {
          trial: { minutes: 30, agents: 1 },
          starter: { minutes: 200, agents: 1 },
          professional: { minutes: 1000, agents: 5 },
          enterprise: { minutes: 5000, agents: Infinity }
        };
        const limits = planLimits[user.plan] || planLimits.trial;

        await Usage.create({
          userId: user._id,
          month,
          plan: user.plan,
          minutesIncluded: limits.minutes,
          agentsLimit: limits.agents
        });
      }
    }

    const token = generateToken(user._id);

    console.log('✅ Google Auth successful:', { email: user.email, userId: user._id });
    res.json({
      _id: user._id,
      email: user.email,
      company: user.company,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      profile: user.profile || {},
      token
    });
  } catch (error) {
    console.error('❌ Google Auth Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    res.status(500).json({
      message: 'Google authentication failed',
      error: error.message
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile data
 * @access  Private
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('profile');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      profile: user.profile || {},
      message: 'Profile retrieved successfully'
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile', error: error.message });
  }
};

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile data (onboarding or later)
 * @body    { profile: {...profileData}, onboardingCompleted: true/false }
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const { profile: profileData } = req.body;

    if (!profileData) {
      return res.status(400).json({ message: 'Profile data is required' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Merge new profile data with existing profile
    const updatedProfile = {
      ...(user.profile || {}),
      ...profileData,
      lastUpdated: new Date()
    };

    // Mark onboarding as complete if all required fields are filled
    const isOnboardingComplete = !!(
      profileData.businessName &&
      profileData.industry &&
      profileData.firstName &&
      profileData.lastName &&
      profileData.primaryUseCase
    );

    if (isOnboardingComplete && !user.profile?.onboardingCompleted) {
      updatedProfile.onboardingCompleted = true;
      updatedProfile.completedAt = new Date();
    }

    // If user skipped onboarding, mark it
    if (profileData.onboardingSkipped) {
      updatedProfile.onboardingSkipped = true;
      updatedProfile.onboardingCompleted = false;
    }

    // Update user profile
    user.profile = updatedProfile;
    await user.save();

    console.log(`✅ Profile updated for user ${user.email}:`, {
      onboardingCompleted: updatedProfile.onboardingCompleted,
      skipped: updatedProfile.onboardingSkipped,
      businessName: updatedProfile.businessName,
      industry: updatedProfile.industry
    });

    res.json({
      profile: user.profile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};
