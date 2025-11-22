import { useState, useEffect, useRef } from 'react';
import { Image, Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Voice-to-Image Call Component
 * Displays images generated in real-time during ElevenLabs voice calls
 */
const VoiceImageCall = ({ conversationId, agentName }) => {
  const { user } = useAuth();
  const [ws, setWs] = useState(null);
  const [images, setImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  // Connect to WebSocket server
  useEffect(() => {
    if (!conversationId || !user?.token) return;

    const connectWebSocket = () => {
      const wsUrl = `ws://localhost:5001/ws/voice-images`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('🔌 Connected to voice-image WebSocket');

        // Authenticate
        socket.send(JSON.stringify({
          type: 'authenticate',
          token: user.token
        }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'authenticated':
            console.log('✅ WebSocket authenticated');
            // Join conversation
            socket.send(JSON.stringify({
              type: 'join_conversation',
              conversationId
            }));
            break;

          case 'joined':
            console.log('✅ Joined conversation:', conversationId);
            setConnected(true);
            break;

          case 'image_generating':
            console.log('🎨 Generating image:', data.prompt);
            setGenerating(true);
            break;

          case 'image_generated':
            console.log('✅ Image generated:', data.image);
            setGenerating(false);
            setImages(prev => [...prev, data.image]);
            setCurrentImage(data.image);
            break;

          case 'image_error':
            console.error('❌ Image generation error:', data.error);
            setGenerating(false);
            break;

          default:
            console.log('WebSocket message:', data);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setConnected(false);

        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = socket;
      setWs(socket);
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [conversationId, user]);

  // Manual image generation (user can type prompts)
  const handleManualGeneration = (prompt) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'manual_generate',
        prompt,
        style: 'photorealistic',
        aspectRatio: '16:9'
      }));
    }
  };

  return (
    <div className="voice-image-call h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">{agentName}</h3>
            <p className="text-xs text-gray-400">
              {connected ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              ) : (
                'Connecting...'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Image className="w-4 h-4" />
          <span>{images.length} images</span>
        </div>
      </div>

      {/* Main Image Display */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-6">
        {generating ? (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Generating image...</p>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span>Powered by Replicate AI</span>
            </div>
          </div>
        ) : currentImage ? (
          <div className="relative max-w-4xl w-full">
            <img
              src={currentImage.url}
              alt={currentImage.prompt}
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
              <p className="text-sm text-gray-200">{currentImage.prompt}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(currentImage.generatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <Image className="w-20 h-20 mx-auto mb-4 opacity-20" />
            <p>Images will appear here during the conversation</p>
            <p className="text-sm mt-2">
              The agent can generate visualizations in real-time
            </p>
          </div>
        )}
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <h4 className="text-sm font-medium mb-3 text-gray-400">
            Generated Images ({images.length})
          </h4>
          <div className="flex gap-2 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(image)}
                className={`flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  currentImage === image
                    ? 'border-blue-500 scale-105'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceImageCall;
