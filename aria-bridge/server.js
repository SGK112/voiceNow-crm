import Fastify from "fastify";
import WebSocket from "ws";
import fastifyFormBody from "@fastify/formbody";
import fastifyWs from "@fastify/websocket";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VOICE = "coral";
const TEMPERATURE = 0.7;

// μ-law decoding table (converts 8-bit μ-law to 16-bit linear PCM)
const ULAW_DECODE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  let mu = ~i & 0xFF;
  let sign = (mu & 0x80) ? -1 : 1;
  let exponent = (mu >> 4) & 0x07;
  let mantissa = mu & 0x0F;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  ULAW_DECODE[i] = sign * (sample - 0x84);
}

// μ-law encoding table (converts 16-bit linear PCM to 8-bit μ-law)
const ULAW_ENCODE = new Uint8Array(65536);
const BIAS = 0x84, CLIP = 32635;
for (let i = -32768; i < 32768; i++) {
  let sample = i, sign = 0;
  if (sample < 0) { sign = 0x80; sample = -sample; }
  if (sample > CLIP) sample = CLIP;
  sample += BIAS;
  let exponent = 7;
  for (let exp = 0; exp < 8; exp++) {
    if (sample < (1 << (exp + 8))) { exponent = exp; break; }
  }
  let mantissa = (sample >> (exponent + 3)) & 0x0F;
  ULAW_ENCODE[(i + 32768) & 0xFFFF] = ~(sign | (exponent << 4) | mantissa) & 0xFF;
}

function decodeUlaw(ulawBuffer) {
  const samples = new Int16Array(ulawBuffer.length);
  for (let i = 0; i < ulawBuffer.length; i++) samples[i] = ULAW_DECODE[ulawBuffer[i]];
  return samples;
}

function encodeUlaw(pcmSamples) {
  const ulaw = Buffer.alloc(pcmSamples.length);
  for (let i = 0; i < pcmSamples.length; i++) ulaw[i] = ULAW_ENCODE[(pcmSamples[i] + 32768) & 0xFFFF];
  return ulaw;
}

// Upsample 8kHz -> 24kHz (3x with linear interpolation)
function upsample8to24(samples8k) {
  const samples24k = new Int16Array(samples8k.length * 3);
  for (let i = 0; i < samples8k.length - 1; i++) {
    samples24k[i * 3] = samples8k[i];
    samples24k[i * 3 + 1] = Math.round((samples8k[i] * 2 + samples8k[i + 1]) / 3);
    samples24k[i * 3 + 2] = Math.round((samples8k[i] + samples8k[i + 1] * 2) / 3);
  }
  const last = samples8k.length - 1;
  samples24k[last * 3] = samples24k[last * 3 + 1] = samples24k[last * 3 + 2] = samples8k[last];
  return samples24k;
}

// Downsample 24kHz -> 8kHz (average every 3 samples)
function downsample24to8(samples24k) {
  const len = Math.floor(samples24k.length / 3);
  const samples8k = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    samples8k[i] = Math.round((samples24k[i * 3] + samples24k[i * 3 + 1] + samples24k[i * 3 + 2]) / 3);
  }
  return samples8k;
}

function int16ToBase64(samples) {
  const buffer = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) buffer.writeInt16LE(samples[i], i * 2);
  return buffer.toString("base64");
}

