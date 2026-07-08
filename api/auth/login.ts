import type { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { db } from '../_lib/db';
import { users } from '../_lib/schema';
import { eq } from 'drizzle-orm';
import { signToken } from '../_lib/jwt';
import { checkRateLimit } from '../_lib/rate-limit-middleware';
import { jsonResponse, readBody } from '../_lib/http';
import bcrypt from 'bcryptjs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required' } }, 405);
  }

  if (!checkRateLimit(req, res, 10, 300_000)) return;

  try {
    const body = await readBody(req);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }, 422);
    }

    const { email, password } = parsed.data;

    const rows = await db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = rows[0];
    if (!user) {
      return jsonResponse(res, { error: { code: 'LOGIN_ERROR', message: 'Invalid email or password' } }, 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return jsonResponse(res, { error: { code: 'LOGIN_ERROR', message: 'Invalid email or password' } }, 401);
    }

    const accessToken = await signToken({ sub: user.id, email: user.email, type: 'access' });

    return jsonResponse(res, {
      user: { id: user.id, email: user.email },
      session: { access_token: accessToken },
    });
  } catch (err: any) {
    console.error('[login]', err);
    return jsonResponse(res, { error: { code: 'INTERNAL', message: err?.message ?? 'Internal error' } }, 500);
  }
}
