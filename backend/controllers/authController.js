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

    let googleId, email, name;

    if (tokenType === 'authorization_code') {
      // Handle authorization code from OAuth redirect flow
      const { code, redirectUri } = req.body;

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

      if (!tokens.id_token) {
        return res.status(400).json({ message: 'Failed to get ID token from Google' });
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

    res.json({
      _id: user._id,
      email: user.email,
      company: user.company,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      token
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: 'Google authentication failed' });
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

// Forgot Password - Send SMS with reset code
export const forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ message: 'Email or phone number required' });
    }

    // Find user by email or phone
    const query = email ? { email } : { phone };
    const user = await User.findOne(query);

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ message: 'If an account exists, a reset code has been sent' });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the reset code before storing
    const resetToken = crypto.createHash('sha256').update(resetCode).digest('hex');

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send reset code via SMS if phone is provided
    if (phone && twilioClient) {
      try {
        await twilioClient.messages.create({
          body: `Your VoiceFlow CRM password reset code is: ${resetCode}. This code expires in 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
      } catch (twilioError) {
        console.error('Twilio SMS Error:', twilioError);
        return res.status(500).json({ message: 'Failed to send SMS. Please try again.' });
      }
    } else {
      // Fallback to email
      try {
        await emailService.sendPasswordResetEmail(user.email, resetCode);
      } catch (emailError) {
        console.error('Email Error:', emailError);
        return res.status(500).json({ message: 'Failed to send reset code. Please try again.' });
      }
    }

    res.json({
      message: 'If an account exists, a reset code has been sent',
      method: phone ? 'sms' : 'email'
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

// Reset Password - Verify code and update password
export const resetPassword = async (req, res) => {
  try {
    const { email, phone, code, newPassword } = req.body;

    if (!code || !newPassword) {
      return res.status(400).json({ message: 'Reset code and new password required' });
    }

    if (!email && !phone) {
      return res.status(400).json({ message: 'Email or phone number required' });
    }

    // Hash the provided code to compare with stored hash
    const resetToken = crypto.createHash('sha256').update(code).digest('hex');

    // Find user with valid reset token
    const query = {
      resetPasswordToken: resetToken,
      resetPasswordExpire: { $gt: Date.now() }
    };

    if (email) {
      query.email = email;
    } else if (phone) {
      query.phone = phone;
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate new token for auto-login
    const token = generateToken(user._id);

    res.json({
      message: 'Password reset successful',
      token,
      _id: user._id,
      email: user.email,
      company: user.company,
      plan: user.plan
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};
