import Fastify from "fastify";
import WebSocket from "ws";
import fastifyFormBody from "@fastify/formbody";
import fastifyWs from "@fastify/websocket";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VOICE = "coral";
const TEMPERATURE = 0.7;

const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

fastify.get("/health", async () => ({ status: "ok", voice: VOICE, format: "g711_ulaw (native passthrough)" }));

fastify.register(async (f) => {
  f.get("/media-stream/:callId", { websocket: true }, (connection, req) => {
    const url = new URL(req.url, "https://localhost");
    const contactName = decodeURIComponent(url.searchParams.get("contactName") || "there");
    const purpose = decodeURIComponent(url.searchParams.get("purpose") || "to connect");
    const ownerName = decodeURIComponent(url.searchParams.get("ownerName") || "the team");
    const ownerCompany = decodeURIComponent(url.searchParams.get("ownerCompany") || "");

    console.log("Client connected - Contact:", contactName, "Purpose:", purpose, "Owner:", ownerName);

    let streamSid = null;
    let latestMediaTimestamp = 0;
    let lastAssistantItem = null;
    let markQueue = [];
    let responseStartTimestampTwilio = null;

    const companyPart = ownerCompany ? ` from ${ownerCompany}` : "";
    const SYSTEM_MESSAGE = `You are ARIA, a warm friendly AI assistant calling on behalf of ${ownerName}${companyPart}. You are calling ${contactName}. Purpose: ${purpose}. Be natural, friendly, concise. Greet them warmly and mention the purpose of your call.`;

    const openAiWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17", {
      headers: { Authorization: "Bearer " + OPENAI_API_KEY, "OpenAI-Beta": "realtime=v1" }
    });

    const initializeSession = () => {
      // Use g711_ulaw format - native Twilio format, no conversion needed
      openAiWs.send(JSON.stringify({
        type: "session.update",
        session: {
          turn_detection: { type: "server_vad" },
          input_audio_format: "g711_ulaw",
          output_audio_format: "g711_ulaw",
          voice: VOICE,
          instructions: SYSTEM_MESSAGE,
          modalities: ["text", "audio"],
          temperature: TEMPERATURE
        }
      }));
      console.log("Session update sent (g711_ulaw native)");
    };

    const sendInitialGreeting = () => {
      openAiWs.send(JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: `Greet ${contactName} warmly. Say hi, introduce yourself as ARIA calling on behalf of ${ownerName}, mention you're calling about: ${purpose}, and ask how they are doing.` }]
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
          // g711_ulaw from OpenAI -> pass directly to Twilio (no conversion!)
          connection.send(JSON.stringify({
            event: "media",
            streamSid,
            media: { payload: response.delta }
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
              // g711_ulaw from Twilio -> pass directly to OpenAI (no conversion!)
              openAiWs.send(JSON.stringify({
                type: "input_audio_buffer.append",
                audio: data.media.payload
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
  console.log(`[ARIA] Server on ${PORT}, Voice: ${VOICE}, Format: g711_ulaw (native passthrough)`);
});
