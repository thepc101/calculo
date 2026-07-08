import type { Context } from 'hono';
import { z } from 'zod';
import { db } from '../../_lib/db';
import { users, profiles } from '../../_lib/schema';
import { eq } from 'drizzle-orm';
import { signToken } from '../../_lib/jwt';
import { rateLimiter } from '../../_lib/rate-limit-middleware';
import { isValidEmail } from '../../_lib/sanitize';
import bcrypt from 'bcryptjs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(64).optional(),
});

const limiter = rateLimiter({ limit: 5, windowMs: 300_000 });

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

  const { email, password, name } = parsed.data;
  if (!isValidEmail(email)) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } }, 422);
  }

  // Check if email already exists
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    return c.json({ error: { code: 'SIGNUP_ERROR', message: 'Email already registered' } }, 400);
  }

  // Hash password with bcrypt (12 rounds)
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const newUser = await db.insert(users).values({ email, passwordHash }).returning({ id: users.id });
  const user = newUser[0]!;

  // Create profile
  const displayName = name ?? email.split('@')[0];
  await db.insert(profiles).values({ id: user.id, email, name: displayName });

  // Issue JWT
  const accessToken = await signToken({ sub: user.id, email, type: 'access' });

  return c.json({
    user: { id: user.id, email },
    session: { access_token: accessToken },
    message: 'Account created',
  }, 201);
}
