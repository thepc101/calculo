import type { Context } from 'hono';
import { z } from 'zod';
import { db } from '../_lib/db';
import { calculators } from '../_lib/schema';
import { requireAuth } from '../_lib/auth';
import { rateLimiter } from '../_lib/rate-limit-middleware';
import { sanitizeInput } from '../_lib/sanitize';

const createSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.enum(['basic', 'scientific', 'graphing', 'financial', 'programming', 'custom']).default('scientific'),
  theme: z.object({
    mode: z.string().default('dark'),
    primaryColor: z.string().default('#3b82f6'),
    backgroundColor: z.string().default('#0a0a0b'),
    textColor: z.string().default('#fafafa'),
  }).optional(),
});

const limiter = rateLimiter({ limit: 30, windowMs: 60_000 });

export default async function handler(c: Context) {
  await limiter(c, async () => {});
  await requireAuth(c, async () => {});

  const userId = c.get('userId') as string;
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
  }

  const { name, type, theme } = parsed.data;
  const safeName = sanitizeInput(name);
  const id = 'calc_' + crypto.randomUUID().slice(0, 12);

  await db.insert(calculators).values({
    id,
    userId,
    name: safeName,
    type,
    theme: theme ?? { mode: 'dark', primaryColor: '#3b82f6', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
  });

  return c.json({ id, name: safeName, type }, 201);
}
