import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Browser Agent Service
 * Bridge between Node.js backend and Python browser-use automation server
 * Enables voice agents to perform browser automation tasks
 */
class BrowserAgentService {
  constructor() {
    this.baseUrl = process.env.BROWSER_AGENT_URL || 'http://localhost:8100';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // 60 second default timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Track active tasks
    this.activeTasks = new Map();
  }

  /**
   * Check if browser agent server is healthy
   */
  async isHealthy() {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Browser Agent health check failed:', error.message);
      return false;
    }
  }

  /**
   * Execute a generic browser automation task
   * @param {string} task - Natural language task description
   * @param {Object} options - Task options
   * @returns {Promise<Object>} Task result
   */
  async executeTask(task, options = {}) {
    const taskId = options.taskId || `task-${uuidv4()}`;

    try {
      const response = await this.client.post('/api/browser/task', {
        task_id: taskId,
        task: task,
        llm_provider: options.llmProvider || 'openai',
        model: options.model || 'gpt-4o',
        headless: options.headless !== false,
        max_steps: options.maxSteps || 50,
        timeout: options.timeout || 300,
        context: options.context || null
      });

      this.activeTasks.set(taskId, {
        status: 'pending',
        createdAt: new Date()
      });

      // If waitForCompletion is true, poll until done
      if (options.waitForCompletion) {
        return await this.waitForTask(taskId, options.pollTimeout || 300000);
      }

      return {
        taskId,
        status: 'started',
        message: 'Task started in background'
      };
    } catch (error) {
      console.error('Browser task execution failed:', error.response?.data || error.message);
      throw new Error(`Failed to execute browser task: ${error.message}`);
    }
  }

  /**
   * Research a lead/company
   * Useful for voice agents to gather info during or before calls
   * @param {Object} lead - Lead information
   * @returns {Promise<Object>} Research results
   */
  async researchLead(lead) {
    const taskId = `research-${lead.id || uuidv4()}`;

    try {
      const response = await this.client.post('/api/browser/research-lead', {
        task_id: taskId,
        company_name: lead.company || lead.companyName,
        company_website: lead.website || lead.companyWebsite,
        contact_name: lead.name || lead.contactName,
        research_depth: lead.researchDepth || 'standard'
      });

      // Wait for completion since voice agents need this info quickly
      const result = await this.waitForTask(taskId, 120000); // 2 min timeout

      return {
        success: result.status === 'completed',
        taskId,
        research: this.parseResearchResult(result.result),
        rawResult: result.result
      };
    } catch (error) {
      console.error('Lead research failed:', error.message);
      return {
        success: false,
        taskId,
        error: error.message
      };
    }
  }

  /**
   * Fill out a web form
   * @param {string} url - Form URL
   * @param {Object} formData - Key-value pairs for form fields
   * @param {boolean} submit - Whether to submit the form
   */
  async fillForm(url, formData, submit = false) {
    const taskId = `form-${uuidv4()}`;

    try {
      const response = await this.client.post('/api/browser/fill-form', {
        task_id: taskId,
        url,
        form_data: formData,
        submit
      });

      const result = await this.waitForTask(taskId, 60000);

      return {
        success: result.status === 'completed',
        taskId,
        result: result.result
      };
    } catch (error) {
      console.error('Form fill failed:', error.message);
      return {
        success: false,
        taskId,
        error: error.message
      };
    }
  }

  /**
   * Book an appointment on a scheduling page
   * @param {Object} appointmentDetails - Booking details
   */
  async bookAppointment(appointmentDetails) {
    const taskId = `booking-${uuidv4()}`;

    try {
      const response = await this.client.post('/api/browser/book-appointment', {
        task_id: taskId,
        calendar_url: appointmentDetails.calendarUrl,
        preferred_date: appointmentDetails.preferredDate,
        preferred_time: appointmentDetails.preferredTime,
        attendee_name: appointmentDetails.name,
        attendee_email: appointmentDetails.email,
        attendee_phone: appointmentDetails.phone,
        meeting_type: appointmentDetails.meetingType
      });

      const result = await this.waitForTask(taskId, 90000);

      return {
        success: result.status === 'completed',
        taskId,
        booking: result.result,
        confirmedTime: this.extractBookingConfirmation(result.result)
      };
    } catch (error) {
      console.error('Appointment booking failed:', error.message);
      return {
        success: false,
        taskId,
        error: error.message
      };
    }
  }

  /**
   * Extract data from a webpage
   * @param {string} url - Page URL
   * @param {string} extractionPrompt - What to extract
   * @param {string} format - Output format (json, text, csv)
   */
  async extractData(url, extractionPrompt, format = 'json') {
    const taskId = `extract-${uuidv4()}`;

    try {
      const response = await this.client.post('/api/browser/extract-data', {
        task_id: taskId,
        url,
        extraction_prompt: extractionPrompt,
        output_format: format
      });

      const result = await this.waitForTask(taskId, 60000);

      return {
        success: result.status === 'completed',
        taskId,
        data: result.result?.final_result,
        rawResult: result.result
      };
    } catch (error) {
      console.error('Data extraction failed:', error.message);
      return {
        success: false,
        taskId,
        error: error.message
      };
    }
  }

  /**
   * Get task status
   * @param {string} taskId - Task ID
   */
  async getTaskStatus(taskId) {
    try {
      const response = await this.client.get(`/api/browser/task/${taskId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { status: 'not_found', taskId };
      }
      throw error;
    }
  }

  /**
   * Cancel a running task
   * @param {string} taskId - Task ID
   */
  async cancelTask(taskId) {
    try {
      await this.client.delete(`/api/browser/task/${taskId}`);
      this.activeTasks.delete(taskId);
      return { success: true, message: `Task ${taskId} cancelled` };
    } catch (error) {
      console.error('Task cancellation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all tasks
   */
  async listTasks() {
    try {
      const response = await this.client.get('/api/browser/tasks');
      return response.data;
    } catch (error) {
      console.error('Failed to list tasks:', error.message);
      return {};
    }
  }

  /**
   * Wait for a task to complete
   * @param {string} taskId - Task ID
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForTask(taskId, timeout = 300000) {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (Date.now() - startTime < timeout) {
      const status = await this.getTaskStatus(taskId);

      if (status.status === 'completed' || status.status === 'failed') {
        this.activeTasks.delete(taskId);
        return status;
      }

      await this.sleep(pollInterval);
    }

    // Timeout - try to cancel the task
    await this.cancelTask(taskId);
    throw new Error(`Task ${taskId} timed out after ${timeout}ms`);
  }

  /**
   * Parse research results into structured format
   */
  parseResearchResult(result) {
    if (!result?.final_result) return null;

    const text = result.final_result;

    // Extract structured info from the research text
    return {
      summary: text,
      // Could add more structured parsing here
      raw: text
    };
  }

  /**
   * Extract booking confirmation from result
   */
  extractBookingConfirmation(result) {
    if (!result?.final_result) return null;

    // Parse confirmation details from the result
    return {
      confirmed: true,
      details: result.final_result
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================
  // Voice Agent Integration Methods
  // ==========================================

  /**
   * Quick research for voice agent (optimized for real-time)
   * Use this when a voice agent needs lead info during a call
   */
  async voiceAgentResearch(companyName, contactName = null) {
    console.log(`🔍 Voice agent requesting research on: ${companyName}`);

    try {
      const response = await this.client.post('/api/voice-tools/research', {
        company_name: companyName,
        contact_name: contactName
      }, {
        timeout: 35000 // 35 second timeout for voice
      });

      return response.data;
    } catch (error) {
      console.error('Voice agent research failed:', error.message);
      return {
        success: false,
        error: 'Research unavailable at this time'
      };
    }
  }

  /**
   * Check calendar availability for voice agent
   */
  async voiceAgentCheckAvailability(calendarUrl, date) {
    console.log(`📅 Voice agent checking availability for: ${date}`);

    try {
      const response = await this.client.post('/api/voice-tools/check-availability', {
        calendar_url: calendarUrl,
        date
      }, {
        timeout: 25000
      });

      return response.data;
    } catch (error) {
      console.error('Availability check failed:', error.message);
      return {
        success: false,
        error: 'Could not check availability'
      };
    }
  }

  /**
   * Create ElevenLabs client tool definitions for browser automation
   * These can be added to voice agents to enable browser tasks during calls
   */
  getElevenLabsToolDefinitions() {
    return [
      {
        type: 'client',
        name: 'research_company',
        description: 'Research a company or lead to get information about them. Use this when you need to look up details about a company, find their website, or learn about their business.',
        parameters: {
          type: 'object',
          properties: {
            company_name: {
              type: 'string',
              description: 'The name of the company to research'
            },
            contact_name: {
              type: 'string',
              description: 'Optional: Name of a specific person to research at the company'
            }
          },
          required: ['company_name']
        }
      },
      {
        type: 'client',
        name: 'check_calendar_availability',
        description: 'Check available appointment times on a calendar. Use this when scheduling meetings or appointments.',
        parameters: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'The date to check availability for (e.g., "2024-12-15" or "next Monday")'
            }
          },
          required: ['date']
        }
      },
      {
        type: 'client',
        name: 'fill_web_form',
        description: 'Fill out a web form with customer information. Use this to help customers complete online applications or registrations.',
        parameters: {
          type: 'object',
          properties: {
            form_url: {
              type: 'string',
              description: 'The URL of the form to fill'
            },
            customer_name: {
              type: 'string',
              description: 'Customer full name'
            },
            customer_email: {
              type: 'string',
              description: 'Customer email address'
            },
            customer_phone: {
              type: 'string',
              description: 'Customer phone number'
            },
            additional_info: {
              type: 'string',
              description: 'Any additional information to include in the form'
            }
          },
          required: ['form_url', 'customer_name']
        }
      }
    ];
  }
}

// Export singleton instance
export default new BrowserAgentService();
