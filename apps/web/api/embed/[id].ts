import type { Context } from 'hono';
import { db } from '../_lib/db';
import { calculators } from '../_lib/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { rateLimiter } from '../_lib/rate-limit-middleware';

const limiter = rateLimiter({ limit: 60, windowMs: 60_000 });

const DEMO_CONFIGS: Record<string, object> = {
  'demo_basic': {
    id: 'demo_basic', type: 'basic',
    theme: { mode: 'dark', primaryColor: '#3b82f6', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
  },
  'demo_scientific': {
    id: 'demo_scientific', type: 'scientific',
    theme: { mode: 'dark', primaryColor: '#8b5cf6', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
  },
  'demo_graphing': {
    id: 'demo_graphing', type: 'scientific',
    theme: { mode: 'dark', primaryColor: '#10b981', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
  },
  'demo_light': {
    id: 'demo_light', type: 'scientific',
    theme: { mode: 'light', primaryColor: '#2563eb', backgroundColor: '#ffffff', textColor: '#18181b' },
  },
  'demo_cyberpunk': {
    id: 'demo_cyberpunk', type: 'scientific',
    theme: { mode: 'dark', primaryColor: '#f0abfc', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
  },
};

export default async function handler(c: Context) {
  await limiter(c, async () => {});

  const id = c.req.param('id');
  if (!id || id.length > 64) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid calculator ID' } }, 400);
  }

  // Check demo configs first
  const demo = DEMO_CONFIGS[id];
  if (demo) {
    return c.json(demo, 200, {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    });
  }

  // Try database
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
