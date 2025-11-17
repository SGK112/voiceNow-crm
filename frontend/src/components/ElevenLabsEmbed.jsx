import { useState } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * ElevenLabsEmbed - A workaround component for ElevenLabs CSP iframe blocking
 *
 * ElevenLabs blocks iframe embedding via Content Security Policy.
 * This component provides a better UX by showing instructions and opening
 * ElevenLabs in a popup window instead of trying to embed it.
 */
const ElevenLabsEmbed = ({
  url,
  title = "ElevenLabs Dashboard",
  description,
  height = 700,
  instructions = []
}) => {
  const [windowOpened, setWindowOpened] = useState(false);

  const openInPopup = () => {
    if (!url) return;

    // Calculate centered position
    const width = 1400;
    const popupHeight = 900;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - popupHeight) / 2;

    // Open in popup window
    window.open(
      url,
      'elevenlabs-window',
      `width=${width},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,status=yes`
    );

    setWindowOpened(true);

    // Reset after 3 seconds
    setTimeout(() => setWindowOpened(false), 3000);
  };

  return (
    <div
      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
      style={{ height: `${height}px` }}
    >
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
          <ExternalLink className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
            {description}
          </p>
        )}

        {/* CSP Notice */}
        <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 max-w-2xl">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Why can't we embed ElevenLabs here?
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              ElevenLabs uses Content Security Policy (CSP) to block iframe embedding for security reasons.
              Click the button below to open their dashboard in a new window for the best experience.
            </p>
          </div>
        </div>

        {/* Instructions (if provided) */}
        {instructions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 max-w-2xl border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Quick Steps:
            </h4>
            <ol className="text-left space-y-2">
              {instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={openInPopup}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <ExternalLink className="w-5 h-5 mr-2" />
          Open {title}
        </Button>

        {/* Success Message */}
        {windowOpened && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              Window opened successfully!
            </span>
          </div>
        )}

        {/* Direct Link Fallback */}
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          Popup blocked?{' '}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Click here to open in a new tab
          </a>
        </p>
      </div>
    </div>
  );
};

export default ElevenLabsEmbed;
