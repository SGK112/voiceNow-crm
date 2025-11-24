import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple file-based queue for dev commands
const QUEUE_FILE = path.join(__dirname, '../dev-command-queue.json');

// Initialize queue file if it doesn't exist
if (!fs.existsSync(QUEUE_FILE)) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify({ commands: [], results: [] }));
}

// Helper to read queue
function readQueue() {
  try {
    const data = fs.readFileSync(QUEUE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { commands: [], results: [] };
  }
}

// Helper to write queue
function writeQueue(data) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2));
}

// @desc    Submit a development command (from mobile app)
// @route   POST /api/dev/command
// @access  Public (should add auth in production)
router.post('/command', async (req, res) => {
  try {
    const { command, transcription } = req.body;

    if (!command) {
      return res.status(400).json({ success: false, message: 'Command required' });
    }

    const queue = readQueue();

    const newCommand = {
      id: Date.now().toString(),
      command,
      transcription,
      timestamp: new Date().toISOString(),
      status: 'pending',
      executed: false
    };

    queue.commands.push(newCommand);
    writeQueue(queue);

    console.log('📝 New dev command received:', command);

    res.json({
      success: true,
      message: 'Command queued for execution',
      commandId: newCommand.id
    });
  } catch (error) {
    console.error('Error queuing command:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue command',
      error: error.message
    });
  }
});

// @desc    Get pending commands (for Claude Code to read)
// @route   GET /api/dev/commands/pending
// @access  Public
router.get('/commands/pending', (req, res) => {
  try {
    const queue = readQueue();
    const pending = queue.commands.filter(cmd => !cmd.executed);

    res.json({
      success: true,
      commands: pending
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Mark command as executed (for Claude Code)
// @route   POST /api/dev/command/:id/executed
// @access  Public
router.post('/command/:id/executed', (req, res) => {
  try {
    const { id } = req.params;
    const { result, success: execSuccess } = req.body;

    const queue = readQueue();
    const cmdIndex = queue.commands.findIndex(cmd => cmd.id === id);

    if (cmdIndex === -1) {
      return res.status(404).json({ success: false, message: 'Command not found' });
    }

    queue.commands[cmdIndex].executed = true;
    queue.commands[cmdIndex].status = execSuccess ? 'completed' : 'failed';
    queue.commands[cmdIndex].executedAt = new Date().toISOString();

    // Add to results
    queue.results.push({
      commandId: id,
      command: queue.commands[cmdIndex].command,
      result,
      success: execSuccess,
      timestamp: new Date().toISOString()
    });

    writeQueue(queue);

    console.log('✅ Command executed:', id);

    res.json({
      success: true,
      message: 'Command marked as executed'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Get command result (for mobile app)
// @route   GET /api/dev/command/:id/result
// @access  Public
router.get('/command/:id/result', (req, res) => {
  try {
    const { id } = req.params;
    const queue = readQueue();

    const command = queue.commands.find(cmd => cmd.id === id);
    const result = queue.results.find(r => r.commandId === id);

    if (!command) {
      return res.status(404).json({ success: false, message: 'Command not found' });
    }

    res.json({
      success: true,
      command,
      result: result || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Get all recent results (for mobile app)
// @route   GET /api/dev/results
// @access  Public
router.get('/results', (req, res) => {
  try {
    const queue = readQueue();
    const recentResults = queue.results.slice(-10).reverse(); // Last 10 results

    res.json({
      success: true,
      results: recentResults
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
