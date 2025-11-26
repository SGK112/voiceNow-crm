import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * Unified TTS Service - Supports multiple providers
 *
 * Providers:
 * - elevenlabs: ElevenLabs API (paid, high quality)
 * - xtts: Self-hosted XTTS v2 (free, requires GPU)
 * - piper: Self-hosted Piper (free, fast, CPU-friendly)
 */

// Voice mappings - map friendly names to provider-specific IDs
const VOICE_MAPPINGS = {
  // Female voices
  'aria': {
    elevenlabs: 'EXAVITQu4vr4xnSDxMaL', // Bella
    xtts: 'female_1',
    piper: 'en_US-amy-medium',
    gender: 'female',
    description: 'Warm, friendly American female'
  },
  'lily': {
    elevenlabs: 'pFZP5JQG7iQjIQuC4Bku',
    xtts: 'female_2',
    piper: 'en_GB-alba-medium',
    gender: 'female',
    description: 'British female'
  },
  'charlotte': {
    elevenlabs: 'XB0fDUnXU5powFXDhCwa',
    xtts: 'female_3',
    piper: 'en_US-lessac-medium',
    gender: 'female',
    description: 'English-Swedish female'
  },
  'gigi': {
    elevenlabs: 'jBpfuIE2acCO8z3wKNLl',
    xtts: 'female_4',
    piper: 'en_US-libritts-high',
    gender: 'female',
    description: 'American female'
  },
  // Male voices
  'daniel': {
    elevenlabs: 'onwK4e9ZLuTAKqWW03F9',
    xtts: 'male_1',
    piper: 'en_GB-alan-medium',
    gender: 'male',
    description: 'British male'
  },
  'callum': {
    elevenlabs: 'N2lVS1w4EtoT3dr4eOWO',
    xtts: 'male_2',
    piper: 'en_US-ryan-medium',
    gender: 'male',
    description: 'Transatlantic male'
  },
  'liam': {
    elevenlabs: 'TX3LPaxmHKxFdv7VOQHJ',
    xtts: 'male_3',
    piper: 'en_US-joe-medium',
    gender: 'male',
    description: 'American male'
  },
  'will': {
    elevenlabs: 'bIHbv24MWmeRgasZH58o',
    xtts: 'male_4',
    piper: 'en_US-kusal-medium',
    gender: 'male',
    description: 'American male'
  }
};

// Provider configurations
const PROVIDERS = {
  elevenlabs: {
    baseUrl: 'https://api.elevenlabs.io/v1',
    model: 'eleven_turbo_v2_5',
    requires: ['ELEVENLABS_API_KEY']
  },
  xtts: {
    baseUrl: process.env.XTTS_API_URL || 'http://localhost:8000',
    requires: ['XTTS_API_URL']
  },
  runpod: {
    // RunPod serverless endpoint
    baseUrl: process.env.RUNPOD_ENDPOINT_URL,
    requires: ['RUNPOD_ENDPOINT_URL', 'RUNPOD_API_KEY']
  },
  piper: {
    baseUrl: process.env.PIPER_API_URL || 'http://localhost:5500',
    requires: ['PIPER_API_URL']
  }
};

class TTSService {
  constructor() {
    // Determine active provider from environment
    this.provider = process.env.TTS_PROVIDER || 'elevenlabs';
    this.fallbackProvider = process.env.TTS_FALLBACK_PROVIDER || null;

    // API Keys
    this.elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    this.xttsUrl = process.env.XTTS_API_URL || 'http://localhost:8000';
    this.piperUrl = process.env.PIPER_API_URL || 'http://localhost:5500';
    this.runpodEndpoint = process.env.RUNPOD_ENDPOINT_URL;
    this.runpodApiKey = process.env.RUNPOD_API_KEY;

    // Voice settings
    this.defaultVoice = process.env.TTS_DEFAULT_VOICE || 'aria';

    console.log(`✅ TTS Service initialized with provider: ${this.provider}`);
    if (this.fallbackProvider) {
      console.log(`   Fallback provider: ${this.fallbackProvider}`);
    }
  }

  /**
   * Get available voices for the current provider
   */
  getAvailableVoices() {
    return Object.entries(VOICE_MAPPINGS).map(([name, config]) => ({
      id: name,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      gender: config.gender,
      description: config.description,
      providerId: config[this.provider]
    }));
  }

