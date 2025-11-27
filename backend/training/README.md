# LIMO Training Integration for Aria 🚀

This directory contains the integration between VoiceNow CRM and [LIMO (Less Is More)](https://github.com/GAIR-NLP/LIMO) for training Aria with high-quality conversation data.

## What is LIMO?

LIMO is a state-of-the-art training framework that achieves superior AI performance with **significantly less but higher quality training data**:

- 🎯 **800 curated samples** outperform models trained on 800k samples
- 🌟 **Strong generalization** across diverse problem types
- 💡 **Step-by-step reasoning** for better decision making
- 📊 **SOTA results** on mathematical and reasoning benchmarks

Perfect for training Aria to be more intelligent and capable!

## Quick Start

### 1. Export Your Conversation Data

```bash
cd /Users/homepc/voiceFlow-crm-1/backend
node scripts/export-limo-dataset.js
```

This will:
- ✅ Collect high-quality conversations from your CRM
- ✅ Filter for the best training examples (quality score >= 5)
- ✅ Convert to LIMO-compatible format
- ✅ Generate training scripts and configs
- ✅ Split into train/eval sets (90/10)

### 2. Review Your Dataset

```bash
# View training data
cat training/datasets/aria_train_limo.jsonl | jq

# Check dataset statistics
cat training/datasets/dataset_metadata.json | jq
```

### 3. Train the Model

#### Option A: Using the Generated Script (Easiest)

```bash
./training/datasets/train_aria_limo.sh
```

#### Option B: Manual Training

```bash
cd /Users/homepc/LIMO/train

# Install dependencies (first time only)
pip install -r requirements.txt

# Start training
deepspeed --num_gpus=4 train.py \
  --model_name_or_path Qwen/Qwen2.5-32B-Instruct \
  --data_path /Users/homepc/voiceFlow-crm-1/backend/training/datasets/aria_train_limo.jsonl \
  --output_dir /Users/homepc/LIMO/outputs/aria_model \
  --num_train_epochs 3 \
  --per_device_train_batch_size 1 \
  --gradient_accumulation_steps 16 \
  --learning_rate 2e-5 \
  --bf16 True
```

## How It Works

### Data Collection

The system collects conversations from:

1. **Aria Memory** - Stored conversation context
2. **Call Logs** - Successful calls with transcripts (duration > 60s)
3. **Messages** - SMS/email exchanges
4. **CRM Interactions** - Lead communications

### Quality Assessment

Each interaction is scored based on:

| Criteria | Points |
|----------|--------|
| Length > 50 chars | +1 |
| Length > 150 chars | +1 |
| Duration > 2 minutes (calls) | +2 |
| Successful completion | +2 |
| Contains reasoning keywords | +2 |
| Domain-specific content | +1 |

**Only conversations with score >= 5 are included** for training.

### LIMO Format

Conversations are converted to LIMO's format:

```json
{
  "system": "You are Aria, an AI assistant for a CRM system...",
  "messages": [
    {
      "role": "user",
      "content": "Can you schedule a meeting with John tomorrow at 2pm?"
    },
    {
      "role": "assistant",
      "content": "Let me help you with that.\n\nThinking step by step:\n1. I'll check John's contact information...\n2. I'll find an available time slot tomorrow at 2pm...\n3. I'll create the appointment and send a notification..."
    }
  ],
  "metadata": {
    "quality_score": 8,
    "source": "voiceflow_crm"
  }
}
```

## Training Pipeline

```mermaid
graph LR
    A[VoiceNow CRM Data] --> B[Quality Filter]
    B --> C[LIMO Format Converter]
    C --> D[Train/Eval Split]
    D --> E[LIMO Training]
    E --> F[Fine-tuned Aria Model]
```

## Dataset Quality

LIMO prioritizes **quality over quantity**:

- ✅ Only high-scoring conversations (>= 5 points)
- ✅ Multi-turn dialogues with context
- ✅ Domain-specific CRM interactions
- ✅ Step-by-step reasoning patterns
- ✅ Successful outcomes

**Target: 500-1000 high-quality samples** (LIMO's sweet spot)

## Training Configuration

Default settings (optimized for 4x GPUs):

```json
{
  "model": "Qwen2.5-32B-Instruct",
  "epochs": 3,
  "batch_size": 1,
  "gradient_accumulation": 16,
  "learning_rate": 2e-5,
  "precision": "bf16",
  "deepspeed": "zero2"
}
```

## Monitoring Training

### TensorBoard

```bash
tensorboard --logdir /Users/homepc/LIMO/outputs/aria_model
```

### Check Progress

```bash
# View training logs
tail -f /Users/homepc/LIMO/outputs/aria_model/train.log

# Check model checkpoints
ls -lh /Users/homepc/LIMO/outputs/aria_model/
```

## Using the Trained Model

### Load in Python

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained(
    "/Users/homepc/LIMO/outputs/aria_model/checkpoint-best",
    torch_dtype="auto",
    device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained(
    "/Users/homepc/LIMO/outputs/aria_model/checkpoint-best"
)

# Use with Aria
messages = [
    {"role": "system", "content": "You are Aria, an AI assistant..."},
    {"role": "user", "content": "Schedule a meeting with John tomorrow"}
]

inputs = tokenizer.apply_chat_template(
    messages,
    tokenize=True,
    return_tensors="pt"
).to(model.device)

outputs = model.generate(inputs, max_new_tokens=512)
print(tokenizer.decode(outputs[0]))
```

### Integrate with VoiceFlow

Replace the OpenAI API call in `routes/voice.js` with your trained model:

```javascript
// Instead of:
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: messages
});

// Use:
const completion = await yourAriaModel.generate(messages);
```

## Continuous Improvement

### Automatic Retraining

Set up a cron job to retrain periodically:

```bash
# Add to crontab
0 0 * * 0 node /Users/homepc/voiceFlow-crm-1/backend/scripts/export-limo-dataset.js && /path/to/train_aria_limo.sh
```

### Incremental Training

Add new high-quality conversations:

```bash
# Export new data
node scripts/export-limo-dataset.js

# Continue training from checkpoint
deepspeed train.py \
  --model_name_or_path /Users/homepc/LIMO/outputs/aria_model/checkpoint-best \
  --data_path training/datasets/aria_train_limo.jsonl \
  --output_dir /Users/homepc/LIMO/outputs/aria_model_v2
```

## Evaluation

### Benchmark Your Model

```bash
cd /Users/homepc/LIMO/eval

python eval.py \
  --model_path /Users/homepc/LIMO/outputs/aria_model/checkpoint-best \
  --eval_data /Users/homepc/voiceFlow-crm-1/backend/training/datasets/aria_eval_limo.jsonl
```

### A/B Testing

Compare your trained model vs GPT-4o-mini:

```bash
node scripts/ab-test-models.js \
  --model-a gpt-4o-mini \
  --model-b /Users/homepc/LIMO/outputs/aria_model/checkpoint-best \
  --test-cases training/datasets/aria_eval_limo.jsonl
```

## Troubleshooting

### Out of Memory

Reduce batch size or use gradient checkpointing:

```bash
--per_device_train_batch_size 1 \
--gradient_checkpointing True
```

### Slow Training

Use more GPUs or switch to DeepSpeed Zero-3:

```bash
--deepspeed ds_config_zero3.json
```

### Poor Quality Data

Increase quality threshold:

Edit `training/limo-integration.js`:
```javascript
if (avgQuality >= 7) { // Increased from 5
```

## Resources

- 📄 [LIMO Paper](https://arxiv.org/pdf/2502.03387)
- 🌐 [LIMO Dataset (v2)](https://huggingface.co/datasets/GAIR/LIMO-v2)
- 🤗 [LIMO Model (v2)](https://huggingface.co/GAIR/LIMO-v2)
- 💻 [LIMO GitHub](https://github.com/GAIR-NLP/LIMO)

## Support

Questions? Issues?

1. Check LIMO documentation
2. Review dataset quality scores
3. Open an issue on the VoiceNow CRM repo

---

**Remember**: LIMO's power comes from quality, not quantity. Focus on collecting the best conversations! 🎯
