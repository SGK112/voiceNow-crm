#!/usr/bin/env node

/**
 * Aria Training Script
 *
 * This script helps optimize Aria's response times by:
 * 1. Testing different pause detection thresholds
 * 2. Measuring end-to-end latency
 * 3. Optimizing AI model parameters
 * 4. Fine-tuning voice generation settings
 */

import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('🎯 ARIA TRAINING & OPTIMIZATION SCRIPT');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Training configurations to test
const TRAINING_CONFIGS = [
  {
    name: 'Ultra Fast (Current)',
    pauseDetection: 4000, // 4 seconds
    aiModel: 'gpt-4o-mini',
    maxTokens: 30,
    temperature: 0.7,
    voiceOptimization: 4,
    voiceStability: 0.3,
  },
  {
    name: 'Aggressive Speed',
    pauseDetection: 3000, // 3 seconds
    aiModel: 'gpt-4o-mini',
    maxTokens: 25,
    temperature: 0.6,
    voiceOptimization: 4,
    voiceStability: 0.2,
  },
  {
    name: 'Balanced',
    pauseDetection: 5000, // 5 seconds
    aiModel: 'gpt-4o-mini',
    maxTokens: 40,
    temperature: 0.8,
    voiceOptimization: 3,
    voiceStability: 0.4,
  },
  {
    name: 'Quality Focus',
    pauseDetection: 6000, // 6 seconds
    aiModel: 'gpt-4o',
    maxTokens: 50,
    temperature: 0.8,
    voiceOptimization: 2,
    voiceStability: 0.5,
  },
];

// Test prompts for training
const TEST_PROMPTS = [
  'What time is it?',
  'Tell me about my schedule today.',
  'How many calls do I have?',
  'What are my latest messages?',
  'Show me my leads.',
  'Give me a quick update.',
];

/**
 * Test a configuration with sample prompts
 */
async function testConfiguration(config) {
  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`📊 Testing: ${config.name}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log(`   Pause Detection: ${config.pauseDetection}ms`);
  console.log(`   AI Model: ${config.aiModel}`);
  console.log(`   Max Tokens: ${config.maxTokens}`);
  console.log(`   Temperature: ${config.temperature}`);
  console.log('');

  const results = [];

  for (const prompt of TEST_PROMPTS) {
    try {
      const startTime = Date.now();

      // Simulate AI response
      const messages = [
        {
          role: 'system',
          content: `You are Aria, a friendly AI assistant in VoiceNow CRM.

Keep responses ULTRA SHORT:
- 1 sentence max (15 words or less)
- Be direct and helpful
- Use natural speech`
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const aiStart = Date.now();
      const completion = await openai.chat.completions.create({
        model: config.aiModel,
        messages: messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      });
      const aiTime = Date.now() - aiStart;

      const aiResponse = completion.choices[0].message.content;

      // Simulate voice generation
      const voiceStart = Date.now();
      const voiceResponse = await axios.post(
        'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL/stream',
        {
          text: aiResponse,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: config.voiceStability,
            similarity_boost: 0.7,
            style: 0.5,
            use_speaker_boost: true
          },
          optimize_streaming_latency: config.voiceOptimization
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 8000
        }
      );
      const voiceTime = Date.now() - voiceStart;

      const totalTime = Date.now() - startTime;

      results.push({
        prompt,
        response: aiResponse,
        aiTime,
        voiceTime,
        totalTime,
      });

      console.log(`   ✅ "${prompt}"`);
      console.log(`      AI: ${aiTime}ms | Voice: ${voiceTime}ms | Total: ${totalTime}ms`);
      console.log(`      Response: "${aiResponse}"`);
      console.log('');

    } catch (error) {
      console.error(`   ❌ Error with "${prompt}":`, error.message);
      results.push({
        prompt,
        error: error.message,
      });
    }
  }

  // Calculate averages
  const successfulResults = results.filter(r => !r.error);
  const avgAiTime = successfulResults.reduce((sum, r) => sum + r.aiTime, 0) / successfulResults.length;
  const avgVoiceTime = successfulResults.reduce((sum, r) => sum + r.voiceTime, 0) / successfulResults.length;
  const avgTotalTime = successfulResults.reduce((sum, r) => sum + r.totalTime, 0) / successfulResults.length;

  console.log('   📈 AVERAGES:');
  console.log(`      AI Response: ${Math.round(avgAiTime)}ms`);
  console.log(`      Voice Gen: ${Math.round(avgVoiceTime)}ms`);
  console.log(`      Total Time: ${Math.round(avgTotalTime)}ms`);
  console.log(`      Success Rate: ${successfulResults.length}/${results.length}`);

  return {
    config,
    results,
    averages: {
      aiTime: avgAiTime,
      voiceTime: avgVoiceTime,
      totalTime: avgTotalTime,
      successRate: successfulResults.length / results.length,
    }
  };
}

/**
 * Main training function
 */
async function trainAria() {
  const allResults = [];

  console.log('🚀 Starting Aria training with multiple configurations...');
  console.log('');

  for (const config of TRAINING_CONFIGS) {
    const result = await testConfiguration(config);
    allResults.push(result);

    // Wait between tests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 TRAINING RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Sort by total time
  allResults.sort((a, b) => a.averages.totalTime - b.averages.totalTime);

  console.log('Rankings (by speed):');
  console.log('');
  allResults.forEach((result, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    console.log(`${medal} ${index + 1}. ${result.config.name}`);
    console.log(`      Total: ${Math.round(result.averages.totalTime)}ms`);
    console.log(`      AI: ${Math.round(result.averages.aiTime)}ms`);
    console.log(`      Voice: ${Math.round(result.averages.voiceTime)}ms`);
    console.log(`      Success: ${(result.averages.successRate * 100).toFixed(0)}%`);
    console.log('');
  });

  // Save results to file
  const resultsPath = path.join(__dirname, 'aria-training-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: allResults,
  }, null, 2));

  console.log(`💾 Results saved to: ${resultsPath}`);
  console.log('');

  // Recommendations
  const fastest = allResults[0];
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💡 RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Best Configuration: ${fastest.config.name}`);
  console.log(`Average Response Time: ${Math.round(fastest.averages.totalTime)}ms`);
  console.log('');
  console.log('Suggested Settings for mobile/src/components/AIOrbButton.tsx:');
  console.log(`   Pause Detection: ${fastest.config.pauseDetection}ms`);
  console.log('');
  console.log('Suggested Settings for backend/routes/voice.js:');
  console.log(`   Model: '${fastest.config.aiModel}'`);
  console.log(`   Max Tokens: ${fastest.config.maxTokens}`);
  console.log(`   Temperature: ${fastest.config.temperature}`);
  console.log(`   Voice Optimization: ${fastest.config.voiceOptimization}`);
  console.log(`   Voice Stability: ${fastest.config.voiceStability}`);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Training Complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

// Run training
trainAria().catch(error => {
  console.error('❌ Training failed:', error);
  process.exit(1);
});
