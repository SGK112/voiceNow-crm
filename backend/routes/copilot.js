import express from 'express';
import axios from 'axios';

const router = express.Router();

// Initialize services (would normally be in environment variables)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// POST /api/copilot/chat - General chat with AI
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // Use Claude API for general conversation
        if (ANTHROPIC_API_KEY) {
            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 1024,
                    messages: [{
                        role: 'user',
                        content: message
                    }]
                },
                {
                    headers: {
                        'x-api-key': ANTHROPIC_API_KEY,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    }
                }
            );

            const aiResponse = response.data.content[0].text;
            return res.json({ success: true, response: aiResponse });
        }

        // Fallback response if no API key
        res.json({
            success: true,
            response: "I'm your AI Co-Pilot assistant. Configure API keys in your environment to unlock full AI capabilities."
        });

    } catch (error) {
        console.error('Chat error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/copilot/generate-image - Generate images with DALL-E
router.post('/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        if (!OPENAI_API_KEY) {
            return res.status(503).json({
                success: false,
                error: 'OpenAI API key not configured. Set OPENAI_API_KEY in environment variables.'
            });
        }

        const response = await axios.post(
            'https://api.openai.com/v1/images/generations',
            {
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: '1024x1024',
                quality: 'standard'
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const imageUrl = response.data.data[0].url;
        res.json({ success: true, imageUrl, prompt });

    } catch (error) {
        console.error('Image generation error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.error?.message || error.message
        });
    }
});

// POST /api/copilot/call - Initiate phone call via Twilio
router.post('/call', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ success: false, error: 'Phone number is required' });
        }

        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
            return res.status(503).json({
                success: false,
                error: 'Twilio not configured. Set TWILIO credentials in environment variables.'
            });
        }

        const twilioModule = await import('twilio');
        const twilio = twilioModule.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        const call = await twilio.calls.create({
            url: `${process.env.BASE_URL || 'http://localhost:5001'}/api/copilot/twiml/greeting`,
            to: phoneNumber,
            from: TWILIO_PHONE_NUMBER
        });

        res.json({
            success: true,
            callSid: call.sid,
            message: `Calling ${phoneNumber}...`
        });

    } catch (error) {
        console.error('Call error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/copilot/twiml/greeting - TwiML for call greeting
router.get('/twiml/greeting', async (req, res) => {
    try {
        const twilio = await import('twilio');
        const VoiceResponse = twilio.default.twiml.VoiceResponse;
        const response = new VoiceResponse();

        response.say({
            voice: 'alice'
        }, 'Hello! This is your VoiceFlow AI Co-Pilot calling. How can I help you today?');

        res.type('text/xml');
        res.send(response.toString());
    } catch (error) {
        res.status(500).send('Error generating TwiML');
    }
});

// POST /api/copilot/sms - Send SMS via Twilio
router.post('/sms', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;

        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and message are required'
            });
        }

        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
            return res.status(503).json({
                success: false,
                error: 'Twilio not configured'
            });
        }

        const twilioModule = await import('twilio');
        const twilio = twilioModule.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        // Use A2P compliant messaging service
        const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGa86452ccc15de86eee32177817a09d90';
        const sms = await twilio.messages.create({
            body: message,
            to: phoneNumber,
            messagingServiceSid: messagingServiceSid
        });

        res.json({
            success: true,
            messageSid: sms.sid,
            message: `SMS sent to ${phoneNumber}`
        });

    } catch (error) {
        console.error('SMS error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/copilot/calendar/events - Get Google Calendar events
router.get('/calendar/events', async (req, res) => {
    try {
        // This would integrate with Google Calendar API
        // For now, return demo data
        res.json({
            success: true,
            events: [
                {
                    summary: 'Client Meeting - Kitchen Remodel',
                    start: 'Today at 2:00 PM',
                    id: '1'
                },
                {
                    summary: 'Site Visit - Bathroom Project',
                    start: 'Tomorrow at 10:00 AM',
                    id: '2'
                }
            ]
        });

    } catch (error) {
        console.error('Calendar error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/copilot/workflow/trigger - Trigger n8n workflow
router.post('/workflow/trigger', async (req, res) => {
    try {
        const { workflowId, data } = req.body;

        if (!workflowId) {
            return res.status(400).json({ success: false, error: 'Workflow ID is required' });
        }

        const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

        if (!N8N_WEBHOOK_URL) {
            return res.status(503).json({
                success: false,
                error: 'n8n not configured'
            });
        }

        const response = await axios.post(`${N8N_WEBHOOK_URL}/${workflowId}`, data);

        res.json({
            success: true,
            result: response.data
        });

    } catch (error) {
        console.error('Workflow trigger error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
