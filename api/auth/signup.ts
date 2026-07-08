// @ts-nocheck
import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { db } from '../_lib/db';
import { users, profiles } from '../_lib/schema';
import { eq } from 'drizzle-orm';
import { signToken } from '../_lib/jwt';
import { checkRateLimit } from '../_lib/rate-limit-middleware';
import { isValidEmail } from '../_lib/sanitize';
import { jsonResponse, readBody } from '../_lib/http';
import bcrypt from 'bcryptjs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(64).optional(),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required' } }, 405);
  }

  if (!checkRateLimit(req, res, 5, 300_000)) return;

  try {
    const body = await readBody(req);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
    }

    const { email, password, name } = parsed.data;
    if (!isValidEmail(email)) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } }, 422);
    }

    // Check if email already exists
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      return jsonResponse(res, { error: { code: 'SIGNUP_ERROR', message: 'Email already registered' } }, 400);
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

    return jsonResponse(res, {
      user: { id: user.id, email, name: displayName },
      session: { access_token: accessToken },
      message: 'Account created',
    }, 201);
  } catch (err: any) {
    console.error('[signup]', err?.message, err?.stack);
    const msg = err?.message ?? 'Internal error';
    // Provide helpful hints for common issues
    if (msg.includes('relation') && msg.includes('does not exist')) {
      return jsonResponse(res, { error: { code: 'DB_ERROR', message: 'Database tables not created. Run the schema SQL in Neon SQL Editor.' } }, 500);
    }
    if (msg.includes('JWT_SECRET') || msg.includes('secret')) {
      return jsonResponse(res, { error: { code: 'CONFIG_ERROR', message: 'JWT_SECRET not configured.' } }, 500);
    }
    return jsonResponse(res, { error: { code: 'INTERNAL', message: msg } }, 500);
  }
}
