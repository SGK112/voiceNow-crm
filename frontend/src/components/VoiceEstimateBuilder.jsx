import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, FileText, DollarSign, CheckCircle, XCircle, Loader } from 'lucide-react';

const VoiceEstimateBuilder = ({ onEstimateCreated }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversationStatus, setConversationStatus] = useState('idle'); // idle, connecting, active, processing, completed
  const [transcript, setTranscript] = useState([]);
  const [currentEstimate, setCurrentEstimate] = useState(null);
  const [estimateId, setEstimateId] = useState(null);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  const conversationRef = useRef(null);

  // Start a new voice estimate session
  const startEstimateSession = async () => {
    try {
      setConversationStatus('connecting');
      setError(null);

      // Create a new estimate session in the backend
      const response = await fetch('/api/voice-estimates/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: 'New Voice Estimate',
          projectType: 'General'
        })
      });

      const data = await response.json();

      if (data.success) {
        setEstimateId(data.estimateId);

        // Initialize ElevenLabs Conversational AI Widget
        initializeElevenLabsWidget(data.estimateId);
      } else {
        throw new Error(data.message || 'Failed to start estimate session');
      }
    } catch (err) {
      console.error('Error starting estimate session:', err);
      setError(err.message);
      setConversationStatus('idle');
    }
  };

  // Initialize ElevenLabs Conversational AI Widget
  const initializeElevenLabsWidget = (estId) => {
    try {
      // Load ElevenLabs Conversational AI
      const agentId = process.env.REACT_APP_ELEVENLABS_ESTIMATE_AGENT_ID || 'demo_estimate_agent';

      if (window.Elevenlabs) {
        const conversation = window.Elevenlabs.Conversation({
          agentId: agentId,
          onConnect: () => {
            console.log('Connected to ElevenLabs');
            setIsConnected(true);
            setConversationStatus('active');
          },
          onDisconnect: () => {
            console.log('Disconnected from ElevenLabs');
            setIsConnected(false);
            setConversationStatus('processing');
            processConversation();
          },
          onMessage: (message) => {
            console.log('Message:', message);
            setTranscript(prev => [...prev, {
              role: message.source === 'ai' ? 'agent' : 'user',
              text: message.message,
              timestamp: new Date()
            }]);
          },
          onError: (error) => {
            console.error('ElevenLabs error:', error);
            setError('Voice connection error. Please try again.');
            setConversationStatus('idle');
          }
        });

        conversationRef.current = conversation;
        setConversationId(conversation.getConversationId());
      } else {
        throw new Error('ElevenLabs SDK not loaded');
      }
    } catch (err) {
      console.error('Error initializing widget:', err);
      setError('Failed to initialize voice chat. Please refresh and try again.');
      setConversationStatus('idle');
    }
  };

  // Process the conversation and extract estimate data
  const processConversation = async () => {
    if (!estimateId || !conversationId) return;

    try {
      setConversationStatus('processing');

      // In a real implementation, you would:
      // 1. Get the full conversation transcript from ElevenLabs
      // 2. Use AI to extract structured data
      // 3. Send to backend to update the estimate

      // For now, we'll simulate this
      const fullTranscript = transcript.map(t => `${t.role}: ${t.text}`).join('\n');

      // Extract data using AI (this would be done server-side in production)
      const extractedData = extractEstimateDataFromTranscript(fullTranscript);

      // Update the estimate in the backend
      const response = await fetch(`/api/voice-estimates/${estimateId}/update-from-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          conversationId,
          transcript: fullTranscript,
          extractedData,
          aiConfidence: 85,
          conversationDuration: calculateDuration()
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentEstimate(data.estimate);
        setConversationStatus('completed');

        if (onEstimateCreated) {
          onEstimateCreated(data.estimate);
        }
      } else {
        throw new Error(data.message || 'Failed to process conversation');
      }
    } catch (err) {
      console.error('Error processing conversation:', err);
      setError(err.message);
      setConversationStatus('idle');
    }
  };

  // Simple extraction function (in production, this would use AI on the backend)
  const extractEstimateDataFromTranscript = (transcript) => {
    // This is a placeholder - in production, you'd use GPT-4 or similar to extract structured data
    return {
      client: {
        name: 'Extracted Client Name',
        email: 'client@example.com',
        phone: '(555) 123-4567'
      },
      projectScope: 'Extracted project scope from conversation',
      projectTimeline: '2-4 weeks',
      items: [
        {
          description: 'Service Item 1',
          quantity: 1,
          rate: 1000,
          category: 'Service'
        }
      ],
      taxRate: 8.5,
      discount: 0,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  };

  const calculateDuration = () => {
    if (transcript.length === 0) return 0;
    const start = transcript[0].timestamp;
    const end = transcript[transcript.length - 1].timestamp;
    return Math.floor((end - start) / 1000);
  };

  // Start/stop recording
  const toggleRecording = () => {
    if (!isConnected) {
      startEstimateSession();
    } else {
      if (conversationRef.current) {
        conversationRef.current.endSession();
      }
    }
  };

  // Load ElevenLabs SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Mic className="w-6 h-6" />
                Voice Estimate Builder
              </h2>
              <p className="text-blue-100 mt-1">
                Create professional estimates through natural conversation
              </p>
            </div>
            {estimateId && (
              <div className="text-right">
                <div className="text-xs text-blue-100">Estimate #</div>
                <div className="font-mono text-sm">{estimateId.slice(-8)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-900">Error</div>
                <div className="text-red-700 text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* Status Display */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                conversationStatus === 'active' ? 'bg-green-100 text-green-800' :
                conversationStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                conversationStatus === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {conversationStatus.charAt(0).toUpperCase() + conversationStatus.slice(1)}
              </span>
            </div>

            {/* Conversation Controls */}
            <div className="flex justify-center gap-4 my-8">
              {conversationStatus === 'idle' && (
                <button
                  onClick={toggleRecording}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Mic className="w-6 h-6" />
                  Start Voice Estimate
                </button>
              )}

              {conversationStatus === 'active' && (
                <button
                  onClick={toggleRecording}
                  className="flex items-center gap-2 px-8 py-4 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <PhoneOff className="w-6 h-6" />
                  End Conversation
                </button>
              )}

              {conversationStatus === 'processing' && (
                <div className="flex items-center gap-3 px-8 py-4 bg-yellow-50 border border-yellow-200 rounded-full">
                  <Loader className="w-6 h-6 text-yellow-600 animate-spin" />
                  <span className="font-semibold text-yellow-900">Processing your estimate...</span>
                </div>
              )}

              {conversationStatus === 'completed' && (
                <div className="flex items-center gap-3 px-8 py-4 bg-green-50 border border-green-200 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="font-semibold text-green-900">Estimate created successfully!</span>
                </div>
              )}
            </div>
          </div>

          {/* Transcript */}
          {transcript.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Conversation Transcript
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto space-y-3">
                {transcript.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <div className="text-xs opacity-75 mb-1">
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </div>
                      <div className="text-sm">{message.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estimate Preview */}
          {currentEstimate && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Estimate Preview
              </h3>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
                {/* Client Info */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Client Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{currentEstimate.client?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2 font-medium">{currentEstimate.client?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                {currentEstimate.items && currentEstimate.items.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Items</h4>
                    <div className="space-y-2">
                      {currentEstimate.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-white rounded p-3 text-sm">
                          <div className="flex-1">
                            <div className="font-medium">{item.description}</div>
                            <div className="text-gray-600 text-xs">
                              Qty: {item.quantity} × ${item.rate.toFixed(2)}
                            </div>
                          </div>
                          <div className="font-semibold text-gray-900">
                            ${item.amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">${currentEstimate.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    {currentEstimate.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax ({currentEstimate.taxRate}%):</span>
                        <span className="font-medium">${currentEstimate.taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {currentEstimate.discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount:</span>
                        <span className="font-medium">-${currentEstimate.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-blue-600">${currentEstimate.total?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Review & Edit
                  </button>
                  <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                    Send to Client
                  </button>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                    Sync to QuickBooks
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {conversationStatus === 'idle' && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click "Start Voice Estimate" to begin</li>
                <li>Have a natural conversation about your project</li>
                <li>The AI will collect client details, project scope, and pricing</li>
                <li>Review the generated estimate and make any edits</li>
                <li>Send to your client or sync with QuickBooks</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceEstimateBuilder;
