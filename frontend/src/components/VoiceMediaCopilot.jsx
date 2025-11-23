import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Sparkles,
  Image as ImageIcon,
  Video,
  Wand2,
  Loader2,
  Volume2,
  VolumeX,
  MessageCircle,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const VoiceMediaCopilot = ({ onClose, isFullscreen, onToggleFullscreen }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [currentlyGenerating, setCurrentlyGenerating] = useState(null);
  const [generatedMedia, setGeneratedMedia] = useState([]);
  const [credits, setCredits] = useState({ balance: 0, used: 0 });

  const wsRef = useRef(null);
  const elevenLabsAgentRef = useRef(null);
  const conversationEndRef = useRef(null);

  // Connect to WebSocket on mount
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  /**
   * Connect to Voice Copilot WebSocket
   */
  const connectWebSocket = () => {
    const wsUrl = process.env.NODE_ENV === 'production'
      ? 'wss://your-backend-url.com/ws/voice-copilot'
      : 'ws://localhost:5000/ws/voice-copilot';

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Voice Copilot WebSocket connected');

      // Authenticate
      ws.send(JSON.stringify({
        type: 'authenticate',
        token
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      addSystemMessage('Connection error. Please try again.');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setIsConnected(false);
      setIsInCall(false);
    };

    wsRef.current = ws;
  };

  /**
   * Handle WebSocket messages
   */
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'connected':
        console.log('WebSocket connected:', data.message);
        break;

      case 'authenticated':
        setIsConnected(true);
        console.log('Authenticated as:', data.userId);
        break;

      case 'conversation_joined':
        setConversationId(data.conversationId);
        console.log('Joined conversation:', data.conversationId);
        break;

      case 'copilot_ready':
        addSystemMessage(data.message);
        break;

      case 'user_spoke':
        addMessage('user', data.text);
        break;

      case 'agent_spoke':
        addMessage('agent', data.text);
        break;

      case 'media_generating':
        setCurrentlyGenerating({
          type: data.mediaType,
          prompt: data.prompt,
          model: data.model
        });
        addSystemMessage(`Generating ${data.mediaType}... "${data.prompt}"`);
        break;

      case 'media_generated':
        setCurrentlyGenerating(null);

        if (data.mediaType === 'image') {
          setGeneratedMedia(prev => [
            ...prev,
            {
              type: 'image',
              urls: data.images,
              prompt: data.prompt,
              creditsUsed: data.creditsUsed,
              timestamp: new Date()
            }
          ]);
          addSystemMessage(`✨ Image generated! (${data.creditsUsed} credits used)`);
        } else if (data.mediaType === 'video') {
          setGeneratedMedia(prev => [
            ...prev,
            {
              type: 'video',
              url: data.video,
              prompt: data.prompt,
              creditsUsed: data.creditsUsed,
              timestamp: new Date()
            }
          ]);
          addSystemMessage(`✨ Video generated! (${data.creditsUsed} credits used)`);
        }

        // Refresh credits
        fetchCredits();
        break;

      case 'image_transforming':
        setCurrentlyGenerating({
          type: 'transform',
          transformType: data.transformType,
          imageUrl: data.imageUrl
        });
        addSystemMessage(`Transforming image (${data.transformType})...`);
        break;

      case 'image_transformed':
        setCurrentlyGenerating(null);
        setGeneratedMedia(prev => [
          ...prev,
          {
            type: 'transformation',
            original: data.original,
            transformed: data.transformed,
            transformType: data.transformType,
            creditsUsed: data.creditsUsed,
            timestamp: new Date()
          }
        ]);
        addSystemMessage(`✨ Image transformed! (${data.creditsUsed} credits used)`);
        fetchCredits();
        break;

      case 'generation_error':
      case 'transformation_error':
        setCurrentlyGenerating(null);
        addSystemMessage(`❌ Error: ${data.error}`, 'error');
        break;

      case 'credits_update':
        setCredits(data.credits);
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  /**
   * Add message to conversation
   */
  const addMessage = (role, text) => {
    setConversation(prev => [
      ...prev,
      {
        role, // 'user' | 'agent' | 'system'
        text,
        timestamp: new Date()
      }
    ]);
  };

  /**
   * Add system message
   */
  const addSystemMessage = (text, variant = 'info') => {
    setConversation(prev => [
      ...prev,
      {
        role: 'system',
        text,
        variant, // 'info' | 'error' | 'success'
        timestamp: new Date()
      }
    ]);
  };

  /**
   * Fetch user credits
   */
  const fetchCredits = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'get_credits'
      }));
    }
  };

  /**
   * Start voice call with ElevenLabs agent
   */
  const startVoiceCall = async () => {
    try {
      const convId = `copilot_${user._id}_${Date.now()}`;
      setConversationId(convId);

      // Join conversation via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'join_conversation',
          conversationId: convId
        }));
      }

      // Initialize ElevenLabs Conversational AI
      // Note: Replace with your actual ElevenLabs agent ID
      const agentId = 'your_media_copilot_agent_id';

      // Start ElevenLabs conversation
      // This would use ElevenLabs Web SDK
      // For now, this is a placeholder
      addSystemMessage('🎙️ Voice call started! Start speaking to create media.');
      setIsInCall(true);
      fetchCredits();

      // TODO: Integrate actual ElevenLabs SDK here
      // Example:
      // const conversation = await ElevenLabs.Conversation.startSession({
      //   agentId,
      //   authorization: token,
      //   clientTools: {
      //     conversationId: convId
      //   }
      // });
      // elevenLabsAgentRef.current = conversation;

    } catch (error) {
      console.error('Error starting voice call:', error);
      addSystemMessage('Failed to start voice call. Please try again.', 'error');
    }
  };

  /**
   * End voice call
   */
  const endVoiceCall = () => {
    if (elevenLabsAgentRef.current) {
      // End ElevenLabs conversation
      // elevenLabsAgentRef.current.endSession();
      elevenLabsAgentRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_conversation'
      }));
    }

    setIsInCall(false);
    setConversationId(null);
    addSystemMessage('Voice call ended.');
  };

  /**
   * Toggle mute
   */
  const toggleMute = () => {
    // TODO: Mute/unmute ElevenLabs microphone
    setIsMuted(!isMuted);
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'relative'} bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isInCall ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Media Copilot</h2>
              <p className="text-sm text-white/80">
                {isInCall ? '🎙️ Listening...' : 'Voice-powered media creation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Credits Display */}
            <div className="bg-white/20 rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold">{credits.balance}</span>
              </div>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={onToggleFullscreen}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-[600px]'}`}>
        {/* Conversation Panel */}
        <div className="flex-1 flex flex-col">
          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'system' ? (
                  <div className={`max-w-md px-4 py-2 rounded-lg text-sm ${
                    msg.variant === 'error'
                      ? 'bg-red-100 text-red-700'
                      : msg.variant === 'success'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {msg.text}
                  </div>
                ) : (
                  <div className={`max-w-md px-4 py-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {msg.role === 'agent' && <Sparkles className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />}
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Currently Generating Indicator */}
            {currentlyGenerating && (
              <div className="flex justify-start">
                <div className="max-w-md px-4 py-3 rounded-lg bg-purple-100 border border-purple-200">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm text-purple-900">
                      Generating {currentlyGenerating.type}...
                    </span>
                  </div>
                  {currentlyGenerating.prompt && (
                    <p className="text-xs text-purple-700 mt-1">
                      "{currentlyGenerating.prompt}"
                    </p>
                  )}
                </div>
              </div>
            )}

            <div ref={conversationEndRef} />
          </div>

          {/* Voice Controls */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex items-center justify-center gap-4">
              {!isInCall ? (
                <button
                  onClick={startVoiceCall}
                  disabled={!isConnected}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <Phone className="w-6 h-6" />
                  <span className="font-semibold">Start Voice Call</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition-all ${
                      isMuted
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <button
                    onClick={endVoiceCall}
                    className="flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all shadow-lg"
                  >
                    <PhoneOff className="w-6 h-6" />
                    <span className="font-semibold">End Call</span>
                  </button>
                </>
              )}
            </div>

            {!isConnected && (
              <p className="text-center text-sm text-gray-600 mt-3">
                Connecting to copilot...
              </p>
            )}
          </div>
        </div>

        {/* Generated Media Panel */}
        <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Generated Media</h3>
            <p className="text-sm text-gray-600">Media created this session</p>
          </div>

          <div className="p-4 space-y-4">
            {generatedMedia.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  No media generated yet
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Start a voice call to create images and videos
                </p>
              </div>
            ) : (
              generatedMedia.map((media, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                  {media.type === 'image' && (
                    <div>
                      <img
                        src={media.urls[0]}
                        alt={media.prompt}
                        className="w-full aspect-video object-cover"
                      />
                      <div className="p-3">
                        <p className="text-sm text-gray-900 line-clamp-2">{media.prompt}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {media.creditsUsed} credits • {media.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {media.type === 'video' && (
                    <div>
                      <video
                        src={media.url}
                        controls
                        className="w-full aspect-video"
                      />
                      <div className="p-3">
                        <p className="text-sm text-gray-900 line-clamp-2">{media.prompt}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {media.creditsUsed} credits • {media.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {media.type === 'transformation' && (
                    <div>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <div className="bg-gray-200 text-xs text-center py-1">Before</div>
                          <img src={media.original} alt="Before" className="w-full aspect-square object-cover" />
                        </div>
                        <div>
                          <div className="bg-purple-200 text-xs text-center py-1">After</div>
                          <img src={media.transformed} alt="After" className="w-full aspect-square object-cover" />
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-gray-900">{media.transformType.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {media.creditsUsed} credits • {media.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceMediaCopilot;
