import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  projects: [
    {
      name: 'electron',
      testDir: './electron',
      testMatch: '*.spec.ts',
    },
    {
      name: 'browser',
      testDir: './test',
      testMatch: '*.spec.ts',
      use: {
        baseURL: 'http://localhost:4000',
      },
    },
  ],
});
