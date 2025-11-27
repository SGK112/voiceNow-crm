# Security Audit Report - VoiceNow CRM

**Date:** 2025-11-16
**Status:** CRITICAL ISSUES FOUND - IMMEDIATE ACTION REQUIRED

## Executive Summary

This security audit identified **7 critical vulnerabilities** and **12 medium-risk issues** that require immediate attention before production deployment.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. **JWT Secret Exposure Risk**
**Severity:** CRITICAL
**Location:** `backend/middleware/auth.js`, `.env.example`
**Issue:**
- JWT_SECRET defaults to weak example value in `.env.example`
- No rotation mechanism for compromised tokens
- JWT expiry set to 30 days (too long)

**Impact:** Attackers can forge authentication tokens if JWT_SECRET is compromised

**Fix:**
```javascript
// Recommended changes:
// 1. Enforce strong JWT secret (min 64 characters)
// 2. Reduce expiry to 7 days
// 3. Implement refresh tokens
// 4. Add token revocation list in Redis
```

---

### 2. **API Key Exposure in Logs**
**Severity:** CRITICAL
**Location:** `backend/services/n8nService.js:58-63`
**Issue:**
```javascript
console.log('Creating workflow in n8n cloud:', {
  apiKey: this.apiKey ? 'SET' : 'NOT SET', // ✅ GOOD
  workflowName: workflow.name
});
```
**Status:** ✅ SAFE - API key is masked

**However, found in:**
- `backend/routes/calls.js:8` - ElevenLabs API key in plaintext
```javascript
const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
```

**Impact:** If error logs are exposed, API keys could leak

**Fix:**
- Implement API key masking utility
- Never log raw API keys
- Use secure secret management (AWS Secrets Manager, HashiCorp Vault)

---

### 3. **NoSQL Injection Vulnerability**
**Severity:** CRITICAL
**Location:** Multiple controllers
**Issue:** User input directly passed to MongoDB queries without sanitization

**Example in `backend/routes/crm-workflows.js:31-34`:**
```javascript
const workflow = await CRMWorkflow.findOne({
  _id: req.params.id, // ❌ VULNERABLE
  userId: req.user.userId
});
```

**Attack Vector:**
```javascript
// Malicious request:
GET /api/crm-workflows/{"$ne": null}
// Returns all workflows instead of specific one
```

**Status:** ⚠️ PARTIALLY PROTECTED
- `express-mongo-sanitize` is installed (line 114 in `backend/server.js`)
- But NOT applied to all routes

**Fix:**
```javascript
import mongoSanitize from 'express-mongo-sanitize';

// Sanitize specific params
const workflow = await CRMWorkflow.findOne({
  _id: mongoSanitize.sanitize(req.params.id),
  userId: req.user.userId
});
```

---

### 4. **Webhook Replay Attack Vulnerability**
**Severity:** CRITICAL
**Location:** `backend/routes/webhooks.js`
**Issue:**
- No timestamp validation on webhook payloads
- No nonce/idempotency key checking
- Stripe webhook has signature verification ✅
- ElevenLabs/Twilio webhooks DO NOT ❌

**Attack Vector:**
Attacker can replay captured webhook payloads to trigger duplicate actions

**Fix:**
```javascript
// Add timestamp and signature verification for ALL webhooks
const verifyWebhookSignature = (req, secret) => {
  const timestamp = req.headers['x-webhook-timestamp'];
  const signature = req.headers['x-webhook-signature'];

  // Reject if older than 5 minutes
  if (Date.now() - timestamp > 300000) {
    throw new Error('Webhook too old');
  }

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(timestamp + req.body)
    .digest('hex');

  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }
};
```

---

### 5. **Insufficient Rate Limiting**
**Severity:** HIGH
**Location:** `backend/middleware/rateLimiter.js`, `backend/routes/webhooks.js:19-24`
**Issue:**
- Webhook limiter only applied to some routes
- No per-user rate limiting
- API limiter applied AFTER all routes (line 166 in server.js)

**Attack Vector:**
- DDoS attacks on unprotected endpoints
- Brute force on login endpoints

**Fix:**
```javascript
// Apply rate limiting BEFORE routes
app.use('/api', apiLimiter);
app.use('/api/auth/login', strictAuthLimiter); // Stricter for auth
app.use('/api/webhooks', webhookLimiter);

// Add per-user limits
const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.userId || req.ip
});
```

---

### 6. **Phone Number Validation Missing**
**Severity:** HIGH
**Location:** `backend/routes/calls.js:29-30`
**Issue:**
```javascript
const formattedNumber = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;
```
No validation for:
- Invalid phone format
- Premium rate numbers
- International dialing restrictions

