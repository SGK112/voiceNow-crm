import WebSocket from 'ws';
import axios from 'axios';

/**
 * Twilio Media Stream Service
 * Handles real-time audio streaming between Twilio calls and ElevenLabs TTS
 * This gives us full control over the conversation flow
 */
class TwilioMediaStreamService {
  constructor() {
    this.activeStreams = new Map(); // Track active call streams
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  }

  /**
   * Handle incoming Twilio Media Stream WebSocket connection
   */
  handleMediaStream(ws, callSid) {
    console.log(`📞 Media stream connected for call: ${callSid}`);

    const streamState = {
      callSid,
      streamSid: null,
      audioBuffer: [],
      elevenLabsWs: null,
      currentScript: '',
      workflowContext: {}
    };

    this.activeStreams.set(callSid, streamState);

    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message);

        switch (msg.event) {
          case 'start':
            streamState.streamSid = msg.start.streamSid;
            console.log(`🎙️ Stream started: ${streamState.streamSid}`);

            // Send initial greeting
            await this.speak(ws, streamState, "Hello! This is a test of the Twilio media stream integration. I can now control the conversation in real-time and trigger workflows during our call.");
            break;

          case 'media':
            // Incoming audio from caller (base64 encoded µ-law)
            // This is where we'd send to speech-to-text
            const audioPayload = msg.media.payload;
            streamState.audioBuffer.push(audioPayload);

            // Process audio for speech recognition
            // We can send this to Twilio's speech recognition or another STT service
            break;

          case 'stop':
            console.log(`📞 Stream stopped: ${callSid}`);
            this.cleanup(callSid);
            break;
        }
      } catch (error) {
        console.error('❌ Error processing media stream message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`📞 WebSocket closed for call: ${callSid}`);
      this.cleanup(callSid);
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for call ${callSid}:`, error);
      this.cleanup(callSid);
    });
  }

  /**
   * Speak text using ElevenLabs and send to Twilio
   */
  async speak(ws, streamState, text, voiceId = 'EXAVITQu4vr4xnSDxMaL') {
    try {
      console.log(`🗣️ Speaking: "${text.substring(0, 50)}..."`);

      // Generate audio with ElevenLabs
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          },
          output_format: 'ulaw_8000' // Twilio's format
        },
        {
          headers: {
            'xi-api-key': this.elevenLabsApiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      // Convert to base64 and send to Twilio
      const audioBase64 = Buffer.from(response.data).toString('base64');

      // Send audio in chunks to Twilio
      const chunkSize = 640; // Twilio expects 20ms chunks of µ-law audio (8000 Hz)
      for (let i = 0; i < audioBase64.length; i += chunkSize) {
        const chunk = audioBase64.slice(i, i + chunkSize);

        ws.send(JSON.stringify({
          event: 'media',
          streamSid: streamState.streamSid,
          media: {
            payload: chunk
          }
        }));
      }

      console.log('✅ Audio sent to caller');
    } catch (error) {
      console.error('❌ Error speaking:', error.message);
      throw error;
    }
  }

  /**
   * Trigger a workflow during the call
   * This is where the magic happens - full control!
   */
  async triggerWorkflow(callSid, workflowId, data) {
    const streamState = this.activeStreams.get(callSid);
    if (!streamState) {
      throw new Error('Call not found');
    }

    console.log(`⚡ Triggering workflow ${workflowId} during call ${callSid}`);

    // Here you would trigger your n8n workflow
    // For now, just log it
    streamState.workflowContext = {
      ...streamState.workflowContext,
      lastWorkflow: workflowId,
      lastWorkflowData: data,
      triggeredAt: new Date()
    };

    return { success: true, context: streamState.workflowContext };
  }

  /**
   * Send SMS during an active call
   */
  async sendSMSDuringCall(callSid, phoneNumber, message) {
    console.log(`📱 Sending SMS during call ${callSid} to ${phoneNumber}`);

    // This would integrate with your Twilio SMS service
    // For demo purposes, just log it
    const streamState = this.activeStreams.get(callSid);
    if (streamState) {
      streamState.workflowContext.smsSent = {
        to: phoneNumber,
        message,
        sentAt: new Date()
      };
    }

    return { success: true };
  }

  /**
   * Update conversation script mid-call
   */
  updateScript(callSid, newScript) {
    const streamState = this.activeStreams.get(callSid);
    if (!streamState) {
      throw new Error('Call not found');
    }

    streamState.currentScript = newScript;
    console.log(`📝 Updated script for call ${callSid}`);
    return { success: true };
  }

  /**
   * Cleanup when call ends
   */
  cleanup(callSid) {
    const streamState = this.activeStreams.get(callSid);
    if (streamState?.elevenLabsWs) {
      streamState.elevenLabsWs.close();
    }
    this.activeStreams.delete(callSid);
    console.log(`🧹 Cleaned up call: ${callSid}`);
  }

  /**
   * Get active call state
   */
  getCallState(callSid) {
    return this.activeStreams.get(callSid);
  }
}

export default new TwilioMediaStreamService();
