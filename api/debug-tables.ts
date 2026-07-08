import type { IncomingMessage, ServerResponse } from 'http';
import { db } from '../_lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
    return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ tables: result }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: msg }));
  }
}
