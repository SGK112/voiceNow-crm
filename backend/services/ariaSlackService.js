import axios from 'axios';

export class AriaSlackService {
  constructor() {
    // Support both SLACK_WEBHOOK and SLACK_WEBHOOK_URL for backwards compatibility
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.SLACK_WEBHOOK;
    this.botToken = process.env.SLACK_BOT_TOKEN;
    this.enabled = !!this.webhookUrl;

    if (!this.enabled) {
      console.log('⚠️  [SLACK] Slack integration not configured');
    } else {
      console.log('✅ [SLACK] Slack integration enabled');
    }
  }

  /**
   * Send a message to Slack
   */
  async sendMessage(text, options = {}) {
    if (!this.enabled) {
      console.log('⚠️  [SLACK] Skipping - not configured');
      return { success: false, error: 'Slack not configured' };
    }

    try {
      const {
        channel = null,
        username = 'Aria AI Assistant',
        icon_emoji = ':robot_face:',
        attachments = [],
        blocks = []
      } = options;

      const payload = {
        text,
        username,
        icon_emoji
      };

      if (channel) payload.channel = channel;
      if (attachments.length > 0) payload.attachments = attachments;
      if (blocks.length > 0) payload.blocks = blocks;

      const response = await axios.post(this.webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('✅ [SLACK] Message sent successfully');

      return {
        success: true,
        response: response.data
      };
    } catch (error) {
      console.error('❌ [SLACK] Send error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send a rich notification with formatting
   */
  async sendNotification(title, message, options = {}) {
    const {
      color = 'good',
      fields = [],
      footer = 'Aria AI Assistant',
      timestamp = Math.floor(Date.now() / 1000)
    } = options;

    const attachment = {
      color,
      title,
      text: message,
      fields,
      footer,
      ts: timestamp
    };

    return await this.sendMessage('', {
      attachments: [attachment],
      ...options
    });
  }

  /**
   * Send error notification
   */
  async sendError(error, context = {}) {
    return await this.sendNotification(
      '🚨 Error Alert',
      `\`\`\`${error.message}\`\`\``,
      {
        color: 'danger',
        fields: [
          {
            title: 'Context',
            value: JSON.stringify(context, null, 2).slice(0, 200),
            short: false
          }
        ]
      }
    );
  }

  /**
   * Send conversation summary
   */
  async sendConversationSummary(sessionId, summary, metrics) {
    const fields = [
      {
        title: 'Session ID',
        value: sessionId,
        short: true
      },
      {
        title: 'Messages',
        value: metrics.messageCount?.toString() || '0',
        short: true
      },
      {
        title: 'Duration',
        value: `${Math.round(metrics.totalDuration / 1000)}s`,
        short: true
      },
      {
        title: 'Capabilities Used',
        value: metrics.capabilitiesUsed?.join(', ') || 'None',
        short: true
      }
    ];

    return await this.sendNotification(
      '💬 Conversation Ended',
      summary,
      {
        color: '#36a64f',
        fields
      }
    );
  }

  /**
   * Send capability usage notification
   */
  async sendCapabilityUsage(capability, args, result) {
    const status = result.success ? '✅ Success' : '❌ Failed';
    const color = result.success ? 'good' : 'danger';

    return await this.sendNotification(
      `${status} - Capability: ${capability}`,
      `Arguments: \`${JSON.stringify(args).slice(0, 100)}\`\n\nResult: ${result.summary || result.error || 'No details'}`,
      { color }
    );
  }

  /**
   * Send memory storage notification
   */
  async sendMemoryUpdate(action, memory) {
    const emoji = action === 'stored' ? '💾' : '🔍';

    return await this.sendNotification(
      `${emoji} Memory ${action}`,
      `**Key:** ${memory.key}\n**Value:** ${memory.value?.substring(0, 100)}\n**Category:** ${memory.category}`,
      {
        color: '#4A90E2',
        fields: [
          {
            title: 'Importance',
            value: `${memory.importance}/10`,
            short: true
          },
          {
            title: 'Access Count',
            value: memory.accessCount?.toString() || '0',
            short: true
          }
        ]
      }
    );
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(stats) {
    const fields = [
      {
        title: 'Total Conversations',
        value: stats.conversations?.toString() || '0',
        short: true
      },
      {
        title: 'Total Messages',
        value: stats.messages?.toString() || '0',
        short: true
      },
      {
        title: 'Memories Created',
        value: stats.memoriesCreated?.toString() || '0',
        short: true
      },
      {
        title: 'Avg Response Time',
        value: `${stats.avgResponseTime || 0}ms`,
        short: true
      },
      {
        title: 'Capabilities Used',
        value: stats.capabilitiesUsed?.toString() || '0',
        short: true
      },
      {
        title: 'Error Rate',
        value: `${stats.errorRate || 0}%`,
        short: true
      }
    ];

    return await this.sendNotification(
      '📊 Daily Aria Stats',
      'Here\'s how Aria performed today:',
      {
        color: '#5865F2',
        fields
      }
    );
  }

  /**
   * Log important events to Slack
   */
  async logEvent(eventType, details) {
    const eventEmojis = {
      conversation_start: '🎬',
      conversation_end: '🏁',
      capability_used: '⚡',
      memory_stored: '💾',
      memory_recalled: '🔍',
      error: '🚨',
      training_complete: '🎓'
    };

    const emoji = eventEmojis[eventType] || '📝';

    return await this.sendMessage(
      `${emoji} *${eventType.replace(/_/g, ' ').toUpperCase()}*\n${details}`
    );
  }
}

export const ariaSlackService = new AriaSlackService();
export default ariaSlackService;
