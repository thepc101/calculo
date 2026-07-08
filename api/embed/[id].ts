// @ts-nocheck
import type { IncomingMessage, ServerResponse } from 'http';
import { db } from '../_lib/db';
import { calculators } from '../_lib/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { jsonResponse } from '../_lib/http';

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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const id = url.pathname.split('/').pop();

  if (!id || id.length > 64) {
    return jsonResponse(res, { error: { code: 'BAD_REQUEST', message: 'Invalid calculator ID' } }, 400);
  }

  // Check demo configs first
  const demo = DEMO_CONFIGS[id];
  if (demo) {
    return jsonResponse(res, demo);
  }

  // Try database
  const rows = await db
    .select({ id: calculators.id, type: calculators.type, theme: calculators.theme, buttons: calculators.buttons, layout: calculators.layout, settings: calculators.settings, display: calculators.display })
    .from(calculators)
    .where(and(eq(calculators.id, id), isNotNull(calculators.publishedAt)))
    .limit(1);

  const calc = rows[0];
  if (!calc) {
    return jsonResponse(res, { error: { code: 'NOT_FOUND', message: 'Calculator not found' } }, 404);
  }

  return jsonResponse(res, calc);
}
