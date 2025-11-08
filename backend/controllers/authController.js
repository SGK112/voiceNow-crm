import User from '../models/User.js';
import Usage from '../models/Usage.js';
import { generateToken } from '../middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';
import emailService from '../services/emailService.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    await Usage.create({
      userId: user._id,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1)
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
    const { credential } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

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
      await Usage.create({
        userId: user._id,
        resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1)
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
