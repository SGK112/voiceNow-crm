import { useState, useEffect } from 'react';
import { Music, Play, Pause, Trash2, Edit, Tag, Plus, Search, Grid, List, Zap } from 'lucide-react';
import api from '../services/api';
import QuickAgentBuilder from '../components/QuickAgentBuilder';

// Helper function to map accent/country names to ISO country codes for flag-icons
const getCountryCode = (accent) => {
  if (!accent || accent === 'unknown') return null;

  const accentMap = {
    'american': 'us',
    'british': 'gb',
    'australian': 'au',
    'canadian': 'ca',
    'irish': 'ie',
    'scottish': 'gb-sct',
    'indian': 'in',
    'south african': 'za',
    'new zealand': 'nz',
    'nigerian': 'ng',
    'filipino': 'ph',
    'singaporean': 'sg',
    'jamaican': 'jm',
    'spanish': 'es',
    'mexican': 'mx',
    'argentinian': 'ar',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'brazilian': 'br',
    'russian': 'ru',
    'chinese': 'cn',
    'japanese': 'jp',
    'korean': 'kr',
    'arabic': 'sa',
    'dutch': 'nl',
    'swedish': 'se',
    'norwegian': 'no',
    'danish': 'dk',
    'finnish': 'fi',
    'polish': 'pl',
    'turkish': 'tr',
    'greek': 'gr',
    'czech': 'cz',
    'hungarian': 'hu',
    'romanian': 'ro',
    'ukrainian': 'ua',
    'thai': 'th',
    'vietnamese': 'vn',
    'indonesian': 'id',
    'malaysian': 'my',
    'pakistani': 'pk',
    'bangladeshi': 'bd',
  };

  const normalized = accent.toLowerCase().trim();
  return accentMap[normalized] || null;
};

