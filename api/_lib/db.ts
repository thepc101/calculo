import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[calculo] DATABASE_URL not set — API routes will fail');
}

const sql = neon(DATABASE_URL!);

// Wrap with retry for Neon cold starts (database pauses on free tier)
const originalQuery = sql;
export const db = drizzle(originalQuery, { schema });
