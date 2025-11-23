import { useState } from 'react';
import {
  Upload,
  Wand2,
  Image as ImageIcon,
  Palette,
  Home,
  Trees,
  Sofa,
  Sparkles,
  Maximize,
  Sun,
  Layers,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Save
} from 'lucide-react';
import api from '../services/api';

const ImageTransform = ({ onClose, onSave, initialImage = null }) => {
  const [step, setStep] = useState(initialImage ? 'transform' : 'upload');
  const [selectedImage, setSelectedImage] = useState(initialImage);
  const [selectedTransform, setSelectedTransform] = useState(null);
  const [transformOptions, setTransformOptions] = useState({});
  const [transforming, setTransforming] = useState(false);
  const [transformedImage, setTransformedImage] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);

  // Available transformations
  const transformations = [
    {
      id: 'material_swap',
      name: 'Material Swap',
      icon: Palette,
      credits: 2,
      description: 'Replace countertops, flooring, backsplash',
      color: 'blue',
      options: [
        {
          key: 'materialType',
          label: 'What to replace',
          type: 'select',
          choices: ['countertop', 'flooring', 'backsplash', 'siding', 'cabinets']
        },
        {
          key: 'newMaterial',
          label: 'New material',
          type: 'text',
          placeholder: 'black galaxy granite'
        },
        {
          key: 'strength',
          label: 'Transformation strength',
          type: 'slider',
          min: 0.5,
          max: 1.0,
          step: 0.1,
          default: 0.8
        }
      ]
    },
    {
      id: 'interior',
      name: 'Interior Redesign',
      icon: Home,
      credits: 3,
      description: 'Transform room style completely',
      color: 'purple',
      options: [
        {
          key: 'prompt',
          label: 'Desired style',
          type: 'text',
          placeholder: 'modern farmhouse style with shiplap walls'
        },
        {
          key: 'style',
          label: 'Design style',
          type: 'select',
          choices: ['modern', 'traditional', 'farmhouse', 'industrial', 'minimalist', 'contemporary']
        },
        {
          key: 'strength',
          label: 'Transformation strength',
          type: 'slider',
          min: 0.5,
          max: 1.0,
          step: 0.1,
          default: 0.7
        }
      ]
    },
    {
      id: 'exterior',
      name: 'Exterior Transform',
      icon: Home,
      credits: 3,
      description: 'Change home exterior style',
      color: 'green',
      options: [
        {
          key: 'transformation',
          label: 'Transformation',
          type: 'text',
          placeholder: 'modern farmhouse with board and batten siding'
        },
        {
          key: 'details',
          label: 'Additional details',
          type: 'text',
          placeholder: 'add black windows and steel roof'
        }
      ]
    },
    {
      id: 'landscaping',
      name: 'Landscaping',
      icon: Trees,
      credits: 3,
      description: 'Add or modify landscaping',
      color: 'emerald',
      options: [
        {
          key: 'landscapeType',
          label: 'Landscape type',
          type: 'select',
          choices: [
            'lush garden with flowers',
            'desert landscaping with cacti',
            'modern pavers with ornamental grasses',
            'English cottage garden',
            'tropical palms and plants',
            'rock garden with succulents'
          ]
        }
      ]
    },
    {
      id: 'virtual_staging',
      name: 'Virtual Staging',
      icon: Sofa,
      credits: 3,
      description: 'Add furniture to empty rooms',
      color: 'orange',
      options: [
        {
          key: 'roomType',
          label: 'Room type',
          type: 'select',
          choices: ['living room', 'bedroom', 'kitchen', 'dining room', 'office', 'bathroom']
        },
        {
          key: 'style',
          label: 'Furniture style',
          type: 'select',
          choices: ['modern', 'traditional', 'minimalist', 'farmhouse', 'industrial', 'mid-century modern']
        }
      ]
    },
    {
      id: 'color_change',
      name: 'Color Change',
      icon: Palette,
      credits: 2,
      description: 'Change paint colors',
      color: 'pink',
      options: [
        {
          key: 'target',
          label: 'What to repaint',
          type: 'select',
          choices: ['walls', 'cabinets', 'exterior', 'trim', 'doors']
        },
        {
          key: 'color',
          label: 'New color',
          type: 'text',
          placeholder: 'light gray'
        }
      ]
    },
    {
      id: 'enhance',
      name: 'Enhance Resolution',
      icon: Maximize,
      credits: 2,
      description: 'Upscale 4x for print quality',
      color: 'indigo',
      options: [
        {
          key: 'scale',
          label: 'Upscale factor',
          type: 'select',
          choices: ['2', '4']
        }
      ]
    },
    {
      id: 'time_of_day',
      name: 'Time of Day',
      icon: Sun,
      credits: 2,
      description: 'Change lighting conditions',
      color: 'yellow',
      options: [
        {
          key: 'timeOfDay',
          label: 'Lighting',
          type: 'select',
          choices: ['golden hour sunset', 'blue hour', 'midday', 'overcast', 'night']
        }
      ]
    },
    {
      id: 'background',
      name: 'Background Replace',
      icon: Layers,
      credits: 2,
      description: 'Replace background',
      color: 'cyan',
      options: [
        {
          key: 'newBackground',
          label: 'New background',
          type: 'text',
          placeholder: 'modern kitchen interior'
        }
      ]
    },
    {
      id: 'remove_objects',
      name: 'Remove Objects',
      icon: Trash2,
      credits: 2,
      description: 'Remove unwanted items',
      color: 'red',
      options: [
        {
          key: 'objectsToRemove',
          label: 'What to remove',
          type: 'text',
          placeholder: 'old furniture and clutter'
        }
      ]
    },
    {
      id: 'add_stickers',
      name: 'Add Stickers',
      icon: Sparkles,
      credits: 1,
      description: 'Add decorative stickers and overlays',
      color: 'teal',
      options: [
        {
          key: 'stickerCategory',
          label: 'Sticker category',
          type: 'select',
          choices: [
            'before-after-badges',
            'price-tags',
            'sale-banners',
            'emoji-reactions',
            'geometric-shapes',
            'decorative-frames',
            'text-callouts',
            'brand-logos'
          ]
        },
        {
          key: 'stickerText',
          label: 'Custom text (optional)',
          type: 'text',
          placeholder: 'SALE! or New!'
        },
        {
          key: 'position',
          label: 'Position',
          type: 'select',
          choices: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']
        }
      ]
    }
  ];

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result);
      // In production, upload to cloud storage and get URL
      setSelectedImage(reader.result);
      setStep('transform');
    };
    reader.readAsDataURL(file);
  };

  // Handle transformation
  const handleTransform = async () => {
    if (!selectedTransform || !selectedImage) return;

    try {
      setTransforming(true);

      const endpoint = `/image-transform/${selectedTransform.id.replace('_', '-')}`;

      // Build request body based on transformation type
      const requestBody = {
        imageUrl: selectedImage,
        ...transformOptions
      };

      const response = await api.post(endpoint, requestBody);

      if (response.data.success) {
        setTransformedImage(response.data.transformed);
        setStep('result');
      }
    } catch (error) {
      console.error('Error transforming image:', error);
      alert(error.response?.data?.message || 'Failed to transform image');
    } finally {
      setTransforming(false);
    }
  };

  // Handle save to library
  const handleSaveToLibrary = () => {
    if (onSave && transformedImage) {
      onSave({
        original: selectedImage,
        transformed: transformedImage,
        transformationType: selectedTransform.id,
        options: transformOptions
      });
    }
    onClose();
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300',
      purple: 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-300',
      green: 'border-green-200 bg-green-50 text-green-700 hover:border-green-300',
      emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300',
      orange: 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300',
      pink: 'border-pink-200 bg-pink-50 text-pink-700 hover:border-pink-300',
      indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300',
      yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700 hover:border-yellow-300',
      cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300',
      red: 'border-red-200 bg-red-50 text-red-700 hover:border-red-300'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Wand2 className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Transform Image</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {['upload', 'transform', 'result'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-blue-600 text-white'
                      : idx < ['upload', 'transform', 'result'].indexOf(step)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < 2 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      idx < ['upload', 'transform', 'result'].indexOf(step)
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Upload Your Project Photo
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Interior, exterior, landscape, or any project image
                  </p>
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Upload className="w-5 h-5" />
                    Choose Image
                  </div>
                </label>
              </div>

              {uploadPreview && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Preview:</h3>
                  <img
                    src={uploadPreview}
                    alt="Preview"
                    className="w-full max-h-96 object-contain rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => setStep('transform')}
                    className="w-full mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <ChevronRight className="w-5 h-5" />
                    Continue to Transform
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step: Select Transformation */}
          {step === 'transform' && !selectedTransform && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Choose Transformation Type
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {transformations.map((transform) => {
                  const Icon = transform.icon;
                  return (
                    <button
                      key={transform.id}
                      onClick={() => {
                        setSelectedTransform(transform);
                        // Initialize default options
                        const defaults = {};
                        transform.options.forEach((opt) => {
                          if (opt.default) defaults[opt.key] = opt.default;
                        });
                        setTransformOptions(defaults);
                      }}
                      className={`p-4 border-2 rounded-lg transition-all text-left ${getColorClasses(
                        transform.color
                      )}`}
                    >
                      <Icon className="w-8 h-8 mb-2" />
                      <div className="font-semibold text-sm mb-1">{transform.name}</div>
                      <div className="text-xs opacity-80 mb-2">{transform.description}</div>
                      <div className="flex items-center gap-1 text-xs">
                        <Sparkles className="w-3 h-3" />
                        {transform.credits} credits
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Configure Transformation */}
          {step === 'transform' && selectedTransform && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedTransform.name}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedTransform.description}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTransform(null);
                    setTransformOptions({});
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Change Type
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Options Form */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Transformation Options</h4>

                  {selectedTransform.options.map((option) => (
                    <div key={option.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {option.label}
                      </label>

                      {option.type === 'text' && (
                        <input
                          type="text"
                          placeholder={option.placeholder}
                          value={transformOptions[option.key] || ''}
                          onChange={(e) =>
                            setTransformOptions({
                              ...transformOptions,
                              [option.key]: e.target.value
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      )}

                      {option.type === 'select' && (
                        <select
                          value={transformOptions[option.key] || option.choices[0]}
                          onChange={(e) =>
                            setTransformOptions({
                              ...transformOptions,
                              [option.key]: e.target.value
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {option.choices.map((choice) => (
                            <option key={choice} value={choice}>
                              {choice}
                            </option>
                          ))}
                        </select>
                      )}

                      {option.type === 'slider' && (
                        <div>
                          <input
                            type="range"
                            min={option.min}
                            max={option.max}
                            step={option.step}
                            value={transformOptions[option.key] || option.default}
                            onChange={(e) =>
                              setTransformOptions({
                                ...transformOptions,
                                [option.key]: parseFloat(e.target.value)
                              })
                            }
                            className="w-full"
                          />
                          <div className="text-sm text-gray-600 text-right">
                            {transformOptions[option.key] || option.default}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Cost Display */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Cost:</span>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-lg font-bold text-blue-600">
                          {selectedTransform.credits} Credits
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleTransform}
                    disabled={transforming}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {transforming ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Transforming...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        Transform Image
                      </>
                    )}
                  </button>
                </div>

                {/* Original Image Preview */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Original Image</h4>
                  <img
                    src={selectedImage}
                    alt="Original"
                    className="w-full rounded-lg border border-gray-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Result (Before/After) */}
          {step === 'result' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Transformation Complete!
                </h3>
                <p className="text-gray-600">
                  Compare the before and after images below
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before */}
                <div>
                  <div className="bg-gray-100 rounded-t-lg px-4 py-2 font-medium text-gray-700">
                    Before
                  </div>
                  <img
                    src={selectedImage}
                    alt="Before"
                    className="w-full rounded-b-lg border border-gray-200"
                  />
                </div>

                {/* After */}
                <div>
                  <div className="bg-blue-100 rounded-t-lg px-4 py-2 font-medium text-blue-700">
                    After - {selectedTransform?.name}
                  </div>
                  <img
                    src={transformedImage}
                    alt="After"
                    className="w-full rounded-b-lg border border-blue-200"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('transform');
                    setTransformedImage(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Try Another
                </button>

                <a
                  href={transformedImage}
                  download="transformed-image.jpg"
                  className="flex-1 px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download
                </a>

                <button
                  onClick={handleSaveToLibrary}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save to Library
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageTransform;
