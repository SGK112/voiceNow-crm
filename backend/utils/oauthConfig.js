/**
 * OAuth Configuration Utility
 * Centralized configuration for OAuth redirect URIs across all services
 *
 * This ensures consistent OAuth URLs in both development and production:
 * - Development: Uses WEBHOOK_BASE_URL (production) for reliable OAuth callbacks
 *   since ngrok free tier blocks programmatic redirects
 * - Production: Uses WEBHOOK_BASE_URL (Render URL)
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Get the base URL for OAuth callbacks
 * IMPORTANT: Always use the production/stable URL for OAuth
 * because OAuth providers redirect to this URL programmatically
 * and ngrok free tier blocks such requests
 */
export const getOAuthBaseUrl = () => {
  // For OAuth, we ALWAYS want to use a stable, publicly accessible URL
  // This avoids issues with ngrok's interstitial page blocking OAuth callbacks

  // Priority order:
  // 1. OAUTH_REDIRECT_BASE - explicit OAuth URL override
  // 2. WEBHOOK_BASE_URL - production URL (Render)
  // 3. WEBHOOK_URL - development tunnel (ngrok) - may have issues
  // 4. API_URL - local development

  return process.env.OAUTH_REDIRECT_BASE
    || process.env.WEBHOOK_BASE_URL
    || process.env.WEBHOOK_URL
    || process.env.API_URL
    || 'http://localhost:5001';
};

/**
 * Get OAuth redirect URIs for different services
 */
export const getOAuthRedirectUri = (service) => {
  const baseUrl = getOAuthBaseUrl();

  const redirectPaths = {
    // Google OAuth for mobile app (sync contacts/calendar)
    'google-mobile': '/api/mobile/auth/google/callback',

    // Google OAuth for web (login/signup)
    'google-web': '/api/auth/google/callback',

    // Shopify OAuth
    'shopify': '/api/shopify/auth/callback',

    // QuickBooks OAuth
    'quickbooks': '/api/quickbooks/callback',

    // Slack OAuth
    'slack': '/api/slack/oauth/callback',

    // Facebook/Instagram OAuth
    'facebook': '/api/integrations/facebook/callback',
  };

  const path = redirectPaths[service];
  if (!path) {
    throw new Error(`Unknown OAuth service: ${service}`);
  }

  return `${baseUrl}${path}`;
};

/**
 * Get all configured OAuth redirect URIs (for documentation)
 */
export const getAllOAuthRedirectUris = () => {
  const baseUrl = getOAuthBaseUrl();

  return {
    environment: isProduction ? 'production' : 'development',
    baseUrl,
    redirectUris: {
      googleMobile: `${baseUrl}/api/mobile/auth/google/callback`,
      googleWeb: `${baseUrl}/api/auth/google/callback`,
      shopify: `${baseUrl}/api/shopify/auth/callback`,
      quickbooks: `${baseUrl}/api/quickbooks/callback`,
      slack: `${baseUrl}/api/slack/oauth/callback`,
      facebook: `${baseUrl}/api/integrations/facebook/callback`,
    }
  };
};

/**
 * Log OAuth configuration on startup (for debugging)
 */
export const logOAuthConfig = () => {
  const config = getAllOAuthRedirectUris();
  console.log('🔐 OAuth Configuration:');
  console.log(`   Environment: ${config.environment}`);
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log('   Redirect URIs:');
  Object.entries(config.redirectUris).forEach(([key, uri]) => {
    console.log(`     - ${key}: ${uri}`);
  });
};

export default {
  getOAuthBaseUrl,
  getOAuthRedirectUri,
  getAllOAuthRedirectUris,
  logOAuthConfig
};
