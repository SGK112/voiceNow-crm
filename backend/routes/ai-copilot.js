import express from 'express';
import AIService from '../services/aiService.js';
import ElevenLabsService from '../services/elevenLabsService.js';

const router = express.Router();
const aiService = new AIService();
const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

/**
 * AI Workflow Copilot
 * Analyzes workflows, suggests improvements, and implements changes
 */
router.post('/workflow-copilot', async (req, res) => {
  try {
    const { message, workflow, conversationHistory } = req.body;

    console.log('🤖 AI Copilot request:', { message, workflow: workflow.agentName, nodes: workflow.nodeCount });

    // Build context for AI
    const workflowStatus = workflow.nodeCount === 0
      ? "**Current Workflow:** Empty workspace - ready to build from scratch!"
      : `**Current Workflow:**
- Agent Name: ${workflow.agentName}
- Nodes: ${workflow.nodeCount} (${workflow.nodes.map(n => n.type).join(', ')})
- Connections: ${workflow.edgeCount}

**Node Details:**
${workflow.nodes.map(n => `- ${n.id} (${n.type}): ${JSON.stringify(n.data).substring(0, 100)}${Object.keys(n.data).length > 0 ? '...' : 'not configured'}`).join('\n')}`;

    const logsContext = workflow.recentLogs && workflow.recentLogs.length > 0
      ? `\n**Recent Console Logs:**\n${workflow.recentLogs.map(log => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`).join('\n')}\n`
      : '';

    const systemPrompt = `You are an AI Workflow Copilot assistant helping users build voice agent workflows.

${workflowStatus}${logsContext}

**Your Capabilities:**
1. Analyze workflows and suggest improvements
2. Recommend missing nodes (e.g., calendar for appointments, human handoff for escalations)
3. Suggest node connections and workflow optimization
4. Provide best practices for voice agent design
5. Implement changes by returning structured change commands
6. Read and interpret console logs to help debug issues
7. Explain errors and provide solutions based on log messages
8. Help configure the Test node for making live calls, SMS, or email tests

**Available Node Types:**

**Call Flow Nodes:**
- inboundCall: Starting point for workflows that receive incoming phone calls
  * No input connections (it's the entry point)
  * Connects to voice/prompt nodes
  * Used for customer service, support, sales inquiries
- outboundCall: Makes outbound calls to customers
  * Requires input connection (triggered by something)
  * data: { phoneNumber: "+1234567890" }
  * Connects to voice/prompt to define what the agent says

**Core Agent Nodes:**
- voice: AI voice selection (required for all voice agents)
- prompt: Agent instructions/personality (required for all voice agents)
- knowledge: Documents and URLs for context (FAQs, website content)

**Action Nodes:**
- calendar: Appointment scheduling (Google Calendar, Calendly, etc.)
- code: Custom logic execution
- humanHandoff: Transfer calls to humans
- sms/mms/email: Send messages
- webhook: API integrations

**AI Processing Nodes:**
- aiDecision: AI-powered routing (yes/no decisions)
- aiGenerator: Generate dynamic content
- aiExtractor: Extract structured data from conversation
- aiIntent: Classify customer intent

**Testing:**
- test: Test node for making live calls, SMS, or MMS
  * Connects AFTER voice and prompt are configured
  * testType: "call", "sms", or "mms"
  * testData: { phone: "+1234567890" }

**Response Format:**
You MUST ALWAYS return ONLY valid JSON. No markdown, no code blocks, no explanations outside the JSON.
The JSON should be in this exact format:

{
  "message": "Your explanation to the user",
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "changes": {
    "nodes": [
      {
        "action": "add",
        "tempId": "temp-1",
        "type": "calendar",
        "data": {
          "calendarType": "google",
          "calendarName": "primary"
        }
      },
      {
        "action": "update",
        "nodeId": "existing-node-id",
        "data": {
          "fieldToUpdate": "new value"
        }
      }
    ],
    "edges": [
      {
        "action": "add",
        "source": "existing-node-id",
        "target": "temp-1"
      }
    ]
  }
}

**IMPORTANT RULES:**
1. When adding nodes, use "tempId" (like "temp-1", "temp-2") for new nodes - DO NOT include position coordinates
2. When creating edges, reference existing node IDs or the tempIds of new nodes
3. The frontend will automatically position nodes in a smart layout
4. Only include "changes" if the user explicitly asks you to implement, add, create, or build something
5. If user asks questions or wants suggestions, only return "message" and "suggestions" - no "changes"
6. When adding multiple nodes, give each a unique tempId (temp-1, temp-2, temp-3, etc.)

**Common Workflow Patterns:**

1. **Inbound Customer Service** (receives calls):
   inboundCall → voice → prompt → knowledge → aiIntent → [humanHandoff or aiGenerator]
   + Add test node connected after prompt to test the agent

2. **Outbound Sales Calls** (makes calls):
   trigger/schedule → outboundCall → voice → prompt → aiExtractor (collect info) → calendar/email
   + Add test node to test making calls

3. **Appointment Booking** (receives calls):
   inboundCall → voice → prompt → aiIntent → calendar → sms (confirmation)
   + Add test node to test the booking flow

4. **Lead Qualification** (receives calls):
   inboundCall → voice → prompt → aiExtractor → aiDecision → [humanHandoff or saveLead]

**Building from Scratch:**
When the workspace is empty and user asks to "build" or "create" a workflow:

**For INBOUND workflows (answering calls):**
- Start with inboundCall node (this receives calls)
- Add voice and prompt nodes (essential)
- Add knowledge node if they mention FAQs, docs, or website
- Add test node at the end to let them call and test
- Connect: inboundCall → voice → prompt → knowledge → test

**For OUTBOUND workflows (making calls):**
- Start with outboundCall node
- Add voice and prompt nodes
- Connect: outboundCall → voice → prompt → [actions]
- Add test node to trigger test calls

**The Test Node:**
- Always add a test node when building workflows
- It connects AFTER voice and prompt are set up
- It allows users to make real test calls to verify their agent works

**User's Request:** ${message}`;

    // Call AI service with message array
    const response = await aiService.chatWithMessages([
      {
        role: 'system',
        content: systemPrompt
      },
      ...(conversationHistory || []),
      {
        role: 'user',
        content: message
      }
    ], {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1500,
      responseFormat: 'json_object' // Force JSON mode
    });

    // Parse AI response - handle various formats
    let aiResponse;
    try {
      // Try direct parse first
      aiResponse = JSON.parse(response);
    } catch (parseError) {
      console.log('Direct JSON parse failed, trying to extract...');

      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                        response.match(/(\{[\s\S]*\})/);

      if (jsonMatch && jsonMatch[1]) {
        try {
          aiResponse = JSON.parse(jsonMatch[1]);
          console.log('✅ Extracted JSON from response');
        } catch (extractError) {
          console.error('Failed to parse extracted JSON:', extractError);
          aiResponse = {
            message: response,
            suggestions: []
          };
        }
      } else {
        // Fallback if no JSON found
        console.log('No JSON found, using raw response');
        aiResponse = {
          message: response,
          suggestions: []
        };
      }
    }

    console.log('✅ AI Copilot response generated');

    res.json(aiResponse);

  } catch (error) {
    console.error('❌ AI Copilot error:', error);
    res.status(500).json({
      error: error.message,
      message: "I'm having trouble right now. Could you try rephrasing your question?"
    });
  }
});

