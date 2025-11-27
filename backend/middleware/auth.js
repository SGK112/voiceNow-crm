import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getRedisClient } from '../config/redis.js';
import errorReportingService from '../services/errorReportingService.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const redis = getRedisClient();
      if (redis) {
        const cachedUser = await redis.get(`user:${decoded.id}`);
        if (cachedUser) {
          req.user = JSON.parse(cachedUser);
          return next();
        }
      }

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (redis) {
        await redis.setEx(`user:${decoded.id}`, 3600, JSON.stringify(req.user));
      }

      next();
    } catch (error) {
      console.error(error);
      // Report auth errors to webhook (but rate-limit these as they can be frequent)
      await errorReportingService.reportError(error, {
        component: 'auth_middleware',
        action: `${req.method} ${req.path}`,
        input: {
          hasToken: !!token,
          tokenPrefix: token ? token.substring(0, 20) + '...' : 'none'
        },
        severity: 'warning'
      });
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const checkSubscription = (allowedPlans = []) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (req.user.subscriptionStatus !== 'active' && req.user.subscriptionStatus !== 'trialing') {
      return res.status(403).json({ message: 'Subscription required' });
    }

    if (allowedPlans.length > 0 && !allowedPlans.includes(req.user.plan)) {
      return res.status(403).json({ message: 'Upgrade plan to access this feature' });
    }

    next();
  };
};

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Optional auth - sets req.user if token present, but doesn't require it
export const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const redis = getRedisClient();
      if (redis) {
        const cachedUser = await redis.get(`user:${decoded.id}`);
        if (cachedUser) {
          req.user = JSON.parse(cachedUser);
          return next();
        }
      }

      req.user = await User.findById(decoded.id).select('-password');

      if (redis && req.user) {
        await redis.setEx(`user:${decoded.id}`, 3600, JSON.stringify(req.user));
      }
    } catch (error) {
      // Token invalid, but we don't fail - just continue without user
      console.log('Optional auth: token invalid or expired');
    }
  }

  next();
};