export default function MyVoices() {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [playingPreview, setPlayingPreview] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [editingVoice, setEditingVoice] = useState(null);
  const [selectedVoiceForAgent, setSelectedVoiceForAgent] = useState(null);

  useEffect(() => {
    fetchSavedVoices();
  }, []);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const fetchSavedVoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/agents/voices/saved');
      setVoices(response.data.voices || []);
    } catch (error) {
      console.error('Failed to fetch saved voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteVoice = async (voiceId, voiceName) => {
    if (!confirm(`Are you sure you want to remove "${voiceName}" from your library?`)) {
      return;
    }

    try {
      await api.delete(`/agents/voices/saved/${voiceId}`);
      setVoices(voices.filter(v => v.voiceId !== voiceId));
      alert(`✅ "${voiceName}" removed from your library`);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove voice';
      alert(`❌ ${message}`);
    }
  };

  const updateVoice = async (voiceId, updates) => {
    try {
      const response = await api.patch(`/agents/voices/saved/${voiceId}`, updates);
      setVoices(voices.map(v => v.voiceId === voiceId ? response.data.voice : v));
      setEditingVoice(null);
      alert('✅ Voice updated successfully');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update voice';
      alert(`❌ ${message}`);
    }
  };

  const playPreview = (voice) => {
    if (!voice.previewUrl) return;

    // Stop current audio if playing
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }

    // Create new audio element
    const audio = new Audio(voice.previewUrl);
    audio.play();

    audio.onended = () => {
      setPlayingPreview(null);
    };

    setAudioElement(audio);
    setPlayingPreview(voice.voiceId);
  };

  const stopPreview = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    setPlayingPreview(null);
  };

  const filteredVoices = voices.filter(voice => {
    if (!searchTerm) return true;
    return voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           voice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           voice.accent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           voice.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white font-medium text-lg">Loading your voice library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-voices-page min-h-screen bg-white dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Music className="text-white" size={32} />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  My Voice Library
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-base mb-4">
                  Manage your saved voices and use them for calls and agents
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-4 py-2 rounded-lg">
                    <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{voices.length}</span>
                    <span className="text-sm text-blue-600 dark:text-blue-500 ml-2">Saved Voices</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and View Mode */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, description, accent, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-gray-900 dark:text-white text-base"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {filteredVoices.length > 0 && (
          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-600 px-4 py-3 rounded">
              <p className="text-blue-900 dark:text-blue-300 font-medium">
                Showing <span className="font-bold">{filteredVoices.length}</span> of <span className="font-bold">{voices.length}</span> voices
              </p>
            </div>
          </div>
        )}

        {/* Voice Grid/List */}
        {filteredVoices.length === 0 && voices.length > 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="text-gray-400 dark:text-gray-500" size={36} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No voices match your search</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
              Try a different search term
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-bold text-base shadow-lg"
            >
              Clear Search
            </button>
          </div>
        )}

        {filteredVoices.length === 0 && voices.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Music className="text-gray-400 dark:text-gray-500" size={36} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Your voice library is empty</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
              Browse the voice library to add voices
            </p>
            <a
              href="/app/voice-library"
              className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-bold text-base shadow-lg"
            >
              Browse Voice Library
            </a>
          </div>
        )}

        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredVoices.map(voice => (
            <div
              key={voice.voiceId}
              className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xl transition-all overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 p-4">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Music size={18} />
                    <span className="text-sm font-bold uppercase">{voice.language || 'EN'}</span>
                    {voice.accent && voice.accent !== 'unknown' && getCountryCode(voice.accent) && (
                      <span
                        className={`fi fi-${getCountryCode(voice.accent)} text-xl`}
                        title={voice.accent.charAt(0).toUpperCase() + voice.accent.slice(1)}
                      />
                    )}
                  </div>
                  {voice.freeUsersAllowed && (
                    <span className="bg-white/30 px-3 py-1 rounded-full text-xs font-bold">
                      FREE
                    </span>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5">
                <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3">
                  {voice.name}
                </h3>

                {/* Info Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {voice.gender && voice.gender !== 'unknown' && (
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                      voice.gender === 'female'
                        ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
                        : voice.gender === 'male'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {voice.gender.toUpperCase()}
                    </span>
                  )}
                  {voice.accent && voice.accent !== 'unknown' && (
                    <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1.5">
                      {getCountryCode(voice.accent) && (
                        <span className={`fi fi-${getCountryCode(voice.accent)}`} />
                      )}
                      {voice.accent.charAt(0).toUpperCase() + voice.accent.slice(1)}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 min-h-[3rem]">
                  {voice.description || 'Professional quality voice'}
                </p>

                {/* Custom Tags */}
                {voice.tags && voice.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {voice.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold flex items-center gap-1">
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {voice.notes && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-900 dark:text-yellow-300 italic">"{voice.notes}"</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Preview Button */}
                  {voice.previewUrl && (
                    <button
                      onClick={() => playingPreview === voice.voiceId ? stopPreview() : playPreview(voice)}
                      className={`w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl font-bold text-base transition-all ${
                        playingPreview === voice.voiceId
                          ? 'bg-green-500 dark:bg-green-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {playingPreview === voice.voiceId ? (
                        <>
                          <Pause size={20} />
                          <span>Stop Preview</span>
                        </>
                      ) : (
                        <>
                          <Play size={20} />
                          <span>Listen to Sample</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Create Agent Button - Prominent */}
                  <button
                    onClick={() => setSelectedVoiceForAgent(voice)}
                    className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-bold text-base shadow-lg"
                  >
                    <Zap size={20} />
                    <span>Create Agent with This Voice</span>
                  </button>

                  {/* Action Buttons Row */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingVoice(voice)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-all font-bold text-sm"
                    >
                      <Edit size={16} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deleteVoice(voice.voiceId, voice.name)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-all font-bold text-sm"
                    >
                      <Trash2 size={16} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingVoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Voice</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{editingVoice.name}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  defaultValue={editingVoice.tags?.join(', ') || ''}
                  id="edit-tags"
                  placeholder="e.g., professional, energetic, friendly"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 text-gray-900 dark:text-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  defaultValue={editingVoice.notes || ''}
                  id="edit-notes"
                  rows={4}
                  placeholder="Add personal notes about this voice..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setEditingVoice(null)}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const tags = document.getElementById('edit-tags').value
                    .split(',')
                    .map(t => t.trim())
                    .filter(t => t);
                  const notes = document.getElementById('edit-notes').value;
                  updateVoice(editingVoice.voiceId, { tags, notes });
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all font-bold shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Agent Builder Modal */}
      {selectedVoiceForAgent && (
        <QuickAgentBuilder
          voice={selectedVoiceForAgent}
          onClose={() => setSelectedVoiceForAgent(null)}
          onSuccess={() => {
            setSelectedVoiceForAgent(null);
            alert('✅ Agent created successfully! Go to Voice Agents page to view it.');
          }}
        />
      )}
    </div>
  );
}
