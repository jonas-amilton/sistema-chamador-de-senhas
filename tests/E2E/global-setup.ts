import { execFileSync } from 'node:child_process';

export default function globalSetup(): void {
    execFileSync('php', ['artisan', 'migrate:fresh', '--seed', '--force'], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            APP_ENV: 'testing',
            BROADCAST_CONNECTION: 'null',
            QUEUE_CONNECTION: 'sync',
            CACHE_STORE: 'array',
            SESSION_DRIVER: 'database',
        },
        stdio: 'inherit',
    });
}
