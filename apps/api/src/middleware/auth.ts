import { createMiddleware } from 'hono/factory';
import { AuthError } from '@calculo/shared';

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    throw new AuthError('Missing Authorization header');
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AuthError('Invalid Authorization header format');
  }

  c.set('apiKey', token);
  c.set('projectId', 'demo');

  await next();
});

export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if (scheme === 'Bearer' && token) {
      c.set('apiKey', token);
      c.set('projectId', 'demo');
    }
  }

  await next();
});