  /**
   * Get voice ID for current provider
   */
  getVoiceId(voiceName) {
    const voice = VOICE_MAPPINGS[voiceName?.toLowerCase()] || VOICE_MAPPINGS[this.defaultVoice];
    return voice[this.provider] || voice.elevenlabs;
  }

  /**
   * Convert ElevenLabs voice ID to voice name
   */
  voiceIdToName(elevenLabsId) {
    for (const [name, config] of Object.entries(VOICE_MAPPINGS)) {
      if (config.elevenlabs === elevenLabsId) {
        return name;
      }
    }
    return this.defaultVoice;
  }

  /**
   * Main TTS method - generates audio from text
   * @param {string} text - Text to convert to speech
   * @param {Object} options - TTS options
   * @param {string} options.voice - Voice name or ID
   * @param {string} options.style - Voice style (friendly, professional, etc.)
   * @param {number} options.stability - Voice stability (0-1)
   * @param {number} options.similarity - Voice similarity boost (0-1)
   * @returns {Promise<Buffer>} Audio buffer (MP3)
   */
  async synthesize(text, options = {}) {
    const {
      voice = this.defaultVoice,
      style = 'friendly',
      stability = 0.5,
      similarity = 0.75
    } = options;

    try {
      // Try primary provider
      return await this._synthesizeWithProvider(this.provider, text, {
        voice,
        style,
        stability,
        similarity
      });
    } catch (error) {
      console.error(`[TTS] ${this.provider} failed:`, error.message);

      // Try fallback if configured
      if (this.fallbackProvider) {
        console.log(`[TTS] Trying fallback provider: ${this.fallbackProvider}`);
        return await this._synthesizeWithProvider(this.fallbackProvider, text, {
          voice,
          style,
          stability,
          similarity
        });
      }

      throw error;
    }
  }

  /**
   * Synthesize with specific provider
   */
  async _synthesizeWithProvider(provider, text, options) {
    switch (provider) {
      case 'elevenlabs':
        return await this._synthesizeElevenLabs(text, options);
      case 'xtts':
        return await this._synthesizeXTTS(text, options);
      case 'runpod':
        return await this._synthesizeRunPod(text, options);
      case 'piper':
        return await this._synthesizePiper(text, options);
      default:
        throw new Error(`Unknown TTS provider: ${provider}`);
    }
  }

