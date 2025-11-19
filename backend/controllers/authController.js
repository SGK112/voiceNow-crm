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
        await twilioClient.messages.create({
          body: `Your VoiceFlow CRM password reset code is: ${resetCode}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, please ignore this message.`,
          from: process.env.TWILIO_PHONE_NUMBER,
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

    res.status(201).json({
      _id: user._id,
      email: user.email,
      company: user.company,
      plan: user.plan,
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
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { credential, tokenType } = req.body;
    console.log('🔐 Google Auth Request:', { tokenType, hasCredential: !!credential, hasCode: !!req.body.code });

    let googleId, email, name;

    if (tokenType === 'authorization_code') {
      // Handle authorization code from OAuth redirect flow
      const { code, redirectUri } = req.body;
      console.log('📝 Authorization code flow:', { hasCode: !!code, redirectUri });

      // Exchange authorization code for tokens
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

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user && !user.googleId) {
      user.googleId = googleId;
      await user.save();
    } else if (!user) {
      user = await User.create({
        email,
        googleId,
        company: name || email.split('@')[0],
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
    }

    const token = generateToken(user._id);

    console.log('✅ Google Auth successful:', { email: user.email, userId: user._id });
    res.json({
      _id: user._id,
      email: user.email,
      company: user.company,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
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
