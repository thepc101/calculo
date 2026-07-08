import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { db } from '../_lib/db';
import { apiKeys } from '../_lib/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { authenticateUser } from '../_lib/auth-user';
import { generateApiKey, hashKey } from '../_lib/crypto';
import { checkRateLimit } from '../_lib/rate-limit-middleware';
import { jsonResponse, readBody } from '../_lib/http';

const createSchema = z.object({
  name: z.string().min(1).max(64),
  projectId: z.string().min(1).max(64).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  if (!checkRateLimit(req, res, 10, 60_000)) return;
  const user = await authenticateUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const rows = await db
      .select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, projectId: apiKeys.projectId, createdAt: apiKeys.createdAt, lastUsedAt: apiKeys.lastUsedAt, expiresAt: apiKeys.expiresAt })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, user.userId), isNull(apiKeys.revokedAt)))
      .orderBy(desc(apiKeys.createdAt));
    return jsonResponse(res, { keys: rows });
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
    }

    const { name, projectId, expiresInDays } = parsed.data;
    const { plaintext, prefix } = generateApiKey();
    const tokenHash = await hashKey(plaintext);
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null;

    const rows = await db
      .insert(apiKeys)
      .values({ userId: user.userId, projectId: projectId ?? null, name, tokenHash, prefix, expiresAt })
      .returning({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, projectId: apiKeys.projectId, createdAt: apiKeys.createdAt, expiresAt: apiKeys.expiresAt });

    const created = rows[0];
    return jsonResponse(res, { ...created, key: plaintext }, 201);
  }

  return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: req.method + ' not allowed' } }, 405);
}
