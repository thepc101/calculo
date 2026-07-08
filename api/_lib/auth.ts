// @ts-nocheck
import type { IncomingMessage, ServerResponse } from 'http';
import { db } from './db';
import { apiKeys } from './schema';
import { eq } from 'drizzle-orm';
import { hashKey } from './crypto';
import { jsonResponse, getHeader } from './http';

export async function authenticateApiKey(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<string | null> {
  const header = getHeader(req, 'Authorization');
  if (!header?.startsWith('Bearer ')) {
    jsonResponse(res, { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } }, 401);
    return null;
  }

  const token = header.slice(7);
  if (!token || !token.startsWith('calc_live_')) {
    jsonResponse(res, { error: { code: 'UNAUTHORIZED', message: 'Invalid API key format' } }, 401);
    return null;
  }

  const tokenHash = await hashKey(token);

  const rows = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId, projectId: apiKeys.projectId, expiresAt: apiKeys.expiresAt, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, tokenHash))
    .limit(1);

  const keyRow = rows[0];
  if (!keyRow) {
    jsonResponse(res, { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, 401);
    return null;
  }

  if (keyRow.revokedAt) {
    jsonResponse(res, { error: { code: 'UNAUTHORIZED', message: 'API key has been revoked' } }, 401);
    return null;
  }

  if (keyRow.expiresAt && keyRow.expiresAt < new Date()) {
    jsonResponse(res, { error: { code: 'UNAUTHORIZED', message: 'API key has expired' } }, 401);
    return null;
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRow.id));

  return keyRow.userId;
}
