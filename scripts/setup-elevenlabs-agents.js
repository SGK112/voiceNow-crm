import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const client = axios.create({
  baseURL: ELEVENLABS_API_URL,
  headers: {
    'xi-api-key': ELEVENLABS_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Agent configurations
const agentConfigs = [
  {
    name: 'Lead Generation Agent',
    type: 'lead_gen',
    description: 'Qualifies leads and captures contact information',
    prompt: `You are a friendly lead generation specialist. Your goal is to:
1. Greet the caller warmly
2. Ask about their needs and pain points
3. Capture their name, email, and phone number
4. Qualify them based on budget and timeline
5. Set clear next steps

Be conversational, listen actively, and always be helpful. If they're qualified, offer to schedule a follow-up call.`,
    firstMessage: "Hi! Thanks for calling. I'm here to help you learn more about our services. May I start by getting your name?",
    voice: {
      voice_id: '21m00Tcm4TlvDq8ikWAM', // Default ElevenLabs voice
      stability: 0.5,
      similarity_boost: 0.75
    }
  },
  {
    name: 'Appointment Booking Agent',
    type: 'booking',
    description: 'Books appointments and manages calendar',
    prompt: `You are an efficient appointment booking specialist. Your responsibilities:
1. Greet the caller professionally
2. Ask about their preferred date and time
3. Check availability (you have access to the calendar)
4. Confirm appointment details (date, time, duration)
5. Collect contact information (email/phone for reminders)
6. Send confirmation

Be clear about availability and always offer alternatives if their preferred time isn't available.`,
    firstMessage: "Hello! I'm here to help you schedule an appointment. What date and time works best for you?",
    voice: {
      voice_id: '21m00Tcm4TlvDq8ikWAM',
      stability: 0.6,
      similarity_boost: 0.8
    }
  },
  {
    name: 'Collections Agent',
    type: 'collections',
    description: 'Professional debt collection and payment arrangement',
    prompt: `You are a professional and empathetic collections specialist. Your approach:
1. Verify the caller's identity
2. Explain the outstanding balance clearly
3. Listen to their situation with empathy
4. Offer flexible payment options
5. Document payment commitments
6. Provide confirmation and next steps

Always maintain a respectful tone. The goal is to find a mutually beneficial solution, not to be aggressive.`,
    firstMessage: "Good day. I'm calling regarding your account. May I please verify your name and account number?",
    voice: {
      voice_id: '21m00Tcm4TlvDq8ikWAM',
      stability: 0.7,
      similarity_boost: 0.75
    }
  },
  {
    name: 'Promotional Campaign Agent',
    type: 'promo',
    description: 'Promotes special offers and campaigns',
    prompt: `You are an enthusiastic promotional specialist. Your mission:
1. Greet the caller with energy
2. Present the special offer clearly
3. Highlight key benefits and value
4. Create urgency (limited time, limited spots)
5. Handle objections positively
6. Close with a clear call-to-action

Be excited but not pushy. Focus on how the offer solves their problems.`,
    firstMessage: "Hi there! I have some exciting news to share with you about our limited-time offer. Do you have a quick minute?",
    voice: {
      voice_id: '21m00Tcm4TlvDq8ikWAM',
      stability: 0.4,
      similarity_boost: 0.9
    }
  },
  {
    name: 'Customer Support Agent',
    type: 'support',
    description: 'Provides customer support and troubleshooting',
    prompt: `You are a knowledgeable and patient customer support specialist. Your role:
1. Greet the caller warmly
2. Listen carefully to their issue
3. Ask clarifying questions
4. Provide clear step-by-step solutions
5. Verify the issue is resolved
6. Offer additional help if needed

Be patient, thorough, and always confirm understanding. If you can't solve it, escalate professionally.`,
    firstMessage: "Hello! Welcome to support. I'm here to help you with any questions or issues you might have. What can I assist you with today?",
    voice: {
      voice_id: '21m00Tcm4TlvDq8ikWAM',
      stability: 0.65,
      similarity_boost: 0.8
    }
  }
];

async function createConversationalAgent(config) {
  try {
    console.log(`\n📞 Creating agent: ${config.name}...`);

    const response = await client.post('/convai/agents', {
      name: config.name,
      conversation_config: {
        agent: {
          prompt: {
            prompt: config.prompt,
            llm: 'gpt-4'
          },
          first_message: config.firstMessage,
          language: 'en'
        },
        tts: {
          voice_id: config.voice.voice_id,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: config.voice.stability,
            similarity_boost: config.voice.similarity_boost
          }
        },
        asr: {
          quality: 'high',
          user_input_audio_format: 'pcm_16000'
        }
      }
    });

    console.log(`✅ Created agent: ${config.name}`);
    console.log(`   Agent ID: ${response.data.agent_id}`);

    return {
      type: config.type,
      name: config.name,
      agentId: response.data.agent_id,
      description: config.description
    };
  } catch (error) {
    console.error(`❌ Error creating agent ${config.name}:`, error.response?.data || error.message);
    return null;
  }
}

async function setupAllAgents() {
  console.log('🚀 Starting ElevenLabs Agent Setup...');
  console.log(`API Key: ${ELEVENLABS_API_KEY ? 'SET' : 'NOT SET'}`);

  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
    process.exit(1);
  }

  const createdAgents = [];

  for (const config of agentConfigs) {
    const agent = await createConversationalAgent(config);
    if (agent) {
      createdAgents.push(agent);
    }
    // Wait 1 second between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Setup Summary');
  console.log('='.repeat(60));
  console.log(`\n✅ Successfully created ${createdAgents.length} agents:`);

  createdAgents.forEach(agent => {
    console.log(`\n${agent.name} (${agent.type})`);
    console.log(`   Agent ID: ${agent.agentId}`);
    console.log(`   Description: ${agent.description}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('📝 Update your .env file with these Agent IDs:');
  console.log('='.repeat(60) + '\n');

  createdAgents.forEach(agent => {
    const envVar = `ELEVENLABS_${agent.type.toUpperCase()}_AGENT_ID`;
    console.log(`${envVar}=${agent.agentId}`);
  });

  console.log('\n✅ Agent setup complete!');
  console.log('\nNext steps:');
  console.log('1. Update your .env file with the Agent IDs above');
  console.log('2. Configure phone numbers for each agent in ElevenLabs dashboard');
  console.log('3. Set webhook URL: https://your-domain.com/api/webhooks/elevenlabs/call-completed');
  console.log('4. Test each agent by calling their assigned phone numbers\n');
}

// Run setup
setupAllAgents().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
