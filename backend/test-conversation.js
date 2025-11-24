#!/usr/bin/env node

/**
 * Conversation Test Script
 *
 * This script simulates a full conversation with Aria to test:
 * - Voice activity detection timing
 * - Conversation history/context
 * - Response latency
 * - Auto-continuation of conversation
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5001';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 ARIA CONVERSATION TEST SCRIPT');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('This script simulates a conversation to test:');
console.log('  ✓ Voice activity detection');
console.log('  ✓ Conversation context memory');
console.log('  ✓ Response timing');
console.log('  ✓ Auto-continuation');
console.log('');

// Test conversation scenarios
const TEST_CONVERSATIONS = [
  {
    name: 'Basic Question & Answer',
    messages: [
      'What time is it?',
      'Can you tell me about the weather?',
      'Thanks for the help!'
    ]
  },
  {
    name: 'Multi-turn Context Test',
    messages: [
      'My name is John.',
      'What did I just tell you?',
      'Can you remember my name?',
      'Great! Now forget it.'
    ]
  },
  {
    name: 'Quick Back-and-Forth',
    messages: [
      'Hi',
      'How are you?',
      'Good thanks',
      'Bye'
    ]
  },
  {
    name: 'Long Sentences (VAD Test)',
    messages: [
      'I need to test if the voice activity detection can handle long sentences without cutting me off in the middle of what I am saying.',
      'This is another very long sentence that should be fully captured by the recording system before it automatically sends to the AI.',
      'Perfect! That worked well.'
    ]
  }
];

/**
 * Simulate sending a voice message
 */
async function sendMessage(message, conversationHistory) {
  const startTime = Date.now();

  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`👤 USER: "${message}"`);
  console.log('───────────────────────────────────────────────────────────');

  try {
    // Generate synthetic audio (TTS of user message)
    console.log('[1/4] Generating synthetic user voice...');
    const userVoiceStart = Date.now();

    const userVoiceResponse = await axios.post(
      'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL/stream',
      {
        text: message,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 5000
      }
    );

    const audioBase64 = Buffer.from(userVoiceResponse.data).toString('base64');
    console.log(`   ⏱️  Voice generation took ${Date.now() - userVoiceStart}ms`);

    // Send to Aria
    console.log('[2/4] Sending to Aria...');
    const ariaStart = Date.now();

    const response = await axios.post(`${API_URL}/api/voice/process`, {
      audioBase64: audioBase64,
      conversationHistory: conversationHistory,
    }, {
      timeout: 15000
    });

    console.log(`   ⏱️  Aria processing took ${Date.now() - ariaStart}ms`);

    if (response.data.success) {
      console.log('');
      console.log(`🤖 ARIA: "${response.data.aiMessage}"`);
      console.log('');
      console.log(`📊 TIMING BREAKDOWN:`);
      console.log(`   Total time: ${Date.now() - startTime}ms`);
      console.log(`   User voice gen: ${Date.now() - userVoiceStart}ms`);
      console.log(`   Aria processing: ${Date.now() - ariaStart}ms`);

      return {
        success: true,
        userMessage: response.data.userMessage,
        aiMessage: response.data.aiMessage,
        conversationHistory: response.data.conversationHistory,
        totalTime: Date.now() - startTime
      };
    } else {
      console.error('❌ Aria returned error:', response.data);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Error in conversation:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run a test conversation
 */
async function runConversation(conversation) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🎬 Starting: ${conversation.name}`);
  console.log('═══════════════════════════════════════════════════════════');

  let conversationHistory = [];
  const results = [];

  for (const message of conversation.messages) {
    const result = await sendMessage(message, conversationHistory);

    if (result.success) {
      conversationHistory = result.conversationHistory;
      results.push({
        userMessage: result.userMessage,
        aiMessage: result.aiMessage,
        totalTime: result.totalTime
      });

      // Wait a bit before next message (simulating human pause)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.error('❌ Conversation failed, stopping...');
      break;
    }
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📈 CONVERSATION SUMMARY: ${conversation.name}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Messages exchanged: ${results.length}`);
  console.log(`   Average response time: ${Math.round(results.reduce((sum, r) => sum + r.totalTime, 0) / results.length)}ms`);
  console.log('');

  return {
    name: conversation.name,
    results,
    averageTime: Math.round(results.reduce((sum, r) => sum + r.totalTime, 0) / results.length)
  };
}

/**
 * Main test runner
 */
async function runAllTests() {
  const allResults = [];

  for (const conversation of TEST_CONVERSATIONS) {
    const result = await runConversation(conversation);
    allResults.push(result);

    // Wait between conversations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Final summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 ALL TESTS COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  allResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}`);
    console.log(`   Messages: ${result.results.length}`);
    console.log(`   Avg time: ${result.averageTime}ms`);
    console.log('');
  });

  // Save detailed results
  const resultsPath = path.join(__dirname, 'conversation-test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: allResults
  }, null, 2));

  console.log(`💾 Detailed results saved to: ${resultsPath}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
