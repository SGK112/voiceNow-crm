import { useState, useEffect } from 'react';
import { X, Phone, Users, Zap, Settings } from 'lucide-react';
import api from '../services/api';
import { useProfile } from '@/context/ProfileContext';
import { buildProfileContextPrompt } from '@/utils/promptBuilder';

export default function QuickAgentBuilder({ voice, onClose, onSuccess }) {
  const profileHelpers = useProfile();
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Action (Call/Assign)

  const [agentData, setAgentData] = useState({
    name: `${voice.name} Agent`,
    prompt: buildProfileContextPrompt(profileHelpers),
    firstMessage: 'Hello! How can I help you today?',
    language: voice.language || 'en'
  });
  const [action, setAction] = useState(null); // 'batch-call' or 'assign-number'
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');
  const [userPhoneNumbers, setUserPhoneNumbers] = useState([]);
  const [creating, setCreating] = useState(false);

  const handleCreateAgent = async () => {
    try {
      setCreating(true);

      // Create the agent
      const response = await api.post('/agents/create', {
        name: agentData.name,
        type: 'voice',
        voice: {
          voiceId: voice.voiceId,
          name: voice.name
        },
        prompt: agentData.prompt,
        firstMessage: agentData.firstMessage,
        language: agentData.language
      });

      const agentId = response.data.agent._id || response.data.agent.id;

      // Handle the selected action
      if (action === 'batch-call') {
        // Parse phone numbers
        const numbers = phoneNumbers
          .split(/[,\n]/)
          .map(n => n.trim())
          .filter(n => n);

        if (numbers.length === 0) {
          alert('Please enter at least one phone number');
          setCreating(false);
          return;
        }

        // TODO: Implement batch calling with ElevenLabs API
        alert(`✅ Agent created! Ready to call ${numbers.length} numbers.\n\nBatch calling feature coming soon!`);

      } else if (action === 'assign-number') {
        if (!selectedPhoneNumber) {
          alert('Please select a phone number');
          setCreating(false);
          return;
        }

        // Assign agent to phone number
        await api.post(`/phone-numbers/${selectedPhoneNumber}/assign-agent`, {
          agentId
        });

        alert(`✅ Agent created and assigned to ${selectedPhoneNumber}!\n\nIt will now answer incoming calls.`);
      } else {
        alert(`✅ Agent "${agentData.name}" created successfully!`);
      }

      if (onSuccess) onSuccess();
      onClose();

    } catch (error) {
      console.error('Error creating agent:', error);
      alert(`❌ Failed to create agent: ${error.response?.data?.message || error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Quick Agent Builder</h2>
              <p className="text-sm text-muted-foreground">Using voice: {voice.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary/80 rounded-lg transition-colors"
          >
            <X size={24} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {step === 1 && (
            <>
              {/* Agent Name */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={agentData.name}
                  onChange={(e) => setAgentData({ ...agentData, name: e.target.value })}
                  placeholder="e.g., Front Desk Agent, Sales Rep, Support Bot"
                  className="w-full px-4 py-3 bg-secondary border-2 border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-foreground"
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Agent Instructions / Prompt *
                </label>
                <textarea
                  value={agentData.prompt}
                  onChange={(e) => setAgentData({ ...agentData, prompt: e.target.value })}
                  rows={6}
                  placeholder="Tell the AI how to behave. Example:

You are a friendly front desk receptionist for ABC Company. Your job is to:
- Greet callers warmly
- Ask how you can help them
- Schedule appointments
- Transfer calls to the right department
- Answer basic questions about business hours"
                  className="w-full px-4 py-3 bg-secondary border-2 border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-foreground font-mono text-sm"
                />
              </div>

              {/* First Message */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  First Message (What the AI says when call starts)
                </label>
                <input
                  type="text"
                  value={agentData.firstMessage}
                  onChange={(e) => setAgentData({ ...agentData, firstMessage: e.target.value })}
                  placeholder="e.g., Hello! This is Sarah from ABC Company. How can I help you?"
                  className="w-full px-4 py-3 bg-secondary border-2 border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-foreground"
                />
              </div>

              {/* Next Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={!agentData.name || !agentData.prompt}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Choose Action →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-6">
                <button
                  onClick={() => setStep(1)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  ← Back to edit agent details
                </button>
              </div>

              {/* Action Selection */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">
                  What would you like to do with this agent?
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Batch Call */}
                  <button
                    onClick={() => setAction('batch-call')}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      action === 'batch-call'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-border hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <Phone className={`mb-3 ${action === 'batch-call' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} size={32} />
                    <h4 className="font-bold text-lg text-foreground mb-2">Make Calls Now</h4>
                    <p className="text-sm text-muted-foreground">
                      Call a list of phone numbers immediately with this agent
                    </p>
                  </button>

                  {/* Assign to Phone Number */}
                  <button
                    onClick={() => setAction('assign-number')}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      action === 'assign-number'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-border hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <Users className={`mb-3 ${action === 'assign-number' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} size={32} />
                    <h4 className="font-bold text-lg text-foreground mb-2">Answer Incoming Calls</h4>
                    <p className="text-sm text-muted-foreground">
                      Assign to a phone number to answer calls automatically
                    </p>
                  </button>
                </div>
              </div>

              {/* Batch Call Options */}
              {action === 'batch-call' && (
                <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
                  <h4 className="font-bold text-foreground mb-3">Enter Phone Numbers</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter phone numbers (one per line or comma-separated)
                  </p>
                  <textarea
                    value={phoneNumbers}
                    onChange={(e) => setPhoneNumbers(e.target.value)}
                    rows={6}
                    placeholder="+1234567890&#10;+1234567891&#10;+1234567892"
                    className="w-full px-4 py-3 bg-card border border-border border-2 border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-foreground font-mono text-sm"
                  />
                  <p className="text-xs text-foreground mt-2">
                    {phoneNumbers.split(/[,\n]/).filter(n => n.trim()).length} numbers entered
                  </p>
                </div>
              )}

              {/* Assign Number Options */}
              {action === 'assign-number' && (
                <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-700">
                  <h4 className="font-bold text-foreground mb-3">Select Phone Number</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose which phone number this agent should answer
                  </p>
                  <select
                    value={selectedPhoneNumber}
                    onChange={(e) => setSelectedPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-card border border-border border-2 border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-foreground"
                  >
                    <option value="">Select a phone number...</option>
                    <option value="+1234567890">+1 (234) 567-890 - Main Line</option>
                    <option value="+1987654321">+1 (987) 654-321 - Support Line</option>
                  </select>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                    💡 Tip: Go to Settings → Phone Numbers to add more numbers
                  </p>
                </div>
              )}

              {/* Create Button */}
              {action && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setAction(null)}
                    className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAgent}
                    disabled={creating || (action === 'batch-call' && !phoneNumbers.trim()) || (action === 'assign-number' && !selectedPhoneNumber)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : action === 'batch-call' ? '📞 Create & Start Calling' : '✅ Create & Assign Agent'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Help */}
        {step === 1 && (
          <div className="p-6 bg-secondary border-t border-border">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Be specific in your instructions. Tell the AI exactly what to do, how to respond, and what information to collect.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
