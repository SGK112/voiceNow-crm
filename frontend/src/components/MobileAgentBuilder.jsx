import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

// Step components (will create these next)
import StepAgentType from './MobileAgentBuilderSteps/StepAgentType';
import StepDirection from './MobileAgentBuilderSteps/voice/StepDirection';
import StepVoiceSelection from './MobileAgentBuilderSteps/voice/StepVoiceSelection';
import StepGreeting from './MobileAgentBuilderSteps/voice/StepGreeting';
import StepPrompt from './MobileAgentBuilderSteps/voice/StepPrompt';
import StepKnowledgeBase from './MobileAgentBuilderSteps/shared/StepKnowledgeBase';
import StepSMSTemplate from './MobileAgentBuilderSteps/sms/StepSMSTemplate';
import StepMMSMedia from './MobileAgentBuilderSteps/mms/StepMMSMedia';
import StepEmailTemplate from './MobileAgentBuilderSteps/email/StepEmailTemplate';
import StepNotificationChannels from './MobileAgentBuilderSteps/notification/StepNotificationChannels';
import StepReview from './MobileAgentBuilderSteps/shared/StepReview';
import StepDeploy from './MobileAgentBuilderSteps/deploy/StepDeploy';

/**
 * 📱 MOBILE AGENT BUILDER
 *
 * Simple, step-by-step wizard for creating agents on mobile devices
 * Supports: Voice, SMS, MMS, Email, Notification agents
 */

// Agent type configurations
const AGENT_TYPES = {
  voice: {
    name: 'Voice Agent',
    icon: '🎙️',
    description: 'AI phone calls',
    provider: 'elevenlabs',
    steps: ['agentType', 'direction', 'voice', 'greeting', 'prompt', 'knowledge', 'review', 'deploy']
  },
  sms: {
    name: 'SMS Agent',
    icon: '💬',
    description: 'Text messaging',
    provider: 'twilio',
    steps: ['agentType', 'smsTemplate', 'review', 'deploy']
  },
  mms: {
    name: 'MMS Agent',
    icon: '📱',
    description: 'Media messages',
    provider: 'twilio',
    steps: ['agentType', 'mmsMedia', 'review', 'deploy']
  },
  email: {
    name: 'Email Agent',
    icon: '📧',
    description: 'Email automation',
    provider: 'smtp',
    steps: ['agentType', 'emailTemplate', 'review', 'deploy']
  },
  notification: {
    name: 'Notification Agent',
    icon: '🔔',
    description: 'Reminders & alerts',
    provider: 'multi',
    steps: ['agentType', 'notificationChannels', 'review', 'deploy']
  }
};

export default function MobileAgentBuilder() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [agentData, setAgentData] = useState({
    agentType: null,
    name: '',
    // Voice-specific
    direction: null, // 'inbound' or 'outbound'
    voiceId: null,
    voiceName: '',
    greeting: '',
    prompt: '',
    knowledgeBase: [],
    // SMS-specific
    smsTemplate: '',
    keywords: [],
    // MMS-specific
    mediaFiles: [],
    mmsCaption: '',
    // Email-specific
    emailSubject: '',
    emailBody: '',
    emailFrom: '',
    // Notification-specific
    notificationChannels: [],
    notificationTrigger: '',
    // Deployment
    phoneNumber: null,
    contacts: [],
    widgetConfig: null,
    shareLink: null
  });

  // Get current agent type configuration
  const agentTypeConfig = agentData.agentType ? AGENT_TYPES[agentData.agentType] : null;
  const steps = agentTypeConfig ? agentTypeConfig.steps : ['agentType'];
  const totalSteps = steps.length;
  const currentStepName = steps[currentStep];

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('mobile_agent_builder_draft', JSON.stringify(agentData));
  }, [agentData]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mobile_agent_builder_draft');
    if (saved) {
      try {
        setAgentData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved draft:', e);
      }
    }
    // Scroll to top on mount
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const updateAgentData = (updates) => {
    setAgentData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const canProceed = () => {
    switch (currentStepName) {
      case 'agentType':
        return agentData.agentType !== null;
      case 'direction':
        return agentData.direction !== null;
      case 'voice':
        return agentData.voiceId !== null;
      case 'greeting':
        return agentData.greeting && agentData.greeting.trim().length > 0;
      case 'prompt':
        return agentData.prompt && agentData.prompt.trim().length >= 10;
      case 'smsTemplate':
        return agentData.smsTemplate && agentData.smsTemplate.trim().length > 0;
      case 'mmsMedia':
        return agentData.mediaFiles && agentData.mediaFiles.length > 0;
      case 'emailTemplate':
        return agentData.emailSubject && agentData.emailSubject.trim().length > 0 &&
               agentData.emailBody && agentData.emailBody.trim().length > 0;
      case 'notificationChannels':
        return agentData.notificationChannels && agentData.notificationChannels.length > 0;
      default:
        return true;
    }
  };

  // Render current step
  const renderStep = () => {
    const stepProps = {
      agentData,
      updateAgentData,
      nextStep,
      prevStep
    };

    switch (currentStepName) {
      case 'agentType':
        return <StepAgentType {...stepProps} />;
      case 'direction':
        return <StepDirection {...stepProps} />;
      case 'voice':
        return <StepVoiceSelection {...stepProps} />;
      case 'greeting':
        return <StepGreeting {...stepProps} />;
      case 'prompt':
        return <StepPrompt {...stepProps} />;
      case 'knowledge':
        return <StepKnowledgeBase {...stepProps} />;
      case 'smsTemplate':
        return <StepSMSTemplate {...stepProps} />;
      case 'mmsMedia':
        return <StepMMSMedia {...stepProps} />;
      case 'emailTemplate':
        return <StepEmailTemplate {...stepProps} />;
      case 'notificationChannels':
        return <StepNotificationChannels {...stepProps} />;
      case 'review':
        return <StepReview {...stepProps} />;
      case 'deploy':
        return <StepDeploy {...stepProps} />;
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (currentStep === 0) {
                navigate('/app/agent-studio');
              } else {
                prevStep();
              }
            }}
            className="p-2 hover:bg-muted rounded-lg touch-manipulation"
          >
            {currentStep === 0 ? <X className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <div>
            <h1 className="font-semibold text-foreground">
              {agentTypeConfig ? agentTypeConfig.name : 'Create Agent'}
            </h1>
            <p className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('mobile_agent_builder_draft');
            navigate('/app/agent-studio');
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-card border-b border-border px-4 py-2">
        <div className="flex items-center gap-1">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2 rounded-full transition-all ${
                idx < currentStep
                  ? 'bg-green-500'
                  : idx === currentStep
                  ? 'bg-blue-500'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        {renderStep()}
      </div>

      {/* Footer Navigation */}
      {currentStepName !== 'deploy' && (
        <div className="bg-card border-t border-border px-4 py-3 flex items-center justify-between sticky bottom-0">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2 touch-manipulation font-medium"
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Continue'}
            {currentStep === totalSteps - 1 ? (
              <Check className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
