#!/usr/bin/env node

/**
 * AI Copilot Executor
 *
 * Autonomous system that:
 * 1. Watches for dev commands in queue
 * 2. Calls Anthropic API with command + codebase context
 * 3. Applies code changes automatically
 * 4. Triggers Fast Refresh
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_FILE = path.join(__dirname, 'dev-command-queue.json');
const MOBILE_DIR = path.join(__dirname, '../mobile');
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: API_KEY,
});

console.log('🤖 AI Copilot Executor Started');
console.log(`📂 Watching: ${QUEUE_FILE}`);
console.log(`📱 Mobile Directory: ${MOBILE_DIR}`);
console.log('');

let isProcessing = false;

// Initialize queue file
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
function markCommandExecuted(commandId, result) {
  const queue = readQueue();
  const command = queue.commands.find(c => c.id === commandId);

  if (command) {
    command.status = 'executed';
    command.executed = true;
    command.executedAt = new Date().toISOString();
    command.result = result;

    if (!queue.results) queue.results = [];
    queue.results.push({
      commandId,
      result,
      timestamp: new Date().toISOString()
    });

    writeQueue(queue);
  }
}

// Get relevant file context
function getFileContext(command) {
  const lowerCommand = command.toLowerCase();
  const contexts = [];

  // Always load commonly modified files for complex commands
  const alwaysLoad = [
    'mobile/src/screens/HomeScreen.tsx',
  ];

  // Determine which files are relevant based on command keywords
  if (lowerCommand.includes('button') || lowerCommand.includes('orb') || lowerCommand.includes('ai') || lowerCommand.includes('voice')) {
    const orbPath = path.join(MOBILE_DIR, 'src/components/AIOrbButton.tsx');
    if (fs.existsSync(orbPath)) {
      contexts.push({
        path: 'mobile/src/components/AIOrbButton.tsx',
        content: fs.readFileSync(orbPath, 'utf8')
      });
    }
  }

  if (lowerCommand.includes('navigation') || lowerCommand.includes('tab') || lowerCommand.includes('screen') || lowerCommand.includes('page')) {
    const navPath = path.join(MOBILE_DIR, 'src/navigation/AppNavigator.tsx');
    if (fs.existsSync(navPath)) {
      contexts.push({
        path: 'mobile/src/navigation/AppNavigator.tsx',
        content: fs.readFileSync(navPath, 'utf8')
      });
    }
  }

  if (lowerCommand.includes('call') || lowerCommand.includes('calls screen')) {
    const callsPath = path.join(MOBILE_DIR, 'src/screens/CallsScreen.tsx');
    if (fs.existsSync(callsPath)) {
      contexts.push({
        path: 'mobile/src/screens/CallsScreen.tsx',
        content: fs.readFileSync(callsPath, 'utf8')
      });
    }
  }

  if (lowerCommand.includes('message') || lowerCommand.includes('sms') || lowerCommand.includes('messages screen')) {
    const messagesPath = path.join(MOBILE_DIR, 'src/screens/MessagesScreen.tsx');
    if (fs.existsSync(messagesPath)) {
      contexts.push({
        path: 'mobile/src/screens/MessagesScreen.tsx',
        content: fs.readFileSync(messagesPath, 'utf8')
      });
    }
  }

  if (lowerCommand.includes('lead') || lowerCommand.includes('leads screen')) {
    const leadsPath = path.join(MOBILE_DIR, 'src/screens/LeadsScreen.tsx');
    if (fs.existsSync(leadsPath)) {
      contexts.push({
        path: 'mobile/src/screens/LeadsScreen.tsx',
        content: fs.readFileSync(leadsPath, 'utf8')
      });
    }
  }

  // Add always-load files if not already included
  alwaysLoad.forEach(filePath => {
    if (!contexts.find(ctx => ctx.path === filePath)) {
      const fullPath = path.join(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) {
        contexts.push({
          path: filePath,
          content: fs.readFileSync(fullPath, 'utf8')
        });
      }
    }
  });

  return contexts;
}

// Execute command via Anthropic API
async function executeCommand(cmd) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 EXECUTING COMMAND VIA AI');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📝 Command: "${cmd.command}"`);
  console.log(`🆔 ID: ${cmd.id}`);
  console.log('');

  try {
    // Get relevant file context
    const contexts = getFileContext(cmd.command);
    console.log(`📂 Loading ${contexts.length} file(s) for context...`);
    contexts.forEach(ctx => console.log(`   - ${ctx.path}`));
    console.log('');

    // Build context message
    let contextText = 'Current codebase files:\n\n';
    contexts.forEach(ctx => {
      contextText += `File: ${ctx.path}\n\`\`\`\n${ctx.content}\n\`\`\`\n\n`;
    });

    // Call Anthropic API
    console.log('🤖 Calling Anthropic API...');
    const startTime = Date.now();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are an AI coding assistant. The user wants to make the following change to their React Native mobile app:

"${cmd.command}"

${contextText}

IMPORTANT: You MUST provide code changes in the exact format below. Do not add explanations before or after the code blocks.

For each file that needs to be modified, respond in this EXACT format:

FILE: path/to/file.tsx
OLD:
\`\`\`
exact code to replace (must match file exactly, including whitespace)
\`\`\`
NEW:
\`\`\`
replacement code
\`\`\`

RULES:
1. Do NOT add any text before "FILE:" or between code blocks
2. Only include the specific sections that need to change
3. The OLD code must match EXACTLY what's in the file (character-for-character)
4. Include enough context (surrounding lines) to make the match unique
5. If multiple changes are needed, repeat the FILE/OLD/NEW format for each one
6. Do NOT explain your changes - just provide the code blocks`
        }
      ]
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ API Response received in ${responseTime}ms`);
    console.log('');

    const responseText = message.content[0].text;
    console.log('📝 AI Response:');
    console.log('───────────────────────────────────────────────────────────');
    console.log(responseText);
    console.log('───────────────────────────────────────────────────────────');
    console.log('');

    // Parse and apply changes
    const changes = parseCodeChanges(responseText);

    if (changes.length === 0) {
      console.log('⚠️  No code changes detected in AI response');
      markCommandExecuted(cmd.id, {
        success: false,
        message: 'No code changes detected',
        aiResponse: responseText
      });
      return;
    }

    console.log(`🔧 Applying ${changes.length} code change(s)...`);

    let appliedChanges = 0;
    for (const change of changes) {
      try {
        const fullPath = path.join(__dirname, '..', change.file);

        if (!fs.existsSync(fullPath)) {
          console.log(`   ⚠️  File not found: ${change.file}`);
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, 'utf8');

        if (!fileContent.includes(change.oldCode)) {
          console.log(`   ⚠️  Old code not found in ${change.file}`);
          console.log(`   Looking for: ${change.oldCode.substring(0, 50)}...`);
          continue;
        }

        const newContent = fileContent.replace(change.oldCode, change.newCode);
        fs.writeFileSync(fullPath, newContent, 'utf8');

        console.log(`   ✅ Updated ${change.file}`);
        appliedChanges++;
      } catch (error) {
        console.log(`   ❌ Error applying change to ${change.file}: ${error.message}`);
      }
    }

    console.log('');
    console.log(`✅ Applied ${appliedChanges}/${changes.length} changes successfully`);
    console.log('🔄 Fast Refresh should trigger automatically');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    markCommandExecuted(cmd.id, {
      success: appliedChanges > 0,
      appliedChanges,
      totalChanges: changes.length,
      aiResponse: responseText.substring(0, 500) // Store first 500 chars
    });

  } catch (error) {
    console.error('❌ Error executing command:', error);
    console.error(error.stack);

    markCommandExecuted(cmd.id, {
      success: false,
      error: error.message
    });
  }
}

// Parse code changes from AI response
function parseCodeChanges(responseText) {
  const changes = [];
  const lines = responseText.split('\n');

  let currentFile = null;
  let currentOld = null;
  let currentNew = null;
  let inCodeBlock = false;
  let codeBlockContent = [];
  let blockType = null; // 'old' or 'new'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect FILE: declaration
    if (line.startsWith('FILE:')) {
      currentFile = line.substring(5).trim();
      continue;
    }

    // Detect OLD: section
    if (line.trim() === 'OLD:') {
      blockType = 'old';
      continue;
    }

    // Detect NEW: section
    if (line.trim() === 'NEW:') {
      blockType = 'new';
      continue;
    }

    // Detect code block start
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockContent = [];
      } else {
        // Code block end
        inCodeBlock = false;
        const code = codeBlockContent.join('\n');

        if (blockType === 'old') {
          currentOld = code;
        } else if (blockType === 'new') {
          currentNew = code;
        }

        // If we have both old and new, save the change
        if (currentFile && currentOld !== null && currentNew !== null) {
          changes.push({
            file: currentFile,
            oldCode: currentOld,
            newCode: currentNew
          });
          currentOld = null;
          currentNew = null;
          blockType = null;
        }
      }
      continue;
    }

    // Collect code block content
    if (inCodeBlock) {
      codeBlockContent.push(line);
    }
  }

  return changes;
}

// Process pending commands
async function processPendingCommands() {
  if (isProcessing) {
    console.log('⏳ Already processing a command, skipping...');
    return;
  }

  const queue = readQueue();
  const pending = queue.commands.filter(c => c.status === 'pending' && !c.executed);

  if (pending.length > 0) {
    isProcessing = true;

    // Process one command at a time
    const cmd = pending[0];
    await executeCommand(cmd);

    isProcessing = false;

    // If more commands pending, process next one
    if (pending.length > 1) {
      setTimeout(() => processPendingCommands(), 1000);
    }
  }
}

// Start file watcher
function startFileWatcher() {
  console.log('👁️  Starting file watcher...');

  const watcher = chokidar.watch(QUEUE_FILE, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50
    }
  });

  watcher.on('change', () => {
    console.log(`📝 Queue updated: ${new Date().toLocaleTimeString()}`);
    processPendingCommands();
  });

  watcher.on('add', () => {
    console.log('✅ Queue file detected');
    processPendingCommands();
  });

  console.log('✅ AI Copilot Executor Ready!');
  console.log('');
  console.log('Speak "Copilot, [your command]" in the VoiceFlow app');
  console.log('Changes will be applied automatically within seconds!');
  console.log('');
}

// Initialize and start
initializeQueue();
startFileWatcher();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Shutting down AI Copilot Executor...');
  process.exit(0);
});
