require('dotenv').config({ path: '/Users/homepc/voiceFlow-crm-1/backend/.env' });
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const ariaCallId = 'aria_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
const ariaBridgeHost = 'aria.srv1138307.hstgr.cloud';

const wsParams = new URLSearchParams();
wsParams.set('contactName', 'Scott');
wsParams.set('purpose', 'Testing improved PCM16 24kHz voice quality');
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
console.log('Call ID:', ariaCallId);

client.calls.create({
  to: '+14802555887',
  from: process.env.TWILIO_PHONE_NUMBER,
  twiml: twimlResponse,
  statusCallback: 'https://voiceflow-crm.onrender.com/api/aria-realtime/status/' + ariaCallId,
  statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
  statusCallbackMethod: 'POST'
}).then(call => {
  console.log('Call initiated!');
  console.log('Twilio SID:', call.sid);
  console.log('Status:', call.status);
}).catch(err => {
  console.error('Error:', err.message);
});
