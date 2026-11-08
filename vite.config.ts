import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
  test: { include: ['src/**/*.test.ts'] },
});
