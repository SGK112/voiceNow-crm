import { useState, useEffect } from 'react';
import { Search, Filter, Play, Plus, Check, Globe, User, Music, Pause, Star, Users, Sparkles, Trash2, X } from 'lucide-react';
import api from '../services/api';

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

export default function VoiceLibraryBrowser({ onVoiceSelect, embedded = false }) {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    gender: 'all',
    language: 'all',
    accent: 'all',
    useCase: 'all',
    freeOnly: false
  });
  const [addingVoice, setAddingVoice] = useState(null);
  const [playingPreview, setPlayingPreview] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  useEffect(() => {
    fetchVoiceLibrary(1, true); // Load first page
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

  const fetchVoiceLibrary = async (page = 1, replace = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await api.get(`/agents/helpers/voice-library?page=${page}&limit=100`);
      const newVoices = response.data.voices || [];

      if (replace) {
        setVoices(newVoices);
      } else {
        setVoices(prev => [...prev, ...newVoices]);
      }

      setHasMore(response.data.hasMore || false);
      setCurrentPage(page);

    } catch (error) {
      console.error('Failed to fetch voice library:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchVoiceLibrary(currentPage + 1, false);
    }
  };

  const addVoice = async (voice) => {
    try {
      setAddingVoice(voice.id);

      // Save voice to user's personal library
      const response = await api.post('/agents/voices/saved', {
        voiceId: voice.id,
        publicOwnerId: voice.publicOwnerId,
        name: voice.name,
        gender: voice.gender,
        age: voice.age,
        accent: voice.accent,
        useCase: voice.useCase,
        category: voice.category,
        language: voice.language,
        locale: voice.locale,
        description: voice.description,
        previewUrl: voice.previewUrl,
        freeUsersAllowed: voice.freeUsersAllowed,
        clonedByCount: voice.clonedByCount
      });

      // Mark as added locally (no need to refetch entire library!)
      setVoices(voices.map(v =>
        v.id === voice.id ? { ...v, isAddedByUser: true } : v
      ));

      // If in embedded mode and there's a callback, use the voice immediately
      if (onVoiceSelect) {
        alert(`✅ ${voice.name} saved! Click "Use This Voice" to continue.`);
      } else {
        alert(`✅ ${voice.name} saved to your library!`);
      }

    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save voice';
      alert(`❌ ${message}`);
    } finally {
      setAddingVoice(null);
    }
  };

  const removeVoice = async (voice) => {
    if (!confirm(`Remove "${voice.name}" from your library?`)) {
      return;
    }

    try {
      setAddingVoice(voice.id); // Reuse loading state

      await api.delete(`/agents/voices/saved/${voice.id}`);

      // Mark as removed locally
      setVoices(voices.map(v =>
        v.id === voice.id ? { ...v, isAddedByUser: false } : v
      ));

      alert(`✅ "${voice.name}" removed from your library`);

    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove voice';
      alert(`❌ ${message}`);
    } finally {
      setAddingVoice(null);
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
    setPlayingPreview(voice.id);
  };

  const stopPreview = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    setPlayingPreview(null);
  };

  // Filter voices
  const filteredVoices = voices.filter(voice => {
    // Search filter
    if (searchTerm && !voice.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !voice.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Gender filter
    if (filters.gender !== 'all' && voice.gender !== filters.gender) {
      return false;
    }

    // Language filter
    if (filters.language !== 'all' && voice.language !== filters.language) {
      return false;
    }

    // Accent filter
    if (filters.accent !== 'all' && voice.accent !== filters.accent) {
      return false;
    }

    // Use case filter
    if (filters.useCase !== 'all' && voice.useCase !== filters.useCase) {
      return false;
    }

    // Free only filter
    if (filters.freeOnly && !voice.freeUsersAllowed) {
      return false;
    }

    return true;
  });

  // Get unique languages, accents, and use cases for filters
  const uniqueLanguages = [...new Set(voices.map(v => v.language))].sort();
  const uniqueAccents = [...new Set(voices.map(v => v.accent).filter(a => a && a !== 'unknown'))].sort();
  const uniqueUseCases = [...new Set(voices.map(v => v.useCase))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white font-medium text-lg">Loading voices...</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-library-browser min-h-screen bg-white dark:bg-gray-900 ${embedded ? '' : 'p-6'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header - Simple & Clear */}
        {!embedded && (
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Music className="text-white" size={32} />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Browse Voice Library
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-base">
                    Listen to voice samples, then click "Add" to use them in your AI agents. Browse thousands of voices - use "Load More" button to see more.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters - Simple & Clear */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Find Your Perfect Voice</h2>

          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Search by name or description
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-gray-900 dark:text-white text-base"
                />
              </div>
            </div>

            {/* Filters in a grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gender Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 text-gray-900 dark:text-white font-medium cursor-pointer text-base"
                >
                  <option value="all">All Genders</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              {/* Language Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 text-gray-900 dark:text-white font-medium cursor-pointer text-base"
                >
                  <option value="all">All Languages</option>
                  {uniqueLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Accent/Country Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Accent / Country
                </label>
                <select
                  value={filters.accent}
                  onChange={(e) => setFilters({ ...filters, accent: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 text-gray-900 dark:text-white font-medium cursor-pointer text-base"
                >
                  <option value="all">All Accents</option>
                  {uniqueAccents.map(accent => {
                    const countryCode = getCountryCode(accent);
                    return (
                      <option key={accent} value={accent}>
                        {accent.charAt(0).toUpperCase() + accent.slice(1)}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Use Case Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Use Case
                </label>
                <select
                  value={filters.useCase}
                  onChange={(e) => setFilters({ ...filters, useCase: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 text-gray-900 dark:text-white font-medium cursor-pointer text-base"
                >
                  <option value="all">All Use Cases</option>
                  {uniqueUseCases.map(uc => (
                    <option key={uc} value={uc}>
                      {uc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Free Only Toggle */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.freeOnly}
                  onChange={(e) => setFilters({ ...filters, freeOnly: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 cursor-pointer"
                />
                <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                  Show only free voices (no cost to add)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-600 px-4 py-3 rounded">
            <p className="text-blue-900 dark:text-blue-300 font-medium">
              Showing <span className="font-bold">{filteredVoices.length}</span> of <span className="font-bold">{voices.length}</span> voices
            </p>
          </div>
        </div>

        {/* Voice Grid - Simple & Clear Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVoices.map(voice => (
            <div
              key={voice.id}
              className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xl transition-all overflow-hidden"
            >
              {/* Simple Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 p-4">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Music size={18} />
                    <span className="text-sm font-bold uppercase">{voice.language}</span>
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
                {/* Voice Name */}
                <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3">
                  {voice.name}
                </h3>

                {/* Info Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                    voice.gender === 'female'
                      ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
                      : voice.gender === 'male'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {voice.gender?.toUpperCase()}
                  </span>
                  {voice.age && voice.age !== 'unknown' && (
                    <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {voice.age}
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
                  {voice.description || 'Professional quality voice for your AI agents'}
                </p>

                {/* Use Case */}
                {voice.useCase && (
                  <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
                    <p className="text-sm text-blue-900 dark:text-blue-300">
                      <span className="font-bold">Best for:</span> {voice.useCase.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}

                {/* Stats */}
                {voice.clonedByCount > 0 && (
                  <div className="flex items-center gap-2 mb-4 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg px-3 py-2">
                    <Users size={16} />
                    <span className="text-sm font-medium">
                      Used by {voice.clonedByCount.toLocaleString()} people
                    </span>
                  </div>
                )}

                {/* Action Buttons - Large and Clear */}
                <div className="space-y-3">
                  {/* Preview Button */}
                  {voice.previewUrl && (
                    <button
                      onClick={() => playingPreview === voice.id ? stopPreview() : playPreview(voice)}
                      className={`w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl font-bold text-base transition-all ${
                        playingPreview === voice.id
                          ? 'bg-green-500 dark:bg-green-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {playingPreview === voice.id ? (
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

                  {/* Add/Select/Remove Button */}
                  {voice.isAddedByUser ? (
                    onVoiceSelect ? (
                      // In embedded mode (voice selection for agent builder)
                      <>
                        <button
                          onClick={() => onVoiceSelect(voice)}
                          className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-bold text-base shadow-lg"
                        >
                          <User size={20} />
                          <span>Use This Voice</span>
                        </button>
                        <button
                          onClick={() => removeVoice(voice)}
                          disabled={addingVoice === voice.id}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                          <span>Remove from Library</span>
                        </button>
                      </>
                    ) : (
                      // In browse mode (voice library page)
                      <div className="space-y-3">
                        <div className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl border-2 border-green-300 dark:border-green-700 font-bold text-base">
                          <Check size={20} />
                          <span>In Your Library</span>
                        </div>
                        <button
                          onClick={() => removeVoice(voice)}
                          disabled={addingVoice === voice.id}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                          <span>{addingVoice === voice.id ? 'Removing...' : 'Remove from Library'}</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => addVoice(voice)}
                      disabled={addingVoice === voice.id}
                      className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      <Plus size={20} />
                      <span>{addingVoice === voice.id ? 'Adding to Your Library...' : 'Add to My Library'}</span>
                    </button>
                  )}
                </div>

                {/* Helper Text */}
                {!voice.isAddedByUser && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                    Click "Add to My Library" to use this voice in your agents
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && filteredVoices.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Loading More Voices...
                </>
              ) : (
                <>Load More Voices (Page {currentPage + 1})</>
              )}
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              Loaded {voices.length} voices so far
            </p>
          </div>
        )}

        {/* No Results - Clear Message */}
        {filteredVoices.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="text-gray-400 dark:text-gray-500" size={36} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No voices match your search</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
              Try adjusting your filters or search term
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilters({ gender: 'all', language: 'all', accent: 'all', useCase: 'all', freeOnly: false });
              }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-bold text-base shadow-lg"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