/**
 * AI Prompt Generator
 * Generates custom system prompts based on user requirements
 */
router.post('/generate-prompt', async (req, res) => {
  try {
    const { purpose, tone, industry, additionalInfo } = req.body;

    console.log('✨ AI Prompt Generator request:', { purpose, tone, industry });

    const systemPrompt = `You are an expert AI prompt engineer specializing in creating system prompts for voice AI agents.

Your task is to generate a professional, detailed system prompt for a voice AI agent based on the user's requirements.

**Requirements:**
- Purpose: ${purpose}
- Tone: ${tone}
- Industry: ${industry || 'General'}
${additionalInfo ? `- Additional Info: ${additionalInfo}` : ''}

**Guidelines for creating the system prompt:**
1. Start by defining who the agent is and their role
2. Clearly state the agent's primary goals and responsibilities
3. Define the tone and personality (match the requested tone: ${tone})
4. Include specific behaviors and response guidelines
5. Add boundaries - what the agent should NOT do
6. Include industry-specific knowledge if applicable
7. Add conversation flow guidance
8. Keep it clear, actionable, and specific

**IMPORTANT:** Return ONLY a JSON object with this structure:
{
  "prompt": "The full system prompt text here",
  "firstMessage": "A suggested greeting message",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

No markdown, no code blocks, just the JSON object.`;

    // Call AI service
    const response = await aiService.chatWithMessages([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Generate a system prompt for a ${purpose} agent with a ${tone} tone in the ${industry || 'general'} industry.`
      }
    ], {
      model: 'gpt-4o-mini',
      temperature: 0.8,
      maxTokens: 1000,
      responseFormat: 'json_object'
    });

    // Parse response
    let aiResponse;
    try {
      aiResponse = JSON.parse(response);
    } catch (parseError) {
      // Try to extract JSON
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                        response.match(/(\{[\s\S]*\})/);

      if (jsonMatch && jsonMatch[1]) {
        aiResponse = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    console.log('✅ Generated prompt successfully');

    res.json({
      success: true,
      ...aiResponse
    });

  } catch (error) {
    console.error('❌ Prompt generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate prompt. Please try again.'
    });
  }
});

/**
 * Voice Copilot - Text/Voice Command Handler
 * Accepts text or voice commands and returns AI response with optional TTS audio
 */
router.post('/voice-command', async (req, res) => {
  try {
    const { command, context = {}, conversationHistory = [], returnAudio = true } = req.body;

    console.log('🎙️ Voice Copilot command:', command);

    // Build comprehensive system prompt for the VoiceFlow AI Wizard
    const systemPrompt = `You are the VoiceFlow AI Wizard, an intelligent voice assistant that helps users create and manage AI voice agents, workflows, and automation.

**Your Capabilities:**
1. Create AI voice agents with custom personalities and voices
2. Build workflows with various nodes (voice, prompt, calendar, SMS, email, webhooks, etc.)
3. Generate images and media using AI
4. Answer questions about VoiceFlow features and capabilities
5. Configure automations and integrations
6. Help with troubleshooting and optimization

**Current Context:**
${context.page ? `- Current Page: ${context.page}` : ''}
${context.selectedAgent ? `- Selected Agent: ${context.selectedAgent}` : ''}
${context.workflowNodes ? `- Workflow Nodes: ${context.workflowNodes}` : ''}

**Response Guidelines:**
- Be conversational, friendly, and helpful
- Keep responses concise (2-3 sentences for simple questions)
- For complex tasks, break down the steps clearly
- Use natural language suitable for voice output
- Avoid technical jargon unless specifically asked
- Include emojis sparingly for personality

**Action Types You Can Return:**
When the user asks you to DO something (create, build, add, configure), return an action in your response:

{
  "message": "Your conversational response",
  "action": {
    "type": "create_agent",
    "data": {
      "name": "Agent Name",
      "voice": "voice-id",
      "prompt": "Agent instructions"
    }
  }
}

Available action types:
- "create_agent": Create a new AI voice agent
- "create_workflow": Build a new workflow
- "add_node": Add a node to current workflow
- "generate_image": Generate an AI image
- "navigate": Navigate to a different page
- "schedule_call": Schedule an outbound call
- "send_sms": Send an SMS message

**Examples:**

User: "Create a customer service agent"
Response: {
  "message": "I'll create a friendly customer service agent for you! This agent will be professional yet warm, perfect for handling customer inquiries.",
  "action": {
    "type": "create_agent",
    "data": {
      "name": "Customer Service Agent",
      "voice": "default",
      "prompt": "You are a helpful customer service representative. Be friendly, patient, and solution-oriented. Always greet customers warmly and ask how you can help them today."
    }
  }
}

User: "What can you do?"
Response: {
  "message": "I can help you create AI voice agents, build automation workflows, generate images, schedule calls, send SMS messages, and answer questions about VoiceFlow! What would you like to do today?"
}

User: "Generate an image of a sunset"
Response: {
  "message": "Creating a beautiful sunset image for you!",
  "action": {
    "type": "generate_image",
    "data": {
      "prompt": "Beautiful sunset over the ocean with vibrant orange and pink colors, photorealistic"
    }
  }
}

**User's Command:** ${command}`;

    // Call AI service
    const aiMessage = await aiService.chatWithMessages([
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: command }
    ], {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      responseFormat: 'json_object'
    });

    // Parse AI response
    let aiResponse;
    try {
      aiResponse = JSON.parse(aiMessage);
    } catch (parseError) {
      // Fallback if not valid JSON
      aiResponse = {
        message: aiMessage
      };
    }

    console.log('✅ AI response:', aiResponse.message?.substring(0, 100) + '...');

    // Generate audio using ElevenLabs TTS if requested
    let audioData = null;
    if (returnAudio && aiResponse.message) {
      try {
        console.log('🔊 Generating TTS audio...');
        const audio = await elevenLabsService.textToSpeech(aiResponse.message, {
          voiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL' // Default: Sarah voice
        });

        if (audio) {
          // Convert buffer to base64
          audioData = audio.toString('base64');
          console.log('✅ TTS audio generated');
        }
      } catch (ttsError) {
        console.error('⚠️ TTS generation failed:', ttsError.message);
        // Continue without audio
      }
    }

    res.json({
      success: true,
      data: {
        message: aiResponse.message,
        action: aiResponse.action || null,
        audio: audioData,
        conversationId: req.body.conversationId || null
      }
    });

  } catch (error) {
    console.error('❌ Voice command error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        message: "I'm having trouble right now. Could you try again?"
      }
    });
  }
});

export default router;
