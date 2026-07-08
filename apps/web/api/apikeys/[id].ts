import type { Context } from 'hono';
import { db } from '../../_lib/db';
import { apiKeys } from '../../_lib/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '../../_lib/auth';

export default async function handler(c: Context) {
  await requireAuth(c, async () => {});

  const userId = c.get('userId') as string;
  const { id } = c.req.param();

  if (!id || id.length > 64) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid API key ID' } }, 400);
  }

  if (c.req.method === 'DELETE') {
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));
    return c.json({ revoked: true });
  }

  return c.json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only DELETE is allowed' } }, 405);
}
