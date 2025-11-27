/**
 * Translation API Routes
 * Endpoints for Aria's translation capabilities
 */

import express from 'express';
import translationService from '../services/translationService.js';

const router = express.Router();

/**
 * POST /api/translation/translate
 * Translate text to target language
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage, userId, contactId, context } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Text and target language are required',
      });
    }

    const result = await translationService.translate(text, targetLanguage, sourceLanguage || 'auto', {
      userId,
      contactId,
      context,
    });

    res.json(result);
  } catch (error) {
    console.error('[Translation] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/translation/detect
 * Detect language of text
 */
router.post('/detect', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    const languageCode = await translationService.detectLanguage(text);
    const languageInfo = translationService.getSupportedLanguages().find(l => l.code === languageCode);

    res.json({
      success: true,
      language: languageCode,
      name: languageInfo?.name || languageCode,
      nativeName: languageInfo?.nativeName || languageCode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/translation/batch
 * Batch translate multiple texts
 */
router.post('/batch', async (req, res) => {
  try {
    const { texts, targetLanguage, sourceLanguage, userId } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Texts array is required',
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language is required',
      });
    }

    if (texts.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 texts allowed per batch',
      });
    }

    const result = await translationService.batchTranslate(texts, targetLanguage, sourceLanguage, { userId });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/translation/conversation
 * Translate a conversation thread
 */
router.post('/conversation', async (req, res) => {
  try {
    const { messages, targetLanguage, userId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required',
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language is required',
      });
    }

    const result = await translationService.translateConversation(messages, targetLanguage, { userId });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/translation/history/:userId
 * Get translation history for a user
 */
router.get('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit, offset, language, contactId } = req.query;

    const result = translationService.getHistory(userId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      language,
      contactId,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/translation/history/:userId
 * Clear translation history for a user
 */
router.delete('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const result = translationService.clearHistory(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/translation/stats/:userId
 * Get translation statistics for a user
 */
router.get('/stats/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const stats = translationService.getLanguageStats(userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/translation/profile
 * Set language profile for a contact/user
 */
router.post('/profile', (req, res) => {
  try {
    const { entityId, entityType, preferredLanguage, nativeLanguage, otherLanguages, notes } = req.body;

    if (!entityId || !entityType) {
      return res.status(400).json({
        success: false,
        error: 'Entity ID and type are required',
      });
    }

    const result = translationService.setLanguageProfile(entityId, entityType, {
      preferredLanguage,
      nativeLanguage,
      otherLanguages: otherLanguages || [],
      notes,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/translation/profile/:entityType/:entityId
 * Get language profile for a contact/user
 */
router.get('/profile/:entityType/:entityId', (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const profile = translationService.getLanguageProfile(entityId, entityType);

    if (profile) {
      res.json({
        success: true,
        profile,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/translation/profiles
 * Get all language profiles
 */
router.get('/profiles', (req, res) => {
  try {
    const profiles = translationService.getAllLanguageProfiles();
    res.json({
      success: true,
      profiles,
      count: profiles.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/translation/languages
 * Get all supported languages
 */
router.get('/languages', (req, res) => {
  const languages = translationService.getSupportedLanguages();
  res.json({
    success: true,
    languages,
    count: languages.length,
  });
});

/**
 * POST /api/translation/suggest
 * Get translation suggestions based on context
 */
router.post('/suggest', async (req, res) => {
  try {
    const { text, targetAudience, purpose, tone } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    const result = await translationService.suggestTranslation(text, {
      targetAudience,
      purpose,
      tone,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
