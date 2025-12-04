import { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';

export default function OnboardingTour({ onComplete }) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const steps = [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">Welcome to VoiceNow CRM!</h2>
          <p className="text-gray-600">
            Your AI-powered CRM for contractors. Let's take a quick tour to help you get started.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Dashboard</h3>
          <p className="text-sm text-gray-600">
            Get a bird's-eye view of your business metrics, upcoming tasks, and recent activity.
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="agents"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">AI Agents</h3>
          <p className="text-sm text-gray-600 mb-2">
            Deploy AI agents to automate calls, follow-ups, payments, and more. This is where the magic happens!
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>✓ Answer customer calls 24/7</li>
            <li>✓ Collect overdue payments</li>
            <li>✓ Book appointments automatically</li>
          </ul>
        </div>
      ),
    },
    {
      target: '[data-tour="leads"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Leads</h3>
          <p className="text-sm text-gray-600">
            All your potential customers in one place. Track, qualify, and convert leads into paying customers.
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="projects"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Projects</h3>
          <p className="text-sm text-gray-600">
            Manage active jobs, track progress, and keep everything organized from start to finish.
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="deals"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Sales Pipeline</h3>
          <p className="text-sm text-gray-600">
            Track deals from estimate to invoice. See your entire sales pipeline at a glance.
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="campaigns"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Campaigns</h3>
          <p className="text-sm text-gray-600">
            Create automated outreach campaigns to win back old customers or follow up with leads.
          </p>
        </div>
      ),
    },
    {
      target: '[data-tour="workflows"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Workflows</h3>
          <p className="text-sm text-gray-600">
            Automate repetitive tasks with powerful workflows. Connect your favorite tools and save hours every week.
          </p>
        </div>
      ),
    },
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">You're All Set!</h2>
          <p className="text-gray-600 mb-3">
            Ready to get started? Here's what we recommend:
          </p>
          <ol className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">1.</span>
              <span>Deploy your first AI agent to start automating</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">2.</span>
              <span>Import your existing leads or add your first lead</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">3.</span>
              <span>Explore the workflow marketplace for templates</span>
            </li>
          </ol>
        </div>
      ),
      placement: 'center',
    },
  ];

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('onboarding_completed');
    if (!hasSeenTour && location.pathname === '/app/dashboard') {
      setTimeout(() => setRun(true), 1000);
    }
  }, [location]);

  const handleJoyrideCallback = (data) => {
    const { status, index, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      localStorage.setItem('onboarding_completed', 'true');
      if (onComplete) onComplete();
    }

    if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#2563EB',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
        },
        buttonNext: {
          background: '#2563EB',
          borderRadius: 6,
          fontSize: 14,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6B7280',
          fontSize: 14,
        },
        buttonSkip: {
          color: '#6B7280',
          fontSize: 14,
        },
      }}
      locale={{
        back: 'Previous',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}
