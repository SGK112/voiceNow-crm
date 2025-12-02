/**
 * Update Max Sales Agent with better interruption handling
 * - Reduce sensitivity to background noise and throat clearing
 * - Only allow clear, intentional interruptions
 *
 * Valid turn_eagerness values: "low", "normal", "high"
 * - "low" = agent is less eager to take the turn, waits longer, less interruption sensitivity
 * - "normal" = default behavior
 * - "high" = agent jumps in quickly
 *
 * Valid mode values: "silence" or "turn"
 * - "silence" = waits for silence to detect end of turn
 * - "turn" = uses turn-taking model
 */

const ELEVENLABS_API_KEY = 'sk_d55908b75aa06d00ac2c0b1a09e12869990d554454e1cf36';
const AGENT_ID = 'agent_9001kbez5eprftjtgapmmqy3xjej';

async function updateAgent() {
  console.log('Updating Max Sales Agent interruption settings...');

  // First get current agent config
  const getResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY
    }
  });

  if (!getResponse.ok) {
    console.error('Failed to get agent:', await getResponse.text());
    process.exit(1);
  }

  const currentAgent = await getResponse.json();
  console.log('Current turn settings:', JSON.stringify(currentAgent.conversation_config?.turn, null, 2));

  // Update with stricter interruption settings
  // turn_eagerness: "low" makes the agent less eager to interrupt
  // turn_timeout: longer timeout means more time before agent speaks (1-300 seconds)
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversation_config: {
        turn: {
          // Use "turn" mode for better turn-taking
          mode: "turn",
          // "patient" eagerness = less likely to interrupt on background noise/partial speech
          // Valid values: "patient", "normal", "eager"
          turn_eagerness: "patient",
          // Wait longer before taking turn (7 was current, let's try 10)
          turn_timeout: 10
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to update agent:', error);
    process.exit(1);
  }

  const data = await response.json();
  console.log('✅ Agent interruption settings updated!');
  console.log('Agent ID:', data.agent_id);
  console.log('New turn settings:', JSON.stringify(data.conversation_config?.turn, null, 2));
}

updateAgent().catch(console.error);
