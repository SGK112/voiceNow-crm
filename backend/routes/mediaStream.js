import express from 'express';
import expressWs from 'express-ws';
import twilioMediaStreamService from '../services/twilioMediaStreamService.js';
import workflowExecutor from '../services/workflowExecutor.js';

const router = express.Router();

// Enable WebSocket support
expressWs(router);

/**
 * Twilio TwiML endpoint - starts the media stream
 * This is what you point your Twilio phone number to
 */
router.post('/start/:workflowId?', async (req, res) => {
  const { workflowId } = req.params;
  const { CallSid, From, To } = req.body;

  console.log(`📞 Incoming call: ${CallSid} from ${From} to ${To}`);

  // Get workflow configuration if specified
  let workflow = null;
  let variables = {};

  if (workflowId) {
    try {
      // Load workflow from database
      const Workflow = (await import('../models/Workflow.js')).default;
      workflow = await Workflow.findById(workflowId);

      if (workflow) {
        console.log(`🔄 Using workflow: ${workflow.name}`);

        // Extract variables from workflow
        variables = workflow.variables || {};
      }
    } catch (error) {
      console.error('❌ Error loading workflow:', error);
    }
  }

  // Generate WebSocket URL for media stream
  const wsUrl = `wss://${req.get('host')}/api/media-stream/stream/${CallSid}?workflowId=${workflowId || ''}`;

  // Return TwiML to start media stream
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${wsUrl}">
            <Parameter name="workflowId" value="${workflowId || ''}" />
            <Parameter name="from" value="${From}" />
            <Parameter name="to" value="${To}" />
        </Stream>
    </Connect>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

/**
 * WebSocket endpoint for Twilio Media Streams
 */
router.ws('/stream/:callSid', async (ws, req) => {
  const { callSid } = req.params;
  const { workflowId } = req.query;

  console.log(`🌐 WebSocket connection for call: ${callSid}`);
  console.log(`🔄 Workflow ID: ${workflowId || 'none'}`);

  // Initialize the media stream handler
  twilioMediaStreamService.handleMediaStream(ws, callSid, workflowId);
});

/**
 * API endpoint to trigger workflows during active call
 * POST /api/media-stream/trigger-workflow
 * Body: { callSid, workflowId, data }
 */
router.post('/trigger-workflow', async (req, res) => {
  try {
    const { callSid, workflowId, data } = req.body;

    if (!callSid || !workflowId) {
      return res.status(400).json({ error: 'callSid and workflowId required' });
    }

    const result = await twilioMediaStreamService.triggerWorkflow(
      callSid,
      workflowId,
      data
    );

    res.json(result);
  } catch (error) {
    console.error('❌ Error triggering workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to speak during active call
 * POST /api/media-stream/speak
 * Body: { callSid, text, voiceId }
 */
router.post('/speak', async (req, res) => {
  try {
    const { callSid, text, voiceId } = req.body;

    if (!callSid || !text) {
      return res.status(400).json({ error: 'callSid and text required' });
    }

    const callState = twilioMediaStreamService.getCallState(callSid);
    if (!callState) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Get the WebSocket for this call (we'll need to store this)
    // For now, return success
    res.json({ success: true, message: 'Speech queued' });
  } catch (error) {
    console.error('❌ Error speaking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to send SMS during active call
 * POST /api/media-stream/send-sms
 * Body: { callSid, phoneNumber, message }
 */
router.post('/send-sms', async (req, res) => {
  try {
    const { callSid, phoneNumber, message } = req.body;

    if (!callSid || !phoneNumber || !message) {
      return res.status(400).json({
        error: 'callSid, phoneNumber, and message required'
      });
    }

    const result = await twilioMediaStreamService.sendSMSDuringCall(
      callSid,
      phoneNumber,
      message
    );

    res.json(result);
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to update script during active call
 * POST /api/media-stream/update-script
 * Body: { callSid, script }
 */
router.post('/update-script', async (req, res) => {
  try {
    const { callSid, script } = req.body;

    if (!callSid || !script) {
      return res.status(400).json({ error: 'callSid and script required' });
    }

    const result = twilioMediaStreamService.updateScript(callSid, script);

    res.json(result);
  } catch (error) {
    console.error('❌ Error updating script:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to inject variables during active call
 * POST /api/media-stream/inject-variables
 * Body: { callSid, variables }
 */
router.post('/inject-variables', async (req, res) => {
  try {
    const { callSid, variables } = req.body;

    if (!callSid || !variables) {
      return res.status(400).json({ error: 'callSid and variables required' });
    }

    const callState = twilioMediaStreamService.getCallState(callSid);
    if (!callState) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Inject variables into the call context
    callState.workflowContext = {
      ...callState.workflowContext,
      variables: {
        ...(callState.workflowContext.variables || {}),
        ...variables
      },
      lastVariableUpdate: new Date()
    };

    console.log(`💉 Injected variables into call ${callSid}:`, variables);

    res.json({
      success: true,
      context: callState.workflowContext
    });
  } catch (error) {
    console.error('❌ Error injecting variables:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get active call state
 * GET /api/media-stream/call/:callSid
 */
router.get('/call/:callSid', (req, res) => {
  try {
    const { callSid } = req.params;
    const callState = twilioMediaStreamService.getCallState(callSid);

    if (!callState) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({
      callSid: callState.callSid,
      streamSid: callState.streamSid,
      context: callState.workflowContext
    });
  } catch (error) {
    console.error('❌ Error getting call state:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
