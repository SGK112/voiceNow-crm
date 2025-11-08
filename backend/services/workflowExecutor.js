import N8nWorkflow from '../models/N8nWorkflow.js';
import N8nService from './n8nService.js';

class WorkflowExecutor {
  constructor() {
    this.n8nService = new N8nService();
  }

  /**
   * Execute workflows for a user based on call data
   * @param {Object} callData - The call data from ElevenLabs
   * @param {String} userId - The user who owns the agent
   */
  async executeWorkflowsForCall(callData, userId) {
    try {
      // Find all enabled workflows for this user
      const workflows = await N8nWorkflow.find({
        userId,
        enabled: true
      });

      if (workflows.length === 0) {
        console.log(`No enabled workflows for user ${userId}`);
        return;
      }

      console.log(`Found ${workflows.length} enabled workflows for user ${userId}`);

      // Execute each workflow that matches the trigger conditions
      for (const workflow of workflows) {
        if (this.shouldTriggerWorkflow(workflow, callData)) {
          await this.executeWorkflow(workflow, callData);
        }
      }
    } catch (error) {
      console.error('Error executing workflows:', error);
    }
  }

  /**
   * Check if a workflow should be triggered based on its conditions
   */
  shouldTriggerWorkflow(workflow, callData) {
    const { triggerConditions } = workflow;

    // If no conditions, trigger for all calls
    if (!triggerConditions || Object.keys(triggerConditions).length === 0) {
      return true;
    }

    // Check agent type condition
    if (triggerConditions.agentTypes && triggerConditions.agentTypes.length > 0) {
      if (!triggerConditions.agentTypes.includes(callData.agent_type)) {
        return false;
      }
    }

    // Check call status condition
    if (triggerConditions.callStatus && triggerConditions.callStatus.length > 0) {
      if (!triggerConditions.callStatus.includes(callData.status)) {
        return false;
      }
    }

    // Check lead qualification condition
    if (triggerConditions.leadQualified !== undefined) {
      if (triggerConditions.leadQualified !== callData.qualified) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a single workflow with call data
   */
  async executeWorkflow(workflow, callData) {
    try {
      console.log(`Executing workflow: ${workflow.name} (${workflow.type})`);

      // Get the master n8n webhook URL for this workflow type
      const webhookPath = this.getWebhookPathForType(workflow.type);

      if (!webhookPath) {
        console.warn(`No webhook path configured for workflow type: ${workflow.type}`);
        return;
      }

      // Prepare data to send to n8n
      const payload = {
        workflowType: workflow.type,
        userId: workflow.userId.toString(),
        workflowId: workflow._id.toString(),
        callData: {
          caller_name: callData.caller_name || 'Unknown',
          caller_phone: callData.caller_phone,
          email: callData.email,
          agent_type: callData.agent_type,
          duration: callData.duration,
          status: callData.status,
          qualified: callData.qualified,
          recording_url: callData.recording_url,
          transcript: callData.transcript
        },
        // Include any custom user configuration from workflowJson
        config: workflow.workflowJson
      };

      // Trigger the master n8n workflow
      const result = await this.n8nService.triggerWorkflow(webhookPath, payload);

      // Update workflow execution stats
      workflow.executionCount += 1;
      workflow.lastExecutedAt = new Date();
      workflow.successCount += 1;
      await workflow.save();

      console.log(`✅ Workflow executed successfully: ${workflow.name}`);
      return result;
    } catch (error) {
      console.error(`❌ Error executing workflow ${workflow.name}:`, error.message);

      // Update failure count
      workflow.executionCount += 1;
      workflow.lastExecutedAt = new Date();
      workflow.failureCount += 1;
      await workflow.save();

      throw error;
    }
  }

  /**
   * Map workflow types to n8n webhook paths
   * In production, you'd create ONE master workflow per type in n8n cloud
   * and configure the webhook path here
   */
  getWebhookPathForType(type) {
    const webhookMap = {
      save_lead: 'save-lead',           // Webhook: /webhook/save-lead
      send_sms: 'send-sms',             // Webhook: /webhook/send-sms
      book_appointment: 'book-appointment', // Webhook: /webhook/book-appointment
      slack_notification: 'slack-notify',   // Webhook: /webhook/slack-notify
      send_email: 'send-email',         // Webhook: /webhook/send-email
      custom: null                      // Custom workflows need manual setup
    };

    return webhookMap[type];
  }
}

export default WorkflowExecutor;
