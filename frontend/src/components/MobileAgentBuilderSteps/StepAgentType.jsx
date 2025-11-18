import { Mic, MessageSquare, Image, Mail, Bell } from 'lucide-react';

/**
 * Step 1: Choose Agent Type
 * Voice, SMS, MMS, Email, or Notification
 */

const AGENT_TYPES = [
  {
    id: 'voice',
    name: 'Voice Agent',
    icon: Mic,
    description: 'AI phone calls',
    details: 'Inbound & Outbound',
    color: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-500'
  },
  {
    id: 'sms',
    name: 'SMS Agent',
    icon: MessageSquare,
    description: 'Text messaging',
    details: 'Auto-reply & Bulk campaigns',
    color: 'from-green-500 to-green-600',
    borderColor: 'border-green-500'
  },
  {
    id: 'mms',
    name: 'MMS Agent',
    icon: Image,
    description: 'Media messages',
    details: 'Images, PDFs, Videos',
    color: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-500'
  },
  {
    id: 'email',
    name: 'Email Agent',
    icon: Mail,
    description: 'Email automation',
    details: 'Campaigns & Auto-replies',
    color: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-500'
  },
  {
    id: 'notification',
    name: 'Notification Agent',
    icon: Bell,
    description: 'Reminders & Alerts',
    details: 'Multi-channel notifications',
    color: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-500'
  }
];

export default function StepAgentType({ agentData, updateAgentData, nextStep }) {
  const handleSelectType = (typeId) => {
    updateAgentData({ agentType: typeId });
    // Auto-advance to next step after selection
    setTimeout(() => nextStep(), 300);
  };

  return (
    <div className="p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Create New Agent
          </h2>
          <p className="text-muted-foreground">
            What type of agent do you want to create?
          </p>
        </div>

        {/* Agent Type Cards */}
        <div className="space-y-3">
          {AGENT_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = agentData.agentType === type.id;

            return (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all touch-manipulation text-left bg-card ${
                  isSelected
                    ? `${type.borderColor}`
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${type.color} flex-shrink-0`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-lg mb-1">
                      {type.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      {type.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {type.details}
                    </p>
                  </div>

                  {/* Checkmark */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 <strong>Tip:</strong> You can create multiple agents for different purposes. Start with the one you need most.
          </p>
        </div>
      </div>
    </div>
  );
}
