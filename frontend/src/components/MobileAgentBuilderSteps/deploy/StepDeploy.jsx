import { useState } from 'react';
import { Phone, Upload, Code, Share2, Check, Loader2 } from 'lucide-react';
import { agentApi } from '../../../services/api';
import { useNavigate } from 'react-router-dom';

/**
 * Step 7: Deploy Your Agent
 * Phone number, Upload list, Website widget, Share link
 */

export default function StepDeploy({ agentData }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [agentId, setAgentId] = useState(null);
  const [error, setError] = useState(null);

  const deploymentOptions = [
    {
      id: 'phone',
      name: 'Phone Number',
      icon: Phone,
      description: 'Get a number for inbound calls',
      color: 'from-green-500 to-green-600',
      available: agentData.agentType === 'voice' && agentData.direction === 'inbound'
    },
    {
      id: 'upload',
      name: 'Upload Contact List',
      icon: Upload,
      description: 'Call a list of contacts (CSV)',
      color: 'from-blue-500 to-blue-600',
      available: agentData.agentType === 'voice' && agentData.direction === 'outbound'
    },
    {
      id: 'widget',
      name: 'Website Widget',
      icon: Code,
      description: '"Call Me" button for your site',
      color: 'from-purple-500 to-purple-600',
      available: agentData.agentType === 'voice'
    },
    {
      id: 'share',
      name: 'Share Link',
      icon: Share2,
      description: 'Send a link that triggers action',
      color: 'from-orange-500 to-orange-600',
      available: true
    }
  ];

  const createAgent = async () => {
    try {
      setCreating(true);
      setError(null);

      // Validate voice agent requirements
      if (agentData.agentType === 'voice') {
        if (!agentData.prompt || agentData.prompt.trim().length < 10) {
          setError('Agent prompt is required (minimum 10 characters). Please go back and fill in the Agent Instructions step.');
          setCreating(false);
          return;
        }
        if (!agentData.voiceId) {
          setError('Please select a voice for your agent.');
          setCreating(false);
          return;
        }
        if (!agentData.direction) {
          setError('Please select call direction (Inbound or Outbound).');
          setCreating(false);
          return;
        }
      }

      // Build agent payload based on type
      const payload = {
        name: `${agentData.agentType} Agent`,
        type: agentData.agentType,
        config: {}
      };

      // Add voice-specific config
      if (agentData.agentType === 'voice') {
        payload.config = {
          direction: agentData.direction,
          voiceId: agentData.voiceId,
          greeting: agentData.greeting,
          prompt: agentData.prompt,
          knowledgeBase: agentData.knowledgeBase || []
        };
      }

      // Add SMS config
      if (agentData.agentType === 'sms') {
        payload.config = {
          template: agentData.smsTemplate,
          keywords: agentData.keywords || []
        };
      }

      // Add MMS config
      if (agentData.agentType === 'mms') {
        payload.config = {
          mediaFiles: agentData.mediaFiles || [],
          caption: agentData.mmsCaption || ''
        };
      }

      // Add Email config
      if (agentData.agentType === 'email') {
        payload.config = {
          subject: agentData.emailSubject,
          body: agentData.emailBody,
          from: agentData.emailFrom || 'noreply@voicenowcrm.com'
        };
      }

      // Add Notification config
      if (agentData.agentType === 'notification') {
        payload.config = {
          channels: agentData.notificationChannels || [],
          trigger: agentData.notificationTrigger || 'manual'
        };
      }

      const response = await agentApi.createAgent(payload);
      setAgentId(response.data.agent.id || response.data.agent._id);
      setCreated(true);

      // Clear draft
      localStorage.removeItem('mobile_agent_builder_draft');
    } catch (err) {
      console.error('Failed to create agent:', err);
      setError(err.response?.data?.message || 'Failed to create agent');
    } finally {
      setCreating(false);
    }
  };

  const handleDeploymentOption = (optionId) => {
    if (optionId === 'phone') {
      navigate(`/app/phone-marketplace?agentId=${agentId}`);
    } else if (optionId === 'upload') {
      navigate(`/app/agents/${agentId}`);
    } else if (optionId === 'widget') {
      navigate(`/app/agents/${agentId}`);
    } else if (optionId === 'share') {
      // Copy share link
      const link = `https://voicenowcrm.com/call/${agentId}`;
      navigator.clipboard.writeText(link);
      alert('Link copied to clipboard!');
    }
  };

  if (!created) {
    return (
      <div className="p-4 pb-20">
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Create Your Agent
            </h2>
            <p className="text-muted-foreground">
              Ready to bring your agent to life?
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={createAgent}
            disabled={creating}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg flex items-center justify-center gap-3 font-medium text-lg shadow-lg disabled:shadow-none touch-manipulation"
          >
            {creating ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Creating Agent...
              </>
            ) : (
              <>
                <Check className="h-6 w-6" />
                Create Agent
              </>
            )}
          </button>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              💡 You can deploy your agent after creation
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Success Message */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Agent Created! 🎉
          </h2>
          <p className="text-muted-foreground">
            Now let's deploy it
          </p>
        </div>

        {/* Deployment Options */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3">
            How will people reach your agent?
          </h3>
          <div className="space-y-3">
            {deploymentOptions.filter(opt => opt.available).map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleDeploymentOption(option.id)}
                  className="w-full p-4 rounded-lg border-2 border-border hover:border-blue-500 bg-card transition-all touch-manipulation text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${option.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">{option.name}</h4>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Skip Button */}
        <button
          onClick={() => navigate('/app/agents')}
          className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
