import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client no longer holds any API keys — all LLM calls go through the
// server-side proxy at /api/llm, and persistence through /api/*. The only
// client env var is VITE_API_BASE (optional; '' = same-origin in production).
export default defineConfig(() => {
    return {
      // Compile-time share flag (from VITE_SHARE_MODE): a CONSTANT so the
      // dead shell branch in index.tsx is eliminated at build time — the
      // share bundle carries no App/Data Studio code and the main bundle
      // carries no share snapshot. A runtime import.meta.env check would
      // keep both in every build.
      define: {
        __SHARE_MODE__: JSON.stringify(process.env.VITE_SHARE_MODE === '1'),
      },
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
