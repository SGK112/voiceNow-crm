import { useState } from 'react';
import { X, Lightbulb, ArrowRight } from 'lucide-react';

export default function HelpPopover({
  title,
  content,
  steps,
  currentStep = 0,
  totalSteps = 1,
  onNext,
  onPrevious,
  onDismiss,
  position = 'bottom-right',
  showProgress = true,
}) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  const progressWidth = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className={'fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-300 ' + positionClasses[position]}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-500 max-w-md p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          {typeof content === 'string' ? (
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{content}</p>
          ) : (
            content
          )}

          {steps && steps.length > 0 && (
            <ul className="mt-3 space-y-2">
              {steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold">
                    {idx + 1}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">{step}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {showProgress && totalSteps > 1 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{currentStep + 1} of {totalSteps}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: progressWidth + '%' }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {onPrevious && currentStep > 0 && (
              <button
                onClick={onPrevious}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Skip
            </button>
            {onNext && (
              <button
                onClick={onNext}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                {currentStep + 1 === totalSteps ? 'Finish' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
