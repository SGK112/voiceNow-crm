// Cookie Consent Banner
(function() {
  'use strict';

  // Check if user has already consented
  function hasConsented() {
    return localStorage.getItem('cookieConsent') === 'accepted';
  }

  // Set consent
  function setConsent(value) {
    localStorage.setItem('cookieConsent', value);
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
  }

  // Create and show banner
  function showCookieBanner() {
    if (hasConsented()) {
      return; // Already consented
    }

    // Create banner HTML
    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.className = 'cookie-consent-banner';
    banner.innerHTML = `
      <div class="cookie-consent-content">
        <div class="cookie-consent-text">
          <div class="cookie-icon">🍪</div>
          <div>
            <p class="cookie-title">We use cookies</p>
            <p class="cookie-description">
              We use essential cookies to make our site work. We'd also like to set analytics cookies to help us improve our service.
              <a href="/cookies.html" class="cookie-link">Learn more</a>
            </p>
          </div>
        </div>
        <div class="cookie-consent-buttons">
          <button id="cookie-accept" class="cookie-btn cookie-btn-accept">
            Accept All
          </button>
          <button id="cookie-essential" class="cookie-btn cookie-btn-essential">
            Essential Only
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Animate in
    setTimeout(() => {
      banner.classList.add('show');
    }, 500);

    // Add event listeners
    document.getElementById('cookie-accept').addEventListener('click', function() {
      setConsent('accepted');
      hideBanner();
    });

    document.getElementById('cookie-essential').addEventListener('click', function() {
      setConsent('essential-only');
      hideBanner();
    });
  }

  // Hide banner with animation
  function hideBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.classList.remove('show');
      setTimeout(() => {
        banner.remove();
      }, 300);
    }
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showCookieBanner);
  } else {
    showCookieBanner();
  }
})();
