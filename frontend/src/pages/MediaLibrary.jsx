import { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video,
  Sparkles,
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  Star,
  Download,
  Share2,
  Trash2,
  FolderOpen,
  Tag,
  TrendingUp,
  Zap,
  Loader2,
  Wand2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ImageTransform from '../components/ImageTransform';

const MediaLibrary = () => {
  const { user } = useAuth();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid'); // grid | list
  const [filter, setFilter] = useState('all'); // all | image | video
  const [searchQuery, setSearchQuery] = useState('');
  const [credits, setCredits] = useState({ balance: 0, used: 0 });
  const [showGenerator, setShowGenerator] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showImageTransform, setShowImageTransform] = useState(false);
  const [selectedImageForTransform, setSelectedImageForTransform] = useState(null);

  // Generator form
  const [generatorForm, setGeneratorForm] = useState({
    type: 'image',
    prompt: '',
    model: 'flux_schnell',
    aspectRatio: '16:9',
    style: 'photorealistic'
  });

  useEffect(() => {
    fetchMediaLibrary();
    fetchCredits();
  }, []);

  const fetchMediaLibrary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/media-library');
      setMedia(response.data.media || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const response = await api.get('/media/credits');
      setCredits(response.data.credits);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const handleGenerate = async () => {
    if (!generatorForm.prompt.trim()) return;

    try {
      setGenerating(true);

      const endpoint = generatorForm.type === 'image'
        ? '/media/generate/image'
        : '/media/generate/video';

      const response = await api.post(endpoint, {
        prompt: generatorForm.prompt,
        model: generatorForm.model,
        aspectRatio: generatorForm.aspectRatio,
        style: generatorForm.style
      });

      if (response.data.success) {
        // Refresh library
        await fetchMediaLibrary();
        await fetchCredits();

        // Reset form
        setGeneratorForm({
          type: 'image',
          prompt: '',
          model: 'flux_schnell',
          aspectRatio: '16:9',
          style: 'photorealistic'
        });

        setShowGenerator(false);
      }
    } catch (error) {
      console.error('Error generating media:', error);
      alert(error.response?.data?.message || 'Failed to generate media');
    } finally {
      setGenerating(false);
    }
  };

  const filteredMedia = media.filter(item => {
    const matchesType = filter === 'all' || item.type === filter;
    const matchesSearch = !searchQuery ||
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prompt?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Media Library</h1>
              <p className="text-sm text-gray-600 mt-1">
                AI-generated images and videos for your business
              </p>
            </div>

            {/* Credits Display */}
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg px-4 py-2 text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold">{credits.balance} Credits</span>
                </div>
                <p className="text-xs opacity-90">{credits.used} used</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowImageTransform(true)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <Wand2 className="w-5 h-5" />
                  <span className="hidden sm:inline">Transform</span>
                </button>

                <button
                  onClick={() => setShowGenerator(true)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Generate</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              {/* Type Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Media</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
              </select>

              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 ${view === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 border-l border-gray-300 ${view === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Grid/List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No media yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start generating AI images and videos for your business
            </p>
            <button
              onClick={() => setShowGenerator(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Generate Your First Media
            </button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMedia.map((item) => (
              <MediaCard
                key={item._id}
                item={item}
                onRefresh={fetchMediaLibrary}
                onTransform={(imageUrl) => {
                  setSelectedImageForTransform(imageUrl);
                  setShowImageTransform(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMedia.map((item) => (
              <MediaListItem
                key={item._id}
                item={item}
                onRefresh={fetchMediaLibrary}
                onTransform={(imageUrl) => {
                  setSelectedImageForTransform(imageUrl);
                  setShowImageTransform(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Generator Modal */}
      {showGenerator && (
        <GeneratorModal
          form={generatorForm}
          setForm={setGeneratorForm}
          onGenerate={handleGenerate}
          onClose={() => setShowGenerator(false)}
          generating={generating}
          credits={credits.balance}
        />
      )}

      {/* Image Transform Modal */}
      {showImageTransform && (
        <ImageTransform
          initialImage={selectedImageForTransform}
          onClose={() => {
            setShowImageTransform(false);
            setSelectedImageForTransform(null);
          }}
          onSave={async (result) => {
            // Refresh library to show new transformed image
            await fetchMediaLibrary();
            await fetchCredits();
          }}
        />
      )}
    </div>
  );
};

// Media Card Component (Grid View)
const MediaCard = ({ item, onRefresh, onTransform }) => {
  const isVideo = item.type === 'video';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {isVideo ? (
          <video
            src={item.url}
            className="w-full h-full object-cover"
            controls
          />
        ) : (
          <img
            src={item.url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}

        <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5">
          {isVideo ? (
            <Video className="w-4 h-4 text-white" />
          ) : (
            <ImageIcon className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Transform Button Overlay (Images Only) */}
        {!isVideo && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={() => onTransform(item.url)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Wand2 className="w-4 h-4" />
              Transform
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.prompt}</p>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <TrendingUp className="w-3 h-3" />
            <span>{item.views || 0} views</span>
          </div>

          <div className="flex items-center gap-1">
            <button className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors">
              <Star className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Media List Item Component (List View)
const MediaListItem = ({ item, onRefresh, onTransform }) => {
  const isVideo = item.type === 'video';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow flex gap-4">
      <div className="w-32 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
        {isVideo ? (
          <video src={item.url} className="w-full h-full object-cover" />
        ) : (
          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{item.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-1 mt-1">{item.prompt}</p>
          </div>

          <div className="flex items-center gap-1 ml-4">
            {!isVideo && (
              <button
                onClick={() => onTransform(item.url)}
                className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
                title="Transform image"
              >
                <Wand2 className="w-4 h-4" />
              </button>
            )}
            <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            {isVideo ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
            {item.type}
          </span>
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          <span>{item.model}</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {item.generationDetails?.creditsUsed || 1} credits
          </span>
        </div>
      </div>
    </div>
  );
};

// Generator Modal Component
const GeneratorModal = ({ form, setForm, onGenerate, onClose, generating, credits }) => {
  const modelOptions = {
    image: [
      { value: 'flux_schnell', label: 'FLUX Schnell (Fast - 1 credit)', credits: 1 },
      { value: 'flux_dev', label: 'FLUX Dev (Better - 2 credits)', credits: 2 },
      { value: 'flux_pro', label: 'FLUX Pro (Best - 5 credits)', credits: 5 },
      { value: 'sdxl', label: 'SDXL (Standard - 1 credit)', credits: 1 }
    ],
    video: [
      { value: 'runway_gen3', label: 'Runway Gen-3 (10 credits)', credits: 10 },
      { value: 'stable_video', label: 'Stable Video (8 credits)', credits: 8 },
      { value: 'animatediff', label: 'AnimateDiff (5 credits)', credits: 5 }
    ]
  };

  const currentModelCredits = modelOptions[form.type].find(m => m.value === form.model)?.credits || 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Generate AI Media</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              ✕
            </button>
          </div>

          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setForm({ ...form, type: 'image', model: 'flux_schnell' })}
              className={`p-4 border-2 rounded-lg transition-all ${
                form.type === 'image'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ImageIcon className="w-8 h-8 mx-auto mb-2" />
              <div className="font-medium">Image</div>
              <div className="text-xs text-gray-600">From 1 credit</div>
            </button>

            <button
              onClick={() => setForm({ ...form, type: 'video', model: 'runway_gen3' })}
              className={`p-4 border-2 rounded-lg transition-all ${
                form.type === 'video'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Video className="w-8 h-8 mx-auto mb-2" />
              <div className="font-medium">Video</div>
              <div className="text-xs text-gray-600">From 5 credits</div>
            </button>
          </div>

          {/* Prompt */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe what you want to create
            </label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              placeholder={form.type === 'image'
                ? "Modern kitchen with black galaxy granite countertops, professional photography, bright lighting..."
                : "Camera panning across a renovated modern kitchen, smooth motion..."
              }
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Model Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality Level
            </label>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {modelOptions[form.type].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio (Images only) */}
          {form.type === 'image' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['1:1', '16:9', '9:16', '4:3'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setForm({ ...form, aspectRatio: ratio })}
                    className={`px-4 py-2 border-2 rounded-lg font-medium ${
                      form.aspectRatio === ratio
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cost Display */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Cost:</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {currentModelCredits} {currentModelCredits === 1 ? 'Credit' : 'Credits'}
                </div>
                <div className="text-xs text-gray-600">
                  Remaining: {credits}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onGenerate}
              disabled={generating || !form.prompt.trim() || credits < currentModelCredits}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate
                </>
              )}
            </button>
          </div>

          {credits < currentModelCredits && (
            <p className="text-sm text-red-600 mt-3 text-center">
              Insufficient credits. You need {currentModelCredits - credits} more credits.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;
