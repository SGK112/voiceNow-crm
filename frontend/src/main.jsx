import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './styles/index.css';
import { GOOGLE_CLIENT_ID } from './config/oauth';

// CRITICAL DEBUG - Force console output
const apiUrl = import.meta.env.VITE_API_URL || 'NOT SET';
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;
console.error('=== VOICEFLOW DEBUG ===');
console.error('API URL:', apiUrl);
console.error('Mode:', import.meta.env.MODE);
console.error('Google Client ID:', googleClientId ? googleClientId.substring(0, 20) + '...' : 'NOT SET');
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
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </BrowserRouter>
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
