#!/usr/bin/env node
/**
 * Export VoiceFlow CRM data to LIMO training format
 *
 * Usage:
 *   node scripts/export-limo-dataset.js
 *
 * This will:
 * 1. Collect high-quality conversations from your CRM
 * 2. Convert them to LIMO-compatible format
 * 3. Generate training scripts
 * 4. Provide next steps for training
 */

import '../config/env.js';
import mongoose from 'mongoose';
import { limoIntegration } from '../training/limo-integration.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   LIMO Training Dataset Export for Aria          ║');
  console.log('║   VoiceFlow CRM → High-Quality Training Data     ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Export dataset
    console.log('📊 Starting dataset export...\n');
    const result = await limoIntegration.exportLIMODataset();

    if (result.success) {
      console.log('\n╔═══════════════════════════════════════════════════╗');
      console.log('║   ✅ Dataset Export Successful!                   ║');
      console.log('╚═══════════════════════════════════════════════════╝\n');

      console.log('📊 Dataset Statistics:');
      console.log(`   • Total conversations: ${result.stats.total}`);
      console.log(`   • Training samples: ${result.stats.train}`);
      console.log(`   • Evaluation samples: ${result.stats.eval}\n`);

      // Generate training config
      console.log('⚙️  Generating training configuration...');
      const configPath = limoIntegration.createLIMOTrainingConfig(result.trainPath);

      // Generate training script
      console.log('📝 Generating training script...');
      const scriptPath = limoIntegration.generateTrainingScript();

      console.log('\n╔═══════════════════════════════════════════════════╗');
      console.log('║   🚀 Next Steps                                   ║');
      console.log('╚═══════════════════════════════════════════════════╝\n');

      console.log('1️⃣  Review your dataset:');
      console.log(`   cat ${result.trainPath} | jq\n`);

      console.log('2️⃣  (Optional) Install LIMO dependencies:');
      console.log('   cd /Users/homepc/LIMO');
      console.log('   pip install -r requirements.txt\n');

      console.log('3️⃣  Start training (requires GPU):');
      console.log(`   ${scriptPath}\n`);

      console.log('4️⃣  Or use the LIMO CLI directly:');
      console.log('   cd /Users/homepc/LIMO/train');
      console.log(`   deepspeed train.py --data_path ${result.trainPath} \\\n`);
      console.log('     --model_name_or_path Qwen/Qwen2.5-32B-Instruct \\\n');
      console.log(`     --output_dir /Users/homepc/LIMO/outputs/aria_model\n`);

      console.log('📖 LIMO Documentation: https://github.com/GAIR-NLP/LIMO');
      console.log('💡 Tip: LIMO achieves SOTA with ~800 high-quality samples!\n');

    } else {
      console.log('\n❌ Export failed:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

main();
