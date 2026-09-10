import dotenv from 'dotenv';
import { createApp } from './app';
import { dataStore } from './services/data-store';
import { bootstrapSuperAdmin } from '@library/database';

dotenv.config();

const port = process.env.PORT || 4000;
const app = createApp();

app.listen(Number(port), '0.0.0.0', async () => {
  console.log(`[API Server] Running on http://127.0.0.1:${port} and http://localhost:${port}`);
  console.log(`[API Server] Health check at http://127.0.0.1:${port}/health`);

  // Automatically guarantee Super Admin exists in memory store
  const inMemoryAdmin = dataStore.bootstrapAdmin();
  console.log(`[API Server] Super Admin Active: ${inMemoryAdmin.email} (Role: ${inMemoryAdmin.role})`);

  // Non-blocking database schema sync and admin bootstrap in background
  if (process.env.NODE_ENV === 'production' || process.env.SYNC_DB_ON_START === 'true') {
    try {
      const { exec } = await import('child_process');
      console.log('[API Server] Running Prisma db push in background for schema sync...');
      exec(
        'npx prisma db push --accept-data-loss',
        {
          cwd: require('path').resolve(__dirname, '../../../packages/database'),
          env: process.env,
        },
        async (err) => {
          if (err) {
            console.warn(`[API Server] Background DB sync note: ${err.message}`);
          } else {
            console.log('[API Server] Background PostgreSQL schema sync completed.');
            try {
              await bootstrapSuperAdmin();
            } catch {}
          }
        }
      );
    } catch (err: any) {
      console.warn(`[API Server] Background DB sync launch note: ${err?.message || err}`);
    }
  } else {
    // In local development, attempt bootstrap without blocking incoming traffic
    bootstrapSuperAdmin().catch(() => {
      console.log('[API Server] Local PostgreSQL not connected. Running in fast memory-backed mode.');
    });
  }
});
