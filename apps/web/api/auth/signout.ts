import type { Context } from 'hono';
import { verifyToken } from '../../_lib/jwt';
import { rateLimiter } from '../../_lib/rate-limit-middleware';

const limiter = rateLimiter({ limit: 5, windowMs: 300_000 });

export default async function handler(c: Context) {
  await limiter(c, async () => {});

  if (c.req.method !== 'POST') {
    return c.json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required' } }, 405);
  }

  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } }, 401);
  }

  const payload = await verifyToken(header.slice(7));
  if (!payload) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401);
  }

  // JWT is stateless — client just discards the token.
  // For production, add a token blocklist in Redis/Neon if you need server-side revocation.
  return c.json({ signedOut: true });
}
