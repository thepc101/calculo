// @ts-nocheck
import type { IncomingMessage, ServerResponse } from 'http';
import { db } from '../_lib/db';
import { forumPosts, forumComments, profiles } from '../_lib/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateUser } from '../_lib/auth-user';
import { jsonResponse } from '../_lib/http';
import { checkRateLimit } from '../_lib/rate-limit-middleware';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const segments = url.pathname.split('/').filter(Boolean);
  const postId = segments[segments.length - 1];

  if (!postId || postId.length > 64) {
    return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Invalid post id' } }, 400);
  }

  try {
    if (req.method === 'GET') {
      if (!checkRateLimit(req, res, 60, 60_000)) return;

      const postRows = await db
        .select({
          id: forumPosts.id,
          title: forumPosts.title,
          body: forumPosts.body,
          pinned: forumPosts.pinned,
          createdAt: forumPosts.createdAt,
          updatedAt: forumPosts.updatedAt,
          userId: forumPosts.userId,
          authorName: profiles.name,
          authorAvatarUrl: profiles.avatarUrl,
        })
        .from(forumPosts)
        .leftJoin(profiles, eq(forumPosts.userId, profiles.id))
        .where(eq(forumPosts.id, postId))
        .limit(1);

      if (!postRows[0]) return jsonResponse(res, { error: { code: 'NOT_FOUND', message: 'Post not found' } }, 404);

      const commentRows = await db
        .select({
          id: forumComments.id,
          body: forumComments.body,
          createdAt: forumComments.createdAt,
          userId: forumComments.userId,
          authorName: profiles.name,
          authorAvatarUrl: profiles.avatarUrl,
        })
        .from(forumComments)
        .leftJoin(profiles, eq(forumComments.userId, profiles.id))
        .where(eq(forumComments.postId, postId))
        .orderBy(desc(forumComments.createdAt));

      return jsonResponse(res, { post: { ...postRows[0], comments: commentRows } });
    }

    if (req.method === 'DELETE') {
      if (!checkRateLimit(req, res, 10, 60_000)) return;
      const user = await authenticateUser(req, res);
      if (!user) return;

      const existing = await db
        .select({ id: forumPosts.id, userId: forumPosts.userId })
        .from(forumPosts)
        .where(eq(forumPosts.id, postId))
        .limit(1);

      if (!existing[0]) return jsonResponse(res, { error: { code: 'NOT_FOUND', message: 'Post not found' } }, 404);
      if (existing[0].userId !== user.userId) return jsonResponse(res, { error: { code: 'FORBIDDEN', message: 'You can only delete your own posts' } }, 403);

      await db.delete(forumPosts).where(eq(forumPosts.id, postId));
      return jsonResponse(res, { message: 'Post deleted' });
    }

    return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: req.method + ' not allowed' } }, 405);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    const setup = isSetupError(msg);
    if (setup) {
      return jsonResponse(res, {
        error: {
          code: 'SETUP_REQUIRED',
          message: 'Database connection issue. Check that your Vercel DATABASE_URL env var matches your Neon project. If the DB is paused, resume at console.neon.tech.',
        },
      }, 503);
    }
    return jsonResponse(res, {
      error: { code: 'INTERNAL_ERROR', message: 'Internal error: ' + msg },
    }, 500);
  }
}
