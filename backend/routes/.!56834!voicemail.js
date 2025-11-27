import express from 'express';
import twilio from 'twilio';
import { callMonitoringService } from '../services/callMonitoringService.js';
import UserProfile from '../models/UserProfile.js';
import OpenAI from 'openai';
import { ariaMemoryService } from '../services/ariaMemoryService.js';

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/voicemail/interactive/:userId
 * TwiML endpoint for interactive voicemail
 */
router.post('/interactive/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { SpeechResult, Digits } = req.body;

