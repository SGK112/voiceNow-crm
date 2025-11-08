/**
 * Environment Variable Validation Utility
 * Validates required environment variables on server startup
 */

const REQUIRED_ENV_VARS = {
  // Server
  NODE_ENV: 'development|production',
  PORT: 'number',
  CLIENT_URL: 'url',

  // Database
  MONGODB_URI: 'required',

  // Authentication
  JWT_SECRET: 'required',
  JWT_EXPIRE: 'required',

  // Email (Gmail SMTP)
  SMTP_HOST: 'required',
  SMTP_PORT: 'number',
  SMTP_USER: 'email',
  SMTP_PASSWORD: 'required',
  SMTP_FROM_EMAIL: 'email',
};

const OPTIONAL_ENV_VARS = {
  // Google OAuth (optional)
  GOOGLE_CLIENT_ID: 'string',
  GOOGLE_CLIENT_SECRET: 'string',

  // Stripe (optional for trial users)
  STRIPE_SECRET_KEY: 'string',
  STRIPE_WEBHOOK_SECRET: 'string',
  STRIPE_STARTER_PRICE_ID: 'string',
  STRIPE_PROFESSIONAL_PRICE_ID: 'string',
  STRIPE_ENTERPRISE_PRICE_ID: 'string',

  // ElevenLabs (optional, can be configured per user)
  ELEVENLABS_API_KEY: 'string',

  // Twilio (optional)
  TWILIO_ACCOUNT_SID: 'string',
  TWILIO_AUTH_TOKEN: 'string',
  TWILIO_PHONE_NUMBER: 'string',

  // N8N (optional)
  N8N_WEBHOOK_URL: 'url',
  N8N_API_KEY: 'string',

  // AWS S3 (optional)
  AWS_ACCESS_KEY_ID: 'string',
  AWS_SECRET_ACCESS_KEY: 'string',
  AWS_S3_BUCKET: 'string',
  AWS_REGION: 'string',
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function validateEnvVar(name, value, type) {
  if (!value || value.trim() === '') {
    return `${name} is required but not set`;
  }

  switch (type) {
    case 'number':
      if (isNaN(Number(value))) {
        return `${name} must be a number`;
      }
      break;

    case 'email':
      if (!isValidEmail(value)) {
        return `${name} must be a valid email address`;
      }
      break;

    case 'url':
      if (!isValidUrl(value)) {
        return `${name} must be a valid URL`;
      }
      break;

    case 'required':
      // Already checked above
      break;

    default:
      if (type.includes('|')) {
        const allowedValues = type.split('|');
        if (!allowedValues.includes(value)) {
          return `${name} must be one of: ${allowedValues.join(', ')}`;
        }
      }
  }

  return null;
}

export function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Check required variables
  for (const [name, type] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[name];
    const error = validateEnvVar(name, value, type);
    if (error) {
      errors.push(error);
    }
  }

  // Check optional variables (only warn if they exist but are invalid)
  for (const [name, type] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[name];
    if (value && value.trim() !== '') {
      const error = validateEnvVar(name, value, type);
      if (error) {
        warnings.push(error);
      }
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ ENVIRONMENT VALIDATION ERRORS:\n');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\n💡 Please check your .env file and ensure all required variables are set.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  ENVIRONMENT WARNINGS:\n');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  console.log('✅ Environment variables validated successfully\n');
}

export function getEnvSummary() {
  const summary = {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    database: process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing',
    redis: (process.env.REDIS_URL || (process.env.REDIS_HOST && process.env.REDIS_PORT)) ? '✅ Configured' : '❌ Missing',
    email: process.env.SMTP_USER ? '✅ Configured' : '❌ Missing',
    stripe: process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '⚠️  Optional',
    elevenlabs: process.env.ELEVENLABS_API_KEY ? '✅ Configured' : '⚠️  Optional',
    twilio: process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '⚠️  Optional',
    n8n: process.env.N8N_WEBHOOK_URL ? '✅ Configured' : '⚠️  Optional',
    googleAuth: process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '⚠️  Optional',
  };

  console.log('\n📋 ENVIRONMENT SUMMARY:');
  console.log('════════════════════════════════════════');
  Object.entries(summary).forEach(([key, value]) => {
    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    console.log(`${label.padEnd(20)} ${value}`);
  });
  console.log('════════════════════════════════════════\n');
}
