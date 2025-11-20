import { useState, useEffect } from 'react';
import VoiceFlowBuilder from './VoiceFlowBuilder';
import MobileVoiceFlowBuilder from './MobileVoiceFlowBuilder';

/**
 * Responsive wrapper for VoiceFlow Builder
 * - MOBILE: Simplified step-by-step builder on mobile devices (< 768px)
 * - DESKTOP: Full React Flow canvas builder on desktop/tablet (>= 768px)
 */
export default function VoiceFlowBuilderResponsive() {
  const [isMobile, setIsMobile] = useState(() => {
    // Initialize based on current window size
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;

      // Additional checks for mobile devices
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;

      // Force mobile builder if touch device with small screen
      setIsMobile(isSmallScreen || (isTouchDevice && window.innerWidth < 1024));
    };

    // Check on mount
    checkMobile();

    // Debounce resize events for performance
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkMobile, 150);
    };

    window.addEventListener('resize', handleResize);

    // Listen for orientation changes on mobile
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', checkMobile);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Force mobile builder for mobile devices
  if (isMobile) {
    return <MobileVoiceFlowBuilder />;
  }

  // Desktop builder for PC users
  return <VoiceFlowBuilder />;
}
