import dotenv from 'dotenv';
import { createApp } from './app';
import { dataStore } from './services/data-store';
import { bootstrapSuperAdmin } from '@library/database';

dotenv.config();

const port = process.env.PORT || 4000;
const app = createApp();

app.listen(port, async () => {
  console.log(`[API Server] Running on http://localhost:${port}`);
  console.log(`[API Server] Health check at http://localhost:${port}/health`);

  // Automatically guarantee Super Admin exists in memory store
  const inMemoryAdmin = dataStore.bootstrapAdmin();
  console.log(`[API Server] Super Admin Active: ${inMemoryAdmin.email} (Role: ${inMemoryAdmin.role})`);

  // Automatically sync PostgreSQL schema & bootstrap admin in production DB
  try {
    const { execSync } = await import('child_process');
    console.log('[API Server] Running Prisma db push for database schema sync...');
    execSync('npx prisma db push --accept-data-loss', {
      cwd: require('path').resolve(__dirname, '../../../packages/database'),
      stdio: 'inherit',
      env: process.env,
    });
    console.log('[API Server] PostgreSQL schema sync completed.');
  } catch (err: any) {
    console.warn(`[API Server] Database schema sync note: ${err?.message || err}`);
  }

  try {
    await bootstrapSuperAdmin();
  } catch (err) {
    console.warn('[API Server] Note: PostgreSQL admin bootstrap deferred until DB is available.');
  }
});
