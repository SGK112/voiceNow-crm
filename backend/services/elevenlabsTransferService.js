import axios from 'axios';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/convai/agents';

/**
 * Sync call transfer settings from VoiceNow CRM to ElevenLabs
 *
 * @param {Object} agent - VoiceAgent document from MongoDB
 * @returns {Promise<Object>} Updated agent configuration
 */
export async function syncTransferSettingsToElevenLabs(agent) {
  if (!agent.elevenLabsAgentId) {
    throw new Error('Agent does not have an ElevenLabs agent ID');
  }

  if (!agent.callTransfer || !agent.callTransfer.enabled) {
    // Transfer is disabled - remove transfer tool if it exists
    return removeTransferTool(agent.elevenLabsAgentId);
  }

  try {
    // Get current agent configuration from ElevenLabs
    const getResponse = await axios.get(
      `${ELEVENLABS_API_URL}/${agent.elevenLabsAgentId}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    const currentConfig = getResponse.data;

    // Build the transfer conditions string from the array
    const conditionsText = agent.callTransfer.transferConditions?.join(', ') ||
      'If the customer asks to speak with someone, if the caller is upset, or if you cannot help them.';

    // Determine transfer type for ElevenLabs
    let transferType = 'conference'; // default
    if (agent.callTransfer.transferType === 'cold') {
      transferType = 'blind'; // ElevenLabs uses 'blind' for cold transfers
    } else if (agent.callTransfer.transferType === 'warm') {
      transferType = 'warm';
    }

    // Build the transfer tool configuration
    const transferTool = {
      type: 'system',
      name: 'transfer_to_number',
      description: '',
      response_timeout_secs: 20,
      disable_interruptions: false,
      force_pre_tool_speech: false,
      assignments: [],
      tool_call_sound: null,
      tool_call_sound_behavior: 'auto',
      params: {
        system_tool_type: 'transfer_to_number',
        transfers: [
          {
            transfer_destination: {
              type: 'phone',
              phone_number: agent.callTransfer.transferNumber
            },
            phone_number: agent.callTransfer.transferNumber,
            condition: conditionsText,
            transfer_type: transferType
          }
        ],
        enable_client_message: true
      }
    };

    // Update the prompt to include transfer instructions
    const currentPrompt = currentConfig.conversation_config?.agent?.prompt?.prompt || '';
    const transferInstructions = buildTransferInstructions(agent.callTransfer);

    // Check if transfer instructions already exist in prompt
    const hasTransferSection = currentPrompt.includes('WHEN TO TRANSFER') ||
                               currentPrompt.includes('CALL TRANSFER');

    let updatedPrompt = currentPrompt;
    if (!hasTransferSection) {
      // Add transfer instructions to the end of the prompt
      updatedPrompt = `${currentPrompt}\n\n${transferInstructions}`;
    } else {
      // Replace existing transfer section
      updatedPrompt = currentPrompt.replace(
        /(?:WHEN TO TRANSFER|CALL TRANSFER)[\s\S]*?(?=\n\n[A-Z]|$)/,
        transferInstructions
      );
    }

    // Check if transfer tool already exists
    const existingTools = currentConfig.conversation_config?.agent?.prompt?.tools || [];
    const hasTransferTool = existingTools.some(t =>
      t.type === 'system' && t.params?.system_tool_type === 'transfer_to_number'
    );

    let updatedTools;
    if (hasTransferTool) {
      // Replace existing transfer tool
      updatedTools = existingTools.map(t =>
        (t.type === 'system' && t.params?.system_tool_type === 'transfer_to_number')
          ? transferTool
          : t
      );
    } else {
      // Add new transfer tool
      updatedTools = [...existingTools, transferTool];
    }

    // Update the agent configuration
    const updatePayload = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: updatedPrompt,
            tools: updatedTools
          }
        }
      }
    };

    const updateResponse = await axios.patch(
      `${ELEVENLABS_API_URL}/${agent.elevenLabsAgentId}`,
      updatePayload,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      message: 'Transfer settings synced successfully',
      data: updateResponse.data
    };

  } catch (error) {
    console.error('Error syncing transfer settings to ElevenLabs:', error.response?.data || error.message);
    throw new Error(
      `Failed to sync transfer settings: ${error.response?.data?.detail?.message || error.message}`
    );
  }
}

/**
 * Remove transfer tool from ElevenLabs agent
 */
async function removeTransferTool(elevenLabsAgentId) {
  try {
    const getResponse = await axios.get(
      `${ELEVENLABS_API_URL}/${elevenLabsAgentId}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    const currentConfig = getResponse.data;
    const existingTools = currentConfig.conversation_config?.agent?.prompt?.tools || [];

    // Remove transfer tool
    const updatedTools = existingTools.filter(t =>
      !(t.type === 'system' && t.params?.system_tool_type === 'transfer_to_number')
    );

    // Remove transfer instructions from prompt
    const currentPrompt = currentConfig.conversation_config?.agent?.prompt?.prompt || '';
    const updatedPrompt = currentPrompt.replace(
      /(?:WHEN TO TRANSFER|CALL TRANSFER)[\s\S]*?(?=\n\n[A-Z]|$)/,
      ''
    ).trim();

    const updatePayload = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: updatedPrompt,
            tools: updatedTools
          }
        }
      }
    };

    await axios.patch(
      `${ELEVENLABS_API_URL}/${elevenLabsAgentId}`,
      updatePayload,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      message: 'Transfer tool removed successfully'
    };

  } catch (error) {
    console.error('Error removing transfer tool:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Build transfer instructions for the agent prompt
 */
function buildTransferInstructions(callTransfer) {
  const { transferConditions, transferMessage, transferNumber } = callTransfer;

  const conditionsList = transferConditions && transferConditions.length > 0
    ? transferConditions.map(c => `- ${c}`).join('\n')
    : `- Customer asks to speak with someone else\n- Customer is upset or frustrated\n- You cannot help with their request`;

  return `WHEN TO TRANSFER CALLS:
✅ Transfer immediately if:
${conditionsList}

HOW TO TRANSFER:
When transferring, say: "${transferMessage || 'Let me connect you with someone who can help you with that. One moment please.'}"
Then use the transfer_to_number tool to connect them to ${transferNumber}.

❌ Do NOT transfer for routine inquiries you can handle yourself.`;
}

/**
 * Get transfer status from ElevenLabs agent
 */
export async function getTransferStatus(elevenLabsAgentId) {
  try {
    const response = await axios.get(
      `${ELEVENLABS_API_URL}/${elevenLabsAgentId}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    const tools = response.data.conversation_config?.agent?.prompt?.tools || [];
    const transferTool = tools.find(t =>
      t.type === 'system' && t.params?.system_tool_type === 'transfer_to_number'
    );

    if (!transferTool) {
      return {
        enabled: false,
        configured: false
      };
    }

    const transfer = transferTool.params.transfers?.[0];

    return {
      enabled: true,
      configured: true,
      transferNumber: transfer?.phone_number,
      condition: transfer?.condition,
      transferType: transfer?.transfer_type
    };

  } catch (error) {
    console.error('Error getting transfer status:', error.response?.data || error.message);
    throw error;
  }
}
