import express from 'express';
import browserAgentService from '../services/browserAgentService.js';
import { protect } from '../middleware/auth.js';
const authenticateToken = protect; // alias for compatibility

const router = express.Router();

/**
 * Browser Agent Routes
 * API endpoints for browser automation tasks
 */

// Health check - no auth required
router.get('/health', async (req, res) => {
  try {
    const healthy = await browserAgentService.isHealthy();
    res.json({
      status: healthy ? 'healthy' : 'unhealthy',
      service: 'browser-agent',
      message: healthy ? 'Browser agent service is running' : 'Browser agent service is not available'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Execute a generic browser task
router.post('/task', authenticateToken, async (req, res) => {
  try {
    const { task, options } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task description is required' });
    }

    const result = await browserAgentService.executeTask(task, {
      ...options,
      context: {
        userId: req.user?.id,
        ...options?.context
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Browser task error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Research a lead/company
router.post('/research-lead', authenticateToken, async (req, res) => {
  try {
    const { company, website, contactName, researchDepth } = req.body;

    if (!company) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const result = await browserAgentService.researchLead({
      company,
      website,
      contactName,
      researchDepth: researchDepth || 'standard'
    });

    res.json(result);
  } catch (error) {
    console.error('Lead research error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fill a web form
router.post('/fill-form', authenticateToken, async (req, res) => {
  try {
    const { url, formData, submit } = req.body;

    if (!url || !formData) {
      return res.status(400).json({ error: 'URL and formData are required' });
    }

    const result = await browserAgentService.fillForm(url, formData, submit);
    res.json(result);
  } catch (error) {
    console.error('Form fill error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Book an appointment
router.post('/book-appointment', authenticateToken, async (req, res) => {
  try {
    const { calendarUrl, preferredDate, preferredTime, name, email, phone, meetingType } = req.body;

    if (!calendarUrl || !preferredDate || !preferredTime || !name || !email) {
      return res.status(400).json({
        error: 'calendarUrl, preferredDate, preferredTime, name, and email are required'
      });
    }

    const result = await browserAgentService.bookAppointment({
      calendarUrl,
      preferredDate,
      preferredTime,
      name,
      email,
      phone,
      meetingType
    });

    res.json(result);
  } catch (error) {
    console.error('Appointment booking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extract data from a webpage
router.post('/extract-data', authenticateToken, async (req, res) => {
  try {
    const { url, extractionPrompt, format } = req.body;

    if (!url || !extractionPrompt) {
      return res.status(400).json({ error: 'URL and extractionPrompt are required' });
    }

    const result = await browserAgentService.extractData(url, extractionPrompt, format);
    res.json(result);
  } catch (error) {
    console.error('Data extraction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get task status
router.get('/task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const status = await browserAgentService.getTaskStatus(taskId);
    res.json(status);
  } catch (error) {
    console.error('Get task status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel a task
router.delete('/task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const result = await browserAgentService.cancelTask(taskId);
    res.json(result);
  } catch (error) {
    console.error('Cancel task error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all tasks
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await browserAgentService.listTasks();
    res.json(tasks);
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ElevenLabs tool definitions for voice agents
router.get('/voice-tools/definitions', authenticateToken, async (req, res) => {
  try {
    const tools = browserAgentService.getElevenLabsToolDefinitions();
    res.json({ tools });
  } catch (error) {
    console.error('Get tool definitions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Voice Agent Tool Webhook Handlers
// These are called by ElevenLabs when voice agents invoke browser tools
// ==========================================

// Handle research_company tool invocation
router.post('/voice-tools/research', async (req, res) => {
  try {
    console.log('📞 Voice agent requesting company research:', req.body);

    const { company_name, contact_name } = req.body;

    if (!company_name) {
      return res.json({
        success: false,
        response: "I need a company name to research."
      });
    }

    const result = await browserAgentService.voiceAgentResearch(company_name, contact_name);

    res.json({
      success: result.success,
      response: result.success
        ? result.research
        : "I wasn't able to find information about that company right now."
    });
  } catch (error) {
    console.error('Voice research tool error:', error);
    res.json({
      success: false,
      response: "I'm having trouble looking that up right now."
    });
  }
});

// Handle check_calendar_availability tool invocation
router.post('/voice-tools/availability', async (req, res) => {
  try {
    console.log('📞 Voice agent checking availability:', req.body);

    const { date, calendar_url } = req.body;
    const calendarUrl = calendar_url || process.env.DEFAULT_CALENDAR_URL;

    if (!calendarUrl) {
      return res.json({
        success: false,
        response: "No calendar configured for availability checks."
      });
    }

    const result = await browserAgentService.voiceAgentCheckAvailability(calendarUrl, date);

    res.json({
      success: result.success,
      response: result.success
        ? result.availability
        : "I couldn't check the calendar right now. Would you like to try a different date?"
    });
  } catch (error) {
    console.error('Voice availability tool error:', error);
    res.json({
      success: false,
      response: "I'm having trouble checking the calendar right now."
    });
  }
});

// Handle fill_web_form tool invocation
router.post('/voice-tools/fill-form', async (req, res) => {
  try {
    console.log('📞 Voice agent filling form:', req.body);

    const { form_url, customer_name, customer_email, customer_phone, additional_info } = req.body;

    if (!form_url) {
      return res.json({
        success: false,
        response: "I need a form URL to fill out."
      });
    }

    const formData = {
      name: customer_name,
      email: customer_email,
      phone: customer_phone
    };

    if (additional_info) {
      formData.notes = additional_info;
    }

    // Don't submit automatically - just fill
    const result = await browserAgentService.fillForm(form_url, formData, false);

    res.json({
      success: result.success,
      response: result.success
        ? "I've filled out the form with your information. Please review it before submitting."
        : "I had trouble filling out that form. You may need to complete it manually."
    });
  } catch (error) {
    console.error('Voice form fill tool error:', error);
    res.json({
      success: false,
      response: "I'm having trouble filling out the form right now."
    });
  }
});

export default router;
