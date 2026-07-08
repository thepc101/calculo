import type { Context } from 'hono';
import { z } from 'zod';
import { db } from '../_lib/db';
import { apiKeys } from '../_lib/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { requireAuth } from '../_lib/auth';
import { generateApiKey, hashKey } from '../_lib/crypto';
import { rateLimiter } from '../_lib/rate-limit-middleware';

const createSchema = z.object({
  name: z.string().min(1).max(64),
  projectId: z.string().min(1).max(64),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const limiter = rateLimiter({ limit: 10, windowMs: 60_000 });

export default async function handler(c: Context) {
  await limiter(c, async () => {});
  await requireAuth(c, async () => {});

  const userId = c.get('userId') as string;
  const method = c.req.method;

  if (method === 'GET') {
    const rows = await db
      .select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, projectId: apiKeys.projectId, createdAt: apiKeys.createdAt, lastUsedAt: apiKeys.lastUsedAt, expiresAt: apiKeys.expiresAt })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
      .orderBy(desc(apiKeys.createdAt));
    return c.json({ keys: rows });
  }

  if (method === 'POST') {
    const body = await c.req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
    }

    const { name, projectId, expiresInDays } = parsed.data;
    const { plaintext, prefix } = generateApiKey();
    const tokenHash = await hashKey(plaintext);
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null;

    const rows = await db
      .insert(apiKeys)
      .values({ userId, projectId, name, tokenHash, prefix, expiresAt })
      .returning({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, projectId: apiKeys.projectId, createdAt: apiKeys.createdAt, expiresAt: apiKeys.expiresAt });

    const created = rows[0];
    return c.json({ ...created, key: plaintext }, 201);
  }

  return c.json({ error: { code: 'METHOD_NOT_ALLOWED', message: method + ' not allowed' } }, 405);
}
