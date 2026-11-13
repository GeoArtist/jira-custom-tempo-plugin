import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: 'chromium',
    timezoneId: 'Europe/Warsaw',
    locale: 'pl-PL',
  },
  projects: [
    {
      name: 'phone',
      use: { viewport: { width: 320, height: 640 }, hasTouch: true },
      testIgnore: /extension\.spec\.ts/,
    },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } }, testIgnore: /extension\.spec\.ts/ },
    // The widest supported layout only needs the layout specs.
    { name: 'wide', use: { viewport: { width: 1920, height: 1080 } }, testMatch: /(panel|launcher)\.spec\.ts/ },
    // The real, built extension loaded into Chromium (needs `vp build` first).
    { name: 'extension', testMatch: /extension\.spec\.ts/ },
  ],
  webServer: {
    command: 'npm run preview',
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
