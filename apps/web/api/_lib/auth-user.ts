import type { IncomingMessage, ServerResponse } from 'http';
import { verifyToken } from './jwt';
import { jsonResponse, getHeader } from './http';

export async function authenticateUser(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<{ userId: string; email: string } | null> {
  const header = getHeader(req, 'Authorization');
  if (!header?.startsWith('Bearer ')) {
    jsonResponse(res, { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } }, 401);
    return null;
  }

  const token = header.slice(7);
  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'access') {
    jsonResponse(res, { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
    return null;
  }

  return { userId: payload.sub, email: payload.email };
}
