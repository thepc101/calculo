import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { db } from '../_lib/db';
import { forumPosts, profiles } from '../_lib/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateUser } from '../_lib/auth-user';
import { jsonResponse, readBody } from '../_lib/http';
import { checkRateLimit } from '../_lib/rate-limit-middleware';
import { sanitizeInput } from '../_lib/sanitize';

const createSchema = z.object({
  title: z.string().min(1).max(128),
  body: z.string().min(1).max(8192),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  if (req.method === 'GET') {
    if (!checkRateLimit(req, res, 60, 60_000)) return;
    const rows = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        body: forumPosts.body,
        pinned: forumPosts.pinned,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        authorName: profiles.name,
        authorAvatarUrl: profiles.avatarUrl,
      })
      .from(forumPosts)
      .leftJoin(profiles, eq(forumPosts.userId, profiles.id))
      .orderBy(desc(forumPosts.pinned), desc(forumPosts.createdAt))
      .limit(100);
    return jsonResponse(res, { posts: rows });
  }

  if (req.method === 'POST') {
    if (!checkRateLimit(req, res, 5, 300_000)) return; // 5 posts per 5 min
    const user = await authenticateUser(req, res);
    if (!user) return;

    const body = await readBody(req);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
    }

    const title = sanitizeInput(parsed.data.title);
    const postBody = sanitizeInput(parsed.data.body);

    if (title.length < 1 || postBody.length < 1) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Title and body required' } }, 422);
    }

    const rows = await db
      .insert(forumPosts)
      .values({ userId: user.userId, title, body: postBody })
      .returning({ id: forumPosts.id, title: forumPosts.title, body: forumPosts.body, pinned: forumPosts.pinned, createdAt: forumPosts.createdAt });

    return jsonResponse(res, { post: rows[0] }, 201);
  }

  return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: req.method + ' not allowed' } }, 405);
}
