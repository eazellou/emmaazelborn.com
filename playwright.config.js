import { defineConfig, devices } from '@playwright/test'

const PORT = 8181
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: `npx http-server dist -p ${PORT} -s -c-1`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
})
