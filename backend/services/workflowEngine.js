import Workflow from '../models/Workflow.js';
import Lead from '../models/Lead.js';
import Task from '../models/Task.js';
import twilio from 'twilio';
import nodemailer from 'nodemailer';

/**
 * Workflow Execution Engine
 * Executes visual workflows created by users
 * Handles triggers, conditions, actions, and integrations
 */
class WorkflowEngine {
  constructor() {
    // Initialize integrations
    this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;

    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  /**
   * Find and execute workflows that match a trigger event
   */
  async handleTrigger(triggerType, context) {
    try {
      // Find all enabled workflows for this trigger type
      const workflows = await Workflow.find({
        'trigger.type': triggerType,
        enabled: true
      });

      console.log(`🔍 Found ${workflows.length} workflows for trigger: ${triggerType}`);

      for (const workflow of workflows) {
        // Check if trigger conditions are met
        if (this.checkTriggerConditions(workflow.trigger.conditions, context)) {
          console.log(`✅ Executing workflow: ${workflow.name}`);
          await this.executeWorkflow(workflow, context);
        }
      }
    } catch (error) {
      console.error('❌ Trigger handler error:', error);
    }
  }

  /**
   * Check if trigger conditions match the context
   */
  checkTriggerConditions(conditions, context) {
    if (!conditions) return true; // No conditions = always trigger

    // Check agent types
    if (conditions.agentTypes && conditions.agentTypes.length > 0) {
      if (!conditions.agentTypes.includes(context.agent?.type)) return false;
    }

    // Check call status
    if (conditions.callStatus && conditions.callStatus.length > 0) {
      if (!conditions.callStatus.includes(context.callData?.status)) return false;
    }

    // Check if lead qualified
    if (conditions.leadQualified !== undefined) {
      if (context.lead?.qualified !== conditions.leadQualified) return false;
    }

    // Check if appointment booked
    if (conditions.appointmentBooked !== undefined) {
      if (context.callData?.extracted_data?.appointment_booked !== conditions.appointmentBooked) return false;
    }

    // Check if payment captured
    if (conditions.paymentCaptured !== undefined) {
      if (context.callData?.extracted_data?.payment_captured !== conditions.paymentCaptured) return false;
    }

    // Check sentiment
    if (conditions.sentiment && conditions.sentiment.length > 0) {
      if (!conditions.sentiment.includes(context.callData?.sentiment)) return false;
    }

    // Check minimum duration
    if (conditions.minimumDuration) {
      if ((context.callData?.duration || 0) < conditions.minimumDuration) return false;
    }

    return true; // All conditions passed
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflow, context) {
    const startTime = Date.now();

    try {
      // Update execution stats
      workflow.execution.totalRuns += 1;
      workflow.execution.lastRunAt = new Date();
      workflow.execution.lastRunStatus = 'running';

      // Build execution context with variables
      const executionContext = {
        ...context,
        variables: this.buildVariables(context, workflow.variables)
      };

      // Execute actions in sequence
      await this.executeActions(workflow.actions, executionContext, workflow.userId);

      // Mark as successful
      workflow.execution.successfulRuns += 1;
      workflow.execution.lastRunStatus = 'success';
      workflow.execution.lastRunError = null;

      const executionTime = Date.now() - startTime;
      workflow.execution.averageExecutionTime =
        (workflow.execution.averageExecutionTime || 0) * 0.9 + executionTime * 0.1;

      await workflow.save();

      console.log(`✅ Workflow "${workflow.name}" completed in ${executionTime}ms`);
    } catch (error) {
      console.error(`❌ Workflow "${workflow.name}" failed:`, error);

      workflow.execution.failedRuns += 1;
      workflow.execution.lastRunStatus = 'failed';
      workflow.execution.lastRunError = error.message;
      await workflow.save();

      throw error;
    }
  }

  /**
   * Execute workflow actions
   */
  async executeActions(actions, context, userId) {
    // Sort actions by position or sequence
    const sortedActions = actions.sort((a, b) => {
      if (a.position && b.position) {
        return a.position.y - b.position.y;
      }
      return 0;
    });

    for (const action of sortedActions) {
      await this.executeAction(action, context, userId);
    }
  }

  /**
   * Execute a single action
   */
  async executeAction(action, context, userId) {
    console.log(`▶️  Executing action: ${action.type} - ${action.name || action.id}`);

    const config = action.config || {};

    try {
      switch (action.type) {
        case 'send_sms':
          await this.actionSendSMS(config, context);
          break;

        case 'send_email':
          await this.actionSendEmail(config, context);
          break;

        case 'create_task':
          await this.actionCreateTask(config, context, userId);
          break;

        case 'create_lead':
          await this.actionCreateLead(config, context, userId);
          break;

        case 'update_lead':
          await this.actionUpdateLead(config, context);
          break;

        case 'add_note':
          await this.actionAddNote(config, context);
          break;

        case 'webhook':
          await this.actionWebhook(config, context);
          break;

        case 'delay':
          await this.actionDelay(config);
          break;

        case 'condition':
          await this.actionCondition(config, context, userId);
          break;

        default:
          console.warn(`⚠️  Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`❌ Action "${action.type}" failed:`, error.message);
      throw error;
    }
  }

  /**
   * Build variables from context
   */
  buildVariables(context, customVariables = {}) {
    return {
      // Call data
      call_duration: context.callData?.duration || 0,
      call_status: context.callData?.status || '',
      call_transcript: context.callData?.transcript || '',
      call_sentiment: context.callData?.sentiment || '',

      // Lead data
      lead_name: context.lead?.name || context.callData?.caller_name || '',
      lead_email: context.lead?.email || '',
      lead_phone: context.lead?.phone || context.callData?.caller_phone || '',
      lead_status: context.lead?.status || '',
      lead_qualified: context.lead?.qualified || false,

      // Agent data
      agent_name: context.agent?.name || '',
      agent_type: context.agent?.type || '',

      // Extracted data
      appointment_booked: context.callData?.extracted_data?.appointment_booked || false,
      appointment_date: context.callData?.extracted_data?.appointment_date || '',
      payment_captured: context.callData?.extracted_data?.payment_captured || false,
      payment_amount: context.callData?.extracted_data?.payment_amount || 0,

      // Custom variables
      ...customVariables
    };
  }

  /**
   * Replace variables in a string
   */
  replaceVariables(template, variables) {
    if (!template) return '';

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  // ==================================================================
  // ACTION IMPLEMENTATIONS
  // ==================================================================

  async actionSendSMS(config, context) {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    const to = this.replaceVariables(config.to, context.variables);
    const message = this.replaceVariables(config.message, context.variables);

    // Use A2P compliant messaging service
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGa86452ccc15de86eee32177817a09d90';
    await this.twilioClient.messages.create({
      to: to,
      messagingServiceSid: messagingServiceSid,
      body: message
    });

    console.log(`📱 SMS sent to ${to}`);
  }

  async actionSendEmail(config, context) {
    const recipient = this.replaceVariables(config.recipient, context.variables);
    const subject = this.replaceVariables(config.subject, context.variables);
    const body = this.replaceVariables(config.body, context.variables);

    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipient,
      subject: subject,
      html: body
    });

    console.log(`📧 Email sent to ${recipient}`);
  }

  async actionCreateTask(config, context, userId) {
    const title = this.replaceVariables(config.taskTitle, context.variables);
    const description = this.replaceVariables(config.taskDescription, context.variables);

    // Parse due date (supports relative dates like "+2 days")
    let dueDate = new Date();
    if (config.taskDueDate) {
      if (config.taskDueDate.startsWith('+')) {
        const match = config.taskDueDate.match(/\+(\d+)\s*(minute|hour|day|week)s?/);
        if (match) {
          const amount = parseInt(match[1]);
          const unit = match[2];

          switch (unit) {
            case 'minute':
              dueDate.setMinutes(dueDate.getMinutes() + amount);
              break;
            case 'hour':
              dueDate.setHours(dueDate.getHours() + amount);
              break;
            case 'day':
              dueDate.setDate(dueDate.getDate() + amount);
              break;
            case 'week':
              dueDate.setDate(dueDate.getDate() + (amount * 7));
              break;
          }
        }
      } else {
        dueDate = new Date(config.taskDueDate);
      }
    }

    await Task.create({
      user: userId,
      title,
      description,
      type: config.taskType || 'task',
      priority: config.taskPriority || 'medium',
      status: 'pending',
      dueDate,
      relatedContact: context.lead?._id,
      relatedCall: context.callLog?._id,
      autoCreatedBy: 'workflow'
    });

    console.log(`✅ Task created: ${title}`);
  }

  async actionCreateLead(config, context, userId) {
    const leadData = {};

    // Build lead data from config with variable replacement
    for (const [key, value] of Object.entries(config.leadData || {})) {
      leadData[key] = this.replaceVariables(value, context.variables);
    }

    // Ensure required fields
    if (!leadData.name || !leadData.email || !leadData.phone) {
      throw new Error('Lead creation requires name, email, and phone');
    }

    await Lead.create({
      userId,
      ...leadData,
      source: leadData.source || 'workflow'
    });

    console.log(`✅ Lead created: ${leadData.name}`);
  }

  async actionUpdateLead(config, context) {
    if (!context.lead) {
      console.warn('⚠️  No lead in context to update');
      return;
    }

    // Update lead fields
    for (const [key, value] of Object.entries(config.leadData || {})) {
      context.lead[key] = this.replaceVariables(value, context.variables);
    }

    await context.lead.save();
    console.log(`✅ Lead updated: ${context.lead.name}`);
  }

  async actionAddNote(config, context) {
    if (!context.lead) {
      console.warn('⚠️  No lead in context to add note to');
      return;
    }

    const noteContent = this.replaceVariables(config.note, context.variables);

    context.lead.notes.push({
      content: noteContent,
      createdBy: 'Workflow',
      createdAt: new Date()
    });

    await context.lead.save();
    console.log(`✅ Note added to lead: ${context.lead.name}`);
  }

  async actionWebhook(config, context) {
    const url = this.replaceVariables(config.url, context.variables);

    // Build request body with variable replacement
    const body = {};
    for (const [key, value] of Object.entries(config.body || {})) {
      body[key] = this.replaceVariables(value, context.variables);
    }

    const axios = (await import('axios')).default;

    await axios({
      method: config.method || 'POST',
      url,
      headers: config.headers || {},
      data: body
    });

    console.log(`🌐 Webhook called: ${url}`);
  }

  async actionDelay(config) {
    const duration = config.duration || 1000;
    const unit = config.unit || 'milliseconds';

    let ms = duration;
    switch (unit) {
      case 'seconds':
        ms = duration * 1000;
        break;
      case 'minutes':
        ms = duration * 60 * 1000;
        break;
      case 'hours':
        ms = duration * 60 * 60 * 1000;
        break;
    }

    console.log(`⏳ Delaying for ${duration} ${unit}...`);
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async actionCondition(config, context, userId) {
    // Simple condition evaluation
    const condition = this.replaceVariables(config.condition, context.variables);

    // Evaluate condition (basic implementation)
    let result = false;
    try {
      // Simple comparison support
      if (condition.includes('===')) {
        const [left, right] = condition.split('===').map(s => s.trim());
        result = left === right;
      } else if (condition.includes('!==')) {
        const [left, right] = condition.split('!==').map(s => s.trim());
        result = left !== right;
      } else if (condition.includes('>')) {
        const [left, right] = condition.split('>').map(s => s.trim());
        result = parseFloat(left) > parseFloat(right);
      } else if (condition.includes('<')) {
        const [left, right] = condition.split('<').map(s => s.trim());
        result = parseFloat(left) < parseFloat(right);
      }
    } catch (error) {
      console.error('Condition evaluation error:', error);
    }

    console.log(`🔀 Condition "${condition}" evaluated to: ${result}`);

    // Execute appropriate actions based on result
    const actionsToRun = result ? config.trueActions : config.falseActions;
    if (actionsToRun && actionsToRun.length > 0) {
      // Find and execute those actions
      // (In a full implementation, you'd recursively execute the action tree)
      console.log(`➡️  Would execute ${actionsToRun.length} conditional actions`);
    }
  }
}

export default WorkflowEngine;
