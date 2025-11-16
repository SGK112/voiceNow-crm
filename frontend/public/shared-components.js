// Shared navigation and footer components for all static pages

function createNavigation() {
  return `
    <nav class="navbar">
        <div class="navbar-container">
            <a href="/" class="logo">
                <span class="logo-icon">🎙️</span>
                <div class="logo-text-container">
                    <span class="logo-text">Remodely</span>
                    <span class="logo-subtitle">VoiceFlow CRM</span>
                </div>
            </a>
            <div class="nav-menu">
                <div class="nav-dropdown">
                    <a href="#" class="nav-link">Product ▾</a>
                    <div class="dropdown-content">
                        <a href="/features.html">Features</a>
                        <a href="/how-it-works.html">How It Works</a>
                        <a href="/integrations.html">Integrations</a>
                        <a href="/pricing.html">Pricing</a>
                    </div>
                </div>
                <div class="nav-dropdown">
                    <a href="#" class="nav-link">Company ▾</a>
                    <div class="dropdown-content">
                        <a href="/about.html">About</a>
                        <a href="/blog.html">Blog</a>
                        <a href="/careers.html">Careers</a>
                        <a href="/contact.html">Contact</a>
                    </div>
                </div>
                <a href="/documentation.html" class="nav-link">Docs</a>
                <a href="/pricing.html" class="nav-link">Pricing</a>
                <a href="/login" class="btn btn-secondary">Sign In</a>
                <a href="/login" class="btn btn-primary">Get Started →</a>
            </div>
        </div>
    </nav>
  `;
}

function createFooter() {
  return `
    <footer class="footer">
        <div class="footer-container">
            <div class="footer-content">
                <div class="footer-brand">
                    <div class="footer-logo">
                        <span class="logo-icon">🎙️</span>
                        <div>
                            <div class="footer-logo-text">Remodely</div>
                            <div class="footer-logo-subtitle">VoiceFlow CRM</div>
                        </div>
                    </div>
                    <p class="footer-description">AI-powered voice agents with visual workflow automation. Transform your business communication.</p>
                </div>

                <div class="footer-links">
                    <div class="footer-column">
                        <h4>Product</h4>
                        <a href="/features.html">Features</a>
                        <a href="/how-it-works.html">How It Works</a>
                        <a href="/integrations.html">Integrations</a>
                        <a href="/pricing.html">Pricing</a>
                    </div>

                    <div class="footer-column">
                        <h4>Company</h4>
                        <a href="/about.html">About</a>
                        <a href="/blog.html">Blog</a>
                        <a href="/careers.html">Careers</a>
                        <a href="/contact.html">Contact</a>
                    </div>

                    <div class="footer-column">
                        <h4>Resources</h4>
                        <a href="/documentation.html">Documentation</a>
                        <a href="/api-reference.html">API Reference</a>
                        <a href="/support.html">Support</a>
                        <a href="/status.html">Status</a>
                    </div>

                    <div class="footer-column">
                        <h4>Legal</h4>
                        <a href="/privacy.html">Privacy Policy</a>
                        <a href="/terms.html">Terms of Service</a>
                        <a href="/cookies.html">Cookie Policy</a>
                        <a href="/security.html">Security</a>
                    </div>
                </div>
            </div>

            <div class="footer-bottom">
                <p>© 2025 VoiceFlow CRM by Remodely.ai. All rights reserved.</p>
                <div class="footer-social">
                    <a href="#" aria-label="Twitter">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                        </svg>
                    </a>
                    <a href="#" aria-label="LinkedIn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"></path>
                            <circle cx="4" cy="4" r="2"></circle>
                        </svg>
                    </a>
                    <a href="#" aria-label="GitHub">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    </footer>
  `;
}

// Auto-inject navigation and footer when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Inject navigation at the beginning of body
  const navPlaceholder = document.getElementById('nav-placeholder');
  if (navPlaceholder) {
    navPlaceholder.innerHTML = createNavigation();
  }

  // Inject footer at the end of body
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (footerPlaceholder) {
    footerPlaceholder.innerHTML = createFooter();
  }

  // Load cookie consent CSS and JS
  if (!document.getElementById('cookie-consent-css')) {
    const cookieCSS = document.createElement('link');
    cookieCSS.id = 'cookie-consent-css';
    cookieCSS.rel = 'stylesheet';
    cookieCSS.href = '/cookie-consent.css';
    document.head.appendChild(cookieCSS);
  }

  if (!document.getElementById('cookie-consent-script')) {
    const cookieScript = document.createElement('script');
    cookieScript.id = 'cookie-consent-script';
    cookieScript.src = '/cookie-consent.js';
    document.body.appendChild(cookieScript);
  }
});
