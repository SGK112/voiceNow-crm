import { WebSocketServer } from 'ws';
import openaiRealtimeCallService from './openaiRealtimeCallService.js';

/**
 * Setup WebSocket server for ARIA Realtime Calls
 * Handles Twilio media streams and bridges them to OpenAI Realtime API
 *
 * Uses static path /ws/aria-calls with query params for call context
 * This pattern works reliably with Render's load balancer
 */
export function setupAriaRealtimeWebSocket(server) {
  // Create WebSocket server on a STATIC path (dynamic paths don't work with WS path matching)
  const wss = new WebSocketServer({
    server,
    path: '/ws/aria-calls'
  });

  console.log('🌐 [ARIA-WS] WebSocket server created at /ws/aria-calls');

  wss.on('connection', (ws, req) => {
    console.log(`🌐 [ARIA-WS] New WebSocket connection`);
    console.log(`   Full URL: ${req.url}`);

    // Parse query parameters - callId and context come via query string
    // URL will be like: /ws/aria-calls?callId=aria_1234567890_abc123&contactName=John&purpose=follow-up
    const urlParams = {};
    let callId = '';

    const queryString = req.url.split('?')[1];
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      callId = searchParams.get('callId') || '';
      urlParams.contactName = searchParams.get('contactName') || '';
      urlParams.purpose = searchParams.get('purpose') || '';
      urlParams.ownerName = searchParams.get('ownerName') || '';
      urlParams.ownerCompany = searchParams.get('ownerCompany') || '';
    }

    console.log(`   Call ID: ${callId}`);
    console.log(`   Params:`, urlParams);

    if (!callId || !callId.startsWith('aria_')) {
      console.error(`❌ [ARIA-WS] Invalid call ID: ${callId}`);
      ws.close(1008, 'Invalid call ID');
      return;
    }

    // Delegate to the service with URL parameters for external calls
    openaiRealtimeCallService.handleMediaStream(ws, callId, urlParams);
  });

  wss.on('error', (error) => {
    console.error('❌ [ARIA-WS] WebSocket server error:', error);
  });

  return wss;
}

export default { setupAriaRealtimeWebSocket };
