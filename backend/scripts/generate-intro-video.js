import Replicate from 'replicate';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate VoiceNow CRM Intro Video using Replicate API
 *
 * This script creates a professional intro video for the marketing page
 * using state-of-the-art AI video generation models.
 */

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

// Video prompts optimized for brand intro
const videoPrompts = {
  // Option 1: Modern tech aesthetic
  modern: `Cinematic shot of a modern call center with AI technology holographic displays,
  sleek dark blue and purple color scheme, floating UI elements showing voice waveforms and customer data,
  smooth camera movement, professional lighting, high-tech atmosphere, 4K quality,
  futuristic yet professional, subtle VoiceFlow branding elements`,

  // Option 2: Abstract tech visualization
  abstract: `Abstract visualization of AI voice technology, flowing data streams in deep blue and purple gradients,
  voice waveforms transforming into connected networks, particle effects,
  smooth morphing animations, clean modern aesthetic, dark background with glowing accents,
  representing 24/7 automation and connectivity, cinematic quality`,

  // Option 3: Human + AI combination
  humanAI: `Professional business environment transforming with AI integration,
  split screen showing traditional sales calls transitioning to AI voice agents working 24/7,
  modern office with holographic displays, voice waveforms visualized in air,
  blue and purple lighting, confident and innovative mood, high production value`,

  // Option 4: Pure branding/logo reveal
  branding: `VoiceNow CRM logo reveal with sleek animation, dark background with gradient from deep purple to blue,
  voice wave visualization particles forming the logo, modern tech aesthetic,
  glowing effects, professional brand identity, clean and minimalist,
  high-end corporate branding style, smooth transitions`
};

async function downloadVideo(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Video downloaded to: ${outputPath}`);
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

async function generateIntroVideo(promptKey = 'abstract') {
  try {
    console.log('🎬 VoiceNow CRM - Intro Video Generator\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const prompt = videoPrompts[promptKey];

    if (!prompt) {
      console.error(`❌ Invalid prompt key. Available options: ${Object.keys(videoPrompts).join(', ')}`);
      process.exit(1);
    }

    console.log(`📝 Generating video with prompt: "${promptKey}"\n`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...\n`);

    // Check if API token exists
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('❌ REPLICATE_API_TOKEN not found in .env file');
      console.log('\n📋 To fix this:');
      console.log('1. Get your API token from: https://replicate.com/account/api-tokens');
      console.log('2. Add to .env file: REPLICATE_API_TOKEN=your_token_here\n');
      process.exit(1);
    }

    console.log('🚀 Starting video generation...\n');
    console.log('⏱️  This may take 2-5 minutes depending on the model...\n');

    const startTime = Date.now();

    // Using Minimax Video-01 - high quality text-to-video generation
    const output = await replicate.run(
      "minimax/video-01",
      {
        input: {
          prompt: prompt,
          prompt_optimizer: true
        }
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Video generated successfully in ${duration}s!\n`);
    console.log(`📹 Video URL: ${output}\n`);

    // Download the video
    const outputDir = path.join(__dirname, '../../frontend/public/videos');

    // Create videos directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created directory: ${outputDir}\n`);
    }

    const outputPath = path.join(outputDir, `intro-${promptKey}-${Date.now()}.mp4`);

    console.log('⬇️  Downloading video...\n');
    await downloadVideo(output, outputPath);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 SUCCESS!\n');
    console.log(`📁 Video saved to: ${outputPath}`);
    console.log(`🌐 Video URL: ${output}`);
    console.log(`⏱️  Generation time: ${duration}s\n`);
    console.log('📋 Next steps:');
    console.log('1. Review the video');
    console.log('2. Rename it to intro.mp4 if you like it');
    console.log('3. Update the marketing.html to use the new video\n');

    return {
      success: true,
      videoUrl: output,
      localPath: outputPath,
      duration: parseFloat(duration)
    };

  } catch (error) {
    console.error('\n❌ Error generating video:', error.message);
    console.error(error.stack);

    if (error.message.includes('Insufficient credits')) {
      console.log('\n💳 You need to add credits to your Replicate account:');
      console.log('https://replicate.com/account/billing\n');
    }

    process.exit(1);
  }
}

// Parse command line arguments
const promptKey = process.argv[2] || 'abstract';

console.log('Available prompt styles:');
console.log('  - modern: Modern call center with AI holographic displays');
console.log('  - abstract: Abstract AI voice visualization (recommended)');
console.log('  - humanAI: Human + AI integration showcase');
console.log('  - branding: Logo reveal with voice wave animation\n');

// Run the generator
generateIntroVideo(promptKey);
