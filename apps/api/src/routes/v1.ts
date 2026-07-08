import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CalculatorEngine } from '@calculo/calculator-engine';
import { GraphEngine } from '@calculo/graph-engine';
import { evaluationRequestSchema, graphRequestSchema } from '@calculo/shared';
import { requireAuth } from '../middleware/auth';

const engine = new CalculatorEngine();
const graphEngine = new GraphEngine();

export const v1Router = new Hono();

v1Router.post('/evaluate', zValidator('json', evaluationRequestSchema), (c) => {
  const data = c.req.valid('json');
  const result = engine.evaluate(data);
  return c.json(result);
});

v1Router.post('/render', zValidator('json', graphRequestSchema), (c) => {
  const data = c.req.valid('json');
  const results = graphEngine.generateAll(data);
  return c.json({ graphs: results });
});

v1Router.post('/calculators', requireAuth, (c) => {
  return c.json({ message: 'Calculator created' }, 201);
});

v1Router.get('/calculators/:id', requireAuth, (c) => {
  const { id } = c.req.param();
  return c.json({ id, type: 'basic' });
});

v1Router.patch('/calculators/:id', requireAuth, (c) => {
  const { id } = c.req.param();
  return c.json({ id, updated: true });
});

v1Router.delete('/calculators/:id', requireAuth, (c) => {
  const { id } = c.req.param();
  return c.json({ id, deleted: true });
});

v1Router.post('/embed', requireAuth, (c) => {
  return c.json({ embedUrl: 'https://calculo.dev/embed/calc_123' });
});

v1Router.get('/templates', (c) => {
  return c.json({ templates: [] });
});

v1Router.get('/usage', requireAuth, (c) => {
  return c.json({ evaluations: 0, calculators: 0 });
});

v1Router.post('/api-keys', requireAuth, (c) => {
  return c.json({ key: 'cal_demo_key', name: 'My Key' });
});

v1Router.get('/projects', requireAuth, (c) => {
  return c.json({ projects: [] });
});