  /**
   * ElevenLabs TTS
   */
  async _synthesizeElevenLabs(text, options) {
    const voiceId = this.getVoiceId(options.voice);

    // Adjust settings based on style
    let stability = options.stability;
    let similarityBoost = options.similarity;
    let styleIntensity = 0.0;

    switch (options.style) {
      case 'professional':
        stability = 0.7;
        similarityBoost = 0.8;
        styleIntensity = 0.1;
        break;
      case 'energetic':
        stability = 0.3;
        similarityBoost = 0.7;
        styleIntensity = 0.5;
        break;
      case 'calm':
        stability = 0.8;
        similarityBoost = 0.9;
        styleIntensity = 0.1;
        break;
      case 'friendly':
      default:
        stability = 0.65;  // Increased for more consistent voice (was 0.5)
        similarityBoost = 0.8;
        styleIntensity = 0.25;  // Slightly reduced for less dramatic variation
        break;
    }

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: stability,
          similarity_boost: similarityBoost,
          style: styleIntensity,
          use_speaker_boost: true
        },
        optimize_streaming_latency: 4
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.elevenLabsKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 10000
      }
    );

    return Buffer.from(response.data);
  }

  /**
   * XTTS v2 TTS (Self-hosted)
   */
  async _synthesizeXTTS(text, options) {
    const voiceId = this.getVoiceId(options.voice);

    const response = await axios.post(
      `${this.xttsUrl}/tts`,
      {
        text: text,
        speaker_id: voiceId,
        language: 'en',
        // XTTS specific settings
        temperature: options.style === 'energetic' ? 0.9 : 0.7,
        length_penalty: 1.0,
        repetition_penalty: 2.0,
        top_k: 50,
        top_p: 0.85
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 15000
      }
    );

    return Buffer.from(response.data);
  }

  /**
   * RunPod Serverless TTS (XTTS on RunPod)
   * Pay-per-use serverless GPU inference
   */
  async _synthesizeRunPod(text, options) {
    if (!this.runpodEndpoint || !this.runpodApiKey) {
      throw new Error('RunPod endpoint URL and API key are required');
    }

    const voiceName = options.voice || this.defaultVoice;

    // RunPod serverless uses /runsync for synchronous calls
    const response = await axios.post(
      `${this.runpodEndpoint}/runsync`,
      {
        input: {
          text: text,
          speaker_id: voiceName,
          language: 'en',
          temperature: options.style === 'energetic' ? 0.9 : 0.7,
          output_format: 'base64'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.runpodApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30s timeout for cold starts
      }
    );

    // RunPod returns { output: { audio_base64: "..." } }
    if (response.data?.output?.audio_base64) {
      return Buffer.from(response.data.output.audio_base64, 'base64');
    } else if (response.data?.output?.error) {
      throw new Error(`RunPod error: ${response.data.output.error}`);
    } else {
      throw new Error('Invalid response from RunPod');
    }
  }

  /**
   * Piper TTS (Self-hosted, fast)
   */
  async _synthesizePiper(text, options) {
    const voiceId = this.getVoiceId(options.voice);

    const response = await axios.post(
      `${this.piperUrl}/synthesize`,
      {
        text: text,
        voice: voiceId,
        // Piper settings
        length_scale: options.style === 'calm' ? 1.1 : 1.0,
        noise_scale: options.style === 'energetic' ? 0.7 : 0.5,
        noise_w: 0.8
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 5000
      }
    );

    return Buffer.from(response.data);
  }

  /**
   * Synthesize and return as base64
   */
  async synthesizeBase64(text, options = {}) {
    const audioBuffer = await this.synthesize(text, options);
    return audioBuffer.toString('base64');
  }

  /**
   * Clone a voice from audio sample (XTTS only)
   * @param {Buffer} audioSample - Audio file buffer
   * @param {string} voiceName - Name for the cloned voice
   */
  async cloneVoice(audioSample, voiceName) {
    if (this.provider !== 'xtts' && this.fallbackProvider !== 'xtts') {
      throw new Error('Voice cloning requires XTTS provider');
    }

    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('audio', audioSample, {
      filename: 'sample.wav',
      contentType: 'audio/wav'
    });
    formData.append('name', voiceName);

    const response = await axios.post(
      `${this.xttsUrl}/clone`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000
      }
    );

    // Add to voice mappings
    VOICE_MAPPINGS[voiceName.toLowerCase()] = {
      elevenlabs: null,
      xtts: response.data.speaker_id,
      piper: null,
      gender: 'custom',
      description: `Custom cloned voice: ${voiceName}`
    };

    return {
      success: true,
      voiceId: response.data.speaker_id,
      voiceName: voiceName
    };
  }

  /**
   * Health check for TTS providers
   */
  async healthCheck() {
    const results = {};

    // Check ElevenLabs
    if (this.elevenLabsKey) {
      try {
        await axios.get('https://api.elevenlabs.io/v1/voices', {
          headers: { 'xi-api-key': this.elevenLabsKey },
          timeout: 5000
        });
        results.elevenlabs = { status: 'ok' };
      } catch (e) {
        results.elevenlabs = { status: 'error', message: e.message };
      }
    }

    // Check XTTS
    try {
      await axios.get(`${this.xttsUrl}/health`, { timeout: 5000 });
      results.xtts = { status: 'ok' };
    } catch (e) {
      results.xtts = { status: 'unavailable', message: e.message };
    }

    // Check RunPod
    if (this.runpodEndpoint && this.runpodApiKey) {
      try {
        await axios.get(`${this.runpodEndpoint}/health`, {
          headers: { 'Authorization': `Bearer ${this.runpodApiKey}` },
          timeout: 5000
        });
        results.runpod = { status: 'ok' };
      } catch (e) {
        // RunPod may not have /health, check if endpoint exists
        results.runpod = { status: 'configured', message: 'Endpoint configured (health check not available)' };
      }
    } else {
      results.runpod = { status: 'not_configured' };
    }

    // Check Piper
    try {
      await axios.get(`${this.piperUrl}/health`, { timeout: 5000 });
      results.piper = { status: 'ok' };
    } catch (e) {
      results.piper = { status: 'unavailable', message: e.message };
    }

    return {
      activeProvider: this.provider,
      fallbackProvider: this.fallbackProvider,
      providers: results
    };
  }

  /**
   * Switch provider at runtime
   */
  setProvider(provider, fallback = null) {
    if (!PROVIDERS[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    this.provider = provider;
    this.fallbackProvider = fallback;
    console.log(`[TTS] Switched to provider: ${provider}`);
  }
}

// Export singleton instance
const ttsService = new TTSService();
export default ttsService;

// Also export class for testing
export { TTSService, VOICE_MAPPINGS };
