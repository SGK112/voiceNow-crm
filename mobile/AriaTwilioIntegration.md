
# Connecting ARIA to Twilio and OpenAI Realtime API

This document outlines the architecture for connecting the ARIA voice AI to Twilio phone numbers, enabling users to call in and interact with ARIA.

## High-Level Architecture

The integration will be a backend-centric solution that bridges Twilio's Programmable Voice with the OpenAI Realtime API. The mobile app will not be directly involved in the call processing once the call is established with Twilio.

The flow is as follows:

1.  **Inbound Call:** A user calls a Twilio-provisioned phone number.
2.  **Twilio Webhook:** Twilio receives the call and sends an HTTP request (a webhook) to a predefined endpoint on our backend server.
3.  **Backend Response (TwiML):** The backend responds with TwiML (Twilio Markup Language) containing a `<Connect>` and `<Stream>` verb. This tells Twilio to establish a bi-directional media stream over a WebSocket to our backend.
4.  **Backend Initiates OpenAI Session:** Simultaneously, the backend initiates a WebRTC connection with the OpenAI Realtime API. This is the same process the mobile app currently uses, involving an SDP offer/answer exchange.
5.  **Audio Bridge:** The backend acts as an audio bridge:
    *   **User -> ARIA:** Audio received from the Twilio WebSocket (the user's voice from the phone call) is forwarded to the OpenAI WebRTC connection.
    *   **ARIA -> User:** Audio received from the OpenAI WebRTC connection (ARIA's synthesized voice) is forwarded to the Twilio WebSocket, which then plays it to the user on the phone call.
6.  **Real-time Interaction:** The backend manages the entire conversation, including:
    *   Handling transcriptions from OpenAI.
    *   Executing function calls (tools) by communicating with the necessary services (e.g., CRM, calendar).
    *   Sending results back to OpenAI.

## Backend Implementation Details

The backend will require a new service or set of services to manage this process. Here are the key components:

### 1. Twilio Webhook Endpoint

*   **URL:** `/api/twilio/voice/inbound`
*   **Method:** `POST`
*   **Action:**
    *   Receives incoming call notifications from Twilio.
    *   Responds with TwiML to start a media stream.
    *   The TwiML should look something like this:
        ```xml
        <Response>
          <Connect>
            <Stream url="wss://YOUR_BACKEND_URL/api/twilio/media" />
          </Connect>
        </Response>
        ```

### 2. WebSocket Media Handler

*   **URL:** `/api/twilio/media`
*   **Protocol:** WebSocket (WSS)
*   **Action:**
    *   Handles the bi-directional media stream from Twilio.
    *   Parses incoming Twilio media messages (which are in a specific JSON format containing base64-encoded audio).
    *   Decodes the audio (it's likely Mulaw format and will need to be converted to PCM for OpenAI).
    *   Forwards the user's audio to the OpenAI WebRTC connection.
    *   Receives audio from the OpenAI connection, encodes it back to the format Twilio expects, and sends it over the WebSocket.

### 3. OpenAI Realtime Service

*   This service will be responsible for managing the WebRTC connection with OpenAI.
*   It will be a stateful service that maintains the `RTCPeerConnection` for the duration of the call.
*   It will handle the SDP negotiation, data channel messages (for events and function calls), and the audio tracks.

### 4. Audio Processing

*   A crucial part of the backend will be the audio format conversion.
*   Twilio's media streams typically use `8-bit mu-law` encoding.
*   OpenAI's Realtime API expects `16-bit PCM` audio.
*   The backend will need to decode from mu-law to PCM and encode from PCM to mu-law in real-time. Libraries will be available for this in most backend languages (e.g., Node.js, Python).

## Backend Modifications (for `https://voiceflow-crm.onrender.com`)

To implement this, you will need to modify your backend application, which is currently hosted at `https://voiceflow-crm.onrender.com`.

### Step 1: Create a New API Endpoint for Twilio Webhooks

**Purpose:** This endpoint will be configured in your Twilio phone number settings. When an incoming call arrives, Twilio will send a `POST` request to this URL.

**Endpoint Details:**

*   **Path:** `/api/twilio/voice/inbound` (or a similar, distinct path)
*   **Method:** `POST`
*   **Functionality:**
    1.  **Receive Call Data:** Parse the incoming `POST` request from Twilio to extract call details (e.g., `CallSid`, `From`, `To`).
    2.  **Generate TwiML:** Construct a TwiML response that instructs Twilio to connect the call to a WebSocket media stream. The `Stream` URL should point to your backend's WebSocket media handler.
        *   **Important:** Replace `YOUR_BACKEND_URL` with your actual deployed backend URL (e.g., `wss://voiceflow-crm.onrender.com/api/twilio/media`). If you are using ngrok for local development, this URL would be your ngrok URL.
        ```xml
        <Response>
          <Connect>
            <Stream url="wss://voiceflow-crm.onrender.com/api/twilio/media" />
          </Connect>
        </Response>
        ```
    3.  **Return TwiML:** Send this TwiML as the response body with a `Content-Type: application/xml` header.

**Example (Conceptual Node.js Express code for your backend):**

```javascript
// Assuming you have an Express app instance named 'app'
app.post('/api/twilio/voice/inbound', (req, res) => {
  console.log('Incoming Twilio call webhook received:', req.body);

  // You might want to save call details to a database here

  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.connect().stream({
    url: 'wss://voiceflow-crm.onrender.com/api/twilio/media'
  });

  res.type('text/xml');
  res.send(twiml.toString());
});
```

### Step 2: Configure Twilio Phone Number

After implementing the backend endpoint:

1.  Log in to your Twilio Console.
2.  Navigate to "Phone Numbers" -> "Manage" -> "Active numbers".
3.  Select the Twilio phone number you want to connect to ARIA.
4.  Under the "Voice & Fax" section, find "A CALL COMES IN".
5.  Select "Webhook" and set the URL to `https://voiceflow-crm.onrender.com/api/twilio/voice/inbound` (or your chosen backend endpoint path).
6.  Ensure the HTTP Method is `POST`.
7.  Save your changes.

This completes the first step of setting up the backend API endpoint for Twilio webhooks. The next step will involve creating the WebSocket media handler.

## Summary of Technologies

*   **Backend Language:** Node.js (with Express.js or similar) or Python (with FastAPI or Flask) are good choices due to their strong support for WebSockets and available libraries.
*   **Twilio:** Programmable Voice, TwiML, Media Streams.
*   **OpenAI:** Realtime API (for GPT-4o with voice).
*   **WebRTC:** A library for the backend language will be needed to handle the WebRTC connection to OpenAI (e.g., `wrtc` for Node.js).

This architecture allows for a scalable and robust solution that leverages the strengths of both Twilio and OpenAI to create a seamless voice AI experience over a standard phone call.
