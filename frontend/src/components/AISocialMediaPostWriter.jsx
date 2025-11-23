import { useState } from 'react';
import {
  Wand2,
  Copy,
  RefreshCw,
  Check,
  Sparkles,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Image as ImageIcon,
  Hash,
  AtSign,
  Calendar,
  Send,
  X,
  Loader2
} from 'lucide-react';
import api from '../services/api';

const AISocialMediaPostWriter = ({ onClose, imageUrl = null, projectDetails = {} }) => {
  const [platform, setPlatform] = useState('instagram');
  const [tone, setTone] = useState('professional');
  const [contentType, setContentType] = useState('before-after');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedPost, setGeneratedPost] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'pink' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'blue' },
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'sky' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'indigo' }
  ];

  const tones = [
    { id: 'professional', name: 'Professional', description: 'Clear and polished' },
    { id: 'casual', name: 'Casual', description: 'Friendly and relaxed' },
    { id: 'excited', name: 'Excited', description: 'Energetic and enthusiastic' },
    { id: 'educational', name: 'Educational', description: 'Informative and helpful' },
    { id: 'promotional', name: 'Promotional', description: 'Sales-focused' }
  ];

  const contentTypes = [
    { id: 'before-after', name: 'Before & After', emoji: '✨' },
    { id: 'project-showcase', name: 'Project Showcase', emoji: '🏆' },
    { id: 'tips-advice', name: 'Tips & Advice', emoji: '💡' },
    { id: 'behind-scenes', name: 'Behind the Scenes', emoji: '🎬' },
    { id: 'client-testimonial', name: 'Client Testimonial', emoji: '⭐' },
    { id: 'seasonal-promo', name: 'Seasonal Promo', emoji: '🎉' }
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await api.post('/social-media/generate-social-post', {
        platform,
        tone,
        contentType,
        customPrompt,
        imageUrl,
        projectDetails
      });

      setGeneratedPost(response.data);
    } catch (error) {
      console.error('Error generating post:', error);
      alert(error.response?.data?.message || 'Failed to generate post');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setGeneratedPost(null);
    handleGenerate();
  };

  const getPlatformConfig = () => {
    const configs = {
      instagram: {
        charLimit: 2200,
        hashtagLimit: 30,
        features: ['Image Required', 'Stories', 'Reels', 'Hashtags']
      },
      facebook: {
        charLimit: 63206,
        hashtagLimit: null,
        features: ['Images', 'Video', 'Link Preview', 'Long-form']
      },
      twitter: {
        charLimit: 280,
        hashtagLimit: 2,
        features: ['Short & Punchy', 'Threads', 'Images/GIFs']
      },
      linkedin: {
        charLimit: 3000,
        hashtagLimit: 5,
        features: ['Professional', 'Articles', 'Company Updates']
      }
    };
    return configs[platform] || configs.instagram;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">AI Social Media Post Writer</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {!generatedPost ? (
            <div className="space-y-6">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Platform
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {platforms.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          platform === p.id
                            ? `border-${p.color}-500 bg-${p.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon
                          className={`w-8 h-8 mx-auto mb-2 ${
                            platform === p.id ? `text-${p.color}-600` : 'text-gray-400'
                          }`}
                        />
                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-sm text-blue-800">
                    <strong>Platform Info:</strong> {getPlatformConfig().charLimit} char limit
                    {getPlatformConfig().hashtagLimit &&
                      ` • Max ${getPlatformConfig().hashtagLimit} hashtags`
                    }
                  </div>
                </div>
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Post Tone
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {tones.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        tone === t.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-600">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Content Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {contentTypes.map((ct) => (
                    <button
                      key={ct.id}
                      onClick={() => setContentType(ct.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        contentType === ct.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg mb-1">{ct.emoji}</div>
                      <div className="text-sm font-medium text-gray-900">{ct.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Add specific details about your project, client name, location, services, or any key points to mention..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={4}
                />
              </div>

              {/* Image Preview */}
              {imageUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Image Preview
                  </label>
                  <img
                    src={imageUrl}
                    alt="Post preview"
                    className="w-full max-h-64 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Your Perfect Post...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate AI Post
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Generated Post */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-900">Generated Post</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(generatedPost.caption)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleRegenerate}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{generatedPost.caption}</p>
                </div>

                {/* Character Count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {generatedPost.caption.length} / {getPlatformConfig().charLimit} characters
                  </span>
                  {generatedPost.caption.length > getPlatformConfig().charLimit && (
                    <span className="text-red-600 font-medium">⚠️ Exceeds limit</span>
                  )}
                </div>
              </div>

              {/* Hashtags */}
              {generatedPost.hashtags && generatedPost.hashtags.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">Suggested Hashtags</h4>
                    </div>
                    <button
                      onClick={() => handleCopy(generatedPost.hashtags.join(' '))}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Copy className="w-4 h-4" />
                      Copy All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {generatedPost.hashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-white border border-blue-300 rounded-full text-sm text-blue-700 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Call to Action */}
              {generatedPost.cta && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Send className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-900">Call to Action</h4>
                  </div>
                  <p className="text-gray-700">{generatedPost.cta}</p>
                </div>
              )}

              {/* Best Time to Post */}
              {generatedPost.bestTimeToPost && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Best Time to Post</h4>
                  </div>
                  <p className="text-gray-700 mt-2">{generatedPost.bestTimeToPost}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setGeneratedPost(null)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Create New Post
                </button>
                <button
                  onClick={() => {
                    handleCopy(generatedPost.caption + '\n\n' + generatedPost.hashtags.join(' '));
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Copy Full Post
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISocialMediaPostWriter;
