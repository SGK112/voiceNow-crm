import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI } from '@google-cloud/vertexai';

/**
 * Multi-AI Service
 * Supports: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude 3.5 Sonnet, Claude 3 Opus/Haiku), Google (Gemini Pro), Vertex AI
 */
class MultiAIService {
  constructor() {
    // OpenAI Configuration
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;

    // Anthropic (Claude) Configuration
    this.anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    }) : null;

    // Google Gemini Configuration
    this.gemini = process.env.GOOGLE_AI_API_KEY ? new GoogleGenerativeAI(
      process.env.GOOGLE_AI_API_KEY
    ) : null;

    // Vertex AI Configuration (Google Cloud)
    this.vertexAI = process.env.GOOGLE_CLOUD_PROJECT ? new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    }) : null;

    // Model configurations with capabilities and pricing
    this.models = {
      // OpenAI Models
      'gpt-4-turbo': {
        provider: 'openai',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        outputTokens: 4096,
        pricing: { input: 0.01, output: 0.03 },
        capabilities: ['text', 'vision', 'function_calling', 'json_mode'],
        recommended: true
      },
      'gpt-4': {
        provider: 'openai',
        name: 'GPT-4',
        contextWindow: 8192,
        outputTokens: 4096,
        pricing: { input: 0.03, output: 0.06 },
        capabilities: ['text', 'function_calling', 'json_mode']
      },
      'gpt-3.5-turbo': {
        provider: 'openai',
        name: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        outputTokens: 4096,
        pricing: { input: 0.0005, output: 0.0015 },
        capabilities: ['text', 'function_calling', 'json_mode'],
        recommended: false
      },
      'gpt-4o': {
        provider: 'openai',
        name: 'GPT-4o',
        contextWindow: 128000,
        outputTokens: 4096,
        pricing: { input: 0.005, output: 0.015 },
        capabilities: ['text', 'vision', 'function_calling', 'json_mode', 'audio'],
        recommended: true
      },

      // Anthropic (Claude) Models
      'claude-3-5-sonnet-20241022': {
        provider: 'anthropic',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        outputTokens: 8192,
        pricing: { input: 0.003, output: 0.015 },
        capabilities: ['text', 'vision', 'function_calling', 'extended_thinking'],
        recommended: true
      },
      'claude-3-opus-20240229': {
        provider: 'anthropic',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        outputTokens: 4096,
        pricing: { input: 0.015, output: 0.075 },
        capabilities: ['text', 'vision', 'function_calling']
      },
      'claude-3-sonnet-20240229': {
        provider: 'anthropic',
        name: 'Claude 3 Sonnet',
        contextWindow: 200000,
        outputTokens: 4096,
        pricing: { input: 0.003, output: 0.015 },
        capabilities: ['text', 'vision', 'function_calling']
      },
      'claude-3-haiku-20240307': {
        provider: 'anthropic',
        name: 'Claude 3 Haiku',
        contextWindow: 200000,
        outputTokens: 4096,
        pricing: { input: 0.00025, output: 0.00125 },
        capabilities: ['text', 'vision', 'function_calling'],
        recommended: false
      },

      // Google Gemini Models
      'gemini-pro': {
        provider: 'gemini',
        name: 'Gemini Pro',
        contextWindow: 32768,
        outputTokens: 2048,
        pricing: { input: 0.00025, output: 0.0005 },
        capabilities: ['text', 'function_calling'],
        recommended: false
      },
      'gemini-pro-vision': {
        provider: 'gemini',
        name: 'Gemini Pro Vision',
        contextWindow: 16384,
        outputTokens: 2048,
        pricing: { input: 0.00025, output: 0.0005 },
        capabilities: ['text', 'vision']
      },
      'gemini-1.5-pro': {
        provider: 'gemini',
        name: 'Gemini 1.5 Pro',
        contextWindow: 1000000,
        outputTokens: 8192,
        pricing: { input: 0.0035, output: 0.0105 },
        capabilities: ['text', 'vision', 'function_calling', 'long_context'],
        recommended: true
      },
      'gemini-1.5-flash': {
        provider: 'gemini',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1000000,
        outputTokens: 8192,
        pricing: { input: 0.00035, output: 0.00105 },
        capabilities: ['text', 'vision', 'function_calling', 'long_context'],
        recommended: false
      },

      // Vertex AI Models
      'text-bison': {
        provider: 'vertex',
        name: 'PaLM 2 Text Bison',
        contextWindow: 8192,
        outputTokens: 1024,
        pricing: { input: 0.001, output: 0.001 },
        capabilities: ['text']
      },
      'chat-bison': {
        provider: 'vertex',
        name: 'PaLM 2 Chat Bison',
        contextWindow: 8192,
        outputTokens: 1024,
        pricing: { input: 0.0005, output: 0.0005 },
        capabilities: ['text', 'chat']
      }
    };

    this.defaultModel = process.env.DEFAULT_AI_MODEL || 'gpt-4-turbo';
  }

  /**
   * Get available models for user
   */
  getAvailableModels() {
    const available = {};

    Object.entries(this.models).forEach(([modelId, config]) => {
      // Only return models where provider is configured
      if (this.isProviderAvailable(config.provider)) {
        available[modelId] = {
          ...config,
          available: true
        };
      }
    });

    return available;
  }

  /**
   * Check if provider is configured
   */
  isProviderAvailable(provider) {
    switch (provider) {
      case 'openai':
        return this.openai !== null;
      case 'anthropic':
        return this.anthropic !== null;
      case 'gemini':
        return this.gemini !== null;
      case 'vertex':
        return this.vertexAI !== null;
      default:
        return false;
    }
  }

  /**
   * Generate completion with specified model
   */
  async generateCompletion(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 2000,
      stream = false,
      functions = null,
      responseFormat = null
    } = options;

    const modelConfig = this.models[model];

    if (!modelConfig) {
      throw new Error(`Model ${model} not supported`);
    }

    if (!this.isProviderAvailable(modelConfig.provider)) {
      throw new Error(`Provider ${modelConfig.provider} not configured`);
    }

    // Route to appropriate provider
    switch (modelConfig.provider) {
      case 'openai':
        return this.generateOpenAI(model, messages, {
          temperature,
          maxTokens,
          stream,
          functions,
          responseFormat
        });

      case 'anthropic':
        return this.generateAnthropic(model, messages, {
          temperature,
          maxTokens,
          stream,
          functions
        });

      case 'gemini':
        return this.generateGemini(model, messages, {
          temperature,
          maxTokens
        });

      case 'vertex':
        return this.generateVertex(model, messages, {
          temperature,
          maxTokens
        });

      default:
        throw new Error(`Provider ${modelConfig.provider} not implemented`);
    }
  }

  /**
   * OpenAI Completion
   */
  async generateOpenAI(model, messages, options) {
    const params = {
      model,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: options.stream
    };

    if (options.functions) {
      params.functions = options.functions;
      params.function_call = 'auto';
    }

    if (options.responseFormat) {
      params.response_format = options.responseFormat;
    }

    const response = await this.openai.chat.completions.create(params);

    if (options.stream) {
      return response; // Return stream directly
    }

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: response.model,
      finishReason: response.choices[0].finish_reason,
      functionCall: response.choices[0].message.function_call
    };
  }

  /**
   * Anthropic (Claude) Completion
   */
  async generateAnthropic(model, messages, options) {
    // Convert OpenAI-style messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const params = {
      model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      messages: conversationMessages
    };

    if (systemMessage) {
      params.system = systemMessage.content;
    }

    if (options.functions) {
      params.tools = options.functions.map(fn => ({
        name: fn.name,
        description: fn.description,
        input_schema: fn.parameters
      }));
    }

    if (options.stream) {
      params.stream = true;
    }

    const response = await this.anthropic.messages.create(params);

    if (options.stream) {
      return response; // Return stream directly
    }

    return {
      content: response.content[0].text,
      usage: response.usage,
      model: response.model,
      finishReason: response.stop_reason,
      toolCalls: response.content.filter(c => c.type === 'tool_use')
    };
  }

  /**
   * Google Gemini Completion
   */
  async generateGemini(model, messages, options) {
    const genModel = this.gemini.getGenerativeModel({ model });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = genModel.startChat({
      history,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens
      }
    });

    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return {
      content: response.text(),
      usage: {
        prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: response.usageMetadata?.totalTokenCount || 0
      },
      model,
      finishReason: response.candidates?.[0]?.finishReason
    };
  }

  /**
   * Vertex AI Completion
   */
  async generateVertex(model, messages, options) {
    const generativeModel = this.vertexAI.preview.getGenerativeModel({
      model
    });

    // Convert messages to Vertex format
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens
      }
    });

    const response = result.response;

    return {
      content: response.candidates[0].content.parts[0].text,
      usage: {
        prompt_tokens: 0, // Vertex doesn't always provide token counts
        completion_tokens: 0,
        total_tokens: 0
      },
      model,
      finishReason: response.candidates[0].finishReason
    };
  }

  /**
   * Get recommended model for a use case
   */
  getRecommendedModel(useCase = 'general') {
    const recommendations = {
      general: 'gpt-4-turbo',
      coding: 'claude-3-5-sonnet-20241022',
      creative: 'claude-3-opus-20240229',
      fast: 'gpt-3.5-turbo',
      budget: 'gemini-1.5-flash',
      longContext: 'gemini-1.5-pro',
      vision: 'gpt-4o',
      reasoning: 'claude-3-5-sonnet-20241022'
    };

    const recommendedModel = recommendations[useCase] || this.defaultModel;

    // Check if model is available
    const modelConfig = this.models[recommendedModel];
    if (this.isProviderAvailable(modelConfig?.provider)) {
      return recommendedModel;
    }

    // Fallback to first available model
    const available = Object.keys(this.getAvailableModels());
    return available[0] || null;
  }

  /**
   * Calculate cost for completion
   */
  calculateCost(model, inputTokens, outputTokens) {
    const modelConfig = this.models[model];

    if (!modelConfig) {
      return 0;
    }

    const inputCost = (inputTokens / 1000) * modelConfig.pricing.input;
    const outputCost = (outputTokens / 1000) * modelConfig.pricing.output;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency: 'USD'
    };
  }
}

export default MultiAIService;
