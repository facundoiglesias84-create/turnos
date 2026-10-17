import 'server-only';
import { Pool } from 'pg';

// One pool per server process (reused across hot reloads in dev)
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool = globalForDb.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool;
