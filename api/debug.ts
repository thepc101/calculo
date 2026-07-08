import type { IncomingMessage, ServerResponse } from 'http';
import { db } from '../_lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    const url = process.env.DATABASE_URL ?? 'NOT SET';
    const host = url.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    const result = await db.execute(sql`SELECT current_database(), current_schema(), current_user`);
    const tables = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
    return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
      db_host_masked: host.slice(0, 80),
      connection: result,
      tables,
    }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    const url = process.env.DATABASE_URL ?? 'NOT SET';
    const host = url.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: msg, db_host_masked: host.slice(0, 80) }));
  }
}
