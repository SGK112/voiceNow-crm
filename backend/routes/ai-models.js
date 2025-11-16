import express from 'express';
import { protect } from '../middleware/auth.js';
import MultiAIService from '../services/multiAIService.js';

const router = express.Router();
const aiService = new MultiAIService();

/**
 * @route   GET /api/ai-models
 * @desc    Get all available AI models
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const models = aiService.getAvailableModels();

    // Group by provider
    const grouped = {
      openai: [],
      anthropic: [],
      gemini: [],
      vertex: []
    };

    Object.entries(models).forEach(([id, config]) => {
      grouped[config.provider].push({
        id,
        ...config
      });
    });

    res.json({
      success: true,
      models: Object.entries(models).map(([id, config]) => ({
        id,
        ...config
      })),
      grouped,
      total: Object.keys(models).length
    });
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI models',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai-models/completion
 * @desc    Generate completion with selected model
 * @access  Private
 */
router.post('/completion', protect, async (req, res) => {
  try {
    const { model, messages, temperature, maxTokens, stream } = req.body;

    if (!model || !messages) {
      return res.status(400).json({
        success: false,
        message: 'Model and messages are required'
      });
    }

    const result = await aiService.generateCompletion(messages, {
      model,
      temperature,
      maxTokens,
      stream
    });

    // Calculate cost
    const cost = aiService.calculateCost(
      model,
      result.usage.prompt_tokens,
      result.usage.completion_tokens
    );

    res.json({
      success: true,
      ...result,
      cost
    });
  } catch (error) {
    console.error('Error generating completion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate completion',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ai-models/recommendations
 * @desc    Get recommended models for different use cases
 * @access  Private
 */
router.get('/recommendations', protect, async (req, res) => {
  try {
    const useCases = ['general', 'coding', 'creative', 'fast', 'budget', 'longContext', 'vision', 'reasoning'];

    const recommendations = {};

    useCases.forEach(useCase => {
      recommendations[useCase] = {
        model: aiService.getRecommendedModel(useCase),
        description: getUseCaseDescription(useCase)
      };
    });

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai-models/calculate-cost
 * @desc    Calculate cost for a completion
 * @access  Private
 */
router.post('/calculate-cost', protect, async (req, res) => {
  try {
    const { model, inputTokens, outputTokens } = req.body;

    if (!model || inputTokens === undefined || outputTokens === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Model, inputTokens, and outputTokens are required'
      });
    }

    const cost = aiService.calculateCost(model, inputTokens, outputTokens);

    res.json({
      success: true,
      ...cost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate cost',
      error: error.message
    });
  }
});

function getUseCaseDescription(useCase) {
  const descriptions = {
    general: 'Best all-around performance for general tasks',
    coding: 'Optimized for code generation and programming',
    creative: 'Best for creative writing and brainstorming',
    fast: 'Fastest responses with good quality',
    budget: 'Most cost-effective option',
    longContext: 'Handles very long documents (up to 1M tokens)',
    vision: 'Supports image analysis and vision tasks',
    reasoning: 'Advanced reasoning and complex problem solving'
  };

  return descriptions[useCase] || '';
}

export default router;
