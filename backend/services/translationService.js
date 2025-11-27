/**
 * Translation Service
 * Provides translation capabilities for Aria with history tracking
 * Supports real-time translation, transcription, and language learning
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory translation history (will be moved to DB)
const translationHistory = new Map(); // userId -> translations[]
const languageProfiles = new Map(); // contactId/userId -> language preferences

class TranslationService {
  constructor() {
    this.supportedLanguages = {
      // Major languages
      'en': { name: 'English', nativeName: 'English', rtl: false },
      'es': { name: 'Spanish', nativeName: 'Español', rtl: false },
      'fr': { name: 'French', nativeName: 'Français', rtl: false },
      'de': { name: 'German', nativeName: 'Deutsch', rtl: false },
      'it': { name: 'Italian', nativeName: 'Italiano', rtl: false },
      'pt': { name: 'Portuguese', nativeName: 'Português', rtl: false },
      'zh': { name: 'Chinese', nativeName: '中文', rtl: false },
      'ja': { name: 'Japanese', nativeName: '日本語', rtl: false },
      'ko': { name: 'Korean', nativeName: '한국어', rtl: false },
      'ar': { name: 'Arabic', nativeName: 'العربية', rtl: true },
      'hi': { name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
      'ru': { name: 'Russian', nativeName: 'Русский', rtl: false },
      'vi': { name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false },
      'th': { name: 'Thai', nativeName: 'ไทย', rtl: false },
      'nl': { name: 'Dutch', nativeName: 'Nederlands', rtl: false },
      'tr': { name: 'Turkish', nativeName: 'Türkçe', rtl: false },
      'pl': { name: 'Polish', nativeName: 'Polski', rtl: false },
      'sv': { name: 'Swedish', nativeName: 'Svenska', rtl: false },
      'he': { name: 'Hebrew', nativeName: 'עברית', rtl: true },
      'id': { name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false },
      'ms': { name: 'Malay', nativeName: 'Bahasa Melayu', rtl: false },
      'fil': { name: 'Filipino', nativeName: 'Filipino', rtl: false },
      'uk': { name: 'Ukrainian', nativeName: 'Українська', rtl: false },
      'cs': { name: 'Czech', nativeName: 'Čeština', rtl: false },
      'el': { name: 'Greek', nativeName: 'Ελληνικά', rtl: false },
      'ro': { name: 'Romanian', nativeName: 'Română', rtl: false },
      'hu': { name: 'Hungarian', nativeName: 'Magyar', rtl: false },
      'da': { name: 'Danish', nativeName: 'Dansk', rtl: false },
      'fi': { name: 'Finnish', nativeName: 'Suomi', rtl: false },
      'no': { name: 'Norwegian', nativeName: 'Norsk', rtl: false },
      'sk': { name: 'Slovak', nativeName: 'Slovenčina', rtl: false },
      'bg': { name: 'Bulgarian', nativeName: 'Български', rtl: false },
      'hr': { name: 'Croatian', nativeName: 'Hrvatski', rtl: false },
      'sr': { name: 'Serbian', nativeName: 'Српски', rtl: false },
      'bn': { name: 'Bengali', nativeName: 'বাংলা', rtl: false },
      'ta': { name: 'Tamil', nativeName: 'தமிழ்', rtl: false },
      'te': { name: 'Telugu', nativeName: 'తెలుగు', rtl: false },
      'mr': { name: 'Marathi', nativeName: 'मराठी', rtl: false },
      'gu': { name: 'Gujarati', nativeName: 'ગુજરાતી', rtl: false },
      'ur': { name: 'Urdu', nativeName: 'اردو', rtl: true },
      'fa': { name: 'Persian', nativeName: 'فارسی', rtl: true },
      'sw': { name: 'Swahili', nativeName: 'Kiswahili', rtl: false },
      'af': { name: 'Afrikaans', nativeName: 'Afrikaans', rtl: false },
    };
  }

  /**
   * Translate text from one language to another
   */
  async translate(text, targetLanguage, sourceLanguage = 'auto', options = {}) {
    const { userId, contactId, context, preserveFormatting = true } = options;

    if (!text || !targetLanguage) {
      throw new Error('Text and target language are required');
    }

    const startTime = Date.now();

    try {
      // Build translation prompt
      let systemPrompt = `You are an expert translator. Translate the following text to ${this.getLanguageName(targetLanguage)}.`;

      if (sourceLanguage !== 'auto') {
        systemPrompt += ` The source language is ${this.getLanguageName(sourceLanguage)}.`;
      }

      if (preserveFormatting) {
        systemPrompt += ' Preserve the original formatting, tone, and style.';
      }

      if (context) {
        systemPrompt += ` Context: ${context}`;
      }

      systemPrompt += ' Only output the translation, nothing else.';

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: Math.max(text.length * 2, 500),
      });

      const translatedText = response.choices[0].message.content.trim();
      const duration = Date.now() - startTime;

      // Create translation record
      const record = {
        id: Date.now().toString(),
        originalText: text,
        translatedText,
        sourceLanguage: sourceLanguage === 'auto' ? await this.detectLanguage(text) : sourceLanguage,
        targetLanguage,
        userId,
        contactId,
        context,
        timestamp: new Date().toISOString(),
        duration,
        charCount: text.length,
      };

      // Store in history
      if (userId) {
        this.addToHistory(userId, record);
      }

      return {
        success: true,
        translation: translatedText,
        sourceLanguage: record.sourceLanguage,
        targetLanguage,
        originalText: text,
        charCount: text.length,
        duration,
      };

    } catch (error) {
      console.error('[TranslationService] Translation error:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Detect the language of text
   */
  async detectLanguage(text) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Detect the language of the following text. Respond with only the ISO 639-1 language code (e.g., en, es, fr, de, zh, ja, ko, ar). If uncertain, respond with your best guess.',
          },
          { role: 'user', content: text },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      const detectedCode = response.choices[0].message.content.trim().toLowerCase();
      return this.supportedLanguages[detectedCode] ? detectedCode : 'en';

    } catch (error) {
      console.error('[TranslationService] Language detection error:', error);
      return 'en';
    }
  }

  /**
   * Translate and transcribe audio
   */
  async transcribeAndTranslate(audioBuffer, targetLanguage, options = {}) {
    const { userId } = options;

    try {
      // First transcribe the audio
      const audioFile = new File([audioBuffer], 'audio.m4a', { type: 'audio/m4a' });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json',
      });

      const originalText = transcription.text;
      const detectedLanguage = transcription.language || 'en';

      // Then translate if needed
      let translatedText = originalText;
      if (detectedLanguage !== targetLanguage) {
        const translationResult = await this.translate(originalText, targetLanguage, detectedLanguage, { userId });
        translatedText = translationResult.translation;
      }

      return {
        success: true,
        originalText,
        translatedText,
        sourceLanguage: detectedLanguage,
        targetLanguage,
        transcription: {
          text: originalText,
          language: detectedLanguage,
          duration: transcription.duration,
        },
      };

    } catch (error) {
      console.error('[TranslationService] Transcribe/translate error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Batch translate multiple texts
   */
  async batchTranslate(texts, targetLanguage, sourceLanguage = 'auto', options = {}) {
    const results = [];

    for (const text of texts) {
      try {
        const result = await this.translate(text, targetLanguage, sourceLanguage, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          originalText: text,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      results,
      totalCount: texts.length,
      successCount: results.filter(r => r.success).length,
    };
  }

  /**
   * Real-time conversation translation (for live chat)
   */
  async translateConversation(messages, targetLanguage, options = {}) {
    const translatedMessages = [];

    for (const msg of messages) {
      if (msg.language && msg.language !== targetLanguage) {
        const result = await this.translate(msg.content, targetLanguage, msg.language, options);
        translatedMessages.push({
          ...msg,
          originalContent: msg.content,
          content: result.translation,
          translated: true,
          originalLanguage: msg.language,
        });
      } else {
        translatedMessages.push({ ...msg, translated: false });
      }
    }

    return {
      success: true,
      messages: translatedMessages,
      targetLanguage,
    };
  }

  /**
   * Get translation history for a user
   */
  getHistory(userId, options = {}) {
    const { limit = 50, offset = 0, language, contactId } = options;

    let history = translationHistory.get(userId) || [];

    // Filter by language
    if (language) {
      history = history.filter(h =>
        h.sourceLanguage === language || h.targetLanguage === language
      );
    }

    // Filter by contact
    if (contactId) {
      history = history.filter(h => h.contactId === contactId);
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const paginated = history.slice(offset, offset + limit);

    return {
      success: true,
      history: paginated,
      total: history.length,
      limit,
      offset,
    };
  }

  /**
   * Add translation to history
   */
  addToHistory(userId, record) {
    if (!translationHistory.has(userId)) {
      translationHistory.set(userId, []);
    }

    const history = translationHistory.get(userId);
    history.unshift(record);

    // Keep only last 1000 translations per user
    if (history.length > 1000) {
      history.pop();
    }
  }

  /**
   * Clear translation history
   */
  clearHistory(userId) {
    translationHistory.delete(userId);
    return { success: true, message: 'History cleared' };
  }

  /**
   * Set language profile for a contact/user
   */
  setLanguageProfile(entityId, entityType, profile) {
    const key = `${entityType}:${entityId}`;
    languageProfiles.set(key, {
      ...profile,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, profile: languageProfiles.get(key) };
  }

  /**
   * Get language profile for a contact/user
   */
  getLanguageProfile(entityId, entityType) {
    const key = `${entityType}:${entityId}`;
    return languageProfiles.get(key) || null;
  }

  /**
   * Get all language profiles
   */
  getAllLanguageProfiles() {
    const profiles = [];
    for (const [key, profile] of languageProfiles) {
      const [entityType, entityId] = key.split(':');
      profiles.push({ entityType, entityId, ...profile });
    }
    return profiles;
  }

  /**
   * Get language statistics for a user
   */
  getLanguageStats(userId) {
    const history = translationHistory.get(userId) || [];

    const stats = {
      totalTranslations: history.length,
      totalCharacters: history.reduce((sum, h) => sum + h.charCount, 0),
      languagePairs: {},
      mostUsedSourceLanguages: {},
      mostUsedTargetLanguages: {},
      recentActivity: history.slice(0, 10),
    };

    for (const record of history) {
      // Count language pairs
      const pair = `${record.sourceLanguage}->${record.targetLanguage}`;
      stats.languagePairs[pair] = (stats.languagePairs[pair] || 0) + 1;

      // Count source languages
      stats.mostUsedSourceLanguages[record.sourceLanguage] =
        (stats.mostUsedSourceLanguages[record.sourceLanguage] || 0) + 1;

      // Count target languages
      stats.mostUsedTargetLanguages[record.targetLanguage] =
        (stats.mostUsedTargetLanguages[record.targetLanguage] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get language name from code
   */
  getLanguageName(code) {
    return this.supportedLanguages[code]?.name || code;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return Object.entries(this.supportedLanguages).map(([code, info]) => ({
      code,
      ...info,
    }));
  }

  /**
   * Check if language is supported
   */
  isSupported(code) {
    return !!this.supportedLanguages[code];
  }

  /**
   * Suggest translations based on context
   */
  async suggestTranslation(text, context = {}) {
    const { targetAudience, purpose, tone } = context;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a translation consultant. Analyze the text and suggest the best languages to translate it into based on the context. Consider the target audience, purpose, and content.${
              targetAudience ? ` Target audience: ${targetAudience}.` : ''
            }${purpose ? ` Purpose: ${purpose}.` : ''}${tone ? ` Desired tone: ${tone}.` : ''}

Respond in JSON format: { "suggestedLanguages": [{ "code": "xx", "reason": "why this language" }], "detectedSourceLanguage": "xx" }`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.5,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const suggestions = JSON.parse(response.choices[0].message.content);
      return {
        success: true,
        ...suggestions,
      };

    } catch (error) {
      console.error('[TranslationService] Suggestion error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
const translationService = new TranslationService();
export default translationService;
