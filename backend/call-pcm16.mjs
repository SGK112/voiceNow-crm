import dotenv from 'dotenv';
import twilio from 'twilio';
dotenv.config({ path: '/Users/homepc/voiceFlow-crm-1/backend/.env' });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const ariaCallId = 'aria_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
// Use port 443 via Traefik for WebSocket routing
const ariaBridgeHost = 'aria.srv1138307.hstgr.cloud';

const wsParams = new URLSearchParams();
wsParams.set('contactName', 'Scott');
wsParams.set('purpose', 'Testing PCM16 24kHz high quality audio');
wsParams.set('ownerName', 'Claude');
wsParams.set('ownerCompany', 'Anthropic');

const wsUrl = 'wss://' + ariaBridgeHost + '/media-stream/' + ariaCallId + '?' + wsParams.toString();
const wsUrlXmlSafe = wsUrl.replace(/&/g, '&amp;');

const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${wsUrlXmlSafe}">
            <Parameter name="callId" value="${ariaCallId}" />
        </Stream>
    </Connect>
</Response>`;

console.log('Making ARIA call with PCM16 24kHz audio...');
console.log('To: +14802555887');
console.log('WS URL:', wsUrl);
console.log('Call ID:', ariaCallId);

const call = await client.calls.create({
  to: '+14802555887',
  from: process.env.TWILIO_PHONE_NUMBER,
  twiml: twimlResponse,
  statusCallback: 'https://voiceflow-crm.onrender.com/api/aria-realtime/status/' + ariaCallId,
  statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
  statusCallbackMethod: 'POST'
});

console.log('Call initiated!');
console.log('Twilio SID:', call.sid);
console.log('Status:', call.status);
