import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'marketing-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/marketing.html';
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  publicDir: 'public',
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    allowedHosts: [
      'localhost',
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
    // Use native file watching (faster than polling)
    watch: {
      usePolling: false,
      interval: 1000
    },
    // Reduce HMR overhead
    hmr: {
      overlay: true
    }
  },
  // Optimize dev performance
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      'lucide-react',
      'reactflow',
      'recharts',
      'zustand'
    ],
    exclude: ['@elevenlabs/client']
  },
  build: {
    // Code splitting for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts', 'reactflow']
        }
      }
    },
    // Reduce build size
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false
  },
  // Enable esbuild for faster transforms
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});
