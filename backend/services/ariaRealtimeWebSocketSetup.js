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
    // Extract callId from URL path
    // URL will be like: /api/aria-realtime/media-stream/aria_1234567890_abc123
    const urlParts = req.url.split('/');
    const callId = urlParts[urlParts.length - 1]?.split('?')[0];

    console.log(`🌐 [ARIA-WS] New WebSocket connection for call: ${callId}`);
    console.log(`   URL: ${req.url}`);

    if (!callId || !callId.startsWith('aria_')) {
      console.error(`❌ [ARIA-WS] Invalid call ID: ${callId}`);
      ws.close(1008, 'Invalid call ID');
      return;
    }

    // Delegate to the service
    openaiRealtimeCallService.handleMediaStream(ws, callId);
  });

  wss.on('error', (error) => {
    console.error('❌ [ARIA-WS] WebSocket server error:', error);
  });

  return wss;
}

export default { setupAriaRealtimeWebSocket };
