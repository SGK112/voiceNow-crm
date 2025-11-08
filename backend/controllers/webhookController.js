import CallLog from '../models/CallLog.js';
import Lead from '../models/Lead.js';
import VoiceAgent from '../models/VoiceAgent.js';
import N8nWorkflow from '../models/N8nWorkflow.js';
import Usage from '../models/Usage.js';
import N8nService from '../services/n8nService.js';

const n8nService = new N8nService();

export const handleElevenLabsWebhook = async (req, res) => {
  try {
    const callData = req.body;

    const agent = await VoiceAgent.findOne({ elevenLabsAgentId: callData.agent_id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const callLog = await CallLog.create({
      userId: agent.userId,
      agentId: agent._id,
      callerName: callData.caller_name || 'Unknown',
      callerPhone: callData.caller_phone || callData.phone_number,
      direction: callData.direction || 'outbound',
      duration: callData.duration || 0,
      transcript: callData.transcript || '',
      recordingUrl: callData.recording_url,
      status: callData.status || 'completed',
      elevenLabsCallId: callData.call_id,
      sentiment: callData.sentiment || 'neutral',
      leadsCapured: {
        name: callData.extracted_data?.name,
        email: callData.extracted_data?.email,
        phone: callData.extracted_data?.phone || callData.caller_phone,
        interest: callData.extracted_data?.interest,
        qualified: callData.extracted_data?.qualified || false,
        appointmentBooked: callData.extracted_data?.appointment_booked || false,
        appointmentDate: callData.extracted_data?.appointment_date,
        paymentCaptured: callData.extracted_data?.payment_captured || false,
        paymentAmount: callData.extracted_data?.payment_amount
      }
    });

    agent.performance.totalCalls += 1;
    if (callData.status === 'completed') {
      agent.performance.successfulCalls += 1;
    }
    await agent.save();

    const usage = await Usage.findOne({ userId: agent.userId });
    if (usage) {
      usage.callsThisMonth += 1;
      await usage.save();
    }

    if (callData.extracted_data?.name && callData.extracted_data?.phone) {
      const lead = await Lead.create({
        userId: agent.userId,
        name: callData.extracted_data.name,
        email: callData.extracted_data.email || `${callData.caller_phone}@temp.com`,
        phone: callData.extracted_data.phone || callData.caller_phone,
        source: agent.type,
        qualified: callData.extracted_data.qualified || false,
        qualificationScore: callData.extracted_data.qualification_score || 0,
        value: callData.extracted_data.estimated_value || 0,
        callId: callLog._id
      });

      agent.performance.leadsGenerated += 1;
      await agent.save();

      if (usage) {
        usage.leadsGenerated += 1;
        await usage.save();
      }
    }

    const workflows = await N8nWorkflow.find({
      userId: agent.userId,
      enabled: true
    });

    for (const workflow of workflows) {
      const conditions = workflow.triggerConditions;

      let shouldTrigger = true;

      if (conditions.agentTypes && conditions.agentTypes.length > 0) {
        shouldTrigger = shouldTrigger && conditions.agentTypes.includes(agent.type);
      }

      if (conditions.callStatus && conditions.callStatus.length > 0) {
        shouldTrigger = shouldTrigger && conditions.callStatus.includes(callData.status);
      }

      if (conditions.leadQualified !== undefined) {
        shouldTrigger = shouldTrigger && (callData.extracted_data?.qualified === conditions.leadQualified);
      }

      if (shouldTrigger && workflow.n8nWorkflowId) {
        try {
          await n8nService.triggerWorkflow(workflow.n8nWorkflowId, {
            call: callLog,
            agent: { id: agent._id, name: agent.name, type: agent.type },
            extractedData: callData.extracted_data
          });

          workflow.executionCount += 1;
          workflow.lastExecutedAt = new Date();
          workflow.successCount += 1;
          await workflow.save();
        } catch (error) {
          console.error('Failed to trigger workflow:', error);
          workflow.failureCount += 1;
          await workflow.save();
        }
      }
    }

    res.json({ received: true, callId: callLog._id });
  } catch (error) {
    console.error('ElevenLabs Webhook Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const handleN8nWebhook = async (req, res) => {
  try {
    const data = req.body;
    console.log('N8N Webhook received:', data);

    res.json({ received: true });
  } catch (error) {
    console.error('N8N Webhook Error:', error);
    res.status(500).json({ message: error.message });
  }
};