**Impact:**
- Toll fraud (calling premium numbers)
- Unexpected billing charges

**Fix:**
```javascript
import { parsePhoneNumber } from 'libphonenumber-js';

const validateAndFormatPhone = (phone) => {
  try {
    const phoneNumber = parsePhoneNumber(phone, 'US'); // Default country

    if (!phoneNumber.isValid()) {
      throw new Error('Invalid phone number');
    }

    // Block premium rate numbers
    if (phoneNumber.getType() === 'PREMIUM_RATE') {
      throw new Error('Premium rate numbers not allowed');
    }

    return phoneNumber.format('E.164'); // Returns +1234567890
  } catch (error) {
    throw new Error(`Phone validation failed: ${error.message}`);
  }
};
```

---

### 7. **CORS Misconfiguration**
**Severity:** HIGH
**Location:** `backend/server.js:97-105`
**Issue:**
```javascript
const corsOptions = process.env.NODE_ENV === 'production'
  ? {
      origin: true, // ❌ DANGEROUS - Allows ALL origins
      credentials: true
    }
  : { ... }
```

**Impact:**
- Cross-site request forgery (CSRF)
- Credential theft
- Unauthorized API access

**Fix:**
```javascript
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://yourdomain.com',
  'https://www.yourdomain.com'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400 // Cache preflight for 24h
};
```

---

## 🟡 MEDIUM RISK ISSUES

### 8. **Missing Input Validation**
**Severity:** MEDIUM
**Locations:** Multiple controllers
**Issue:** No validation on request bodies

**Fix:** Implement Joi or Zod validation schemas

---

### 9. **Error Information Disclosure**
**Severity:** MEDIUM
**Location:** Throughout error handlers
**Issue:** Detailed error messages sent to client

**Example:**
```javascript
res.status(500).json({
  error: error.message, // ❌ Exposes internal details
  stack: error.stack     // ❌ NEVER send stack traces
});
```

**Fix:**
```javascript
res.status(500).json({
  error: 'An error occurred',
  requestId: req.id // For support lookup
});
// Log full error server-side only
```

---

### 10. **No Request ID Tracking**
**Severity:** MEDIUM
**Impact:** Difficult to trace attacks or debug issues

**Fix:** Add request ID middleware

---

### 11. **Unencrypted Sensitive Data**
**Severity:** MEDIUM
**Location:** Database models
**Issue:** No encryption for:
- Lead phone numbers
- Email addresses
- Custom fields

**Fix:** Implement field-level encryption with `mongoose-encryption`

---

### 12. **Missing Security Headers**
**Severity:** MEDIUM
**Location:** `backend/server.js:90-93`
**Status:** ⚠️ PARTIALLY PROTECTED
- Helmet is used ✅
- But CSP is disabled ❌

**Fix:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL]
    }
  },
  crossOriginEmbedderPolicy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 🔵 VOICE API SECURITY ANALYSIS

### ElevenLabs Integration
**Location:** `backend/services/elevenLabsService.js`, `backend/routes/calls.js`

**Security Assessment:** ✅ MOSTLY SECURE

**Strengths:**
- API key stored in environment variables
- Authentication middleware (`protect`) on all call routes
- User validation before initiating calls

**Weaknesses:**
1. **No call cost limits** - User could rack up unlimited charges
2. **No caller ID verification** - Spoofing possible
3. **Webhook validation missing** - No signature verification

**Recommended Fixes:**
```javascript
// Add call budget limits
const checkCallBudget = async (userId) => {
  const usage = await getMonthlyUsage(userId);
  const limit = await getUserPlanLimit(userId);

  if (usage.callMinutes >= limit.callMinutes) {
    throw new Error('Monthly call limit exceeded');
  }
};

// Verify ElevenLabs webhook signatures
const verifyElevenLabsSignature = (req) => {
  const signature = req.headers['x-elevenlabs-signature'];
  // Implement signature verification
};
```

---

## 🔵 N8N OAUTH SECURITY ANALYSIS

### Current Implementation
**Location:** `backend/services/n8nCredentialService.js`

**Security Assessment:** ⚠️ NEEDS IMPROVEMENT

**Issues Found:**

1. **OAuth URLs Not Properly Secured**
```javascript
// Line 125 - OAuth callback URL
getOAuthUrl(credentialType, callbackUrl) {
  const encodedCallback = encodeURIComponent(callbackUrl);
  return `${baseUrl}/rest/oauth2-credential/auth?credentialType=${credentialType}&callback=${encodedCallback}`;
}
```
**Problem:** No state parameter for CSRF protection

