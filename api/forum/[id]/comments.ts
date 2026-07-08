import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { db } from '../../_lib/db';
import { forumPosts, forumComments, profiles } from '../../_lib/schema';
import { eq } from 'drizzle-orm';
import { authenticateUser } from '../../_lib/auth-user';
import { jsonResponse, readBody } from '../../_lib/http';
import { checkRateLimit } from '../../_lib/rate-limit-middleware';
import { sanitizeInput } from '../../_lib/sanitize';

const createSchema = z.object({
  body: z.string().min(1).max(4096),
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  if (req.method !== 'POST') {
    return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required' } }, 405);
  }

  try {
    if (!checkRateLimit(req, res, 20, 60_000)) return;
    const user = await authenticateUser(req, res);
    if (!user) return;

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const segments = url.pathname.split('/').filter(Boolean);
    const postId = segments[2];

    if (!postId || postId.length > 64) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Invalid post id' } }, 400);
    }

    const postExists = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!postExists[0]) return jsonResponse(res, { error: { code: 'NOT_FOUND', message: 'Post not found' } }, 404);

    const body = await readBody(req);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
    }

    const commentBody = sanitizeInput(parsed.data.body);
    if (commentBody.length < 1) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Comment body required' } }, 422);
    }

    const rows = await db
      .insert(forumComments)
      .values({ postId, userId: user.userId, body: commentBody })
      .returning({ id: forumComments.id, body: forumComments.body, createdAt: forumComments.createdAt });

    const comment = rows[0];

    const profileRows = await db
      .select({ name: profiles.name, avatarUrl: profiles.avatarUrl })
      .from(profiles)
      .where(eq(profiles.id, user.userId))
      .limit(1);

    const profile = profileRows[0];

    return jsonResponse(res, {
      comment: {
        ...comment,
        userId: user.userId,
        authorName: profile?.name ?? null,
        authorAvatarUrl: profile?.avatarUrl ?? null,
      },
    }, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    const setup = isSetupError(msg);
    return jsonResponse(res, {
      error: {
        code: setup ? 'SETUP_REQUIRED' : 'INTERNAL_ERROR',
        message: setup
          ? 'Forum not available yet. Run the migration SQL from api/_lib/migration.sql in your Neon console. If the database is paused, resume it at console.neon.tech.'
          : 'Internal error: ' + msg,
      },
    }, setup ? 503 : 500);
  }
}
