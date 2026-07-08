import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { db } from '../_lib/db';
import { profiles } from '../_lib/schema';
import { eq } from 'drizzle-orm';
import { authenticateUser } from '../_lib/auth-user';
import { jsonResponse, readBody } from '../_lib/http';
import { checkRateLimit } from '../_lib/rate-limit-middleware';
import { sanitizeInput } from '../_lib/sanitize';

const updateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  bio: z.string().max(512).optional(),
  avatarUrl: z.string().max(512).optional(),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  if (!checkRateLimit(req, res, 30, 60_000)) return;
  const user = await authenticateUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const rows = await db
      .select({ id: profiles.id, email: profiles.email, name: profiles.name, bio: profiles.bio, avatarUrl: profiles.avatarUrl, createdAt: profiles.createdAt, updatedAt: profiles.updatedAt })
      .from(profiles)
      .where(eq(profiles.id, user.userId))
      .limit(1);
    if (!rows[0]) return jsonResponse(res, { error: { code: 'NOT_FOUND', message: 'Profile not found' } }, 404);
    return jsonResponse(res, { profile: rows[0] });
  }

  if (req.method === 'PATCH') {
    if (!checkRateLimit(req, res, 10, 60_000)) return;
    const body = await readBody(req);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = sanitizeInput(parsed.data.name);
    if (parsed.data.bio !== undefined) updates.bio = sanitizeInput(parsed.data.bio);
    if (parsed.data.avatarUrl !== undefined) {
      // Basic URL validation - only allow http/https
      const url = parsed.data.avatarUrl;
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Avatar URL must start with http:// or https://' } }, 422);
      }
      updates.avatarUrl = url;
    }

    if (Object.keys(updates).length === 1) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } }, 422);
    }

    const rows = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.id, user.userId))
      .returning({ id: profiles.id, email: profiles.email, name: profiles.name, bio: profiles.bio, avatarUrl: profiles.avatarUrl, createdAt: profiles.createdAt, updatedAt: profiles.updatedAt });

    if (!rows[0]) return jsonResponse(res, { error: { code: 'NOT_FOUND', message: 'Profile not found' } }, 404);
    return jsonResponse(res, { profile: rows[0] });
  }

  return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: req.method + ' not allowed' } }, 405);
}
