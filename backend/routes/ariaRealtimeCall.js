import express from 'express';
import openaiRealtimeCallService from '../services/openaiRealtimeCallService.js';

const router = express.Router();

// WebSocket endpoint is handled by WebSocketServer in ariaRealtimeWebSocketSetup.js
// at path: /ws/aria-calls (with callId as query parameter)

/**
 * TwiML endpoint for ARIA Realtime calls
 * Twilio calls this when the call is answered
 * POST /api/aria-realtime/twiml/:callId
 */
router.post('/twiml/:callId', (req, res) => {
  const { callId } = req.params;

  console.log(`📞 [ARIA-REALTIME] TwiML request for call: ${callId}`);

  const twiml = openaiRealtimeCallService.getTwiML(callId);

  res.type('text/xml');
  res.send(twiml);
});

/**
 * Call status callback from Twilio
 * POST /api/aria-realtime/status/:callId
 */
router.post('/status/:callId', (req, res) => {
  const { callId } = req.params;
  const { CallStatus, CallSid } = req.body;

  console.log(`📊 [ARIA-REALTIME] Status callback: ${callId} -> ${CallStatus}`);

  openaiRealtimeCallService.handleStatusCallback(callId, CallStatus, CallSid);

  res.sendStatus(200);
});

/**
 * Initiate an outbound call
 * POST /api/aria-realtime/call
 * Body: { toNumber, contactName, purpose, context }
 */
router.post('/call', async (req, res) => {
  try {
    const { toNumber, contactName, purpose, context } = req.body;

    if (!toNumber) {
      return res.status(400).json({
        success: false,
        error: 'toNumber is required'
      });
    }

    const result = await openaiRealtimeCallService.initiateCall({
      toNumber,
      contactName,
      purpose,
      context: context || {}
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [ARIA-REALTIME] Error initiating call:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get call status
 * GET /api/aria-realtime/call/:callId
 */
router.get('/call/:callId', (req, res) => {
  const { callId } = req.params;

  const callState = openaiRealtimeCallService.getCallState(callId);

  if (!callState) {
    return res.status(404).json({
      success: false,
      error: 'Call not found'
    });
  }

  res.json({
    success: true,
    call: {
      id: callState.id,
      status: callState.status,
      toNumber: callState.toNumber,
      contactName: callState.contactName,
      purpose: callState.purpose,
      startTime: callState.startTime,
      endTime: callState.endTime,
      duration: callState.duration,
      transcriptLength: callState.transcript?.length || 0
    }
  });
});

/**
 * Get all active calls
 * GET /api/aria-realtime/calls
 */
router.get('/calls', (req, res) => {
  const calls = openaiRealtimeCallService.getActiveCalls();

  res.json({
    success: true,
    count: calls.length,
    calls: calls.map(c => ({
      id: c.id,
      status: c.status,
      toNumber: c.toNumber,
      contactName: c.contactName,
      startTime: c.startTime
    }))
  });
});

export default router;
