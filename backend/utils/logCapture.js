import fs from 'fs';
import path from 'path';

// Circular buffer for storing recent logs
class LogBuffer {
  constructor(maxSize = 1000) {
    this.logs = [];
    this.maxSize = maxSize;
    this.categories = {
      voice: [],
      error: [],
      performance: [],
      conversation: []
    };
  }

  addLog(category, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      category,
      message,
      metadata
    };

    // Add to main buffer
    this.logs.push(logEntry);
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }

    // Add to category buffer
    if (this.categories[category]) {
      this.categories[category].push(logEntry);
      if (this.categories[category].length > 200) {
        this.categories[category].shift();
      }
    }

    return logEntry;
  }

  getRecentLogs(category = null, limit = 50) {
    if (category && this.categories[category]) {
      return this.categories[category].slice(-limit);
    }
    return this.logs.slice(-limit);
  }

  getLogsSince(timestamp) {
    const sinceTime = new Date(timestamp).getTime();
    return this.logs.filter(log => new Date(log.timestamp).getTime() >= sinceTime);
  }

  captureSnippet(description, category = 'voice', limit = 20) {
    const logs = this.getRecentLogs(category, limit);

    return {
      id: `snippet_${Date.now()}`,
      description,
      category,
      capturedAt: new Date().toISOString(),
      logs: logs.map(log => ({
        time: log.timestamp,
        message: log.message,
        ...log.metadata
      }))
    };
  }

  exportToFile(filePath, category = null) {
    const logs = category ? this.getRecentLogs(category, 500) : this.logs.slice(-500);
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
    return filePath;
  }
}

// Global log buffer instance
export const logBuffer = new LogBuffer();

// Helper function to save command for Claude Code
export function saveClaudeCommand(command, logs, context) {
  const queuePath = path.join(process.cwd(), 'dev-command-queue.json');

  let queue = { commands: [], results: [] };
  if (fs.existsSync(queuePath)) {
    queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  }

  const newCommand = {
    id: Date.now().toString(),
    type: 'improvement',
    command,
    logs,
    context,
    timestamp: new Date().toISOString(),
    status: 'pending',
    executed: false
  };

  queue.commands.push(newCommand);
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

  console.log(`📋 Saved improvement command for Claude Code: "${command}"`);
  return newCommand.id;
}

// Auto-save conversations to a rolling log file for analysis
export function autoSaveConversation(conversationData) {
  const conversationsDir = path.join(process.cwd(), 'backend', 'conversation-logs');

  // Create directory if it doesn't exist
  if (!fs.existsSync(conversationsDir)) {
    fs.mkdirSync(conversationsDir, { recursive: true });
  }

  // Use daily log files
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(conversationsDir, `aria-conversations-${date}.jsonl`);

  // Append as JSON Lines format (one JSON object per line)
  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...conversationData
  }) + '\n';

  fs.appendFileSync(logFile, logEntry);
}

// Analyze recent conversations and create improvement suggestions
export function analyzeAndSuggest() {
  const conversationsDir = path.join(process.cwd(), 'backend', 'conversation-logs');

  if (!fs.existsSync(conversationsDir)) {
    return null;
  }

  // Get today's log file
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(conversationsDir, `aria-conversations-${date}.jsonl`);

  if (!fs.existsSync(logFile)) {
    return null;
  }

  // Read and parse conversations
  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
  const conversations = lines.map(line => JSON.parse(line));

  // Calculate statistics
  const totalConversations = conversations.length;
  const avgTranscriptionTime = conversations.reduce((sum, c) => sum + (c.transcriptionTime || 0), 0) / totalConversations;
  const avgAiResponseTime = conversations.reduce((sum, c) => sum + (c.aiResponseTime || 0), 0) / totalConversations;
  const avgVoiceGenTime = conversations.reduce((sum, c) => sum + (c.voiceGenTime || 0), 0) / totalConversations;
  const avgTotalTime = conversations.reduce((sum, c) => sum + (c.totalTime || 0), 0) / totalConversations;

  const errors = conversations.filter(c => c.error);
  const slowConversations = conversations.filter(c => c.totalTime > 5000);

  return {
    date,
    totalConversations,
    avgTranscriptionTime: Math.round(avgTranscriptionTime),
    avgAiResponseTime: Math.round(avgAiResponseTime),
    avgVoiceGenTime: Math.round(avgVoiceGenTime),
    avgTotalTime: Math.round(avgTotalTime),
    errorCount: errors.length,
    slowCount: slowConversations.length,
    recentConversations: conversations.slice(-10)
  };
}

export default logBuffer;
