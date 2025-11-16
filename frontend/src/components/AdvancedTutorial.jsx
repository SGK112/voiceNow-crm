import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Play, Pause, RotateCcw, HelpCircle, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

/**
 * Advanced Interactive Tutorial Component
 * Features:
 * - Spotlight highlighting of UI elements
 * - Step-by-step guided walkthrough
 * - Interactive tooltips with pointers
 * - Practice mode with sample actions
 * - Progress tracking
 * - Skip/replay functionality
 */

export default function AdvancedTutorial({
  tutorialKey,
  title,
  steps = [],
  onComplete,
  children
}) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [highlightedElement, setHighlightedElement] = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    // Check if tutorial has been completed before
    const completed = localStorage.getItem(`tutorial_${tutorialKey}_completed`);
    const dismissed = localStorage.getItem(`tutorial_${tutorialKey}_dismissed`);

    if (!completed && !dismissed && steps.length > 0) {
      // Show tutorial after a short delay to let page load
      setTimeout(() => setShowTutorial(true), 500);
    }
  }, [tutorialKey, steps.length]);

  useEffect(() => {
    if (showTutorial && steps[currentStep]?.target) {
      highlightElement(steps[currentStep].target);
    } else {
      clearHighlight();
    }
  }, [currentStep, showTutorial, steps]);

  const highlightElement = (selector) => {
    try {
      const element = document.querySelector(selector);
      if (element) {
        setHighlightedElement(element);

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add pulse animation
        element.classList.add('tutorial-highlight');
      }
    } catch (error) {
      console.warn('Tutorial: Could not find element:', selector);
    }
  };

  const clearHighlight = () => {
    if (highlightedElement) {
      highlightedElement.classList.remove('tutorial-highlight');
      setHighlightedElement(null);
    }
  };

  const getElementPosition = () => {
    if (!highlightedElement) return null;

    const rect = highlightedElement.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2
    };
  };

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`tutorial_${tutorialKey}_dismissed`, 'true');
    setShowTutorial(false);
    clearHighlight();
  };

  const handleComplete = () => {
    localStorage.setItem(`tutorial_${tutorialKey}_completed`, 'true');
    setShowTutorial(false);
    clearHighlight();
    if (onComplete) onComplete();
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Auto-advance every 5 seconds
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < steps.length - 1) {
            setCompletedSteps(prevCompleted => new Set([...prevCompleted, prev]));
            return prev + 1;
          } else {
            setIsPlaying(false);
            clearInterval(interval);
            return prev;
          }
        });
      }, 5000);
    }
  };

  if (!showTutorial) {
    return (
      <>
        {children}

        {/* Help Button - Always visible */}
        <button
          onClick={() => {
            setShowTutorial(true);
            setCurrentStep(0);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-transform hover:scale-110"
          title="Show Tutorial"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </>
    );
  }

  const currentStepData = steps[currentStep];
  const elementPos = getElementPosition();
  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {children}

      {/* Dark Overlay with Spotlight */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[100] pointer-events-none"
        style={{
          background: highlightedElement
            ? 'radial-gradient(circle at var(--spotlight-x) var(--spotlight-y), transparent 0%, transparent var(--spotlight-size), rgba(0,0,0,0.75) calc(var(--spotlight-size) + 100px))'
            : 'rgba(0,0,0,0.75)',
          '--spotlight-x': elementPos ? `${elementPos.centerX}px` : '50%',
          '--spotlight-y': elementPos ? `${elementPos.centerY}px` : '50%',
          '--spotlight-size': elementPos ? `${Math.max(elementPos.width, elementPos.height) / 2 + 20}px` : '100px'
        }}
      />

      {/* Animated Arrow Pointer */}
      {highlightedElement && elementPos && (
        <div
          className="fixed z-[101] pointer-events-none animate-bounce"
          style={{
            top: `${elementPos.top - 60}px`,
            left: `${elementPos.centerX - 20}px`,
          }}
        >
          <div className="relative">
            <div className="absolute -top-2 -left-2 w-12 h-12 bg-yellow-400 rounded-full opacity-50 animate-ping" />
            <ArrowRight className="w-10 h-10 text-yellow-400 transform rotate-90 relative z-10" />
          </div>
        </div>
      )}

      {/* Tutorial Panel */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[102] pointer-events-auto">
        <Card className="w-[600px] shadow-2xl border-2 border-primary">
          <CardContent className="p-0">
            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-t-lg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-4 text-white">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{title}</h2>
                    <p className="text-white/90 text-sm mt-1">
                      Step {currentStep + 1} of {steps.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close tutorial"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step Progress Dots */}
              <div className="flex items-center gap-1.5 mt-3">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-8 bg-white'
                        : completedSteps.has(index)
                        ? 'w-2 bg-green-400'
                        : 'w-2 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {currentStepData?.image && (
                <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={currentStepData.image}
                    alt={currentStepData.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {currentStepData?.icon && (
                <div className="mb-4 flex justify-center">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <currentStepData.icon className="w-10 h-10 text-blue-600" />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 mb-3">
                <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-blue-600">
                  {currentStepData?.category || 'Tutorial'}
                </Badge>
                {currentStepData?.duration && (
                  <Badge variant="outline">
                    ⏱️ {currentStepData.duration}
                  </Badge>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {currentStepData?.title}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                {currentStepData?.description}
              </p>

              {currentStepData?.action && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Action Required:
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                        {currentStepData.action}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentStepData?.bullets && (
                <ul className="space-y-2 mb-4">
                  {currentStepData.bullets.map((bullet, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {currentStepData?.tip && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    💡 <strong>Pro Tip:</strong> {currentStepData.tip}
                  </p>
                </div>
              )}

              {currentStepData?.warning && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    ⚠️ <strong>Important:</strong> {currentStepData.warning}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-6 flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRestart}
                  size="sm"
                  disabled={currentStep === 0}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Restart
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePlayPause}
                  size="sm"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      Auto-play
                    </>
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    size="lg"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  size="lg"
                >
                  Skip Tutorial
                </Button>

                <Button
                  onClick={handleNext}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Complete Tutorial
                    </>
                  ) : (
                    <>
                      Next Step
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tutorial Highlight Styles */}
      <style>{`
        @keyframes tutorial-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% {
            box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
          }
        }

        .tutorial-highlight {
          position: relative;
          z-index: 101 !important;
          animation: tutorial-pulse 2s infinite;
          border-radius: 8px;
        }
      `}</style>
    </>
  );
}

// Helper function to check if tutorial was completed
export function isTutorialCompleted(tutorialKey) {
  return localStorage.getItem(`tutorial_${tutorialKey}_completed`) === 'true';
}

// Helper function to reset tutorial
export function resetTutorial(tutorialKey) {
  localStorage.removeItem(`tutorial_${tutorialKey}_completed`);
  localStorage.removeItem(`tutorial_${tutorialKey}_dismissed`);
}

// Helper function to reset all tutorials
export function resetAllTutorials() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('tutorial_') && (key.endsWith('_completed') || key.endsWith('_dismissed'))) {
      localStorage.removeItem(key);
    }
  });
}
