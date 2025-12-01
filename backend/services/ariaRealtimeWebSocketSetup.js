import { WebSocketServer } from 'ws';
import openaiRealtimeCallService from './openaiRealtimeCallService.js';

/**
 * Setup WebSocket server for ARIA Realtime Calls
 * Handles Twilio media streams and bridges them to OpenAI Realtime API
 */
export function setupAriaRealtimeWebSocket(server) {
  // Create WebSocket server on a specific path
  const wss = new WebSocketServer({
    server,
    path: '/api/aria-realtime/media-stream'
  });

  console.log('🌐 [ARIA-WS] WebSocket server created at /api/aria-realtime/media-stream');

  wss.on('connection', (ws, req) => {
    // Extract callId from URL path and parse query parameters
    // URL will be like: /api/aria-realtime/media-stream/aria_1234567890_abc123?contactName=John&purpose=follow-up
    const urlParts = req.url.split('/');
    const lastPart = urlParts[urlParts.length - 1] || '';
    const [callIdWithParams] = lastPart.split('?');
    const callId = callIdWithParams;

    // Parse query parameters (for externally initiated calls from ariaCapabilities.js)
    const urlParams = {};
    const queryString = req.url.split('?')[1];
    if (queryString) {
      const searchParams = new URLSearchParams(queryString);
      urlParams.contactName = searchParams.get('contactName') || '';
      urlParams.purpose = searchParams.get('purpose') || '';
      urlParams.ownerName = searchParams.get('ownerName') || '';
      urlParams.ownerCompany = searchParams.get('ownerCompany') || '';
    }

    console.log(`🌐 [ARIA-WS] New WebSocket connection for call: ${callId}`);
    console.log(`   URL: ${req.url}`);
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
