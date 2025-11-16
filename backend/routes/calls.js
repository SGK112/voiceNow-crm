import express from 'express';
import { getCalls, getCallById, deleteCall, initiateCall } from '../controllers/callController.js';
import { protect } from '../middleware/auth.js';
import ElevenLabsService from '../services/elevenLabsService.js';
import CallLog from '../models/CallLog.js';

const router = express.Router();
const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

router.get('/', protect, getCalls);
router.post('/initiate', protect, initiateCall);

/**
 * @route   POST /api/calls/test
 * @desc    Initiate a test call to a phone number
 * @access  Private
 */
router.post('/test', protect, async (req, res) => {
  try {
    const { agent_id, phone_number, test_mode } = req.body;

    if (!agent_id || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID and phone number are required'
      });
    }

    // Format phone number
    const formattedNumber = phone_number.startsWith('+') ? phone_number : `+${phone_number}`;

    // Initiate call via ElevenLabs
    const callData = await elevenLabsService.initiateCall(
      agent_id,
      formattedNumber,
      process.env.ELEVENLABS_PHONE_NUMBER_ID,
      `${process.env.WEBHOOK_URL || process.env.API_URL}/api/webhooks/elevenlabs/conversation-event`,
      { test_mode: test_mode ? 'true' : 'false' }
    );

    // Create call log
    // Note: agentId should be a VoiceAgent ObjectId, but for test calls we'll skip validation
    // by making it optional in the schema or using a temporary agent
    const callLog = await CallLog.create({
      userId: req.user._id,
      agentId: agent_id, // This is the ElevenLabs agent_id string
      callerPhone: formattedNumber,
      direction: 'outbound',
      status: 'in-progress',
      elevenLabsCallId: callData.call_id || callData.id,
      metadata: {
        test_mode: test_mode,
        agent_id: agent_id
      }
    });

    res.json({
      success: true,
      call_id: callLog.elevenLabsCallId,
      message: 'Test call initiated successfully'
    });
  } catch (error) {
    console.error('Error initiating test call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate test call',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/calls/:callId/transcript
 * @desc    Get real-time transcript for a call
 * @access  Private
 */
router.get('/:callId/transcript', protect, async (req, res) => {
  try {
    const { callId } = req.params;

    // Get call log
    const callLog = await CallLog.findOne({
      elevenLabsCallId: callId,
      userId: req.user._id
    });

    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // In a real implementation, you would fetch the transcript from ElevenLabs
    // For now, return the call log with any stored transcript data
    res.json({
      success: true,
      call_id: callId,
      status: callLog.status,
      transcript: callLog.transcript || [],
      duration: callLog.duration
    });
  } catch (error) {
    console.error('Error getting transcript:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transcript',
      error: error.message
    });
  }
});

router.get('/:id', protect, getCallById);
router.delete('/:id', protect, deleteCall);

export default router;
