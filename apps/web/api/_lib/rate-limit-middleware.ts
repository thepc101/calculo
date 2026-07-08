import type { IncomingMessage, ServerResponse } from 'http';
import { rateLimit, rateLimitHeaders } from './rate-limit';
import { jsonResponse, getHeader } from './http';

export function checkRateLimit(
  req: IncomingMessage,
  res: ServerResponse,
  limit: number,
  windowMs: number,
): boolean {
  const key = getHeader(req, 'x-forwarded-for') ?? getHeader(req, 'x-real-ip') ?? 'anonymous';
  const result = rateLimit(key, limit, windowMs);
  const headers = rateLimitHeaders(result);
  for (const [k, v] of Object.entries(headers)) {
    if (v !== undefined) res.setHeader(k, v);
  }
  if (!result.allowed) {
    jsonResponse(res, { error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
    return false;
  }
  return true;
}
