import type { Context, Next } from 'hono';
import { verifyToken, type TokenPayload } from './jwt';
import { db } from './db';
import { profiles } from './schema';
import { eq } from 'drizzle-orm';

export async function requireUser(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } }, 401);
  }

  const token = header.slice(7);
  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'access') {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
  }

  const rows = await db
    .select({ id: profiles.id, email: profiles.email, name: profiles.name })
    .from(profiles)
    .where(eq(profiles.id, payload.sub))
    .limit(1);

  const user = rows[0];
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } }, 401);
  }

  c.set('userId', user.id);
  c.set('userEmail', user.email);
  c.set('userName', user.name);

  await next();
}
