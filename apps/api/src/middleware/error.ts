import type { ErrorHandler } from 'hono';
import { CalculoError } from '@calculo/shared';

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof CalculoError) {
    return c.json(
      { error: { code: err.code, message: err.message } },
      err.status,
    );
  }

  console.error('Unhandled error:', err);
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    500,
  );
};
