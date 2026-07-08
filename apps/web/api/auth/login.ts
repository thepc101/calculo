import type { Context } from 'hono';
import { z } from 'zod';
import { db } from '../../_lib/db';
import { users } from '../../_lib/schema';
import { eq } from 'drizzle-orm';
import { signToken } from '../../_lib/jwt';
import { rateLimiter } from '../../_lib/rate-limit-middleware';
import bcrypt from 'bcryptjs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

const limiter = rateLimiter({ limit: 10, windowMs: 300_000 });

export default async function handler(c: Context) {
  await limiter(c, async () => {});

  if (c.req.method !== 'POST') {
    return c.json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required' } }, 405);
  }

  const body = await c.req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
  }

  const { email, password } = parsed.data;

  // Find user by email
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  if (!user) {
    return c.json({ error: { code: 'LOGIN_ERROR', message: 'Invalid email or password' } }, 401);
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: { code: 'LOGIN_ERROR', message: 'Invalid email or password' } }, 401);
  }

  // Issue JWT
  const accessToken = await signToken({ sub: user.id, email: user.email, type: 'access' });

  return c.json({
    user: { id: user.id, email: user.email },
    session: { access_token: accessToken },
  });
}
