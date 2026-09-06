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

  // Automatically guarantee Super Admin exists on startup
  const inMemoryAdmin = dataStore.bootstrapAdmin();
  console.log(`[API Server] Super Admin Active: ${inMemoryAdmin.email} (Role: ${inMemoryAdmin.role})`);

  // Also guarantee in PostgreSQL if database is reachable
  try {
    await bootstrapSuperAdmin();
  } catch (err) {
    console.warn('[API Server] Note: PostgreSQL bootstrap deferred until DB is available.');
  }
});
