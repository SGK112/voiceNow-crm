import axios from 'axios';
import Integration from '../models/Integration.js';

class SlackService {
  /**
   * Send a message to Slack using webhook URL
   */
  async sendWebhookMessage(webhookUrl, message) {
    try {
      const response = await axios.post(webhookUrl, {
        text: message.text,
        blocks: message.blocks,
        attachments: message.attachments
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return { success: true, response: response.data };
    } catch (error) {
      console.error('Slack webhook error:', error.response?.data || error.message);
      throw new Error(`Failed to send Slack message: ${error.message}`);
    }
  }

  /**
   * Send a message using OAuth integration
   */
  async sendOAuthMessage(userId, channel, message) {
    try {
      // Get user's Slack integration
      const integration = await Integration.findOne({
        userId,
        service: 'slack',
        status: 'connected'
      });

      if (!integration) {
        throw new Error('Slack not connected');
      }

      // Check if token is expired and refresh if needed
      if (integration.isExpired() && integration.getRefreshToken()) {
        await this.refreshToken(integration);
      }

      const accessToken = integration.getAccessToken();

      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel,
          text: message.text,
          blocks: message.blocks,
          attachments: message.attachments
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.ok) {
        throw new Error(response.data.error);
      }

      await integration.markUsed();

      return { success: true, response: response.data };
    } catch (error) {
      console.error('Slack OAuth message error:', error);
      throw error;
    }
  }

  /**
   * Refresh Slack OAuth token
   */
  async refreshToken(integration) {
    try {
      const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
        params: {
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: integration.getRefreshToken()
        }
      });

      if (!response.data.ok) {
        throw new Error(response.data.error);
      }

      await integration.updateTokens(
        response.data.access_token,
        response.data.refresh_token,
        response.data.expires_in || 43200 // 12 hours default
      );

      return integration;
    } catch (error) {
      await integration.recordError(error);
      throw error;
    }
  }

  /**
   * Get list of channels in a workspace
   */
  async getChannels(userId) {
    try {
      const integration = await Integration.findOne({
        userId,
        service: 'slack',
        status: 'connected'
      });

      if (!integration) {
        throw new Error('Slack not connected');
      }

      const accessToken = integration.getAccessToken();

      const response = await axios.get('https://slack.com/api/conversations.list', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          types: 'public_channel,private_channel',
          exclude_archived: true
        }
      });

      if (!response.data.ok) {
        throw new Error(response.data.error);
      }

      return response.data.channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        memberCount: channel.num_members
      }));
    } catch (error) {
      console.error('Get Slack channels error:', error);
      throw error;
    }
  }

  /**
   * Helper: Create formatted message for new lead
   */
  formatNewLeadMessage(lead, isHot = false) {
    const emoji = isHot ? '🔥' : '📋';
    const priority = isHot ? '*HOT LEAD*' : 'New Lead';

    return {
      text: `${emoji} ${priority}: ${lead.name}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${priority}*\n\n*${lead.name}*${lead.company ? ` - ${lead.company}` : ''}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Phone:*\n${lead.phone || 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${lead.email || 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n${lead.status || 'New'}`
            },
            {
              type: 'mrkdwn',
              text: `*Score:*\n${lead.score || 0}/100`
            }
          ]
        },
        ...(lead.notes ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Notes:*\n${lead.notes}`
          }
        }] : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '👁️ View Lead'
              },
              url: `${process.env.FRONTEND_URL}/app/leads?id=${lead._id}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🤖 VoiceNow CRM • ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };
  }

  /**
   * Helper: Create formatted message for completed call
   */
  formatCallCompletedMessage(call) {
    const duration = call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'N/A';

    return {
      text: `📞 Call completed with ${call.leadId?.name || 'Unknown'}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📞 *Call Completed*\n\n*Customer:* ${call.leadId?.name || 'Unknown'}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Duration:*\n${duration}`
            },
            {
              type: 'mrkdwn',
              text: `*Agent:*\n${call.agentId?.name || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*Outcome:*\n${call.outcome || 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `*Sentiment:*\n${call.sentiment || 'N/A'}`
            }
          ]
        },
        ...(call.summary ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Summary:*\n${call.summary}`
          }
        }] : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🎧 Listen to Recording'
              },
              url: `${process.env.FRONTEND_URL}/app/calls?id=${call._id}`
            }
          ]
        }
      ]
    };
  }

  /**
   * Helper: Create formatted message for new appointment
   */
  formatAppointmentMessage(appointment) {
    const appointmentTime = appointment.dueDate
      ? new Date(appointment.dueDate).toLocaleString()
      : 'Not set';

    return {
      text: `📅 New appointment scheduled with ${appointment.leadId?.name || 'Unknown'}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📅 *New Appointment Scheduled*\n\n*${appointment.title || 'Appointment'}*`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Customer:*\n${appointment.leadId?.name || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${appointmentTime}`
            },
            {
              type: 'mrkdwn',
              text: `*Phone:*\n${appointment.leadId?.phone || 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${appointment.leadId?.email || 'N/A'}`
            }
          ]
        },
        ...(appointment.description ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n${appointment.description}`
          }
        }] : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📋 View Details'
              },
              url: `${process.env.FRONTEND_URL}/app/tasks?id=${appointment._id}`
            }
          ]
        }
      ]
    };
  }

  /**
   * Helper: Create formatted message for deal update
   */
  formatDealUpdateMessage(deal, action = 'updated') {
    const emoji = action === 'won' ? '🎉' : action === 'lost' ? '😞' : '💼';
    const actionText = action === 'won' ? 'WON' : action === 'lost' ? 'LOST' : 'UPDATED';

    return {
      text: `${emoji} Deal ${actionText}: ${deal.name}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *Deal ${actionText}*\n\n*${deal.name}*`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Value:*\n$${deal.value?.toLocaleString() || 0}`
            },
            {
              type: 'mrkdwn',
              text: `*Stage:*\n${deal.stage || 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `*Customer:*\n${deal.leadId?.name || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*Close Date:*\n${deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : 'N/A'}`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '💼 View Deal'
              },
              url: `${process.env.FRONTEND_URL}/app/deals?id=${deal._id}`
            }
          ]
        }
      ]
    };
  }
}

export default new SlackService();
