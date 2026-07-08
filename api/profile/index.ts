// @ts-nocheck
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

function isSetupError(msg: string): boolean {
  return (
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('column') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('Connection terminated') ||
    msg.includes('Connection refused')
  );
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  try {
    if (!checkRateLimit(req, res, 30, 60_000)) return;
    const user = await authenticateUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      // Try with all columns first; fall back to base columns if migration not run
      let rows: Record<string, unknown>[];
      try {
        rows = await db
          .select({ id: profiles.id, email: profiles.email, name: profiles.name, bio: profiles.bio, avatarUrl: profiles.avatarUrl, createdAt: profiles.createdAt, updatedAt: profiles.updatedAt })
          .from(profiles)
          .where(eq(profiles.id, user.userId))
          .limit(1) as unknown as Record<string, unknown>[];
      } catch {
        // Fallback: bio/avatar_url columns may not exist yet
        rows = await db
          .select({ id: profiles.id, email: profiles.email, name: profiles.name, createdAt: profiles.createdAt, updatedAt: profiles.updatedAt })
          .from(profiles)
          .where(eq(profiles.id, user.userId))
          .limit(1) as unknown as Record<string, unknown>[];
        if (rows[0]) {
          rows[0].bio = '';
          rows[0].avatarUrl = null;
        }
      }
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
        const url = parsed.data.avatarUrl;
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
          return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Avatar URL must start with http:// or https://' } }, 422);
        }
        updates.avatarUrl = url;
      }

      if (Object.keys(updates).length === 1) {
        return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } }, 422);
      }

      // Try with all columns; fall back if migration not run
      let rows: Record<string, unknown>[];
      try {
        rows = await db
          .update(profiles)
          .set(updates)
          .where(eq(profiles.id, user.userId))
          .returning({ id: profiles.id, email: profiles.email, name: profiles.name, bio: profiles.bio, avatarUrl: profiles.avatarUrl, createdAt: profiles.createdAt, updatedAt: profiles.updatedAt }) as unknown as Record<string, unknown>[];
      } catch {
        // Fallback: only update columns that exist
        const safeUpdates: Record<string, unknown> = { updatedAt: new Date() };
        if (parsed.data.name !== undefined) safeUpdates.name = updates.name;
        rows = await db
          .update(profiles)
          .set(safeUpdates)
          .where(eq(profiles.id, user.userId))
          .returning({ id: profiles.id, email: profiles.email, name: profiles.name, createdAt: profiles.createdAt, updatedAt: profiles.updatedAt }) as unknown as Record<string, unknown>[];
        if (rows[0]) {
          rows[0].bio = '';
          rows[0].avatarUrl = null;
        }
      }

      if (!rows[0]) return jsonResponse(res, { error: { code: 'NOT_FOUND', message: 'Profile not found' } }, 404);
      return jsonResponse(res, { profile: rows[0] });
    }

    return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: req.method + ' not allowed' } }, 405);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return jsonResponse(res, {
      error: {
        code: isSetupError(msg) ? 'SETUP_REQUIRED' : 'INTERNAL_ERROR',
        message: isSetupError(msg)
          ? 'Database not ready. If this is the first deploy, run the migration SQL from api/_lib/migration.sql in your Neon console. If the database is paused, resume it at console.neon.tech.'
          : 'Internal error: ' + msg,
      },
    }, isSetupError(msg) ? 503 : 500);
  }
}
