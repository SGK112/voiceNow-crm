import { useState, useEffect } from 'react';
import { Search, Play, Check, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/services/api';

/**
 * VoiceLibrary - Browse and select ElevenLabs voices
 *
 * Used in agent creation/editing to let users choose from
 * the entire ElevenLabs voice library without leaving the platform
 */
const VoiceLibrary = ({ open, onOpenChange, onSelectVoice, selectedVoiceId }) => {
  const [voices, setVoices] = useState([]);
  const [filteredVoices, setFilteredVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [accentFilter, setAccentFilter] = useState('all');
  const [playingVoice, setPlayingVoice] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

  // Load voices from backend
  useEffect(() => {
    if (open) {
      loadVoices();
    }
  }, [open]);

  const loadVoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/agents/helpers/voices');

      if (response.data.success) {
        const voiceList = response.data.voices || [];
        if (voiceList.length === 0) {
          setError('No voices available. Please check your ElevenLabs configuration.');
        } else {
          setVoices(voiceList);
          setFilteredVoices(voiceList);
        }
      } else {
        setError('Failed to load voices. Please try again.');
      }
    } catch (err) {
      console.error('Error loading voices:', err);
      let errorMessage = 'Failed to load voices. ';

      if (err.response?.status === 401) {
        errorMessage += 'Please log in again.';
      } else if (err.response?.status === 503) {
        errorMessage += 'ElevenLabs service is temporarily unavailable.';
      } else if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else {
        errorMessage += 'Please try again or contact support.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter voices based on search and filters
  useEffect(() => {
    let filtered = voices;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(voice =>
        voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (voice.description && voice.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(voice => {
        const labels = voice.labels || {};
        return labels.gender?.toLowerCase() === genderFilter.toLowerCase();
      });
    }

    // Accent filter
    if (accentFilter !== 'all') {
      filtered = filtered.filter(voice => {
        const labels = voice.labels || {};
        return labels.accent?.toLowerCase().includes(accentFilter.toLowerCase());
      });
    }

    setFilteredVoices(filtered);
  }, [searchQuery, genderFilter, accentFilter, voices]);

  const playVoicePreview = async (voice) => {
    try {
      // Stop current playback
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      setPlayingVoice(voice.voice_id);

      // If voice has preview_url, play it
      if (voice.preview_url) {
        const audio = new Audio(voice.preview_url);
        audio.onended = () => setPlayingVoice(null);
        audio.onerror = () => setPlayingVoice(null);
        audio.play();
        setAudioElement(audio);
      } else {
        // Fallback: generate preview via backend if available
        setPlayingVoice(null);
      }
    } catch (error) {
      console.error('Error playing preview:', error);
      setPlayingVoice(null);
    }
  };

  const stopPreview = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setPlayingVoice(null);
  };

  const handleSelectVoice = (voice) => {
    stopPreview();
    onSelectVoice(voice);
    onOpenChange(false);
  };

  const getVoiceLabels = (voice) => {
    const labels = voice.labels || {};
    return {
      gender: labels.gender || 'Unknown',
      accent: labels.accent || labels.language || 'Unknown',
      age: labels.age || '',
      description: labels.description || labels.use_case || ''
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Agent's Voice</DialogTitle>
          <DialogDescription>
            Browse professional AI voices. Click preview to hear samples, then select your favorite.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search voices by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Gender</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
            </SelectContent>
          </Select>

          <Select value={accentFilter} onValueChange={setAccentFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Accent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accents</SelectItem>
              <SelectItem value="american">American</SelectItem>
              <SelectItem value="british">British</SelectItem>
              <SelectItem value="australian">Australian</SelectItem>
              <SelectItem value="indian">Indian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Voice Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Loading voices...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button
                onClick={loadVoices}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          ) : filteredVoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No voices found matching your criteria</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setGenderFilter('all');
                  setAccentFilter('all');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVoices.map((voice) => {
                const labels = getVoiceLabels(voice);
                const isSelected = voice.voice_id === selectedVoiceId;
                const isPlaying = playingVoice === voice.voice_id;

                return (
                  <div
                    key={voice.voice_id}
                    className={`border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => handleSelectVoice(voice)}
                  >
                    {/* Voice Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {voice.name}
                          {isSelected && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {labels.gender} • {labels.accent}
                        </p>
                      </div>

                      {/* Preview Button */}
                      {voice.preview_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPlaying) {
                              stopPreview();
                            } else {
                              playVoicePreview(voice);
                            }
                          }}
                          className="shrink-0"
                        >
                          {isPlaying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Voice Description */}
                    {labels.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {labels.description}
                      </p>
                    )}

                    {/* Voice Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {labels.age && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                          {labels.age}
                        </span>
                      )}
                      {voice.category && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-700 dark:text-purple-300">
                          {voice.category}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-500">
            Showing {filteredVoices.length} of {voices.length} voices
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {selectedVoiceId && (
              <Button onClick={() => onOpenChange(false)}>
                Use Selected Voice
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceLibrary;
