// API Call Monitor - Run this to see all API calls in real-time
const http = require('http');
const https = require('https');

console.log('\n🔍 API CALL MONITOR - Watching backend activity...\n');
console.log('📡 Monitoring the following endpoints:');
console.log('   ✓ POST /api/agents/create - Create new agent');
console.log('   ✓ GET  /api/agents/voices - Get ElevenLabs voices');
console.log('   ✓ POST /api/chat - AI Builder chat');
console.log('   ✓ GET  /api/agents - Get all agents');
console.log('\n' + '='.repeat(80) + '\n');

// Intercept http/https requests
const originalRequest = http.request;
const originalHttpsRequest = https.request;

function logRequest(options, protocol) {
  const timestamp = new Date().toISOString();
  const method = options.method || 'GET';
  const path = options.path || options.pathname || '/';

  if (options.hostname === 'localhost' || options.host === 'localhost:5000') {
    console.log(`[${timestamp}] ${protocol} ${method} ${path}`);
  }
}

http.request = function(...args) {
  logRequest(args[0], 'HTTP');
  return originalRequest.apply(this, args);
};

https.request = function(...args) {
  logRequest(args[0], 'HTTPS');
  return originalHttpsRequest.apply(this, args);
};

console.log('✅ Monitor ready! Waiting for API calls...\n');
console.log('Please use the AI Builder in the UI to create an agent.\n');

// Keep the process alive
setInterval(() => {}, 1000);
