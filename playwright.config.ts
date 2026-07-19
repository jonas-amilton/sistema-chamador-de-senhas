import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/E2E',
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://127.0.0.1:8010',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'php artisan serve --host=127.0.0.1 --port=8010',
        url: 'http://127.0.0.1:8010/up',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
            APP_ENV: 'testing',
            APP_URL: 'http://127.0.0.1:8010',
            BROADCAST_CONNECTION: 'null',
            QUEUE_CONNECTION: 'sync',
        },
    },
    globalSetup: './tests/E2E/global-setup.ts',
});
