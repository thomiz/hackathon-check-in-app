import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const demo = mode === 'demo';
  if (demo && !existsSync('fhir/fsh-generated/resources')) {
    throw new Error('The demo bundles the FHIR IG examples. Run "npm run fhir:build" first.');
  }
  return {
    plugins: [react()],
    // Browser builds get a node:crypto shim so the in-browser demo backend can run the
    // registration service. Tests (vitest, command "serve") keep the real Node module.
    resolve: demo || command === 'build'
      ? { alias: { 'node:crypto': fileURLToPath(new URL('./src/demo/node-crypto.ts', import.meta.url)) } }
      : {},
    // Relative asset URLs let the demo be served from any sub-path, e.g. <ig>/demo/ on GitHub Pages.
    ...(demo ? { base: './', build: { outDir: 'dist-demo' } } : {}),
    server: { proxy: demo ? undefined : { '/api': 'http://127.0.0.1:8080' } },
    test: { include: ['tests/**/*.test.ts'], fileParallelism: false }
  };
});
