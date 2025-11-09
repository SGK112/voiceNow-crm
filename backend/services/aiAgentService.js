import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Agent Service
 * Handles multi-provider AI interactions (OpenAI, Anthropic, Google)
 * Provides unified interface for chat completions across providers
 */
class AIAgentService {
  constructor() {
    // Initialize clients
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;

    this.anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;

    this.google = process.env.GOOGLE_AI_API_KEY
      ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
      : null;
  }

  /**
   * Send a message to an AI agent and get response
   * Unified interface across all providers
   */
  async chat(agent, messages, options = {}) {
    const provider = agent.provider;
    const model = agent.model;

    switch (provider) {
      case 'openai':
        return await this.chatOpenAI(agent, messages, options);

      case 'anthropic':
        return await this.chatAnthropic(agent, messages, options);

      case 'google':
        return await this.chatGoogle(agent, messages, options);

      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * OpenAI Chat Completion (GPT-4, GPT-3.5-turbo, etc.)
   */
  async chatOpenAI(agent, messages, options = {}) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const systemMessage = {
        role: 'system',
        content: agent.systemPrompt
      };

      const completion = await this.openai.chat.completions.create({
        model: agent.model,
        messages: [systemMessage, ...messages],
        temperature: agent.configuration.temperature,
        max_tokens: agent.configuration.maxTokens,
        top_p: agent.configuration.topP,
        frequency_penalty: agent.configuration.frequencyPenalty,
        presence_penalty: agent.configuration.presencePenalty,
        stop: agent.configuration.stopSequences,
        ...(agent.capabilities.functionCalling && options.tools ? { tools: options.tools } : {}),
        ...(agent.configuration.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {})
      });

      return {
        provider: 'openai',
        response: completion.choices[0].message.content,
        functionCall: completion.choices[0].message.tool_calls,
        usage: {
          inputTokens: completion.usage.prompt_tokens,
          outputTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        },
        model: agent.model,
        finishReason: completion.choices[0].finish_reason
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI chat failed: ${error.message}`);
    }
  }

  /**
   * Anthropic Claude Chat (Claude-3 Opus, Sonnet, Haiku)
   */
  async chatAnthropic(agent, messages, options = {}) {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      // Claude uses different message format
      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const response = await this.anthropic.messages.create({
        model: agent.model,
        system: agent.systemPrompt,
        messages: formattedMessages,
        temperature: agent.configuration.temperature,
        max_tokens: agent.configuration.maxTokens,
        top_p: agent.configuration.topP,
        stop_sequences: agent.configuration.stopSequences,
        ...(agent.capabilities.functionCalling && options.tools ? { tools: options.tools } : {})
      });

      return {
        provider: 'anthropic',
        response: response.content[0].text,
        functionCall: response.content.find(c => c.type === 'tool_use'),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        model: agent.model,
        finishReason: response.stop_reason
      };
    } catch (error) {
      console.error('Anthropic API Error:', error);
      throw new Error(`Anthropic chat failed: ${error.message}`);
    }
  }

  /**
   * Google Gemini Chat
   */
  async chatGoogle(agent, messages, options = {}) {
    if (!this.google) {
      throw new Error('Google AI API key not configured');
    }

    try {
      const model = this.google.getGenerativeModel({ model: agent.model });

      // Convert messages to Gemini format
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const lastMessage = messages[messages.length - 1].content;

      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: agent.configuration.temperature,
          maxOutputTokens: agent.configuration.maxTokens,
          topP: agent.configuration.topP,
          stopSequences: agent.configuration.stopSequences
        },
        systemInstruction: agent.systemPrompt
      });

      const result = await chat.sendMessage(lastMessage);
      const response = result.response.text();

      return {
        provider: 'google',
        response: response,
        functionCall: null, // Google function calling handled differently
        usage: {
          inputTokens: result.response.usageMetadata?.promptTokenCount || 0,
          outputTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: result.response.usageMetadata?.totalTokenCount || 0
        },
        model: agent.model,
        finishReason: result.response.candidates[0]?.finishReason
      };
    } catch (error) {
      console.error('Google AI API Error:', error);
      throw new Error(`Google AI chat failed: ${error.message}`);
    }
  }

  /**
   * Stream chat responses (for real-time UI updates)
   */
  async streamChat(agent, messages, onChunk, options = {}) {
    const provider = agent.provider;

    switch (provider) {
      case 'openai':
        return await this.streamOpenAI(agent, messages, onChunk, options);

      case 'anthropic':
        return await this.streamAnthropic(agent, messages, onChunk, options);

      case 'google':
        return await this.streamGoogle(agent, messages, onChunk, options);

      default:
        throw new Error(`Streaming not supported for provider: ${provider}`);
    }
  }

  async streamOpenAI(agent, messages, onChunk, options = {}) {
    if (!this.openai) throw new Error('OpenAI API key not configured');

    const systemMessage = { role: 'system', content: agent.systemPrompt };
    const stream = await this.openai.chat.completions.create({
      model: agent.model,
      messages: [systemMessage, ...messages],
      temperature: agent.configuration.temperature,
      max_tokens: agent.configuration.maxTokens,
      stream: true
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      onChunk(content);
    }

    return fullResponse;
  }

  async streamAnthropic(agent, messages, onChunk, options = {}) {
    if (!this.anthropic) throw new Error('Anthropic API key not configured');

    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const stream = await this.anthropic.messages.stream({
      model: agent.model,
      system: agent.systemPrompt,
      messages: formattedMessages,
      temperature: agent.configuration.temperature,
      max_tokens: agent.configuration.maxTokens
    });

    let fullResponse = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const content = event.delta.text;
        fullResponse += content;
        onChunk(content);
      }
    }

    return fullResponse;
  }

  async streamGoogle(agent, messages, onChunk, options = {}) {
    if (!this.google) throw new Error('Google AI API key not configured');

    const model = this.google.getGenerativeModel({ model: agent.model });
    const lastMessage = messages[messages.length - 1].content;

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: lastMessage }] }],
      generationConfig: {
        temperature: agent.configuration.temperature,
        maxOutputTokens: agent.configuration.maxTokens
      }
    });

    let fullResponse = '';
    for await (const chunk of result.stream) {
      const content = chunk.text();
      fullResponse += content;
      onChunk(content);
    }

    return fullResponse;
  }

  /**
   * Generate embeddings for RAG/knowledge base
   */
  async generateEmbedding(text, provider = 'openai') {
    switch (provider) {
      case 'openai':
        if (!this.openai) throw new Error('OpenAI API key not configured');

        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text
        });

        return response.data[0].embedding;

      default:
        throw new Error(`Embedding generation not supported for: ${provider}`);
    }
  }

  /**
   * Calculate cost for AI usage
   */
  calculateCost(provider, model, inputTokens, outputTokens) {
    const pricing = {
      openai: {
        'gpt-4': { input: 0.03, output: 0.06 }, // per 1k tokens
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
      },
      anthropic: {
        'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
        'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
        'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
      },
      google: {
        'gemini-pro': { input: 0.00025, output: 0.0005 },
        'gemini-1.5-pro': { input: 0.0035, output: 0.0105 }
      }
    };

    const modelPricing = pricing[provider]?.[model];
    if (!modelPricing) {
      console.warn(`No pricing data for ${provider}:${model}, using default`);
      return 0.01;
    }

    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * Validate API keys are configured
   */
  validateProvider(provider) {
    switch (provider) {
      case 'openai':
        if (!this.openai) throw new Error('OpenAI API key not configured. Add OPENAI_API_KEY to environment.');
        break;
      case 'anthropic':
        if (!this.anthropic) throw new Error('Anthropic API key not configured. Add ANTHROPIC_API_KEY to environment.');
        break;
      case 'google':
        if (!this.google) throw new Error('Google AI API key not configured. Add GOOGLE_AI_API_KEY to environment.');
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(provider) {
    const models = {
      openai: [
        { id: 'gpt-4', name: 'GPT-4', description: 'Most capable, best for complex tasks' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Faster and cheaper GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and affordable' }
      ],
      anthropic: [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most intelligent model' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest and most compact' }
      ],
      google: [
        { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google\'s most capable model' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Long context window (1M tokens)' }
      ]
    };

    return models[provider] || [];
  }
}

export default new AIAgentService();
