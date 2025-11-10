import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './styles/index.css';

// Google OAuth Client ID (public, not a secret)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '710258787879-qmvg6o96r0k3pc6r47mutesavrhkttik.apps.googleusercontent.com';

// Enable dark mode by default
document.documentElement.classList.add('dark');

// CRITICAL DEBUG - Force console output
const apiUrl = import.meta.env.VITE_API_URL || 'NOT SET';
console.error('=== VOICEFLOW DEBUG ===');
console.error('API URL:', apiUrl);
console.error('Mode:', import.meta.env.MODE);
console.error('=======================');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

try {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found!');
  }

  console.error('Starting React render...');

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <BrowserRouter>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <App />
              </AuthProvider>
            </QueryClientProvider>
          </BrowserRouter>
        </GoogleOAuthProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  console.error('React render initiated successfully');
} catch (error) {
  console.error('FATAL ERROR during React initialization:', error);
  document.body.innerHTML = '<div style="color: red; font-size: 20px; padding: 50px; font-family: monospace;">' +
    '<h1>Fatal Error</h1>' +
    '<p>' + error.message + '</p>' +
    '<pre>' + error.stack + '</pre>' +
    '</div>';
}
