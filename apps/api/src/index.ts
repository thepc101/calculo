import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { v1Router } from './routes/v1';
import { errorHandler } from './middleware/error';

const app = new Hono();

app.use('*', cors());
app.use('*', logger());
app.use('*', secureHeaders());

app.get('/', (c) => c.json({ name: 'calculo', version: '0.0.0', status: 'ok' }));
app.get('/health', (c) => c.json({ status: 'healthy' }));

app.route('/v1', v1Router);

app.onError(errorHandler);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

serve({
  fetch: app.fetch,
  port,
});

console.log(`🚀 calculo API running on port ${port}`);
