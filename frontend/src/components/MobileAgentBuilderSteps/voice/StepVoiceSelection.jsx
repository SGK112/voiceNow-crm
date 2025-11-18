import { useState, useEffect } from 'react';
import { Search, Play, Pause, Volume2, Check } from 'lucide-react';
import { agentApi } from '../../../services/api';

/**
 * Step 3 (Voice): Select Voice
 * Browse and preview ElevenLabs voices
 */

// Map accent to flag emoji
const ACCENT_FLAGS = {
  'american': '🇺🇸',
  'british': '🇬🇧',
  'australian': '🇦🇺',
  'indian': '🇮🇳',
  'irish': '🇮🇪',
  'scottish': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'canadian': '🇨🇦',
  'south african': '🇿🇦',
  'new zealand': '🇳🇿'
};

export default function StepVoiceSelection({ agentData, updateAgentData }) {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccent, setSelectedAccent] = useState('american'); // Default to American
  const [playingVoice, setPlayingVoice] = useState(null);
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    loadVoices();
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  const loadVoices = async () => {
    try {
      setLoading(true);
      const response = await agentApi.getVoiceLibrary();
      setVoices(response.data.voices || []);
    } catch (error) {
      console.error('Failed to load voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const playVoice = async (voice) => {
    // Stop current audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    if (playingVoice === voice.voice_id) {
      setPlayingVoice(null);
      setAudio(null);
      return;
    }

    // Play preview
    if (voice.preview_url) {
      try {
        const newAudio = new Audio(voice.preview_url);
        setPlayingVoice(voice.voice_id);
        setAudio(newAudio);

        // Handle errors
        newAudio.onerror = () => {
          console.error('Failed to load audio preview');
          setPlayingVoice(null);
          setAudio(null);
        };

        newAudio.onended = () => {
          setPlayingVoice(null);
          setAudio(null);
        };

        // Play (must be after event handlers)
        await newAudio.play();
      } catch (err) {
        console.error('Failed to play audio:', err);
        setPlayingVoice(null);
        setAudio(null);
      }
    }
  };

  const selectVoice = (voice) => {
    console.log('Selecting voice:', {
      voiceId: voice.voice_id,
      voiceName: voice.name
    });
    updateAgentData({
      voiceId: voice.voice_id,
      voiceName: voice.name
    });
  };

  const filteredVoices = voices.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voice.labels?.gender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voice.labels?.accent?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAccent = !selectedAccent ||
      voice.labels?.accent?.toLowerCase().includes(selectedAccent.toLowerCase());

    return matchesSearch && matchesAccent;
  });

  return (
    <div className="p-4 pb-20">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Choose a Voice
          </h2>
          <p className="text-muted-foreground">
            Select the AI voice for your agent
          </p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search voices..."
              className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Accent Filter */}
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedAccent(null)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                !selectedAccent
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {Object.entries(ACCENT_FLAGS).map(([accent, flag]) => (
              <button
                key={accent}
                onClick={() => setSelectedAccent(accent)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  selectedAccent === accent
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {flag} {accent.charAt(0).toUpperCase() + accent.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Voices List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading voices...</p>
          </div>
        ) : filteredVoices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No voices found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVoices.map((voice) => {
              const isSelected = agentData.voiceId === voice.voice_id;
              const isPlaying = playingVoice === voice.voice_id;

              // Debug logging
              if (isSelected) {
                console.log('Voice marked as selected:', {
                  voiceName: voice.name,
                  voiceId: voice.voice_id,
                  agentDataVoiceId: agentData.voiceId,
                  matches: agentData.voiceId === voice.voice_id
                });
              }

              return (
                <div
                  key={voice.voice_id}
                  className={`p-4 rounded-lg border-2 transition-all bg-card ${
                    isSelected
                      ? 'border-blue-500'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Voice Icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-blue-500' : 'bg-muted'
                      }`}>
                        <Volume2 className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                      </div>
                    </div>

                    {/* Voice Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                        {voice.labels?.accent && ACCENT_FLAGS[voice.labels.accent.toLowerCase()] && (
                          <span className="text-lg">{ACCENT_FLAGS[voice.labels.accent.toLowerCase()]}</span>
                        )}
                        {voice.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {voice.labels?.gender && (
                          <span className="px-2 py-0.5 bg-muted rounded">
                            {voice.labels.gender}
                          </span>
                        )}
                        {voice.labels?.accent && (
                          <span className="px-2 py-0.5 bg-muted rounded">
                            {voice.labels.accent}
                          </span>
                        )}
                        {voice.labels?.age && (
                          <span className="px-2 py-0.5 bg-muted rounded">
                            {voice.labels.age}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Play Button */}
                      <button
                        onClick={() => playVoice(voice)}
                        className="p-2 bg-muted hover:bg-muted/80 rounded-lg touch-manipulation"
                        title={isPlaying ? 'Stop' : 'Play preview'}
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5 text-foreground" />
                        ) : (
                          <Play className="h-5 w-5 text-foreground" />
                        )}
                      </button>

                      {/* Select Button */}
                      <button
                        onClick={() => selectVoice(voice)}
                        className={`px-4 py-2 rounded-lg font-medium touch-manipulation transition-all ${
                          isSelected
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isSelected ? (
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            <span className="hidden sm:inline">Selected</span>
                          </div>
                        ) : (
                          'Select'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Voice Summary */}
        {agentData.voiceId && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">
                Selected: {agentData.voiceName}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
