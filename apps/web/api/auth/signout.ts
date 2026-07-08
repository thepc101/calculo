import type { IncomingMessage, ServerResponse } from 'http';
import { jsonResponse } from '../_lib/http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: 'POST required' } }, 405);
  }

  return jsonResponse(res, { message: 'Signed out' });
}
