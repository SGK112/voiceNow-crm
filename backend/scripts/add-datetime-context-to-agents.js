/**
 * Add Current Date/Time Context to All AI Agents
 *
 * This script updates all ElevenLabs agents to include current date/time
 * awareness so they can properly schedule appointments and understand timing.
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Agent IDs from .env (only the new format with agent_ prefix)
const AGENT_IDS = {
  'Demo Agent': process.env.ELEVENLABS_DEMO_AGENT_ID,
  'SMS Agent': process.env.ELEVENLABS_SMS_AGENT_ID,
  'Granite Agent': process.env.ELEVENLABS_GRANITE_AGENT_ID
};

const client = axios.create({
  baseURL: ELEVENLABS_API_URL,
  headers: {
    'xi-api-key': ELEVENLABS_API_KEY,
    'Content-Type': 'application/json'
  }
});

/**
 * Generate current date/time context block
 */
function generateDateTimeContext() {
  const now = new Date();

  // Format: Friday, November 15, 2025
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = now.toLocaleDateString('en-US', dateOptions);

  // Format: 3:45 PM MST
  const timeOptions = { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
  const formattedTime = now.toLocaleTimeString('en-US', timeOptions);

  // Get day of week
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  // Determine time of day
  const hour = now.getHours();
  let timeOfDay;
  if (hour < 12) timeOfDay = 'morning';
  else if (hour < 17) timeOfDay = 'afternoon';
  else if (hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  return `
**CURRENT DATE & TIME INFORMATION:**
📅 Today's Date: ${formattedDate}
🕐 Current Time: ${formattedTime}
📆 Day of Week: ${dayOfWeek}
☀️ Time of Day: ${timeOfDay}

**IMPORTANT - USE THIS INFORMATION:**
- When scheduling appointments, today is ${formattedDate}
- For "tomorrow", that means ${new Date(now.getTime() + 86400000).toLocaleDateString('en-US', dateOptions)}
- For "next week", that's the week starting ${new Date(now.getTime() + 7 * 86400000).toLocaleDateString('en-US', dateOptions)}
- When someone asks "what's today's date?", say "${formattedDate}"
- Always reference the correct day of week (${dayOfWeek})
- Adjust your greeting based on time of day (currently ${timeOfDay})

**BOOKING APPOINTMENTS:**
When scheduling, calculate dates from TODAY (${formattedDate}):
- "Tomorrow" = ${new Date(now.getTime() + 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
- "Next Monday" = Calculate from ${formattedDate}
- "This week" = ${dayOfWeek} ${now.getDate()} through ${new Date(now.getTime() + (7 - now.getDay()) * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
- "Next week" = Starting ${new Date(now.getTime() + (8 - now.getDay()) * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}

`.trim();
}

/**
 * Get agent configuration
 */
async function getAgent(agentId) {
  try {
    const response = await client.get(`/convai/agents/${agentId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching agent ${agentId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Update agent with date/time context
 */
async function updateAgentWithDateTime(agentId, agentName) {
  console.log(`\n🔄 Updating ${agentName}...`);

  // Get current agent configuration
  const agent = await getAgent(agentId);
  if (!agent) {
    console.log(`⏭️  Skipping ${agentName} - not found`);
    return false;
  }

  // Get current prompt
  const currentPrompt = agent.conversation_config?.agent?.prompt?.prompt || '';

  // Check if already has date/time context
  if (currentPrompt.includes('CURRENT DATE & TIME INFORMATION')) {
    console.log(`⏭️  ${agentName} already has date/time context - updating...`);
    // Remove old context and add new one
    const updatedPrompt = currentPrompt.replace(/\*\*CURRENT DATE & TIME INFORMATION:\*\*[\s\S]*?(?=\n\n(?:\*\*[A-Z]|\w+:)|$)/, '').trim();
    var newPrompt = generateDateTimeContext() + '\n\n' + updatedPrompt;
  } else {
    console.log(`➕ Adding date/time context to ${agentName}...`);
    // Add date/time context at the beginning
    var newPrompt = generateDateTimeContext() + '\n\n' + currentPrompt;
  }

  // Update agent
  try {
    await client.patch(`/convai/agents/${agentId}`, {
      conversation_config: {
        agent: {
          prompt: {
            prompt: newPrompt
          }
        }
      }
    });
    console.log(`✅ ${agentName} updated successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update ${agentName}:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Adding Date/Time Context to All Agents\n');
  console.log('Current Context Block:');
  console.log('─'.repeat(60));
  console.log(generateDateTimeContext());
  console.log('─'.repeat(60));

  let successCount = 0;
  let failCount = 0;

  for (const [name, agentId] of Object.entries(AGENT_IDS)) {
    if (!agentId) {
      console.log(`⏭️  Skipping ${name} - not configured`);
      continue;
    }

    const success = await updateAgentWithDateTime(agentId, name);
    if (success) successCount++;
    else failCount++;

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Updated: ${successCount} agents`);
  console.log(`❌ Failed: ${failCount} agents`);
  console.log('═'.repeat(60));

  console.log('\n📝 NEXT STEPS:');
  console.log('1. Test an agent by calling or using the demo');
  console.log('2. Run this script daily to keep date/time current');
  console.log('3. Consider setting up a cron job for automatic updates');
  console.log('\n💡 TIP: Add this to a daily cron:');
  console.log('   0 0 * * * cd /path/to/app && node backend/scripts/add-datetime-context-to-agents.js');
}

main().catch(console.error);
