import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[calculo] DATABASE_URL not set — API routes will fail');
}

const sql = neon(DATABASE_URL ?? '');
export const db = drizzle(sql, { schema });
