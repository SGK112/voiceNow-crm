import { PhoneIncoming, PhoneOutgoing } from 'lucide-react';

/**
 * Step 2 (Voice): Choose Direction
 * Inbound (answer calls) or Outbound (make calls)
 */

export default function StepDirection({ agentData, updateAgentData }) {
  const directions = [
    {
      id: 'inbound',
      name: 'Inbound Agent',
      icon: PhoneIncoming,
      description: 'Answers incoming calls',
      details: 'Perfect for customer service, support, and lead capture',
      color: 'from-green-500 to-green-600',
      borderColor: 'border-green-500',
      examples: [
        '24/7 customer support',
        'Order taking & inquiries',
        'Appointment scheduling',
        'Lead qualification'
      ]
    },
    {
      id: 'outbound',
      name: 'Outbound Agent',
      icon: PhoneOutgoing,
      description: 'Makes calls to contacts',
      details: 'Perfect for sales, reminders, and follow-ups',
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-500',
      examples: [
        'Sales & lead outreach',
        'Appointment reminders',
        'Follow-up calls',
        'Survey & feedback'
      ]
    }
  ];

  return (
    <div className="p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Choose Call Direction
          </h2>
          <p className="text-muted-foreground">
            Will this agent answer calls or make calls?
          </p>
        </div>

        {/* Direction Cards */}
        <div className="space-y-4">
          {directions.map((dir) => {
            const Icon = dir.icon;
            const isSelected = agentData.direction === dir.id;

            return (
              <button
                key={dir.id}
                onClick={() => updateAgentData({ direction: dir.id })}
                className={`w-full p-5 rounded-xl border-2 transition-all touch-manipulation text-left bg-card ${
                  isSelected
                    ? `${dir.borderColor}`
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div className="flex items-start gap-4 mb-3">
                  {/* Icon */}
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${dir.color} flex-shrink-0`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg mb-1">
                      {dir.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      {dir.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dir.details}
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

                {/* Examples */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Use cases:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {dir.examples.map((example, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="text-green-500">✓</span>
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
