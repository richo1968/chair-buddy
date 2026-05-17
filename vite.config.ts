import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
let commit = 'dev';
try {
  commit = execSync('git rev-parse --short HEAD', {
    stdio: ['ignore', 'pipe', 'ignore']
  })
    .toString()
    .trim();
} catch {
  // git not available (e.g. CI without git history) — fall back to "dev"
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
