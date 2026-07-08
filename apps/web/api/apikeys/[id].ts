import type { IncomingMessage, ServerResponse } from 'http';
import { db } from '../../_lib/db';
import { apiKeys } from '../../_lib/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { authenticateUser } from '../../_lib/auth-user';
import { jsonResponse } from '../../_lib/http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  const user = await authenticateUser(req, res);
  if (!user) return;

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const id = url.pathname.split('/').pop();

  if (!id || id.length > 64) {
    return jsonResponse(res, { error: { code: 'BAD_REQUEST', message: 'Invalid API key ID' } }, 400);
  }

  if (req.method === 'DELETE') {
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.userId), isNull(apiKeys.revokedAt)));
    return jsonResponse(res, { revoked: true });
  }

  return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Only DELETE is allowed' } }, 405);
}
