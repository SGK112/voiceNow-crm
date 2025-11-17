import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getVoices,
  createAgent,
  updateAgent,
  getAgent,
  listAgents,
  deleteAgent
} from '../controllers/elevenLabsAgentController.js';

const router = express.Router();

/**
 * ElevenLabs Voice Agent Management Routes
 *
 * These routes provide complete control over ElevenLabs Conversational AI agents
 * including voice selection, prompt management, and agent configuration.
 */

/**
 * @route   GET /api/elevenlabs/voices
 * @desc    Get all available voices from ElevenLabs voice library
 * @access  Private
 */
router.get('/voices', protect, getVoices);

/**
 * @route   POST /api/elevenlabs/agents/create
 * @desc    Create a new ElevenLabs agent with specified voice
 * @access  Private
 * @body    { name, voiceId, prompt, firstMessage, language, temperature, maxTokens }
 */
router.post('/agents/create', protect, createAgent);

/**
 * @route   PATCH /api/elevenlabs/agents/:agentId/update
 * @desc    Update an existing ElevenLabs agent (including voice changes)
 * @access  Private
 * @body    { name, voiceId, prompt, firstMessage, language, temperature, maxTokens }
 */
router.patch('/agents/:agentId/update', protect, updateAgent);

/**
 * @route   GET /api/elevenlabs/agents/:agentId
 * @desc    Get agent details by ID
 * @access  Private
 */
router.get('/agents/:agentId', protect, getAgent);

/**
 * @route   GET /api/elevenlabs/agents
 * @desc    List all agents for current user
 * @access  Private
 */
router.get('/agents', protect, listAgents);

/**
 * @route   DELETE /api/elevenlabs/agents/:agentId
 * @desc    Delete (disable) an agent
 * @access  Private
 */
router.delete('/agents/:agentId', protect, deleteAgent);

export default router;
