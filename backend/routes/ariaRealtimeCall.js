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
 * Initiate an outbound call with agent selection and CRM data
 * POST /api/aria-realtime/call
 * Body: {
 *   toNumber: string (required),
 *   contactName: string,
 *   purpose: string,
 *   agentId: 'aria' | 'sales' | 'support' | 'project_manager' | 'estimator' (default: 'aria'),
 *   context: { ownerName, ownerCompany, ... },
 *   crmData: { leadScore, lastPurchase, totalSpent, tags, notes, ... }
 * }
 *
 * Agent Voices:
 * - aria: shimmer (bright, energetic female)
 * - sales: verse (dynamic, expressive)
 * - project_manager: echo (clear, professional)
 * - support: coral (warm, friendly female)
 * - estimator: sage (calm, wise)
 */
router.post('/call', async (req, res) => {
  try {
    const { toNumber, contactName, purpose, agentId, context, crmData } = req.body;

    if (!toNumber) {
      return res.status(400).json({
        success: false,
        error: 'toNumber is required'
      });
    }

    // Validate agentId if provided
    const validAgents = ['aria', 'sales', 'support', 'project_manager', 'estimator'];
    if (agentId && !validAgents.includes(agentId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid agentId. Must be one of: ${validAgents.join(', ')}`
      });
    }

    const result = await openaiRealtimeCallService.initiateCall({
      toNumber,
      contactName,
      purpose,
      agentId: agentId || 'aria',
      context: context || {},
      crmData: crmData || {}
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
      agentId: callState.agentId,
      agentName: callState.agentName,
      voice: callState.voice,
      toNumber: callState.toNumber,
      contactName: callState.contactName,
      purpose: callState.purpose,
      startTime: callState.startTime,
      endTime: callState.endTime,
      duration: callState.duration,
      transcriptLength: callState.transcript?.length || 0,
      hasCrmData: callState.crmData && Object.keys(callState.crmData).length > 0
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
      agentId: c.agentId,
      agentName: c.agentName,
      voice: c.voice,
      toNumber: c.toNumber,
      contactName: c.contactName,
      purpose: c.purpose,
      startTime: c.startTime
    }))
  });
});

export default router;
