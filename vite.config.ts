// Vite+ configuration: build, dev server, tests, lint, and format in one place.
//
// The product is a browser extension: one content script that runs on Jira Cloud pages.
//
//   vp build                 dist/extension   content.js + manifest.json + icons (to install)
//   vp build --mode demo     dist-e2e         a fake Jira page with the add-on (browser tests)
//   vp dev --mode demo       the same fake Jira page, live, at http://127.0.0.1:5173/
import { resolve } from 'node:path';
import { defineConfig } from 'vite-plus';

export default defineConfig(({ mode }) => {
  // "demo" replaces the Jira session with a fake one, so the add-on runs without Jira.
  const demo = mode === 'demo';

  return {
    root: demo ? resolve('demo') : process.cwd(),
    base: './',
    // Copied as-is into the extension: manifest.json and the icons.
    publicDir: demo ? false : resolve('extension'),
    resolve: {
      alias: demo
        ? [{ find: /^.*\/jira\/session-gateway$/, replacement: resolve('tests/e2e/browser-gateway.ts') }]
        : [],
    },
    build: demo
      ? { outDir: resolve('dist-e2e'), emptyOutDir: true, target: 'es2022' }
      : {
          outDir: resolve('dist/extension'),
          emptyOutDir: true,
          target: 'es2022',
          // A content script is one classic script file: no modules, no separate stylesheet
          // (the styles are part of the script and go into the add-on's shadow root).
          lib: {
            entry: resolve('src/content/main.ts'),
            formats: ['iife'],
            name: 'JiraCustomTempo',
            fileName: () => 'content.js',
          },
        },
    server: { host: '127.0.0.1', port: 5173, fs: { allow: [process.cwd()] } },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
    test: {
      environment: 'happy-dom',
      include: ['tests/unit/**/*.test.ts', 'tests/ui/**/*.test.ts'],
    },
    fmt: {
      singleQuote: true,
      printWidth: 120,
      ignorePatterns: ['specs/**', '.specify/**', '.claude/**', '**/*.md', 'tests/fixtures/**'],
    },
    lint: {
      jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
      rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
      options: { typeAware: true, typeCheck: true },
      ignorePatterns: ['dist/**', 'dist-e2e/**', 'specs/**', '.specify/**', '.claude/**'],
    },
  };
});
