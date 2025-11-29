import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Analyzes conversation patterns and generates improvement suggestions
export class ConversationTrainer {
  constructor() {
    this.trainingDataPath = path.join(process.cwd(), 'backend', 'training-data');
    this.learningsPath = path.join(this.trainingDataPath, 'learnings.json');
    this.patternsPath = path.join(this.trainingDataPath, 'speech-patterns.json');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.trainingDataPath)) {
      fs.mkdirSync(this.trainingDataPath, { recursive: true });
    }

    // Initialize learnings file if it doesn't exist
    if (!fs.existsSync(this.learningsPath)) {
      fs.writeFileSync(this.learningsPath, JSON.stringify({
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        totalConversationsAnalyzed: 0,
        insights: {
          commonPhrases: [],
          effectiveResponses: [],
          timingPatterns: {},
          userPreferences: {}
        }
      }, null, 2));
    }

    // Initialize patterns file
    if (!fs.existsSync(this.patternsPath)) {
      fs.writeFileSync(this.patternsPath, JSON.stringify({
        greetings: [],
        questions: [],
        commands: [],
        farewells: [],
        successfulResponsePatterns: []
      }, null, 2));
    }
  }

  // Analyze a single conversation when it ends
  async analyzeConversation(conversationData) {
    console.log('🎓 [TRAINER] Analyzing conversation for learning opportunities...');

    const analysis = {
      timestamp: new Date().toISOString(),
      conversationId: conversationData.conversationId || Date.now(),
      metrics: this.analyzeMetrics(conversationData),
      speechPatterns: this.analyzeSpeechPatterns(conversationData),
      timingAnalysis: this.analyzeTimingPatterns(conversationData),
      suggestions: []
    };

    // Generate AI-powered insights
    if (conversationData.messages && conversationData.messages.length > 2) {
      analysis.aiInsights = await this.generateAIInsights(conversationData);
    }

    // Identify improvement opportunities
    analysis.suggestions = this.generateSuggestions(analysis);

    // Save analysis
    this.saveAnalysis(analysis);

    // Update learnings
    this.updateLearnings(analysis);

    console.log(`✅ [TRAINER] Analysis complete. Found ${analysis.suggestions.length} improvement opportunities.`);

    return analysis;
  }

  // Analyze performance metrics
  analyzeMetrics(conversationData) {
    const metrics = {
      totalDuration: conversationData.totalTime || 0,
      transcriptionTime: conversationData.transcriptionTime || 0,
      aiResponseTime: conversationData.aiResponseTime || 0,
      voiceGenTime: conversationData.voiceGenTime || 0,
      messageCount: conversationData.messages?.length || 0
    };

    // Calculate efficiency scores
    metrics.transcriptionEfficiency = metrics.transcriptionTime < 1500 ? 'excellent' :
                                      metrics.transcriptionTime < 2000 ? 'good' : 'needs-improvement';

    metrics.aiEfficiency = metrics.aiResponseTime < 700 ? 'excellent' :
                          metrics.aiResponseTime < 1000 ? 'good' : 'needs-improvement';

    metrics.voiceEfficiency = metrics.voiceGenTime < 700 ? 'excellent' :
                             metrics.voiceGenTime < 1000 ? 'good' : 'needs-improvement';

    return metrics;
  }

  // Analyze user speech patterns
  analyzeSpeechPatterns(conversationData) {
    const patterns = {
      avgMessageLength: 0,
      commonWords: {},
      questionTypes: [],
      userTone: 'neutral'
    };

    if (!conversationData.messages) return patterns;

    const userMessages = conversationData.messages.filter(m => m.role === 'user');

    if (userMessages.length === 0) return patterns;

    // Calculate average message length
    const totalLength = userMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    patterns.avgMessageLength = Math.round(totalLength / userMessages.length);

    // Extract common words
    userMessages.forEach(msg => {
      const words = (msg.content || '').toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // Ignore short words
          patterns.commonWords[word] = (patterns.commonWords[word] || 0) + 1;
        }
      });
    });

    // Identify question types
    userMessages.forEach(msg => {
      const content = (msg.content || '').toLowerCase();
      if (content.includes('what')) patterns.questionTypes.push('what');
      if (content.includes('when')) patterns.questionTypes.push('when');
      if (content.includes('where')) patterns.questionTypes.push('where');
      if (content.includes('why')) patterns.questionTypes.push('why');
      if (content.includes('how')) patterns.questionTypes.push('how');
      if (content.includes('who')) patterns.questionTypes.push('who');
    });

    return patterns;
  }

  // Analyze timing patterns
  analyzeTimingPatterns(conversationData) {
    return {
      avgTranscriptionTime: conversationData.transcriptionTime,
      avgAiResponseTime: conversationData.aiResponseTime,
      avgVoiceGenTime: conversationData.voiceGenTime,
      totalProcessingTime: conversationData.totalTime,
      bottleneck: this.identifyBottleneck(conversationData)
    };
  }

  identifyBottleneck(conversationData) {
    const times = {
      transcription: conversationData.transcriptionTime || 0,
      ai: conversationData.aiResponseTime || 0,
      voice: conversationData.voiceGenTime || 0
    };

    const max = Math.max(times.transcription, times.ai, times.voice);

    if (max === times.transcription) return 'transcription';
    if (max === times.ai) return 'ai';
    return 'voice';
  }

  // Generate AI-powered insights using GPT
  async generateAIInsights(conversationData) {
    try {
      const conversationText = conversationData.messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = `Analyze this voice assistant conversation and provide insights:

${conversationText}

Metrics:
- Transcription: ${conversationData.transcriptionTime}ms
- AI Response: ${conversationData.aiResponseTime}ms
- Voice Gen: ${conversationData.voiceGenTime}ms

Provide a JSON response with:
1. userIntent: What the user was trying to accomplish
2. conversationQuality: Rate 1-10
3. responseAppropriateNess: Were Aria's responses appropriate?
4. suggestedImprovements: Array of specific improvements
5. detectedPatterns: Any patterns in how the user speaks

Keep it brief and actionable.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('❌ [TRAINER] Error generating AI insights:', error.message);
      return null;
    }
  }

  // Generate improvement suggestions
  generateSuggestions(analysis) {
    const suggestions = [];

    // Performance suggestions
    if (analysis.metrics.transcriptionEfficiency === 'needs-improvement') {
      suggestions.push({
        type: 'performance',
        area: 'transcription',
        priority: 'high',
        suggestion: 'Transcription is slow. Consider using smaller audio files or optimizing audio format.',
        currentValue: `${analysis.metrics.transcriptionTime}ms`,
        targetValue: '< 1500ms'
      });
    }

    if (analysis.metrics.aiEfficiency === 'needs-improvement') {
      suggestions.push({
        type: 'performance',
        area: 'ai-response',
        priority: 'high',
        suggestion: 'AI response time is high. Consider reducing max_tokens or using prompt caching.',
        currentValue: `${analysis.metrics.aiResponseTime}ms`,
        targetValue: '< 700ms'
      });
    }

    // Speech pattern suggestions
    if (analysis.speechPatterns.avgMessageLength > 100) {
      suggestions.push({
        type: 'ux',
        area: 'user-speech',
        priority: 'medium',
        suggestion: 'User tends to give long messages. Consider implementing better interruption handling.',
        pattern: 'long-messages'
      });
    }

    // Bottleneck suggestions
    if (analysis.timingAnalysis.bottleneck) {
      suggestions.push({
        type: 'optimization',
        area: analysis.timingAnalysis.bottleneck,
        priority: 'high',
        suggestion: `${analysis.timingAnalysis.bottleneck} is the main bottleneck. Focus optimization efforts here.`,
        bottleneck: analysis.timingAnalysis.bottleneck
      });
    }

    return suggestions;
  }

  // Save analysis to file
  saveAnalysis(analysis) {
    const date = new Date().toISOString().split('T')[0];
    const analysisFile = path.join(this.trainingDataPath, `analysis-${date}.jsonl`);

    const entry = JSON.stringify(analysis) + '\n';
    fs.appendFileSync(analysisFile, entry);
  }

  // Update cumulative learnings
  updateLearnings(analysis) {
    let learnings = JSON.parse(fs.readFileSync(this.learningsPath, 'utf8'));

    learnings.totalConversationsAnalyzed += 1;
    learnings.lastUpdated = new Date().toISOString();

    // Update timing patterns
    if (!learnings.insights.timingPatterns.avgTranscription) {
      learnings.insights.timingPatterns.avgTranscription = [];
    }
    learnings.insights.timingPatterns.avgTranscription.push(analysis.metrics.transcriptionTime);

    // Keep only last 100 data points
    if (learnings.insights.timingPatterns.avgTranscription.length > 100) {
      learnings.insights.timingPatterns.avgTranscription.shift();
    }

    // Update common phrases from speech patterns
    if (analysis.speechPatterns.commonWords) {
      Object.entries(analysis.speechPatterns.commonWords).forEach(([word, count]) => {
        const existing = learnings.insights.commonPhrases.find(p => p.word === word);
        if (existing) {
          existing.count += count;
        } else {
          learnings.insights.commonPhrases.push({ word, count });
        }
      });

      // Sort and keep top 50
      learnings.insights.commonPhrases.sort((a, b) => b.count - a.count);
      learnings.insights.commonPhrases = learnings.insights.commonPhrases.slice(0, 50);
    }

    fs.writeFileSync(this.learningsPath, JSON.stringify(learnings, null, 2));
  }

  // Generate optimized system prompt based on learnings
  generateOptimizedPrompt() {
    const learnings = JSON.parse(fs.readFileSync(this.learningsPath, 'utf8'));

    let optimizations = [];

    // Calculate average timing
    const avgTranscription = learnings.insights.timingPatterns.avgTranscription || [];
    if (avgTranscription.length > 0) {
      const avg = avgTranscription.reduce((a, b) => a + b, 0) / avgTranscription.length;

      if (avg > 1500) {
        optimizations.push('Focus on even shorter responses to compensate for transcription delays');
      }
    }

    // Top user words/phrases
    const topPhrases = learnings.insights.commonPhrases.slice(0, 10);
    if (topPhrases.length > 0) {
      optimizations.push(`User commonly says: ${topPhrases.map(p => p.word).join(', ')}`);
    }

    return {
      totalConversations: learnings.totalConversationsAnalyzed,
      optimizations,
      lastUpdated: learnings.lastUpdated
    };
  }

  // Get training statistics
  getTrainingStats() {
    const learnings = JSON.parse(fs.readFileSync(this.learningsPath, 'utf8'));

    const avgTranscription = learnings.insights.timingPatterns.avgTranscription || [];
    const avgTiming = avgTranscription.length > 0
      ? avgTranscription.reduce((a, b) => a + b, 0) / avgTranscription.length
      : 0;

    return {
      totalAnalyzed: learnings.totalConversationsAnalyzed,
      lastUpdated: learnings.lastUpdated,
      avgTranscriptionTime: Math.round(avgTiming),
      topUserPhrases: learnings.insights.commonPhrases.slice(0, 10),
      version: learnings.version
    };
  }
}

export const trainer = new ConversationTrainer();
export default trainer;
