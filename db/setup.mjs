// Aplica db/schema.sql sobre la base de DATABASE_URL.
// Uso: npm run db:setup
import { readFile } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL (ver .env.local)');
    process.exit(1);
}

const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
    await client.query(sql);
    console.log('Esquema aplicado.');
} finally {
    await client.end();
}
