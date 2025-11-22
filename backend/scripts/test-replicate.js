import replicateMediaService from '../services/replicateMediaService.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test script for Replicate integration
 * Run with: node backend/scripts/test-replicate.js
 */
async function testReplicate() {
  try {
    console.log('🧪 Testing Replicate Integration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a test user (or create one)
    let testUser = await User.findOne({ email: 'test@example.com' });

    if (!testUser) {
      console.log('Creating test user...');
      testUser = await User.create({
        email: 'test@example.com',
        password: 'testpassword123',
        company: 'Test Company',
        mediaCredits: {
          balance: 100,
          used: 0,
          purchased: 0
        }
      });
    }

    console.log(`Test User ID: ${testUser._id}`);
    console.log(`Media Credits: ${testUser.mediaCredits?.balance || 0}\n`);

    // Test 1: Generate Image
    console.log('📸 Test 1: Generating image with FLUX Schnell...');
    const imageResult = await replicateMediaService.generateImage(testUser._id, {
      prompt: 'Modern kitchen with black galaxy granite countertops, professional photography, bright lighting',
      model: 'flux_schnell',
      aspectRatio: '16:9',
      numOutputs: 1
    });

    console.log('✅ Image generated!');
    console.log(`   URL: ${imageResult.images[0]}`);
    console.log(`   Credits used: ${imageResult.creditsUsed}`);
    console.log(`   Duration: ${imageResult.duration}ms\n`);

    // Test 2: Check Credits
    console.log('💰 Test 2: Checking remaining credits...');
    const credits = await replicateMediaService.getCredits(testUser._id);
    console.log(`   Balance: ${credits.balance}`);
    console.log(`   Used: ${credits.used}`);
    console.log(`   Purchased: ${credits.purchased}\n`);

    // Test 3: Upscale Image
    console.log('🔍 Test 3: Upscaling image...');
    const upscaleResult = await replicateMediaService.upscaleImage(
      testUser._id,
      imageResult.images[0],
      2
    );

    console.log('✅ Image upscaled!');
    console.log(`   URL: ${upscaleResult.image}`);
    console.log(`   Credits used: ${upscaleResult.creditsUsed}\n`);

    // Test 4: Get Pricing
    console.log('💵 Test 4: Get pricing info...');
    const pricing = replicateMediaService.getPricing();
    console.log('   Image Models:');
    Object.entries(pricing.image).forEach(([model, credits]) => {
      console.log(`     - ${model}: ${credits} credits`);
    });
    console.log('   Video Models:');
    Object.entries(pricing.video).forEach(([model, credits]) => {
      console.log(`     - ${model}: ${credits} credits`);
    });
    console.log('');

    // Test 5: Final Credits Check
    const finalCredits = await replicateMediaService.getCredits(testUser._id);
    console.log('📊 Final Balance:');
    console.log(`   Started with: 100 credits`);
    console.log(`   Used: ${finalCredits.used} credits`);
    console.log(`   Remaining: ${finalCredits.balance} credits\n`);

    console.log('✅ All tests passed!\n');
    console.log('🎉 Replicate integration is working perfectly!\n');
    console.log('Generated images:');
    console.log(`1. Original: ${imageResult.images[0]}`);
    console.log(`2. Upscaled: ${upscaleResult.image}\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testReplicate();
