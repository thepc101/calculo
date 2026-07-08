// @ts-nocheck
import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { db } from '../_lib/db';
import { calculators } from '../_lib/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateUser } from '../_lib/auth-user';
import { checkRateLimit } from '../_lib/rate-limit-middleware';
import { sanitizeInput } from '../_lib/sanitize';
import { jsonResponse, readBody } from '../_lib/http';

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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  if (!checkRateLimit(req, res, 60, 60_000)) return;
  const user = await authenticateUser(req, res);
  if (!user) return;

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const id = url.pathname.split('/').pop();

  if (!id || id.length > 64) {
    return jsonResponse(res, { error: { code: 'BAD_REQUEST', message: 'Invalid calculator ID' } }, 400);
  }

  if (req.method === 'GET') {
    const rows = await db.select().from(calculators).where(and(eq(calculators.id, id), eq(calculators.userId, user.userId))).limit(1);
    if (!rows[0]) return jsonResponse(res, { error: { code: 'NOT_FOUND', message: 'Calculator not found' } }, 404);
    return jsonResponse(res, rows[0]);
  }

  if (req.method === 'PATCH') {
    const body = await readBody(req);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
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

    await db.update(calculators).set(updates).where(and(eq(calculators.id, id), eq(calculators.userId, user.userId)));
    return jsonResponse(res, { id, updated: true });
  }

  if (req.method === 'DELETE') {
    await db.delete(calculators).where(and(eq(calculators.id, id), eq(calculators.userId, user.userId)));
    return jsonResponse(res, { deleted: true });
  }

  return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: req.method + ' not allowed' } }, 405);
}
