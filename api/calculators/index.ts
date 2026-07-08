// @ts-nocheck
import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { db } from '../_lib/db';
import { calculators } from '../_lib/schema';
import { authenticateUser } from '../_lib/auth-user';
import { checkRateLimit } from '../_lib/rate-limit-middleware';
import { sanitizeInput } from '../_lib/sanitize';
import { jsonResponse, readBody } from '../_lib/http';

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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  if (!checkRateLimit(req, res, 30, 60_000)) return;
  const user = await authenticateUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { eq } = await import('drizzle-orm');
    const rows = await db
      .select()
      .from(calculators)
      .where(eq(calculators.userId, user.userId));
    return jsonResponse(res, { calculators: rows });
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
    }

    const { name, type, theme } = parsed.data;
    const safeName = sanitizeInput(name);
    const id = 'calc_' + crypto.randomUUID().slice(0, 12);

    await db.insert(calculators).values({
      id,
      userId: user.userId,
      name: safeName,
      type,
      theme: theme ?? { mode: 'dark', primaryColor: '#3b82f6', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
    });

    return jsonResponse(res, { id, name: safeName, type }, 201);
  }

  return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: req.method + ' not allowed' } }, 405);
}
