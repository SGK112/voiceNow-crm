/**
 * LIMO Training Integration for VoiceNow CRM
 *
 * This module integrates the LIMO (Less Is More) training framework
 * with VoiceFlow's conversation data to create high-quality training datasets.
 *
 * LIMO focuses on: https://github.com/GAIR-NLP/LIMO
 * - Quality over quantity (800 high-quality samples > 800k low-quality ones)
 * - Step-by-step reasoning
 * - Strong generalization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import AriaMemory from '../models/AriaMemory.js';
import CallLog from '../models/CallLog.js';
import TeamMessage from '../models/TeamMessage.js';
import Lead from '../models/Lead.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class LIMOTrainingIntegration {
  constructor() {
    this.outputDir = path.join(__dirname, 'datasets');
    this.limoDir = '/Users/homepc/LIMO';
    this.conversationLog = [];

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Convert VoiceFlow conversations to LIMO format
   * LIMO uses a specific format for training:
   * {
   *   "conversations": [
   *     {
   *       "system": "System prompt",
   *       "messages": [
   *         {"role": "user", "content": "..."},
   *         {"role": "assistant", "content": "..."}
   *       ]
   *     }
   *   ]
   * }
   */
  async collectConversationsFromMemory() {
    console.log('📚 [LIMO] Collecting conversations from Aria memory...');

    try {
      // Get all Aria memories with conversation context
      const memories = await AriaMemory.find({
        category: { $in: ['context', 'conversation'] }
      })
        .sort({ createdAt: -1 })
        .limit(1000);

      console.log(`✅ [LIMO] Found ${memories.length} conversation memories`);
      return memories;
    } catch (error) {
      console.error('❌ [LIMO] Error collecting memories:', error);
      return [];
    }
  }

  /**
   * Collect high-quality interactions from CRM data
   */
  async collectCRMInteractions() {
    console.log('📞 [LIMO] Collecting CRM interactions...');

    const interactions = [];

    try {
      // Get successful calls with transcripts
      const calls = await CallLog.find({
        status: 'completed',
        duration: { $gte: 60 } // At least 1 minute
      })
        .sort({ createdAt: -1 })
        .limit(200);

      for (const call of calls) {
        if (call.transcript) {
          interactions.push({
            type: 'call',
            data: call,
            quality: this.assessInteractionQuality(call)
          });
        }
      }

      // Get meaningful message exchanges
      const messages = await TeamMessage.find({
        direction: { $in: ['inbound', 'outbound'] },
        status: 'delivered'
      })
        .sort({ createdAt: -1 })
        .limit(200);

      for (const msg of messages) {
        if (msg.content && msg.content.length > 20) {
          interactions.push({
            type: 'message',
            data: msg,
            quality: this.assessInteractionQuality(msg)
          });
        }
      }

      console.log(`✅ [LIMO] Collected ${interactions.length} CRM interactions`);
      return interactions;
    } catch (error) {
      console.error('❌ [LIMO] Error collecting CRM data:', error);
      return [];
    }
  }

  /**
   * Assess the quality of an interaction for training
   * LIMO emphasizes quality over quantity
   */
  assessInteractionQuality(interaction) {
    let score = 0;

    // Length check (meaningful conversations)
    const content = interaction.transcript || interaction.content || '';
    if (content.length > 50) score += 1;
    if (content.length > 150) score += 1;

    // Duration check (for calls)
    if (interaction.duration && interaction.duration > 120) score += 2;

    // Successful outcome
    if (interaction.status === 'completed' || interaction.status === 'delivered') {
      score += 2;
    }

    // Contains reasoning or multi-step problem solving
    if (content.match(/first|then|next|because|therefore|so/i)) {
      score += 2;
    }

    // Contains specific domain knowledge (CRM, sales, scheduling)
    if (content.match(/appointment|meeting|quote|estimate|follow.?up|schedule/i)) {
      score += 1;
    }

    return score;
  }

  /**
   * Convert collected data to LIMO training format
   */
  convertToLIMOFormat(interactions, memories) {
    console.log('🔄 [LIMO] Converting to LIMO training format...');

    const conversations = [];

    // LIMO system prompt emphasizes step-by-step reasoning
    const systemPrompt = `You are Aria, an AI assistant for a CRM system. You help with:
- Managing leads and customer relationships
- Scheduling appointments and follow-ups
- Sending emails and SMS messages
- Accessing CRM data and providing insights
- Remembering important information about customers

Please reason step by step when handling complex requests, and provide clear, actionable responses.`;

    // Group interactions by context
    const groupedInteractions = this.groupByConversation(interactions);

    for (const group of groupedInteractions) {
      // Only include high-quality conversations (score >= 5)
      const avgQuality = group.reduce((sum, int) => sum + int.quality, 0) / group.length;

      if (avgQuality >= 5) {
        const messages = group.map(interaction => {
          const content = interaction.data.transcript || interaction.data.content || '';

          // Determine role based on interaction type
          const role = interaction.type === 'call' || interaction.data.direction === 'inbound'
            ? 'user'
            : 'assistant';

          return {
            role,
            content: content.trim()
          };
        });

        // Add reasoning steps if available
        const enhancedMessages = this.enhanceWithReasoning(messages);

        conversations.push({
          system: systemPrompt,
          messages: enhancedMessages,
          metadata: {
            quality_score: avgQuality,
            source: 'voiceflow_crm',
            types: group.map(g => g.type)
          }
        });
      }
    }

    console.log(`✅ [LIMO] Converted ${conversations.length} high-quality conversations`);
    return conversations;
  }

  /**
   * Group interactions into conversational threads
   */
  groupByConversation(interactions) {
    const groups = [];
    let currentGroup = [];
    let lastTimestamp = null;

    // Sort by timestamp
    interactions.sort((a, b) => {
      const aTime = a.data.createdAt || a.data.timestamp;
      const bTime = b.data.createdAt || b.data.timestamp;
      return new Date(aTime) - new Date(bTime);
    });

    for (const interaction of interactions) {
      const timestamp = new Date(interaction.data.createdAt || interaction.data.timestamp);

      // Start new group if gap is > 30 minutes
      if (lastTimestamp && (timestamp - lastTimestamp) > 30 * 60 * 1000) {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [];
      }

      currentGroup.push(interaction);
      lastTimestamp = timestamp;
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Enhance messages with step-by-step reasoning
   * This is key to LIMO's approach
   */
  enhanceWithReasoning(messages) {
    return messages.map((msg, idx) => {
      if (msg.role === 'assistant') {
        // Add reasoning steps for assistant responses
        const content = msg.content;

        // Check if response involves multiple steps
        if (content.includes('and') || content.includes('then') || content.includes('also')) {
          // Already has reasoning structure
          return msg;
        } else if (content.length > 100) {
          // Long response - might benefit from explicit reasoning
          return {
            ...msg,
            content: `Let me help you with that.\n\nThinking step by step:\n1. ${content}`
          };
        }
      }
      return msg;
    });
  }

  /**
   * Export dataset in LIMO-compatible format
   */
  async exportLIMODataset() {
    console.log('📤 [LIMO] Exporting training dataset...');

    try {
      // Collect data
      const memories = await this.collectConversationsFromMemory();
      const interactions = await this.collectCRMInteractions();

      // Convert to LIMO format
      const conversations = this.convertToLIMOFormat(interactions, memories);

      // Split into train/eval (90/10 split)
      const trainSize = Math.floor(conversations.length * 0.9);
      const trainData = conversations.slice(0, trainSize);
      const evalData = conversations.slice(trainSize);

      // Save training set
      const trainPath = path.join(this.outputDir, 'aria_train_limo.jsonl');
      const trainJsonl = trainData.map(conv => JSON.stringify(conv)).join('\n');
      fs.writeFileSync(trainPath, trainJsonl);

      // Save evaluation set
      const evalPath = path.join(this.outputDir, 'aria_eval_limo.jsonl');
      const evalJsonl = evalData.map(conv => JSON.stringify(conv)).join('\n');
      fs.writeFileSync(evalPath, evalJsonl);

      // Save metadata
      const metadataPath = path.join(this.outputDir, 'dataset_metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify({
        created_at: new Date().toISOString(),
        total_conversations: conversations.length,
        train_size: trainData.length,
        eval_size: evalData.length,
        avg_quality_score: conversations.reduce((sum, c) => sum + c.metadata.quality_score, 0) / conversations.length,
        source: 'voiceflow_crm',
        limo_compatible: true
      }, null, 2));

      console.log(`✅ [LIMO] Dataset exported successfully!`);
      console.log(`   📁 Training set: ${trainPath} (${trainData.length} conversations)`);
      console.log(`   📁 Eval set: ${evalPath} (${evalData.length} conversations)`);
      console.log(`   📁 Metadata: ${metadataPath}`);

      return {
        success: true,
        trainPath,
        evalPath,
        stats: {
          total: conversations.length,
          train: trainData.length,
          eval: evalData.length
        }
      };
    } catch (error) {
      console.error('❌ [LIMO] Export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create training configuration for LIMO
   */
  createLIMOTrainingConfig(datasetPath) {
    const config = {
      model_name_or_path: "Qwen/Qwen2.5-32B-Instruct",
      data_path: datasetPath,
      output_dir: path.join(this.limoDir, "outputs", "aria_model"),
      num_train_epochs: 3,
      per_device_train_batch_size: 1,
      gradient_accumulation_steps: 16,
      learning_rate: 2e-5,
      warmup_ratio: 0.03,
      lr_scheduler_type: "cosine",
      logging_steps: 1,
      save_strategy: "epoch",
      save_total_limit: 3,
      bf16: true,
      tf32: true,
      dataloader_num_workers: 4,
      gradient_checkpointing: true,
      deepspeed: path.join(this.limoDir, "train", "ds_config_zero2.json")
    };

    const configPath = path.join(this.outputDir, 'limo_training_config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`✅ [LIMO] Training config created: ${configPath}`);
    return configPath;
  }

  /**
   * Generate training script
   */
  generateTrainingScript() {
    const script = `#!/bin/bash
# LIMO Training Script for Aria
# Generated on ${new Date().toISOString()}

export CUDA_VISIBLE_DEVICES=0,1,2,3
export PYTHONPATH="${this.limoDir}:$PYTHONPATH"

DATASET_PATH="${path.join(this.outputDir, 'aria_train_limo.jsonl')}"
OUTPUT_DIR="${path.join(this.limoDir, 'outputs', 'aria_model')}"

echo "🚀 Starting LIMO training for Aria..."
echo "📁 Dataset: $DATASET_PATH"
echo "📂 Output: $OUTPUT_DIR"

cd ${this.limoDir}/train

deepspeed --num_gpus=4 train.py \\
    --model_name_or_path Qwen/Qwen2.5-32B-Instruct \\
    --data_path $DATASET_PATH \\
    --output_dir $OUTPUT_DIR \\
    --num_train_epochs 3 \\
    --per_device_train_batch_size 1 \\
    --gradient_accumulation_steps 16 \\
    --learning_rate 2e-5 \\
    --warmup_ratio 0.03 \\
    --lr_scheduler_type cosine \\
    --logging_steps 1 \\
    --save_strategy epoch \\
    --save_total_limit 3 \\
    --bf16 True \\
    --tf32 True \\
    --dataloader_num_workers 4 \\
    --gradient_checkpointing True \\
    --deepspeed ds_config_zero2.json

echo "✅ Training complete! Model saved to $OUTPUT_DIR"
`;

    const scriptPath = path.join(this.outputDir, 'train_aria_limo.sh');
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, '755');

    console.log(`✅ [LIMO] Training script generated: ${scriptPath}`);
    return scriptPath;
  }
}

export const limoIntegration = new LIMOTrainingIntegration();
export default limoIntegration;
