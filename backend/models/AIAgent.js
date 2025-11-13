import mongoose from 'mongoose';

const aiAgentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['chat', 'voice', 'email', 'sms'],
    required: true,
    default: 'chat'
  },
  provider: {
    type: String,
    enum: ['openai', 'anthropic', 'google', 'elevenlabs', 'custom'],
    required: true
  },
  model: {
    type: String,
    required: true
    // Examples: 'gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'gemini-pro'
  },
  systemPrompt: {
    type: String,
    required: true,
    default: 'You are a helpful AI assistant.'
  },
  configuration: {
    temperature: { type: Number, default: 0.7, min: 0, max: 2 },
    maxTokens: { type: Number, default: 1000 },
    topP: { type: Number, default: 1 },
    frequencyPenalty: { type: Number, default: 0 },
    presencePenalty: { type: Number, default: 0 },
    stopSequences: [String],
    responseFormat: {
      type: String,
      enum: ['text', 'json'],
      default: 'text'
    }
  },
  capabilities: {
    webSearch: { type: Boolean, default: false },
    imageGeneration: { type: Boolean, default: false },
    codeExecution: { type: Boolean, default: false },
    fileAnalysis: { type: Boolean, default: false },
    functionCalling: { type: Boolean, default: false }
  },
  knowledgeBase: {
    enabled: { type: Boolean, default: false },
    documents: [{
      id: String,
      name: String,
      type: String, // 'text', 'pdf', 'url'
      content: String,
      url: String,
      uploadedAt: Date
    }],
    vectorStoreId: String // For RAG (Retrieval Augmented Generation)
  },
  tools: [{
    name: String,
    description: String,
    type: {
      type: String,
      enum: ['function', 'api', 'database', 'webhook']
    },
    config: {
      endpoint: String,
      method: String,
      headers: Map,
      parameters: Map,
      authentication: {
        type: String, // 'none', 'api_key', 'oauth', 'basic'
        credentials: Map
      }
    }
  }],
  channels: [{
    type: {
      type: String,
      enum: ['web_widget', 'slack', 'whatsapp', 'telegram', 'discord', 'sms', 'email', 'api']
    },
    enabled: { type: Boolean, default: false },
    config: {
      webhookUrl: String,
      apiKey: String,
      channelId: String,
      botToken: String,
      phoneNumber: String
    },
    customization: {
      avatarUrl: String,
      primaryColor: String,
      welcomeMessage: String,
      placeholderText: String,
      position: String // 'bottom-right', 'bottom-left', etc.
    }
  }],
  conversationSettings: {
    contextWindow: { type: Number, default: 10 }, // Number of previous messages to remember
    sessionTimeout: { type: Number, default: 3600 }, // seconds
    handoffToHuman: {
      enabled: { type: Boolean, default: false },
      triggers: [String], // Keywords that trigger handoff
      notifyEmail: String,
      notifySlack: String
    },
    collectFeedback: { type: Boolean, default: true },
    saveConversations: { type: Boolean, default: true }
  },
  guardrails: {
    enabled: { type: Boolean, default: true },
    blockedTopics: [String],
    sensitiveDataDetection: { type: Boolean, default: true },
    profanityFilter: { type: Boolean, default: true },
    maxMessagesPerSession: { type: Number, default: 100 },
    rateLimitPerUser: {
      maxRequests: Number,
      windowSeconds: Number
    }
  },
  analytics: {
    totalConversations: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // milliseconds
    satisfactionScore: { type: Number, default: 0 }, // 0-5
    handoffRate: { type: Number, default: 0 }, // percentage
    resolutionRate: { type: Number, default: 0 } // percentage
  },
  deployment: {
    status: {
      type: String,
      enum: ['draft', 'testing', 'active', 'paused'],
      default: 'draft'
    },
    apiKey: String, // Unique API key for this agent
    webhookUrl: String,
    embedCode: String, // For web widget
    lastDeployedAt: Date
  },
  testing: {
    testConversations: [{
      input: String,
      expectedOutput: String,
      actualOutput: String,
      passed: Boolean,
      testedAt: Date
    }],
    lastTestRunAt: Date,
    testsPassed: Number,
    testsFailed: Number
  },
  version: {
    type: Number,
    default: 1
  },
  category: {
    type: String,
    enum: ['customer_support', 'sales', 'lead_qualification', 'faq', 'general', 'custom'],
    default: 'general'
  },
  enabled: {
    type: Boolean,
    default: false
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
aiAgentSchema.index({ userId: 1, enabled: 1 });
aiAgentSchema.index({ userId: 1, archived: 1 });
aiAgentSchema.index({ 'deployment.apiKey': 1 });
aiAgentSchema.index({ provider: 1, model: 1 });

// Virtual for cost estimation
aiAgentSchema.virtual('estimatedCostPerMessage').get(function() {
  const costs = {
    'gpt-4': 0.03, // per 1k tokens (input) + 0.06 (output)
    'gpt-3.5-turbo': 0.001,
    'claude-3-opus': 0.015,
    'claude-3-sonnet': 0.003,
    'claude-3-haiku': 0.00025,
    'gemini-pro': 0.00025
  };
  return costs[this.model] || 0.01;
});

// Generate API key for agent
aiAgentSchema.methods.generateApiKey = function() {
  const crypto = require('crypto');
  this.deployment.apiKey = `ai_${crypto.randomBytes(32).toString('hex')}`;
  return this.deployment.apiKey;
};

// Generate embed code for web widget
aiAgentSchema.methods.generateEmbedCode = function() {
  const baseUrl = process.env.API_URL || 'http://localhost:5001';
  this.deployment.embedCode = `
<!-- VoiceFlow AI Chat Widget -->
<script>
  (function(w,d,s,id){
    w.VoiceFlowChat=w.VoiceFlowChat||function(){
      (w.VoiceFlowChat.q=w.VoiceFlowChat.q||[]).push(arguments)
    };
    var js,fjs=d.getElementsByTagName(s)[0];
    js=d.createElement(s);js.id=id;
    js.src='${baseUrl}/widget.js';
    js.async=true;
    fjs.parentNode.insertBefore(js,fjs);
  })(window,document,'script','vf-chat');

  VoiceFlowChat('init', {
    agentId: '${this._id}',
    apiKey: '${this.deployment.apiKey}',
    primaryColor: '${this.channels[0]?.customization?.primaryColor || '#0066FF'}',
    position: '${this.channels[0]?.customization?.position || 'bottom-right'}'
  });
</script>`;
  return this.deployment.embedCode;
};

const AIAgent = mongoose.model('AIAgent', aiAgentSchema);

export default AIAgent;
