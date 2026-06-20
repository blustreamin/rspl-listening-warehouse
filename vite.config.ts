import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client no longer holds any API keys — all LLM calls go through the
// server-side proxy at /api/llm, and persistence through /api/*. The only
// client env var is VITE_API_BASE (optional; '' = same-origin in production).
export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