function base64ToInt16(base64) {
  const buffer = Buffer.from(base64, "base64");
  const samples = new Int16Array(buffer.length / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = buffer.readInt16LE(i * 2);
  return samples;
}

const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

fastify.get("/health", async () => ({ status: "ok", voice: VOICE, resampling: "8kHz<->24kHz" }));

fastify.register(async (f) => {
  f.get("/media-stream/:callId", { websocket: true }, (connection, req) => {
    const url = new URL(req.url, "https://localhost");
    const contactName = decodeURIComponent(url.searchParams.get("contactName") || "there");
    const purpose = decodeURIComponent(url.searchParams.get("purpose") || "to connect");
    const ownerName = decodeURIComponent(url.searchParams.get("ownerName") || "the team");
    const ownerCompany = decodeURIComponent(url.searchParams.get("ownerCompany") || "");

    console.log("Client connected - Contact:", contactName, "Owner:", ownerName);

    let streamSid = null;
    let latestMediaTimestamp = 0;
    let lastAssistantItem = null;
    let markQueue = [];
    let responseStartTimestampTwilio = null;

    const companyPart = ownerCompany ? ` from ${ownerCompany}` : "";
    const SYSTEM_MESSAGE = `You are ARIA, a warm friendly AI assistant calling on behalf of ${ownerName}${companyPart}. You are calling ${contactName}. Purpose: ${purpose}. Be natural, friendly, concise. Greet them warmly.`;

    const openAiWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17", {
      headers: { Authorization: "Bearer " + OPENAI_API_KEY, "OpenAI-Beta": "realtime=v1" }
    });

    const initializeSession = () => {
      openAiWs.send(JSON.stringify({
        type: "session.update",
        session: {
          turn_detection: { type: "server_vad" },
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          voice: VOICE,
          instructions: SYSTEM_MESSAGE,
          modalities: ["text", "audio"],
          temperature: TEMPERATURE
        }
      }));
      console.log("Session update sent (PCM16 24kHz)");
    };

    const sendInitialGreeting = () => {
      openAiWs.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: `Greet ${contactName} warmly. Say hi, introduce yourself as ARIA calling on behalf of ${ownerName}, and ask how they are doing.` }]
        }
      }));
      openAiWs.send(JSON.stringify({ type: "response.create" }));
    };

    const handleSpeechStartedEvent = () => {
      if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
        const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
        if (lastAssistantItem) {
          openAiWs.send(JSON.stringify({
            type: "conversation.item.truncate",
            item_id: lastAssistantItem,
            content_index: 0,
            audio_end_ms: elapsedTime
          }));
        }
        connection.send(JSON.stringify({ event: "clear", streamSid }));
        markQueue = [];
        lastAssistantItem = null;
        responseStartTimestampTwilio = null;
      }
    };

    const sendMark = () => {
      if (streamSid) {
        connection.send(JSON.stringify({ event: "mark", streamSid, mark: { name: "responsePart" } }));
        markQueue.push("responsePart");
      }
    };

    openAiWs.on("open", () => {
      console.log("Connected to OpenAI Realtime API");
      setTimeout(initializeSession, 100);
    });

    openAiWs.on("message", (data) => {
      try {
        const response = JSON.parse(data);

        if (response.type === "session.updated") {
          console.log("Session updated, sending greeting");
          sendInitialGreeting();
        }

        if (response.type === "response.audio.delta" && response.delta) {
          // Convert PCM16 24kHz -> μ-law 8kHz for Twilio
          const pcm24k = base64ToInt16(response.delta);
          const pcm8k = downsample24to8(pcm24k);
          const ulaw = encodeUlaw(pcm8k);

          connection.send(JSON.stringify({
            event: "media",
            streamSid,
            media: { payload: ulaw.toString("base64") }
          }));

          if (!responseStartTimestampTwilio) responseStartTimestampTwilio = latestMediaTimestamp;
          if (response.item_id) lastAssistantItem = response.item_id;
          sendMark();
        }

        if (response.type === "input_audio_buffer.speech_started") handleSpeechStartedEvent();
        if (response.type === "response.audio_transcript.done") console.log("[ARIA]:", response.transcript);
        if (response.type === "conversation.item.input_audio_transcription.completed") console.log("[USER]:", response.transcript);
        if (response.type === "error") console.error("[ERROR]:", response.error);
      } catch (error) {
        console.error("Error processing OpenAI message:", error);
      }
    });

    openAiWs.on("close", () => console.log("Disconnected from OpenAI"));
    openAiWs.on("error", (error) => console.error("OpenAI WebSocket error:", error));

    connection.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.event) {
          case "media":
            latestMediaTimestamp = data.media.timestamp;
            if (openAiWs.readyState === WebSocket.OPEN) {
              // Convert μ-law 8kHz -> PCM16 24kHz for OpenAI
              const ulawBuffer = Buffer.from(data.media.payload, "base64");
              const pcm8k = decodeUlaw(ulawBuffer);
              const pcm24k = upsample8to24(pcm8k);

              openAiWs.send(JSON.stringify({
                type: "input_audio_buffer.append",
                audio: int16ToBase64(pcm24k)
              }));
            }
            break;
          case "start":
            streamSid = data.start.streamSid;
            console.log("Stream started:", streamSid);
            responseStartTimestampTwilio = null;
            latestMediaTimestamp = 0;
            break;
          case "mark":
            if (markQueue.length > 0) markQueue.shift();
            break;
          case "stop":
            console.log("Stream stopped");
            break;
          default:
            console.log("Received event:", data.event);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    connection.on("close", () => {
      console.log("Client disconnected");
      if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
    });
  });
});

const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`[ARIA] Server on ${PORT}, Voice: ${VOICE}, Resampling: 8kHz<->24kHz`);
});
