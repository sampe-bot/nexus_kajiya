import { defineConfig } from '@playwright/test';
const externalUrl = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: './tests',
  use: { baseURL: externalUrl ?? 'http://127.0.0.1:5174', headless: true, channel: 'chrome' },
  webServer: externalUrl ? undefined : { command: 'npm run dev -- --port 5174', url: 'http://127.0.0.1:5174', reuseExistingServer: false },
});
