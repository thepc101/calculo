import type { Context } from 'hono';
import { z } from 'zod';
import { db } from '../../_lib/db';
import { calculators } from '../../_lib/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../../_lib/auth';
import { rateLimiter } from '../../_lib/rate-limit-middleware';
import { sanitizeInput } from '../../_lib/sanitize';

const updateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  type: z.enum(['basic', 'scientific', 'graphing', 'financial', 'programming', 'custom']).optional(),
  theme: z.any().optional(),
  buttons: z.any().optional(),
  layout: z.any().optional(),
  settings: z.any().optional(),
  display: z.any().optional(),
  published: z.boolean().optional(),
});

const limiter = rateLimiter({ limit: 60, windowMs: 60_000 });

export default async function handler(c: Context) {
  await limiter(c, async () => {});
  await requireAuth(c, async () => {});

  const userId = c.get('userId') as string;
  const { id } = c.req.param();
  const method = c.req.method;

  if (!id || id.length > 64) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid calculator ID' } }, 400);
  }

  if (method === 'GET') {
    const rows = await db.select().from(calculators).where(and(eq(calculators.id, id), eq(calculators.userId, userId))).limit(1);
    if (!rows[0]) return c.json({ error: { code: 'NOT_FOUND', message: 'Calculator not found' } }, 404);
    return c.json(rows[0]);
  }

  if (method === 'PATCH') {
    const body = await c.req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
    }

    const updates: Record<string, unknown> = {};
    const data = parsed.data;
    if (data.name !== undefined) updates.name = sanitizeInput(data.name);
    if (data.type !== undefined) updates.type = data.type;
    if (data.theme !== undefined) updates.theme = data.theme;
    if (data.buttons !== undefined) updates.buttons = data.buttons;
    if (data.layout !== undefined) updates.layout = data.layout;
    if (data.settings !== undefined) updates.settings = data.settings;
    if (data.display !== undefined) updates.display = data.display;
    if (data.published !== undefined) updates.publishedAt = data.published ? new Date() : null;
    updates.updatedAt = new Date();

    await db.update(calculators).set(updates).where(and(eq(calculators.id, id), eq(calculators.userId, userId)));
    return c.json({ id, updated: true });
  }

  if (method === 'DELETE') {
    await db.delete(calculators).where(and(eq(calculators.id, id), eq(calculators.userId, userId)));
    return c.json({ deleted: true });
  }

  return c.json({ error: { code: 'METHOD_NOT_ALLOWED', message: method + ' not allowed' } }, 405);
}
