// Command monitor for Claude Code to watch for voice commands and execute them
import axios from 'axios';
import fs from 'fs';

const API_URL = 'http://192.168.0.151:5001';
const POLL_INTERVAL = 2000; // Check every 2 seconds
const LOG_FILE = '/Users/homepc/voice Flow-crm-1/command-execution-log.txt';

console.log('🎤 Claude Code Command Monitor Started');
console.log('Watching for voice commands from mobile app...\n');

// Function to log commands
function logCommand(command, result) {
  const timestamp = new Date().toISOString();
  const logEntry = `\n[${timestamp}]\nCommand: ${command}\nResult: ${result}\n${'='.repeat(50)}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
}

// Polling function
async function checkForCommands() {
  try {
    const response = await axios.get(`${API_URL}/api/dev/commands/pending`);

    if (response.data.success && response.data.commands.length > 0) {
      for (const cmd of response.data.commands) {
        console.log(`\n📝 New Command Received:`);
        console.log(`   ID: ${cmd.id}`);
        console.log(`   Command: ${cmd.command}`);
        console.log(`   Transcription: ${cmd.transcription || 'N/A'}`);
        console.log(`   Time: ${cmd.timestamp}`);
        console.log(`\n⚠️  ACTION REQUIRED: Execute this command manually and mark as complete`);
        console.log(`   To mark complete: POST to ${API_URL}/api/dev/command/${cmd.id}/executed\n`);

        logCommand(cmd.command, 'Pending - awaiting manual execution');
      }
    }
  } catch (error) {
    // Silent fail - server might be restarting
    if (error.code !== 'ECONNREFUSED') {
      console.error('Error checking commands:', error.message);
    }
  }
}

// Start polling
setInterval(checkForCommands, POLL_INTERVAL);
checkForCommands(); // Initial check

console.log('Press Ctrl+C to stop monitoring\n');
