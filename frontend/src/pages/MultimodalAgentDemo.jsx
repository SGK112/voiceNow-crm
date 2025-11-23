import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import AISocialMediaPostWriter from '../components/AISocialMediaPostWriter';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function MultimodalAgentDemo() {
  const { token } = useAuth();
  const [agentData, setAgentData] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [error, setError] = useState(null);
  const [widgetCode, setWidgetCode] = useState('');
  const [showSocialWriter, setShowSocialWriter] = useState(false);

  const wsRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Load saved agent from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('multimodalAgentData');
    if (saved) {
      try {
        setAgentData(JSON.parse(saved));
        addSystemMessage('Previous agent session restored. Click "Start Conversation" to begin.');
      } catch (e) {
        localStorage.removeItem('multimodalAgentData');
      }
    }
  }, []);

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      type: 'system',
      text,
      timestamp: new Date()
    }]);
  };

  const addMessage = (text, type, label) => {
    setMessages(prev => [...prev, {
      type,
      text,
      label,
      timestamp: new Date()
    }]);
  };

  const createAgent = async () => {
    try {
      setIsCreating(true);
      setError(null);
      addSystemMessage('🤖 Creating your multimodal AI agent...');

      const response = await axios.post(
        `${API_BASE}/conversational-agents/demo`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setAgentData(response.data);
      localStorage.setItem('multimodalAgentData', JSON.stringify(response.data));

      addSystemMessage(`✅ Agent "${response.data.agent.name}" created successfully!`);
      addSystemMessage(`Voice: ${response.data.agent.voiceName} | Multimodal: ${response.data.agent.multimodal ? 'Yes ✓' : 'No'}`);
      addSystemMessage('Click "Start Conversation" below to begin talking!');

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      addSystemMessage(`❌ Error creating agent: ${errorMsg}`);
    } finally {
      setIsCreating(false);
    }
  };

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      addSystemMessage('📡 Connecting to agent...');

      // Connect to WebSocket
      const ws = new WebSocket(agentData.testing.signedUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        addSystemMessage('✅ Connected! Start speaking or type a message below.');
        addSystemMessage('💡 TIP: You can type while speaking - the agent understands both!');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'agent_response':
            case 'agent_transcript':
              addMessage(message.text || message.message, 'agent', '🤖 Agent');
              break;

            case 'user_transcript':
              addMessage(message.text || message.message, 'user', '👤 You (voice)');
              break;

            case 'interruption':
              addSystemMessage('⚡ You interrupted the agent');
              break;

            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;

            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addSystemMessage('❌ Connection error. Please try again.');
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        addSystemMessage('🔌 Connection closed');
      };

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      addSystemMessage(`❌ Error: ${errorMsg}`);
      setIsConnecting(false);
    }
  };

  const endSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const sendTextMessage = () => {
    if (!inputMessage.trim() || !isConnected || !wsRef.current) {
      return;
    }

    addMessage(inputMessage, 'user', '👤 You (text)');

    wsRef.current.send(JSON.stringify({
      type: 'user_message',
      message: inputMessage
    }));

    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  const copyWidgetCode = () => {
    if (!agentData) return;

    const code = agentData.widget.embedCode;
    navigator.clipboard.writeText(code);
    setWidgetCode(code);
    addSystemMessage('✅ Widget code copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
            🎙️ Multimodal AI Agent
          </h1>
          <p className="text-gray-600 text-center mb-4">
            Voice + Text Conversational AI - Production Ready
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-sm font-semibold">
              🗣️ Voice Input
            </span>
            <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-semibold">
              💬 Text Input
            </span>
            <span className="px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-full text-sm font-semibold">
              ⚡ Real-time
            </span>
            <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full text-sm font-semibold">
              🔄 Context Aware
            </span>
            <button
              onClick={() => setShowSocialWriter(true)}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full text-sm font-semibold hover:shadow-lg transition-shadow"
            >
              ✨ AI Social Post Writer
            </button>
          </div>

          {/* Status */}
          <div className="bg-secondary/50 rounded-lg p-4 border-l-4 border-indigo-500">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Agent Status:</span>
                <span className={`ml-2 font-semibold ${agentData ? 'text-green-600' : 'text-yellow-600'}`}>
                  {agentData ? '✓ Ready' : 'Not Created'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Session:</span>
                <span className={`ml-2 font-semibold ${isConnected ? 'text-green-600' : 'text-gray-600'}`}>
                  {isConnected ? '✓ Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={createAgent}
              disabled={isCreating || agentData !== null}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isCreating ? '⏳ Creating...' : agentData ? '✓ Created' : '🤖 Create Agent'}
            </button>

            <button
              onClick={startSession}
              disabled={!agentData || isConnecting || isConnected}
              className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isConnecting ? '⏳ Connecting...' : isConnected ? '✓ Connected' : '🚀 Start Chat'}
            </button>

            <button
              onClick={endSession}
              disabled={!isConnected}
              className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              🛑 End Session
            </button>

            <button
              onClick={copyWidgetCode}
              disabled={!agentData}
              className="bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              📦 Get Widget
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div
            ref={chatContainerRef}
            className="h-96 overflow-y-auto bg-secondary/50 rounded-lg p-4 mb-4 space-y-3"
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-muted-foreground">
                No messages yet. Create an agent to get started!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg max-w-xs ${msg.type === 'user'
                      ? 'bg-indigo-600 text-white ml-auto'
                      : msg.type === 'agent'
                        ? 'bg-white border border-gray-200 text-gray-800'
                        : 'bg-yellow-50 border border-yellow-200 text-yellow-800 text-center mx-auto max-w-full'
                    }`}
                >
                  {msg.label && (
                    <div className="text-xs opacity-75 mb-1 font-semibold">
                      {msg.label}
                    </div>
                  )}
                  <div className="text-sm">{msg.text}</div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isConnected}
              placeholder={isConnected ? "Type a message (works during voice conversation!)" : "Start a session to send messages"}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none disabled:bg-secondary disabled:cursor-not-allowed"
            />
            <button
              onClick={sendTextMessage}
              disabled={!isConnected || !inputMessage.trim()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Send 💬
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h3 className="text-xl font-bold text-indigo-600 mb-4">📖 Quick Start Guide</h3>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">1</span>
              <p><strong>Create Agent:</strong> Click "Create Agent" to initialize your AI (takes 5 seconds)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">2</span>
              <p><strong>Start Conversation:</strong> Click "Start Chat" and allow microphone access</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">3</span>
              <p><strong>Talk or Type:</strong> Speak naturally OR type messages - the agent understands both!</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">4</span>
              <p><strong>Multimodal Magic:</strong> You can type while speaking - perfect for email addresses, numbers, etc.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">5</span>
              <p><strong>Deploy:</strong> Click "Get Widget" to embed this on your website with one line of code!</p>
            </div>
          </div>
        </div>

        {/* Widget Code Modal */}
        {widgetCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setWidgetCode('')}>
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">📦 Widget Embed Code</h3>
              <p className="text-gray-600 mb-4">Add this code to your website's HTML to embed the conversational agent:</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                {widgetCode}
              </pre>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(widgetCode);
                    addSystemMessage('✅ Code copied!');
                  }}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Copy Code
                </button>
                <button
                  onClick={() => setWidgetCode('')}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Social Media Post Writer Modal */}
        {showSocialWriter && (
          <AISocialMediaPostWriter
            onClose={() => setShowSocialWriter(false)}
            projectDetails={{
              title: 'Multimodal AI Agent Demo',
              description: 'Voice and text conversational AI demonstration'
            }}
          />
        )}
      </div>
    </div>
  );
}
