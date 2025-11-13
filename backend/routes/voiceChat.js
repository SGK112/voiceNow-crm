const express = require('express');
const router = express.Router();

// Voice chat endpoint for marketing page
router.post('/start-session', async (req, res) => {
  try {
    const agentId = 'agent_9701k9xptd0kfr383djx5zk7300x';

    // Return signed URL for ElevenLabs Conversational AI
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsApiKey) {
      return res.status(500).json({
        error: 'ElevenLabs API key not configured',
        fallback: true
      });
    }

    // For now, just confirm the agent is ready
    res.json({
      success: true,
      agentId: agentId,
      message: 'Voice session ready'
    });

  } catch (error) {
    console.error('Voice chat error:', error);
    res.status(500).json({
      error: 'Failed to start voice session',
      fallback: true
    });
  }
});

module.exports = router;
