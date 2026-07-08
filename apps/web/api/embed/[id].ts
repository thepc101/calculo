import type { Context } from 'hono';
import { db } from '../_lib/db';
import { calculators } from '../_lib/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { rateLimiter } from '../_lib/rate-limit-middleware';

const limiter = rateLimiter({ limit: 60, windowMs: 60_000 });

export default async function handler(c: Context) {
  await limiter(c, async () => {});

  const id = c.req.param('id');
  if (!id || id.length > 64) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid calculator ID' } }, 400);
  }

  const rows = await db
    .select({ id: calculators.id, type: calculators.type, theme: calculators.theme, buttons: calculators.buttons, layout: calculators.layout, settings: calculators.settings, display: calculators.display })
    .from(calculators)
    .where(and(eq(calculators.id, id), isNotNull(calculators.publishedAt)))
    .limit(1);

  const calc = rows[0];
  if (!calc) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Calculator not found' } }, 404);
  }

  return c.json(calc, 200, {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    'Access-Control-Allow-Origin': '*',
  });
}
