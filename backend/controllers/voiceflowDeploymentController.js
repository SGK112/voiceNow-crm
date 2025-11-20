import VoiceAgent from '../models/VoiceAgent.js';
import Integration from '../models/Integration.js';
import ElevenLabsService from '../services/elevenLabsService.js';
import mongoose from 'mongoose';

// Define VisualWorkflow schema
const visualWorkflowSchema = new mongoose.Schema({}, { strict: false });
const VisualWorkflow = mongoose.models.VisualWorkflow || mongoose.model('VisualWorkflow', visualWorkflowSchema);

/**
 * Deploy a VoiceFlow workflow as a live voice agent
 *
 * This converts the visual workflow into:
 * 1. VoiceAgent database record
 * 2. ElevenLabs conversational agent
 * 3. Webhook configuration for CRM integration
 */
export const deployWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🚀 Deploying workflow: ${id}`);

    // 1. Get workflow from database
    const workflow = await VisualWorkflow.findOne({ _id: id, userId: req.user._id });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // 2. Extract configuration from nodes
    const voiceNode = workflow.nodes?.find(n => n.type === 'voice');
    const promptNode = workflow.nodes?.find(n => n.type === 'prompt');
    const inboundNode = workflow.nodes?.find(n => n.type === 'inboundCall');
    const knowledgeNode = workflow.nodes?.find(n => n.type === 'knowledge');

    if (!voiceNode || !promptNode) {
      return res.status(400).json({
        message: 'Workflow must have Voice and Prompt nodes to deploy'
      });
    }

    const voiceId = voiceNode.data?.voiceId;
    const voiceName = voiceNode.data?.voiceName || 'Default Voice';
    const script = promptNode.data?.prompt;
    const firstMessage = promptNode.data?.firstMessage || 'Hello! How can I help you today?';
    const phoneNumber = inboundNode?.data?.twilioNumber;
    const knowledgeUrls = knowledgeNode?.data?.urls || [];

    console.log(`📋 Configuration extracted:`);
    console.log(`  Voice: ${voiceName}`);
    console.log(`  Script length: ${script?.length} chars`);
    console.log(`  Phone: ${phoneNumber || 'Not configured'}`);

    // 3. Create or update VoiceAgent in database
    let agent = await VoiceAgent.findOne({ workflowId: id });

    if (agent) {
      console.log(`📝 Updating existing agent: ${agent._id}`);
      agent.name = workflow.name;
      agent.voiceId = voiceId;
      agent.script = script;
      agent.firstMessage = firstMessage;
      agent.phoneNumber = phoneNumber;
      agent.knowledgeBaseUrls = knowledgeUrls;
      agent.updatedAt = new Date();
      await agent.save();
    } else {
      console.log(`✨ Creating new agent`);
      agent = await VoiceAgent.create({
        userId: req.user._id,
        workflowId: id,
        name: workflow.name,
        type: 'inbound',
        voiceId: voiceId,
        script: script,
        firstMessage: firstMessage,
        phoneNumber: phoneNumber,
        knowledgeBaseUrls: knowledgeUrls,
        language: 'en',
        enabled: true
      });
    }

    // 4. Sync to ElevenLabs
    const elevenLabsService = new ElevenLabsService();

    const elevenLabsConfig = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: script,
            voice: {
              voice_id: voiceId
            }
          },
          first_message: firstMessage,
          language: 'en'
        }
      },
      name: workflow.name,
      tags: ['voiceflow-deployed', `user:${req.user._id}`]
    };

    try {
      if (agent.elevenLabsAgentId) {
        // Update existing ElevenLabs agent
        console.log(`🔄 Updating ElevenLabs agent: ${agent.elevenLabsAgentId}`);
        await elevenLabsService.updateAgent(agent.elevenLabsAgentId, elevenLabsConfig);
      } else {
        // Create new ElevenLabs agent
        console.log(`🎙️ Creating new ElevenLabs agent`);
        const elevenLabsAgent = await elevenLabsService.createAgent(elevenLabsConfig);

        agent.elevenLabsAgentId = elevenLabsAgent.agent_id;
        await agent.save();

        console.log(`✅ ElevenLabs agent created: ${elevenLabsAgent.agent_id}`);
      }
    } catch (elevenLabsError) {
      console.error('❌ ElevenLabs sync error:', elevenLabsError.message);
      return res.status(500).json({
        message: 'Agent created in database but failed to sync with ElevenLabs',
        error: elevenLabsError.message,
        agent: { _id: agent._id, name: agent.name }
      });
    }

    // 5. Configure webhook URL
    const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/webhooks/elevenlabs/${agent._id}`;

    console.log(`✅ Deployment complete!`);

    res.json({
      success: true,
      message: 'Workflow deployed successfully',
      agent: {
        _id: agent._id,
        name: agent.name,
        elevenLabsAgentId: agent.elevenLabsAgentId,
        voiceId: agent.voiceId,
        phoneNumber: agent.phoneNumber
      },
      webhookUrl,
      testUrl: `/app/agents/${agent._id}`,
      frontendUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/agents/${agent._id}`
    });

  } catch (error) {
    console.error('❌ Deployment error:', error);
    res.status(500).json({
      message: 'Failed to deploy workflow',
      error: error.message
    });
  }
};

/**
 * Get deployment status for a workflow
 */
export const getDeploymentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const workflow = await VisualWorkflow.findOne({ _id: id, userId: req.user._id });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    const agent = await VoiceAgent.findOne({ workflowId: id });

    if (!agent) {
      return res.json({
        deployed: false,
        workflow: {
          _id: workflow._id,
          name: workflow.name
        }
      });
    }

    res.json({
      deployed: true,
      workflow: {
        _id: workflow._id,
        name: workflow.name
      },
      agent: {
        _id: agent._id,
        name: agent.name,
        elevenLabsAgentId: agent.elevenLabsAgentId,
        enabled: agent.enabled,
        phoneNumber: agent.phoneNumber
      },
      testUrl: `/app/agents/${agent._id}`
    });

  } catch (error) {
    console.error('❌ Get deployment status error:', error);
    res.status(500).json({ message: error.message });
  }
};
