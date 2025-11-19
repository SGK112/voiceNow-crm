import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Setup Shared Credentials in n8n
 * Creates pre-configured credentials that all users can access
 */

const n8nClient = axios.create({
  baseURL: process.env.N8N_API_URL || 'http://5.183.8.119:5678',
  headers: {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': process.env.N8N_API_KEY
  }
});

const sharedCredentials = [
  {
    name: 'VoiceFlow CRM - MongoDB',
    type: 'mongoDb',
    data: {
      connectionString: process.env.MONGODB_URI
    }
  },
  {
    name: 'VoiceFlow CRM - Twilio SMS',
    type: 'twilioApi',
    data: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN
    }
  },
  {
    name: 'VoiceFlow CRM - SMTP Email',
    type: 'smtp',
    data: {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false
    }
  }
];

async function setupSharedCredentials() {
  console.log('🔐 Setting up shared credentials in n8n...\n');

  for (const cred of sharedCredentials) {
    try {
      // Check if credential already exists
      const existing = await n8nClient.get('/api/v1/credentials');
      const exists = existing.data.data?.some(c => c.name === cred.name);

      if (exists) {
        console.log(`⏭️  ${cred.name} - Already exists`);
        continue;
      }

      // Create new credential
      await n8nClient.post('/api/v1/credentials', {
        name: cred.name,
        type: cred.type,
        data: cred.data,
        nodesAccess: [
          { nodeType: '*' }  // Allow all nodes to use this credential
        ]
      });

      console.log(`✅ ${cred.name} - Created successfully`);
    } catch (error) {
      console.error(`❌ ${cred.name} - Failed:`, error.response?.data?.message || error.message);
    }
  }

  console.log('\n🎉 Shared credentials setup complete!');
  console.log('\n💡 Users can now use these credentials without configuration:');
  sharedCredentials.forEach(cred => {
    console.log(`   📌 ${cred.name}`);
  });
}

setupSharedCredentials().catch(console.error);
