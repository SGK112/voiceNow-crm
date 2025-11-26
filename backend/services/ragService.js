import OpenAI from 'openai';
import mongoose from 'mongoose';
import KnowledgeBase from '../models/KnowledgeBase.js';

/**
 * RAG (Retrieval Augmented Generation) Service
 * Enhances AI agents with context from user's knowledge base
 */
class RAGService {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;

    if (!this.openai) {
      console.warn('⚠️  OpenAI API key not configured - RAG features will be limited');
    }
  }

  /**
   * Process and embed knowledge base content
   */
  async processKnowledgeBase(knowledgeBaseId) {
    try {
      const kb = await KnowledgeBase.findById(knowledgeBaseId);
      if (!kb) {
        throw new Error('Knowledge base not found');
      }

      if (!kb.content.rawText) {
        throw new Error('No content to process');
      }

      kb.status = 'processing';
      await kb.save();

      // Generate embeddings
      await kb.generateEmbeddings(this.openai);

      // Extract keywords using simple frequency analysis
      const keywords = this.extractKeywords(kb.content.rawText);
      kb.content.keywords = keywords;

      // Generate AI summary
      const summary = await this.generateSummary(kb.content.rawText);
      kb.content.summary = summary;

      kb.status = 'ready';
      await kb.save();

      return kb;
    } catch (error) {
      console.error('Process knowledge base error:', error);
      const kb = await KnowledgeBase.findById(knowledgeBaseId);
      if (kb) {
        kb.status = 'error';
        kb.processingError = error.message;
        await kb.save();
      }
      throw error;
    }
  }

  /**
   * Search knowledge base for relevant context
   */
  async searchKnowledgeBase(userId, query, options = {}) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API key not configured');
      }

      // Validate userId is a valid ObjectId before querying
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return {
          results: [],
          message: 'Invalid or missing user ID for knowledge base search'
        };
      }

      // Generate query embedding
      const queryEmbedding = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });

      const queryVector = queryEmbedding.data[0].embedding;

      // Find all ready knowledge bases for this user
      const knowledgeBases = await KnowledgeBase.find({
        userId,
        status: 'ready',
        'content.chunks.0': { $exists: true } // Has embeddings
      });

      if (knowledgeBases.length === 0) {
        return {
          results: [],
          message: 'No knowledge base available'
        };
      }

      // Search each knowledge base
      const allResults = [];

      for (const kb of knowledgeBases) {
        const similarities = kb.content.chunks.map(chunk => {
          const similarity = this.cosineSimilarity(queryVector, chunk.embedding);
          return {
            text: chunk.text,
            similarity,
            source: {
              id: kb._id,
              name: kb.name,
              type: kb.type,
              category: kb.category
            },
            metadata: chunk.metadata
          };
        });

        // Add to results
        allResults.push(...similarities);
      }

      // Sort by similarity and return top results
      const topResults = allResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, options.limit || 5)
        .filter(result => result.similarity > (options.threshold || 0.7)); // Only high-quality matches

      return {
        results: topResults,
        count: topResults.length,
        query
      };
    } catch (error) {
      console.error('Search knowledge base error:', error);
      throw error;
    }
  }

  /**
   * Enhance AI agent prompt with relevant context from knowledge base
   */
  async enhancePromptWithContext(userId, agentSystemPrompt, userMessage, options = {}) {
    try {
      // Search for relevant context
      const searchResults = await this.searchKnowledgeBase(userId, userMessage, {
        limit: options.contextLimit || 3,
        threshold: options.threshold || 0.7
      });

      if (searchResults.results.length === 0) {
        // No relevant context found, return original prompt
        return {
          enhancedPrompt: agentSystemPrompt,
          contextsUsed: []
        };
      }

      // Build context section
      const contextText = searchResults.results
        .map((result, index) => {
          return `[Context ${index + 1} from ${result.source.name}]:\n${result.text}\n`;
        })
        .join('\n');

      // Enhance system prompt with context
      const enhancedPrompt = `${agentSystemPrompt}

---

ADDITIONAL CONTEXT FROM KNOWLEDGE BASE:
You have access to the following information to help answer questions:

${contextText}

Use this information when relevant to provide accurate, detailed responses. If the user's question relates to this context, reference it naturally in your answer. If it doesn't relate, you can ignore it.

---`;

      return {
        enhancedPrompt,
        contextsUsed: searchResults.results.map(r => ({
          source: r.source.name,
          type: r.source.type,
          similarity: r.similarity
        }))
      };
    } catch (error) {
      console.error('Enhance prompt error:', error);
      // Fallback: return original prompt
      return {
        enhancedPrompt: agentSystemPrompt,
        contextsUsed: [],
        error: error.message
      };
    }
  }

  /**
   * Generate AI summary of content
   */
  async generateSummary(text, maxLength = 500) {
    try {
      if (!this.openai) {
        return text.substring(0, maxLength);
      }

      // Truncate very long text
      const truncatedText = text.length > 10000
        ? text.substring(0, 10000) + '...'
        : text;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise summaries of documents and data.'
          },
          {
            role: 'user',
            content: `Please provide a concise summary (max ${maxLength} characters) of the following content:\n\n${truncatedText}`
          }
        ],
        max_tokens: 200,
        temperature: 0.5
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Generate summary error:', error);
      // Fallback: return truncated text
      return text.substring(0, maxLength);
    }
  }

  /**
   * Extract keywords from text using frequency analysis
   */
  extractKeywords(text, topN = 10) {
    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
      'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
      'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very'
    ]);

    // Tokenize and count words
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Sort by frequency and return top N
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Bulk process multiple knowledge bases
   */
  async bulkProcessKnowledgeBases(userId) {
    try {
      const pendingKbs = await KnowledgeBase.find({
        userId,
        status: 'pending',
        'content.rawText': { $exists: true, $ne: '' }
      });

      const results = {
        processed: 0,
        failed: 0,
        errors: []
      };

      for (const kb of pendingKbs) {
        try {
          await this.processKnowledgeBase(kb._id);
          results.processed++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            knowledgeBaseId: kb._id,
            name: kb.name,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Bulk process error:', error);
      throw error;
    }
  }

  /**
   * Get knowledge base statistics for a user
   */
  async getKnowledgeBaseStats(userId) {
    try {
      const kbs = await KnowledgeBase.find({ userId });

      const stats = {
        total: kbs.length,
        byStatus: {},
        byType: {},
        byCategory: {},
        totalChunks: 0,
        totalSize: 0
      };

      kbs.forEach(kb => {
        // Count by status
        stats.byStatus[kb.status] = (stats.byStatus[kb.status] || 0) + 1;

        // Count by type
        stats.byType[kb.type] = (stats.byType[kb.type] || 0) + 1;

        // Count by category
        stats.byCategory[kb.category] = (stats.byCategory[kb.category] || 0) + 1;

        // Total chunks
        stats.totalChunks += kb.content.chunks?.length || 0;

        // Total text size
        stats.totalSize += kb.content.rawText?.length || 0;
      });

      stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);

      return stats;
    } catch (error) {
      console.error('Get KB stats error:', error);
      throw error;
    }
  }
}

export default new RAGService();
