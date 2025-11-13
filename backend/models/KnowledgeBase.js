import mongoose from 'mongoose';

/**
 * Knowledge Base Model
 * Stores documents, data sources, and training data for AI agents
 */
const knowledgeBaseSchema = new mongoose.Schema({
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
  description: {
    type: String
  },
  type: {
    type: String,
    enum: [
      'document',      // PDF, DOCX, TXT files
      'spreadsheet',   // Google Sheets, Excel, CSV
      'website',       // Web scraping
      'api',           // External API data
      'database',      // Database query results
      'media',         // Images, videos (via Cloudinary)
      'text',          // Manual text input
      'conversation'   // Past call transcripts
    ],
    required: true
  },
  source: {
    // Document/file source
    fileUrl: String,          // Cloudinary URL or S3 URL
    fileName: String,
    fileSize: Number,
    mimeType: String,

    // Google Sheets source
    googleSheetsId: String,
    googleSheetsUrl: String,
    sheetName: String,

    // Website source
    websiteUrl: String,
    lastScrapedAt: Date,

    // API source
    apiEndpoint: String,
    apiMethod: String,
    apiHeaders: Map,

    // Database source
    databaseType: String,     // 'mongodb', 'mysql', 'postgres'
    connectionString: String, // Encrypted
    query: String
  },
  // Processed content for RAG (Retrieval Augmented Generation)
  content: {
    rawText: String,           // Full text content
    chunks: [{                 // Split into chunks for embedding
      text: String,
      embedding: [Number],     // Vector embedding from OpenAI
      metadata: Map,
      chunkIndex: Number
    }],
    summary: String,           // AI-generated summary
    keywords: [String],        // Extracted keywords
    entities: [String]         // Named entities (people, places, etc.)
  },
  // Structured data (for spreadsheets)
  structuredData: {
    headers: [String],
    rows: [[mongoose.Schema.Types.Mixed]],
    rowCount: Number,
    columnCount: Number
  },
  // Integration settings
  integration: {
    autoSync: { type: Boolean, default: false },
    syncFrequency: {
      type: String,
      enum: ['manual', 'hourly', 'daily', 'weekly'],
      default: 'manual'
    },
    lastSyncedAt: Date,
    nextSyncAt: Date
  },
  // Usage and analytics
  usage: {
    timesReferenced: { type: Number, default: 0 },
    lastAccessedAt: Date,
    linkedAgents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AIAgent' }]
  },
  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'error', 'syncing'],
    default: 'pending'
  },
  processingError: String,
  // Vector store integration
  vectorStore: {
    provider: {
      type: String,
      enum: ['openai', 'pinecone', 'weaviate', 'local'],
      default: 'openai'
    },
    vectorStoreId: String,
    embeddingModel: {
      type: String,
      default: 'text-embedding-3-small'
    }
  },
  // Tags for organization
  tags: [String],
  category: {
    type: String,
    enum: ['product_info', 'pricing', 'policies', 'faq', 'customer_data', 'scripts', 'training', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

// Indexes for performance
knowledgeBaseSchema.index({ userId: 1, type: 1 });
knowledgeBaseSchema.index({ userId: 1, category: 1 });
knowledgeBaseSchema.index({ 'usage.linkedAgents': 1 });
knowledgeBaseSchema.index({ tags: 1 });

// Method to generate embeddings for content
knowledgeBaseSchema.methods.generateEmbeddings = async function(openaiClient) {
  if (!this.content.rawText) {
    throw new Error('No content to embed');
  }

  // Split content into chunks (max ~1000 tokens each)
  const chunkSize = 800; // words
  const words = this.content.rawText.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunkText = words.slice(i, i + chunkSize).join(' ');
    chunks.push({
      text: chunkText,
      chunkIndex: chunks.length,
      metadata: new Map([
        ['sourceId', this._id.toString()],
        ['sourceName', this.name],
        ['type', this.type]
      ])
    });
  }

  // Generate embeddings using OpenAI
  for (const chunk of chunks) {
    const response = await openaiClient.embeddings.create({
      model: this.vectorStore.embeddingModel,
      input: chunk.text
    });
    chunk.embedding = response.data[0].embedding;
  }

  this.content.chunks = chunks;
  this.status = 'ready';
  await this.save();

  return chunks.length;
};

// Method to search similar content
knowledgeBaseSchema.methods.searchSimilar = async function(queryEmbedding, limit = 5) {
  // Calculate cosine similarity between query and each chunk
  const similarities = this.content.chunks.map(chunk => {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    return { chunk, similarity };
  });

  // Sort by similarity and return top results
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(item => ({
      text: item.chunk.text,
      similarity: item.similarity,
      metadata: item.chunk.metadata
    }));
};

// Helper function for cosine similarity
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

export default KnowledgeBase;
