import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_URL = 'http://localhost:5001/api/ai-copilot';

console.log('\n========================================');
console.log('🧪 TESTING AI PROMPT GENERATION');
console.log('========================================\n');

async function testPromptGeneration() {
  console.log('Test: Generating AI Prompt');
  console.log('🌐 Endpoint: POST /api/ai-copilot/generate-prompt\n');

  const testData = {
    purpose: 'Customer Support',
    tone: 'Friendly & Casual',
    industry: 'Home Remodeling',
    additionalInfo: 'We help homeowners with kitchen and bathroom renovations. We offer free consultations and estimates.'
  };

  console.log('📋 Test Data:', testData);
  console.log('');

  try {
    console.log('⏳ Generating prompt...\n');

    const response = await axios.post(`${API_URL}/generate-prompt`, testData);

    if (response.data.success) {
      console.log('✅ Prompt Generated Successfully!\n');
      console.log('========================================');
      console.log('📝 GENERATED SYSTEM PROMPT:');
      console.log('========================================');
      console.log(response.data.prompt);
      console.log('\n========================================');
      console.log('👋 FIRST MESSAGE:');
      console.log('========================================');
      console.log(response.data.firstMessage);
      console.log('\n========================================');

      if (response.data.tips && response.data.tips.length > 0) {
        console.log('💡 TIPS:');
        console.log('========================================');
        response.data.tips.forEach((tip, idx) => {
          console.log(`${idx + 1}. ${tip}`);
        });
        console.log('========================================\n');
      }

      console.log('✅ TEST PASSED!\n');
      console.log('📝 Next Steps:');
      console.log('1. Open http://localhost:5173/app/voiceflow-builder');
      console.log('2. Add a Prompt node to your workflow');
      console.log('3. Click the "AI Wizard" button');
      console.log('4. Fill in the form and click "Generate Prompt with AI"');
      console.log('5. The generated prompt will appear in the System Prompt field\n');

      return true;
    } else {
      console.error('❌ Generation failed:', response.data.message);
      return false;
    }

  } catch (error) {
    console.error('❌ TEST FAILED');
    console.error('Error:', error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);

      if (error.response.status === 500) {
        console.error('\n⚠️  Server error! Check:');
        console.error('   - Backend server is running (npm run server)');
        console.error('   - OpenAI API key is set in .env');
        console.error('   - Backend logs for detailed error');
      }
    } else if (error.request) {
      console.error('\n⚠️  No response from server!');
      console.error('   - Is the backend running on port 5001?');
      console.error('   - Run: npm run server');
    }

    console.log('');
    return false;
  }
}

// Run the test
testPromptGeneration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
