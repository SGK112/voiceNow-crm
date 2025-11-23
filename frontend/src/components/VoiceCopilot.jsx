import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  Minimize2,
  Maximize2,
  X,
  Phone,
  PhoneOff,
  Send,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function VoiceCopilot({ onAction, context = {} }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState('voice'); // 'voice' or 'text'

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const wsRef = useRef(null);
  const conversationEndRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          handleVoiceCommand(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          // Auto-restart if still should be listening
          recognitionRef.current.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Connect to ElevenLabs Conversational AI
  const connectToConversationalAI = async () => {
    try {
      // Get signed URL from backend
      const res = await api.post('/conversational-agents/start-conversation', {
        agentId: 'copilot-agent',
        context
      });

      const { signedUrl, conversationId } = res.data.data;
      setConversationId(conversationId);

      // Connect WebSocket
      const ws = new WebSocket(signedUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to ElevenLabs Conversational AI');
        setIsConnected(true);
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'audio') {
          // Play audio response
          const audioData = message.audio;
          playAudio(audioData);
        } else if (message.type === 'transcript') {
          // Add assistant message to conversation
          setConversation(prev => [
            ...prev,
            { role: 'assistant', content: message.text }
          ]);

          // Parse for actions
          if (message.action) {
            executeAction(message.action);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('Disconnected from ElevenLabs');
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect to conversational AI:', error);
      alert('Failed to connect to voice copilot');
    }
  };

  const disconnectConversationalAI = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
    setConversationId(null);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleVoiceCommand = async (command) => {
    // Add user message to conversation
    setConversation(prev => [
      ...prev,
      { role: 'user', content: command }
    ]);

    // Send to copilot API if using WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text',
        text: command
      }));
    } else {
      // Fallback to REST API
      processCopilotCommand.mutate({ command, context });
    }

    setTranscript('');
  };

  const processCopilotCommand = useMutation({
    mutationFn: async ({ command, context }) => {
      const res = await api.post('/ai-copilot/voice-command', {
        command,
        context,
        conversationHistory: conversation,
        returnAudio: true // Request ElevenLabs TTS audio
      });
      return res.data;
    },
    onSuccess: (data) => {
      const response = data.data;

      // Add assistant response
      setConversation(prev => [
        ...prev,
        { role: 'assistant', content: response.message }
      ]);

      // Play ElevenLabs audio if available, otherwise use browser TTS
      if (response.audio) {
        playAudio(response.audio);
      } else {
        speakText(response.message);
      }

      // Execute action if provided
      if (response.action) {
        executeAction(response.action);
      }
    }
  });

  const executeAction = (action) => {
    // Execute actions based on copilot commands
    switch (action.type) {
      case 'create_workflow':
        onAction?.({
          type: 'create_workflow',
          data: action.data
        });
        break;
      case 'add_node':
        onAction?.({
          type: 'add_node',
          node: action.node
        });
        break;
      case 'create_agent':
        onAction?.({
          type: 'create_agent',
          config: action.config
        });
        break;
      case 'navigate':
        onAction?.({
          type: 'navigate',
          path: action.path
        });
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const playAudio = (base64Audio) => {
    setIsSpeaking(true);
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audio.onended = () => setIsSpeaking(false);
    audio.play();
  };

  const handleTextSubmit = (e) => {
    e?.preventDefault();
    if (!textInput.trim()) return;

    handleVoiceCommand(textInput);
    setTextInput('');
  };

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  return (
    <>
      {/* Floating Button */}
      {!isExpanded && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsExpanded(true)}
            className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
            title="Voice Copilot"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </Button>
        </div>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] z-50 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm dark:text-white">Voice Copilot</h3>
                <p className="text-xs text-muted-foreground">
                  {isConnected ? 'Connected' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsExpanded(false);
                  disconnectConversationalAI();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Conversation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 dark:bg-gray-950">
            {conversation.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-500 opacity-50" />
                <p className="mb-2">👋 Hi! I'm your VoiceFlow AI Wizard</p>
                <p className="text-xs">I can help you:</p>
                <ul className="text-xs mt-2 space-y-1">
                  <li>• Create AI agents & workflows</li>
                  <li>• Generate images & media</li>
                  <li>• Answer questions</li>
                  <li>• Configure automations</li>
                </ul>
              </div>
            )}
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-card dark:bg-gray-800 border border-border dark:border-gray-700 dark:text-white'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {processCopilotCommand.isPending && (
              <div className="flex justify-start">
                <div className="bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              </div>
            )}
            {transcript && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg p-3 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {transcript}...
                </div>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>

          {/* Controls */}
          <div className="p-4 border-t border-border dark:border-gray-700 space-y-3">
            {/* Status & Mode Toggle */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {isListening && (
                  <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                    <Mic className="w-3 h-3 mr-1 animate-pulse" />
                    Listening
                  </Badge>
                )}
                {isSpeaking && (
                  <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                    Speaking
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setInputMode('voice')}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    inputMode === 'voice'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Mic className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    inputMode === 'text'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Text Input Mode */}
            {inputMode === 'text' && (
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                  disabled={processCopilotCommand.isPending}
                />
                <Button
                  type="submit"
                  disabled={!textInput.trim() || processCopilotCommand.isPending}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            )}

            {/* Voice Controls */}
            {inputMode === 'voice' && (
              <div className="flex items-center gap-2">
                {!isConnected ? (
                  <Button
                    onClick={connectToConversationalAI}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Start Voice Chat
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={toggleListening}
                      variant={isListening ? 'destructive' : 'default'}
                      className="flex-1"
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4 mr-2" />
                          Stop Listening
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          Start Listening
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={disconnectConversationalAI}
                      variant="outline"
                    >
                      <PhoneOff className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {inputMode === 'text'
                ? 'Type commands like "Create a workflow" or "Generate an agent"'
                : 'Say commands like "Create a new workflow" or "Add an email node"'}
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
