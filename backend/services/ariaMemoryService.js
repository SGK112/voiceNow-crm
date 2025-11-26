import AriaMemory from '../models/AriaMemory.js';
import AriaConversation from '../models/AriaConversation.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getRedisClient } from '../config/redis.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize AI providers
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export class AriaMemoryService {
  constructor() {
    this.redis = getRedisClient();
    this.CACHE_TTL = 3600; // 1 hour cache
    this.MAX_CONTEXT_MESSAGES = 20; // Keep last 20 messages in context
  }

  // Helper to safely use Redis
  async safeRedisGet(key) {
    if (!this.redis) return null;
    try {
      return await this.redis.get(key);
    } catch (error) {
      return null;
    }
  }

  async safeRedisSet(key, value, ttl = null) {
    if (!this.redis) return;
    try {
      if (ttl) {
        await this.redis.setEx(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      // Silently fail if Redis unavailable
    }
  }

  async safeRedisDel(key) {
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch (error) {
      // Silently fail
    }
  }

  // ==================== MEMORY OPERATIONS ====================

  /**
   * Store a memory with vector embedding for semantic search
   */
  async storeMemory(userId, key, value, options = {}) {
    try {
      console.log(`🧠 [MEMORY] Storing: ${key} for user: ${userId}`);

      const {
        category = 'fact',
        importance = 5,
        sessionId = null,
        expiresIn = null,
        source = 'voice'
      } = options;

      // Generate embedding for semantic search
      const embedding = await this.generateEmbedding(value);

      // Create summary
      const summary = value.length > 100 ? value.substring(0, 100) + '...' : value;

      // Calculate expiration
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn) : null;

      // Store in MongoDB
      const memory = await AriaMemory.create({
        userId,
        sessionId,
        key,
        value,
        summary,
        category,
        importance,
        embedding,
        expiresAt,
        source
      });

      // Cache in Redis for fast access
      await this.cacheMemory(userId, key, memory);

      // Invalidate user's memory cache
      await this.invalidateUserCache(userId);

      console.log(`✅ [MEMORY] Stored successfully: ${memory._id}`);

      return {
        success: true,
        memoryId: memory._id,
        message: `Remembered: ${summary}`
      };
    } catch (error) {
      console.error('❌ [MEMORY] Storage error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Recall memories using semantic search
   */
  async recallMemory(userId, query, options = {}) {
    try {
      console.log(`🔍 [MEMORY] Recalling for user ${userId}: "${query}"`);

      const {
        limit = 5,
        category = null,
        minImportance = 0
      } = options;

      // Try cache first
      const cacheKey = `memory:recall:${userId}:${query}:${category}`;
      const cached = await this.safeRedisGet(cacheKey);
      if (cached) {
        console.log('✅ [MEMORY] Found in cache');
        return JSON.parse(cached);
      }

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Find similar memories using vector similarity
      const filter = { userId };
      if (category) filter.category = category;
      if (minImportance > 0) filter.importance = { $gte: minImportance };

      let memories = await AriaMemory
        .find(filter)
        .sort({ accessCount: -1, importance: -1 })
        .limit(limit * 2); // Get more for filtering

      // Calculate cosine similarity
      memories = memories
        .map(memory => ({
          ...memory.toObject(),
          similarity: memory.embedding
            ? this.cosineSimilarity(queryEmbedding, memory.embedding)
            : 0
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      // Update access counts
      await Promise.all(
        memories.map(m => AriaMemory.findByIdAndUpdate(m._id, {
          $inc: { accessCount: 1 },
          lastAccessed: new Date()
        }))
      );

      const result = {
        success: true,
        memories: memories.map(m => ({
          id: m._id,
          key: m.key,
          value: m.value,
          summary: m.summary,
          category: m.category,
          importance: m.importance,
          similarity: m.similarity,
          accessCount: m.accessCount
        })),
        summary: memories.length > 0
          ? memories[0].value
          : "I don't recall anything about that"
      };

      // Cache result
      await this.safeRedisSet(cacheKey, 300, JSON.stringify(result)); // 5 min cache

      console.log(`✅ [MEMORY] Found ${memories.length} relevant memories`);

      return result;
    } catch (error) {
      console.error('❌ [MEMORY] Recall error:', error);
      return {
        success: false,
        error: error.message,
        memories: []
      };
    }
  }

  /**
   * Get all memories for a user
   */
  async getUserMemories(userId, options = {}) {
    const { category = null, limit = 50, sortBy = 'recent' } = options;

    const filter = { userId };
    if (category) filter.category = category;

    let sort = {};
    switch (sortBy) {
      case 'important':
        sort = { importance: -1, accessCount: -1 };
        break;
      case 'frequent':
        sort = { accessCount: -1 };
        break;
      case 'recent':
      default:
        sort = { createdAt: -1 };
    }

    const memories = await AriaMemory
      .find(filter)
      .sort(sort)
      .limit(limit);

    return memories;
  }

  /**
   * Delete a memory
   */
  async deleteMemory(userId, memoryId) {
    const result = await AriaMemory.deleteOne({ _id: memoryId, userId });
    await this.invalidateUserCache(userId);
    return result.deletedCount > 0;
  }

  // ==================== CONVERSATION CONTEXT ====================

  /**
   * Get or create conversation session
   */
  async getConversation(sessionId, userId = 'default') {
    // First check for active conversation
    let conversation = await AriaConversation.findOne({ sessionId, status: 'active' });

    if (!conversation) {
      // Check if there's an ended conversation we can reactivate
      const existingConversation = await AriaConversation.findOne({ sessionId });

      if (existingConversation) {
        // Reactivate existing conversation
        existingConversation.status = 'active';
        existingConversation.updatedAt = new Date();
        await existingConversation.save();
        console.log(`🎬 [SESSION] New conversation started: ${sessionId}`);
        conversation = existingConversation;
      } else {
        // Create brand new conversation
        conversation = await AriaConversation.create({
          sessionId,
          userId,
          messages: [],
          status: 'active'
        });
        console.log(`🎬 [SESSION] New conversation started: ${sessionId}`);
      }
    }

    return conversation;
  }

  /**
   * Add message to conversation
   */
  async addMessage(sessionId, role, content, metadata = {}) {
    const conversation = await this.getConversation(sessionId);
    await conversation.addMessage(role, content, metadata);

    // Auto-summarize if conversation is getting long
    if (conversation.messages.length % 10 === 0) {
      await this.summarizeConversation(sessionId);
    }

    return conversation;
  }

  /**
   * Get conversation context with relevant memories
   * @param {Object} options - { skipMemoryRecall: boolean } - skip expensive semantic search
   */
  async getConversationContext(sessionId, userId = 'default', options = {}) {
    try {
      const { skipMemoryRecall = false } = options;

      // Check cache - use different key for fast mode
      const cacheKey = skipMemoryRecall ? `context:fast:${sessionId}` : `context:${sessionId}`;
      const cached = await this.safeRedisGet(cacheKey);
      if (cached) {
        console.log(`[CONTEXT] Cache hit (${skipMemoryRecall ? 'fast' : 'full'} mode)`);
        return JSON.parse(cached);
      }

      const conversation = await this.getConversation(sessionId, userId);

      // Get recent messages (sliding window)
      const recentMessages = conversation.getRecentMessages(this.MAX_CONTEXT_MESSAGES);

      let relevantMemories = { memories: [] };

      // Only do expensive memory recall if needed
      if (!skipMemoryRecall) {
        // Get relevant memories based on recent conversation
        const conversationText = recentMessages
          .map(m => m.content)
          .join(' ')
          .slice(-500); // Last 500 chars

        relevantMemories = await this.recallMemory(userId, conversationText, {
          limit: 5,
          minImportance: 3
        });
      } else {
        console.log('[CONTEXT] Skipping memory recall (fast mode)');
      }

      const context = {
        sessionId,
        userId,
        messages: recentMessages,
        memories: relevantMemories.memories || [],
        summary: conversation.summary,
        topic: conversation.topic,
        messageCount: conversation.messages.length
      };

      // Cache for 60 seconds (fast mode) or 30 seconds (full mode)
      const ttl = skipMemoryRecall ? 60 : 30;
      await this.safeRedisSet(cacheKey, JSON.stringify(context), ttl);

      return context;
    } catch (error) {
      console.error('❌ [CONTEXT] Error getting context:', error);
      return {
        sessionId,
        userId,
        messages: [],
        memories: []
      };
    }
  }

  /**
   * Summarize conversation using AI
   */
  async summarizeConversation(sessionId) {
    try {
      const conversation = await AriaConversation.findOne({ sessionId });
      if (!conversation || conversation.messages.length < 5) return;

      const messages = conversation.messages.slice(-20);
      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');

      const summary = await this.generateSummary(text);

      conversation.summary = summary;
      await conversation.save();

      console.log(`📝 [CONTEXT] Conversation summarized: ${sessionId}`);

      return summary;
    } catch (error) {
      console.error('❌ [CONTEXT] Summarization error:', error);
      return null;
    }
  }

  /**
   * End conversation and store key memories
   */
  async endConversation(sessionId) {
    const conversation = await AriaConversation.findOne({ sessionId });
    if (!conversation) return;

    // Generate final summary
    await this.summarizeConversation(sessionId);

    // Extract and store important facts as memories
    await this.extractMemoriesFromConversation(conversation);

    // Mark as ended
    await conversation.endConversation();

    // Clear cache
    await this.safeRedisDel(`context:${sessionId}`);

    console.log(`🏁 [CONTEXT] Conversation ended: ${sessionId}`);
  }

  /**
   * Extract memorable facts from conversation
   */
  async extractMemoriesFromConversation(conversation) {
    try {
      const userMessages = conversation.messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n');

      if (userMessages.length < 50) return;

      // Use AI to extract facts
      const prompt = `Extract important facts, preferences, or information from this conversation that should be remembered for future interactions. Return as JSON array of {key, value, category, importance}.

Conversation:
${userMessages}

Return only memorable information like preferences, personal facts, business details, or important context. Skip greetings and small talk.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 500
      });

      const extracted = JSON.parse(response.choices[0].message.content);

      if (extracted.memories && Array.isArray(extracted.memories)) {
        for (const memory of extracted.memories) {
          await this.storeMemory(
            conversation.userId,
            memory.key,
            memory.value,
            {
              category: memory.category || 'conversation',
              importance: memory.importance || 5,
              sessionId: conversation.sessionId,
              source: 'conversation_extraction'
            }
          );
        }

        console.log(`🎓 [MEMORY] Extracted ${extracted.memories.length} memories from conversation`);
      }
    } catch (error) {
      console.error('❌ [MEMORY] Extraction error:', error);
    }
  }

  // ==================== AI MODEL SUPPORT ====================

  /**
   * Generate AI response using selected model
   */
  async generateResponse(messages, options = {}) {
    const {
      model = 'openai',
      maxTokens = 100,
      temperature = 0.7
    } = options;

    try {
      switch (model) {
        case 'claude':
          return await this.generateWithClaude(messages, maxTokens, temperature);
        case 'gemini':
          return await this.generateWithGemini(messages, maxTokens, temperature);
        case 'openai':
        default:
          return await this.generateWithOpenAI(messages, maxTokens, temperature);
      }
    } catch (error) {
      console.error(`❌ [AI] ${model} generation error:`, error);
      throw error;
    }
  }

  async generateWithOpenAI(messages, maxTokens, temperature) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature
    });

    return response.choices[0].message.content;
  }

  async generateWithClaude(messages, maxTokens, temperature) {
    if (!anthropic) {
      throw new Error('Claude API not configured');
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      temperature,
      messages: messages.filter(m => m.role !== 'system'),
      system: messages.find(m => m.role === 'system')?.content
    });

    return response.content[0].text;
  }

  async generateWithGemini(messages, maxTokens, temperature) {
    if (!gemini) {
      throw new Error('Gemini API not configured');
    }

    const model = gemini.getGenerativeModel({ model: 'gemini-pro' });

    // Convert messages to Gemini format
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  // ==================== HELPER FUNCTIONS ====================

  async generateEmbedding(text) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000) // Limit text length
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ [EMBEDDING] Error:', error);
      return [];
    }
  }

  async generateSummary(text) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Summarize this conversation in 2-3 sentences:\n\n${text}`
        }],
        max_tokens: 100
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('❌ [SUMMARY] Error:', error);
      return 'Conversation about various topics';
    }
  }

  cosineSimilarity(a, b) {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitudeA * magnitudeB);
  }

  async cacheMemory(userId, key, memory) {
    const cacheKey = `memory:${userId}:${key}`;
    await this.safeRedisSet(cacheKey, this.CACHE_TTL, JSON.stringify(memory));
  }

  async invalidateUserCache(userId) {
    if (!this.redis) {
      console.warn('⚠️  Redis not available, skipping cache invalidation');
      return;
    }
    const pattern = `memory:*:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.safeRedisDel(...keys);
    }
  }

  // ==================== STATISTICS ====================

  async getMemoryStats(userId) {
    const total = await AriaMemory.countDocuments({ userId });
    const byCategory = await AriaMemory.aggregate([
      { $match: { userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const mostAccessed = await AriaMemory
      .find({ userId })
      .sort({ accessCount: -1 })
      .limit(5)
      .select('key value accessCount');

    const conversations = await AriaConversation.countDocuments({ userId });

    return {
      totalMemories: total,
      byCategory,
      mostAccessed,
      conversations
    };
  }
}

export const ariaMemoryService = new AriaMemoryService();
export default ariaMemoryService;
