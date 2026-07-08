import type { Context, Next } from 'hono';
import { db } from './db';
import { apiKeys } from './schema';
import { eq, and, gt } from 'drizzle-orm';
import { hashKey } from './crypto';

export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } }, 401);
  }

  const token = header.slice(7);
  if (!token || !token.startsWith('calc_live_')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key format' } }, 401);
  }

  const tokenHash = await hashKey(token);

  const rows = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId, projectId: apiKeys.projectId, expiresAt: apiKeys.expiresAt, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, tokenHash))
    .limit(1);

  const keyRow = rows[0];
  if (!keyRow) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, 401);
  }

  if (keyRow.revokedAt) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'API key has been revoked' } }, 401);
  }

  if (keyRow.expiresAt && keyRow.expiresAt < new Date()) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'API key has expired' } }, 401);
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRow.id));

  c.set('userId', keyRow.userId);
  c.set('projectId', keyRow.projectId ?? 'default');
  c.set('keyId', keyRow.id);

  await next();
}

export async function optionalAuth(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  if (header?.startsWith('Bearer ') && header.slice(7).startsWith('calc_live_')) {
    try {
      const token = header.slice(7);
      const tokenHash = await hashKey(token);
      const rows = await db
        .select({ userId: apiKeys.userId, projectId: apiKeys.projectId })
        .from(apiKeys)
        .where(and(eq(apiKeys.tokenHash, tokenHash), eq(apiKeys.revokedAt, null as unknown as Date)))
        .limit(1);
      if (rows[0]) {
        c.set('userId', rows[0].userId);
        c.set('projectId', rows[0].projectId ?? 'default');
      }
    } catch {
      // optional — ignore
    }
  }
  await next();
}
