/**
 * Google OAuth Client ID Configuration
 *
 * WARNING: If you get "Error 401: deleted_client", the OAuth client ID is wrong!
 *
 * There are MULTIPLE OAuth clients - make sure you use the right one:
 * - Web App (VoiceFlow CRM V2): 710258787879-po32qt7v1cta0h0esrl0mle53vb8193a
 * - iOS App (VoiceFlow AI iOS): 710258787879-732ell2g9g0llo41uispncfkpqr4qlf2
 * - DELETED (do not use): 710258787879-oc3bfa661f9qkp06rkli1hjd2rvutpa2
 *
 * Also check: /frontend/.env (VITE_GOOGLE_CLIENT_ID), /backend/.env
 *
 * See /GOOGLE_OAUTH_CONFIG.md for full documentation.
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '710258787879-po32qt7v1cta0h0esrl0mle53vb8193a.apps.googleusercontent.com';
