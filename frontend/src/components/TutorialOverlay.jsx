import { useState, useEffect } from 'react';
import { X, ArrowRight, Check, Rocket } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

/**
 * Tutorial Overlay Component
 * Shows tutorial content once per user, stored in localStorage
 *
 * Usage:
 * <TutorialOverlay
 *   tutorialKey="crm-workflow-builder"
 *   title="Welcome to CRM Workflow Builder"
 *   steps={[...]}
 *   onComplete={() => console.log('Tutorial completed')}
 * />
 */
export default function TutorialOverlay({
  tutorialKey,
  title,
  steps = [],
  onComplete,
  children
}) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if tutorial has been completed before
    const completed = localStorage.getItem(`tutorial_${tutorialKey}_completed`);
    if (!completed && steps.length > 0) {
      setShowTutorial(true);
    }
  }, [tutorialKey, steps.length]);

  const handleDismiss = () => {
    localStorage.setItem(`tutorial_${tutorialKey}_completed`, 'true');
    setShowTutorial(false);
    if (onComplete) onComplete();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleDismiss();
  };

  if (!showTutorial) {
    return <>{children}</>;
  }

  const currentStepData = steps[currentStep];

  return (
    <>
      {children}

      {/* Tutorial Overlay */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-2 border-primary">
          <CardContent className="p-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 text-white">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Rocket className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{title}</h2>
                    <p className="text-white/90 text-sm mt-1">
                      {currentStepData?.subtitle || 'Let us show you around'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Skip tutorial"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center gap-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      index <= currentStep
                        ? 'bg-white'
                        : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-white/80 mt-2">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              {currentStepData?.image && (
                <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={currentStepData.image}
                    alt={currentStepData.title}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {currentStepData?.icon && (
                <div className="mb-4 flex justify-center">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <currentStepData.icon className="w-12 h-12 text-blue-600" />
                  </div>
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">
                {currentStepData?.title}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 text-center mb-6 leading-relaxed">
                {currentStepData?.description}
              </p>

              {currentStepData?.bullets && (
                <ul className="space-y-2 mb-6">
                  {currentStepData.bullets.map((bullet, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {currentStepData?.warning && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-6">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> {currentStepData.warning}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-8 pb-8 flex items-center justify-between gap-4">
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    size="lg"
                  >
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
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
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Get Started
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
}

// Helper function to reset all tutorials
export function resetAllTutorials() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('tutorial_') && key.endsWith('_completed')) {
      localStorage.removeItem(key);
    }
  });
}
