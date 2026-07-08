import type { Context, Next } from 'hono';
import { rateLimit, rateLimitHeaders } from './rate-limit';

export function rateLimiter(opts: { limit: number; windowMs: number; keyFn?: (c: Context) => string }) {
  return async (c: Context, next: Next) => {
    const key = opts.keyFn ? opts.keyFn(c) : (c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'anonymous');
    const result = rateLimit(key, opts.limit, opts.windowMs);
    const headers = rateLimitHeaders(result);
    for (const [k, v] of Object.entries(headers)) {
      if (v !== undefined) c.header(k, v);
    }
    if (!result.allowed) {
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
    }
    await next();
  };
}
