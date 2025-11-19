/**
 * Pre-Built Workflow Action Blocks
 * Simple, no-code building blocks that users can drag and drop
 * All credentials and configurations are pre-set
 */

export const ACTION_BLOCKS = {
  // ==================== DATA ACTIONS ====================
  save_lead: {
    name: 'Save Lead to CRM',
    icon: '💾',
    description: 'Automatically save caller information to your CRM',
    category: 'Data',
    n8nNode: {
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        method: 'POST',
        url: '={{ $env.VOICEFLOW_API_URL }}/api/leads',
        authentication: 'none',
        options: {},
        bodyParametersUi: {
          parameter: [
            { name: 'name', value: '={{ $json.customer_name }}' },
            { name: 'phone', value: '={{ $json.phone }}' },
            { name: 'email', value: '={{ $json.email }}' },
            { name: 'address', value: '={{ $json.address }}' },
            { name: 'projectType', value: '={{ $json.project_type }}' },
            { name: 'budget', value: '={{ $json.budget }}' },
            { name: 'timeline', value: '={{ $json.timeline }}' },
            { name: 'source', value: 'inbound_call' },
            { name: 'status', value: 'new' }
          ]
        }
      },
      position: [0, 0]
    }
  },

  // ==================== NOTIFICATION ACTIONS ====================
  send_sms_alert: {
    name: 'Send SMS Alert',
    icon: '📱',
    description: 'Send instant SMS notification to your team',
    category: 'Notifications',
    n8nNode: {
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        method: 'POST',
        url: '={{ $env.VOICEFLOW_API_URL }}/api/sms/send',
        bodyParametersUi: {
          parameter: [
            { name: 'to', value: '={{ $env.SALES_TEAM_PHONE }}' },
            { name: 'message', value: '🔥 New Lead: {{ $json.customer_name }}, {{ $json.project_type }}, Budget: {{ $json.budget }}' }
          ]
        }
      },
      position: [0, 0]
    }
  },

  send_email_notification: {
    name: 'Send Email Notification',
    icon: '📧',
    description: 'Send email alert to your team',
    category: 'Notifications',
    n8nNode: {
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        method: 'POST',
        url: '={{ $env.VOICEFLOW_API_URL }}/api/email/send',
        bodyParametersUi: {
          parameter: [
            { name: 'to', value: '={{ $env.SALES_TEAM_EMAIL }}' },
            { name: 'subject', value: 'New Lead: {{ $json.customer_name }}' },
            { name: 'body', value: 'Lead Details:\nName: {{ $json.customer_name }}\nPhone: {{ $json.phone }}\nProject: {{ $json.project_type }}\nBudget: {{ $json.budget }}' }
          ]
        }
      },
      position: [0, 0]
    }
  },

  // ==================== TASK ACTIONS ====================
  create_task: {
    name: 'Create Follow-Up Task',
    icon: '✅',
    description: 'Automatically create a task to follow up with the lead',
    category: 'Tasks',
    n8nNode: {
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        method: 'POST',
        url: '={{ $env.VOICEFLOW_API_URL }}/api/tasks',
        bodyParametersUi: {
          parameter: [
            { name: 'title', value: 'Follow up with {{ $json.customer_name }}' },
            { name: 'description', value: 'Project: {{ $json.project_type }}, Budget: {{ $json.budget }}' },
            { name: 'priority', value: '={{ $json.budget >= 20000 ? "high" : "normal" }}' },
            { name: 'dueDate', value: '={{ $now.plus(2, "days") }}' }
          ]
        }
      },
      position: [0, 0]
    }
  },

  // ==================== ROUTING/LOGIC ====================
  route_by_budget: {
    name: 'Route by Budget',
    icon: '🔀',
    description: 'Split workflow based on budget amount',
    category: 'Logic',
    n8nNode: {
      type: 'n8n-nodes-base.switch',
      parameters: {
        mode: 'rules',
        rules: {
          rules: [
            {
              operation: 'greaterOrEqual',
              value1: '={{ $json.budget }}',
              value2: 20000,
              output: 0  // High value path
            }
          ]
        },
        fallbackOutput: 1  // Standard path
      },
      position: [0, 0]
    }
  },

  // ==================== SCHEDULING ====================
  schedule_callback: {
    name: 'Schedule Callback',
    icon: '📞',
    description: 'Schedule an automatic callback for later',
    category: 'Scheduling',
    n8nNode: {
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        method: 'POST',
        url: '={{ $env.VOICEFLOW_API_URL }}/api/callbacks/schedule',
        bodyParametersUi: {
          parameter: [
            { name: 'phone', value: '={{ $json.phone }}' },
            { name: 'scheduledFor', value: '={{ $json.preferred_callback_time }}' },
            { name: 'agentId', value: '={{ $json.agent_id }}' }
          ]
        }
      },
      position: [0, 0]
    }
  },

  // ==================== INTEGRATIONS ====================
  add_to_google_sheets: {
    name: 'Add to Google Sheets',
    icon: '📊',
    description: 'Log lead to a Google Sheet',
    category: 'Integrations',
    requiresAuth: true,
    authType: 'google',
    n8nNode: {
      type: 'n8n-nodes-base.googleSheets',
      parameters: {
        operation: 'append',
        sheetId: '={{ $env.LEADS_SHEET_ID }}',
        range: 'A:F',
        options: {
            valueInputMode: 'USER_ENTERED'
        },
        dataMode: 'defineBelow',
        fieldsUi: {
          values: [
            { fieldId: 'name', fieldValue: '={{ $json.customer_name }}' },
            { fieldId: 'phone', fieldValue: '={{ $json.phone }}' },
            { fieldId: 'project', fieldValue: '={{ $json.project_type }}' },
            { fieldId: 'budget', fieldValue: '={{ $json.budget }}' },
            { fieldId: 'date', fieldValue: '={{ $now }}' }
          ]
        }
      },
      position: [0, 0]
    }
  },

  send_slack_message: {
    name: 'Send Slack Alert',
    icon: '💬',
    description: 'Notify your team in Slack',
    category: 'Integrations',
    requiresAuth: true,
    authType: 'slack',
    n8nNode: {
      type: 'n8n-nodes-base.slack',
      parameters: {
        resource: 'message',
        operation: 'post',
        channel: '={{ $env.SLACK_SALES_CHANNEL }}',
        text: '🔥 New Lead Alert!\n\nName: {{ $json.customer_name }}\nPhone: {{ $json.phone }}\nProject: {{ $json.project_type }}\nBudget: {{ $json.budget }}'
      },
      position: [0, 0]
    }
  },

  // ==================== ENRICHMENT ====================
  extract_call_data: {
    name: 'Extract Call Data',
    icon: '🔍',
    description: 'Parse customer information from call transcript',
    category: 'Data Processing',
    n8nNode: {
      type: 'n8n-nodes-base.code',
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: `
// Extract data from ElevenLabs webhook
const callData = items[0].json;

return [{
  json: {
    customer_name: callData.analysis?.customerName || '',
    phone: callData.analysis?.phoneNumber || '',
    email: callData.analysis?.email || '',
    address: callData.analysis?.address || '',
    project_type: callData.analysis?.projectType || '',
    budget: callData.analysis?.budget || 0,
    timeline: callData.analysis?.timeline || '',
    call_duration: callData.end_timestamp - callData.start_timestamp,
    transcript: callData.transcript || '',
    recording_url: callData.recording_url || ''
  }
}];
        `
      },
      position: [0, 0]
    }
  }
};

/**
 * Get block template by ID
 */
export function getBlockTemplate(blockId) {
  return ACTION_BLOCKS[blockId] || null;
}

/**
 * Get all blocks by category
 */
export function getBlocksByCategory() {
  const categories = {};

  Object.entries(ACTION_BLOCKS).forEach(([id, block]) => {
    if (!categories[block.category]) {
      categories[block.category] = [];
    }
    categories[block.category].push({ id, ...block });
  });

  return categories;
}

/**
 * Convert block template to n8n workflow node
 */
export function blockToN8nNode(blockId, position = [0, 0]) {
  const block = ACTION_BLOCKS[blockId];
  if (!block) return null;

  const node = { ...block.n8nNode };
  node.position = position;
  node.name = block.name;

  return node;
}