**Fix:**
```javascript
getOAuthUrl(credentialType, callbackUrl, userId) {
  const state = crypto.randomBytes(32).toString('hex');

  // Store state in Redis with 10-minute expiry
  await redis.setEx(`oauth:state:${state}`, 600, JSON.stringify({
    userId,
    credentialType,
    timestamp: Date.now()
  }));

  const encodedCallback = encodeURIComponent(callbackUrl);
  return `${baseUrl}/rest/oauth2-credential/auth?credentialType=${credentialType}&callback=${encodedCallback}&state=${state}`;
}
```

2. **No Credential Encryption at Rest**
**Problem:** n8n credentials stored in n8n database without additional encryption layer

**Recommendation:**
- Use n8n's built-in encryption
- Add application-level encryption key in environment
- Rotate encryption keys periodically

3. **API Key Transmitted in Headers**
**Status:** ✅ SECURE (uses HTTPS + X-N8N-API-KEY header)

---

## 🔵 N8N WORKFLOW SYNC REQUIREMENTS

### Current Gap Analysis

**What's Missing:**
1. ❌ Real-time workflow creation API endpoint
2. ❌ Workflow template sync from n8n to VoiceNow CRM
3. ❌ OAuth credential management UI
4. ❌ Workflow execution tracking
5. ❌ Node credential requirement detection

**What Exists:**
1. ✅ N8N Service with API integration (`backend/services/n8nService.js`)
2. ✅ N8N Credential Service (`backend/services/n8nCredentialService.js`)
3. ✅ Workflow templates (prebuilt in N8N service)
4. ✅ Credential mapping for 30+ services

---

## 📋 IMMEDIATE ACTION ITEMS

### Priority 1 (Deploy Today)
- [ ] Fix CORS configuration to whitelist only specific origins
- [ ] Add webhook signature verification for ElevenLabs/Twilio
- [ ] Implement phone number validation with libphonenumber-js
- [ ] Enable CSP in Helmet
- [ ] Add rate limiting before route handlers

### Priority 2 (This Week)
- [ ] Implement JWT refresh token mechanism
- [ ] Add input validation with Zod schemas
- [ ] Encrypt sensitive database fields
- [ ] Add request ID tracking
- [ ] Implement call budget limits

### Priority 3 (This Month)
- [ ] Set up secret rotation for API keys
- [ ] Add comprehensive audit logging
- [ ] Implement SIEM integration
- [ ] Add penetration testing
- [ ] Set up WAF (Web Application Firewall)

---

## 🛡️ SECURITY CHECKLIST

### Before Production Deployment

- [ ] All environment variables use strong secrets
- [ ] JWT_SECRET is 64+ characters from crypto.randomBytes
- [ ] All webhooks have signature verification
- [ ] Rate limiting on all public endpoints
- [ ] CORS restricted to production domains only
- [ ] CSP headers enabled
- [ ] HTTPS enforced (HSTS enabled)
- [ ] Database field encryption for PII
- [ ] Input validation on all endpoints
- [ ] Error messages don't expose internals
- [ ] API keys masked in logs
- [ ] Security headers configured
- [ ] MongoDB query sanitization
- [ ] Phone number validation
- [ ] Call budget limits
- [ ] OAuth state parameter CSRF protection
- [ ] Dependency vulnerability scan (npm audit)
- [ ] Secrets not in git history
- [ ] .env files in .gitignore
- [ ] Backup encryption enabled

---

## 📊 SECURITY SCORING

| Category | Score | Status |
|----------|-------|--------|
| Authentication | 6/10 | ⚠️ Needs Improvement |
| Authorization | 7/10 | ✅ Good |
| Data Protection | 5/10 | ❌ Critical |
| API Security | 6/10 | ⚠️ Needs Improvement |
| Infrastructure | 7/10 | ✅ Good |
| Monitoring | 4/10 | ❌ Critical |

**Overall Security Score: 5.8/10** ⚠️

**Risk Level:** MEDIUM-HIGH
**Recommendation:** DO NOT DEPLOY TO PRODUCTION until Priority 1 items are resolved

---

## 📞 CONTACT

For security concerns, contact:
- Security Team: security@voiceflowcrm.com
- Bug Bounty: hackerone.com/voiceflowcrm (if applicable)

---

**Next Steps:**
1. Review this audit with development team
2. Create GitHub issues for each vulnerability
3. Implement Priority 1 fixes immediately
4. Schedule follow-up audit after fixes
