#!/usr/bin/env node

/**
 * Auto-Execute Dev Commands
 *
 * Watches dev-command-queue.json for new commands and automatically
 * sends them to Claude Code for execution via terminal output.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_FILE = path.join(__dirname, 'dev-command-queue.json');
const CHECK_INTERVAL = 1000; // Check every 1 second

console.log('🤖 Auto-Execute Dev Commands Started');
console.log(`📂 Watching: ${QUEUE_FILE}`);
console.log('');

let lastCheck = Date.now();
let isProcessing = false;

// Initialize queue file if it doesn't exist
function initializeQueue() {
  if (!fs.existsSync(QUEUE_FILE)) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify({ commands: [], results: [] }, null, 2));
    console.log('✅ Created dev-command-queue.json');
  }
}

// Read queue file
function readQueue() {
  try {
    const data = fs.readFileSync(QUEUE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error reading queue:', error.message);
    return { commands: [], results: [] };
  }
}

// Write queue file
function writeQueue(queue) {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  } catch (error) {
    console.error('❌ Error writing queue:', error.message);
  }
}

// Mark command as executed
function markCommandExecuted(commandId, result = null) {
  const queue = readQueue();
  const command = queue.commands.find(c => c.id === commandId);

  if (command) {
    command.status = 'executed';
    command.executed = true;
    command.executedAt = new Date().toISOString();

    if (result) {
      if (!queue.results) queue.results = [];
      queue.results.push({
        commandId,
        result,
        timestamp: new Date().toISOString()
      });
    }

    writeQueue(queue);
  }
}

// Process pending commands
function processPendingCommands() {
  if (isProcessing) return;

  const queue = readQueue();
  const pending = queue.commands.filter(c => c.status === 'pending' && !c.executed);

  if (pending.length > 0) {
    isProcessing = true;

    pending.forEach((cmd, index) => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔔 NEW DEV COMMAND DETECTED');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`📝 Command ID: ${cmd.id}`);
      console.log(`🗣️  Transcription: "${cmd.transcription}"`);
      console.log(`⚙️  Extracted Command: "${cmd.command}"`);
      console.log(`⏰ Timestamp: ${cmd.timestamp}`);
      console.log('');
      console.log('🤖 CLAUDE CODE: Please execute this command now!');
      console.log('');
      console.log(`   "${cmd.command}"`);
      console.log('');
      console.log('───────────────────────────────────────────────────────────');
      console.log('💡 After execution, the command will be marked as executed');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      // Auto-mark as executed after 2 seconds to prevent re-triggering
      // Claude Code should execute during this window
      setTimeout(() => {
        markCommandExecuted(cmd.id, {
          status: 'notified',
          message: 'Command sent to Claude Code for execution'
        });

        if (index === pending.length - 1) {
          isProcessing = false;
        }
      }, 2000);
    });
  }
}

// File watcher approach
function startFileWatcher() {
  console.log('👁️  Starting file watcher...');

  const watcher = chokidar.watch(QUEUE_FILE, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });

  watcher.on('change', (path) => {
    console.log(`📝 Queue file changed: ${new Date().toLocaleTimeString()}`);
    processPendingCommands();
  });

  watcher.on('add', (path) => {
    console.log('✅ Queue file detected');
    processPendingCommands();
  });

  watcher.on('error', (error) => {
    console.error('❌ Watcher error:', error);
  });

  console.log('✅ File watcher active');
  console.log('');
  console.log('Ready to auto-execute dev commands!');
  console.log('Speak "Claude Code, [your command]" in the VoiceFlow app');
  console.log('');
}

// Polling approach as backup
function startPolling() {
  console.log('🔄 Starting polling mode (fallback)...');

  setInterval(() => {
    processPendingCommands();
  }, CHECK_INTERVAL);

  console.log('✅ Polling active (every 1 second)');
  console.log('');
}

// Initialize and start
initializeQueue();

// Try file watcher first, fall back to polling if chokidar not available
try {
  startFileWatcher();
} catch (error) {
  console.warn('⚠️  File watcher not available, using polling mode');
  startPolling();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Shutting down auto-execute service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('👋 Shutting down auto-execute service...');
  process.exit(0);
});
