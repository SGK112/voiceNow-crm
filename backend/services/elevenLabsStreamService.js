import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ElevenLabs Text-to-Speech Streaming Service
 * Handles real-time audio streaming for Twilio calls
 */
class ElevenLabsStreamService {
  constructor(voiceId, apiKey = process.env.ELEVENLABS_API_KEY) {
    this.voiceId = voiceId;
    this.apiKey = apiKey;
    this.ws = null;
  }

  /**
   * Connect to ElevenLabs WebSocket and stream text to speech
   */
  async connect(text, voiceSettings = {}) {
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream-input?model_id=eleven_turbo_v2_5`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      this.ws.on('open', () => {
        console.log('✅ Connected to ElevenLabs WebSocket');

        // Send initial configuration
        const config = {
          text: text,
          voice_settings: {
            stability: voiceSettings.stability || 0.5,
            similarity_boost: voiceSettings.similarity_boost || 0.75,
            style: voiceSettings.style || 0.0,
            use_speaker_boost: voiceSettings.use_speaker_boost !== false
          },
          xi_api_key: this.apiKey
        };

        this.ws.send(JSON.stringify(config));
        resolve(this.ws);
      });

      this.ws.on('error', (error) => {
        console.error('❌ ElevenLabs WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('🔌 ElevenLabs WebSocket closed');
      });
    });
  }

  /**
   * Send text to be converted to speech
   */
  sendText(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text }));
    } else {
      console.error('❌ WebSocket not connected');
    }
  }

  /**
   * Close the WebSocket connection
   */
  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default ElevenLabsStreamService;
