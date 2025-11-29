/**
 * Aria SMS Service
 *
 * Enables Aria to intelligently respond to SMS messages
 * using her full AI capabilities and function calling
 */

import OpenAI from 'openai';
import { getCapabilityDefinitions } from '../utils/ariaCapabilities.js';
import AriaCapabilities from '../utils/ariaCapabilities.js';
import AgentSMS from '../models/AgentSMS.js';
import Lead from '../models/Lead.js';
import twilio from 'twilio';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

class AriaSMSService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!this.accountSid || !this.authToken || !this.phoneNumber) {
      console.warn('⚠️ Twilio credentials not configured for Aria SMS');
      this.twilioClient = null;
    } else {
      this.twilioClient = twilio(this.accountSid, this.authToken);
    }
  }
  /**
   * Process incoming SMS with Aria's AI
   */
  async processWithAria({ from, to, message, smsRecord, lead, agent }) {
    try {
      console.log(`🤖 Aria processing SMS from ${from}: "${message}"`);

      // Get SMS history for context
      const smsHistory = await AgentSMS.find({
        $or: [
          { from: from },
          { to: from }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Build conversation context
      const conversationHistory = this.buildConversationHistory(smsHistory, from);

      // Get lead context if available
      let leadContext = '';
      if (lead) {
        leadContext = `
CONTACT INFORMATION:
- Name: ${lead.name || 'Unknown'}
- Phone: ${lead.phone}
- Email: ${lead.email || 'Not provided'}
- Status: ${lead.status || 'New'}
- Source: ${lead.source || 'Unknown'}
- Notes: ${lead.notes || 'None'}
`;
      }

      // Build messages for GPT
      const messages = [
        {
          role: 'system',
          content: `You are Aria, an intelligent AI assistant for VoiceNow CRM via SMS.

PERSONALITY:
- Professional, friendly, and helpful
- Concise responses (SMS format - keep under 160 characters when possible)
- Use natural, conversational language
- Proactive and solution-oriented

CAPABILITIES:
You have access to powerful capabilities through function calling:
- Web search for information
- Send emails and SMS messages
- Access CRM data (leads, messages, calls)
- Remember and recall information
- Search contacts

IMPORTANT RULES:
1. Keep SMS responses BRIEF and actionable (under 160 chars preferred)
2. If a complex response is needed, offer to call or email instead
3. Always identify yourself as "Aria from VoiceFlow" on first contact
4. Use capabilities proactively when helpful
5. Handle appointment confirmations, rescheduling, and basic questions
6. For sensitive topics, offer to connect with a human representative

CONTEXT AWARENESS:
- Remember previous messages in the conversation
- Use lead information when available
- Be contextually appropriate based on lead status
${leadContext}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT MESSAGE:
The user just sent: "${message}"

Respond appropriately, using your capabilities when needed. Keep it brief!`
        },
        {
          role: 'user',
          content: message
        }
      ];

      // Call GPT with function calling
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 150, // SMS responses should be concise
        temperature: 0.8,
        tools: getCapabilityDefinitions().map(cap => ({
          type: 'function',
          function: cap
        })),
        tool_choice: 'auto'
      });

      const responseMessage = completion.choices[0].message;

      // Handle function calls if present
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        console.log(`📞 Aria wants to use ${responseMessage.tool_calls.length} capabilities`);

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          console.log(`   Executing: ${functionName}(${JSON.stringify(functionArgs)})`);

          try {
            const ariaCapabilities = new AriaCapabilities();
            await ariaCapabilities.execute(functionName, functionArgs);
          } catch (error) {
            console.error(`   ❌ Failed to execute ${functionName}:`, error.message);
          }
        }
      }

      // Get the text response
      let ariaResponse = responseMessage.content || 'I understand. How can I help you further?';

      // Truncate if too long (SMS limit is 160 chars for single message, 1600 for concatenated)
      if (ariaResponse.length > 320) {
        ariaResponse = ariaResponse.substring(0, 317) + '...';
      }

      console.log(`✅ Aria response: "${ariaResponse}"`);

      // Send SMS response via Twilio
      if (!this.twilioClient) {
        throw new Error('Twilio client not initialized');
      }

      const twilioMessage = await this.twilioClient.messages.create({
        body: ariaResponse,
        from: this.phoneNumber,
        to: from
      });

      // Log SMS in database
      await AgentSMS.create({
        userId: lead?.userId || agent?.userId,
        agentId: agent?._id,
        leadId: lead?._id,
        direction: 'outbound',
        to: from,
        from: this.phoneNumber,
        message: ariaResponse,
        status: twilioMessage.status,
        twilioSid: twilioMessage.sid,
        metadata: {
          type: 'aria_ai_response',
          originalMessage: message,
          modelUsed: 'gpt-4o-mini',
          tokensUsed: completion.usage?.total_tokens
        }
      });

      return {
        success: true,
        response: ariaResponse,
        functionsUsed: responseMessage.tool_calls?.length || 0
      };

    } catch (error) {
      console.error('❌ Aria SMS processing failed:', error);

      // Send fallback response
      if (this.twilioClient) {
        try {
          const fallbackMessage = 'Thanks for your message! A team member will get back to you shortly.';
          const twilioMessage = await this.twilioClient.messages.create({
            body: fallbackMessage,
            from: this.phoneNumber,
            to: from
          });

          // Log fallback SMS
          await AgentSMS.create({
            userId: lead?.userId || agent?.userId,
            agentId: agent?._id,
            leadId: lead?._id,
            direction: 'outbound',
            to: from,
            from: this.phoneNumber,
            message: fallbackMessage,
            status: twilioMessage.status,
            twilioSid: twilioMessage.sid,
            metadata: {
              type: 'aria_fallback',
              error: error.message
            }
          });
        } catch (fallbackError) {
          console.error('❌ Fallback SMS also failed:', fallbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Build conversation history from SMS records
   */
  buildConversationHistory(smsHistory, userPhone) {
    if (!smsHistory || smsHistory.length === 0) {
      return 'This is the first message in this conversation.';
    }

    // Reverse to chronological order
    const chronological = [...smsHistory].reverse();

    let history = '';
    chronological.forEach(sms => {
      const isFromUser = sms.from === userPhone;
      const sender = isFromUser ? 'User' : 'Aria';
      history += `${sender}: ${sms.message}\n`;
    });

    return history.trim() || 'No previous messages.';
  }

  /**
   * Determine if Aria should auto-respond to this message
   */
  shouldAriaRespond(message, lead) {
    const lowerMessage = message.toLowerCase().trim();

    // Don't respond to opt-out messages (handled by agentSMSService)
    if (lowerMessage.includes('stop') || lowerMessage.includes('unsubscribe')) {
      return false;
    }

    // Don't respond to opt-in messages (handled by agentSMSService)
    if (lowerMessage === 'start' || lowerMessage === 'subscribe') {
      return false;
    }

    // Check if lead has opted out
    if (lead?.smsOptOut) {
      return false;
    }

    // Respond to everything else
    return true;
  }
}

export default new AriaSMSService();
