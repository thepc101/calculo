// @ts-nocheck
import type { IncomingMessage, ServerResponse } from 'http';
import { db } from '../_lib/db';
import { calculators, usageEvents } from '../_lib/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { jsonResponse, readBody, getHeader } from '../_lib/http';
import { checkRateLimit } from '../_lib/rate-limit-middleware';

// ── Math Evaluator (inlined so it works without separate function) ────

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue; }
    if (/[0-9.]/.test(expr[i])) {
      let num = '';
      while (i < expr.length && /[0-9.eE]/.test(expr[i])) {
        num += expr[i]; i++;
        if (expr[i] === '-' && /[eE]/.test(expr[i - 1])) { num += expr[i]; i++; }
      }
      tokens.push(num);
    } else if (/[a-zA-Z_]/.test(expr[i])) {
      let name = '';
      while (i < expr.length && /[a-zA-Z_0-9]/.test(expr[i])) { name += expr[i]; i++; }
      tokens.push(name);
    } else if ('+-*/^(),%'.includes(expr[i])) {
      tokens.push(expr[i]); i++;
    } else {
      throw new Error('Unexpected character: ' + expr[i]);
    }
  }
  return tokens;
}

function parseExpr(tokens: string[], pos: { i: number }): number {
  let left = parseMulDiv(tokens, pos);
  while (pos.i < tokens.length && (tokens[pos.i] === '+' || tokens[pos.i] === '-')) {
    const op = tokens[pos.i++];
    const right = parseMulDiv(tokens, pos);
    left = op === '+' ? left + right : left - right;
  }
  return left;
}

function parseMulDiv(tokens: string[], pos: { i: number }): number {
  let left = parsePow(tokens, pos);
  while (pos.i < tokens.length && (tokens[pos.i] === '*' || tokens[pos.i] === '/' || tokens[pos.i] === '%')) {
    const op = tokens[pos.i++];
    const right = parsePow(tokens, pos);
    if (op === '*') left *= right;
    else if (op === '/') left /= right;
    else left %= right;
  }
  return left;
}

function parsePow(tokens: string[], pos: { i: number }): number {
  let left = parseUnary(tokens, pos);
  if (pos.i < tokens.length && tokens[pos.i] === '^') {
    pos.i++;
    const right = parsePow(tokens, pos);
    left = Math.pow(left, right);
  }
  return left;
}

function parseUnary(tokens: string[], pos: { i: number }): number {
  if (pos.i < tokens.length && tokens[pos.i] === '-') { pos.i++; return -parseUnary(tokens, pos); }
  if (pos.i < tokens.length && tokens[pos.i] === '+') { pos.i++; return parseUnary(tokens, pos); }
  return parseAtom(tokens, pos);
}

function parseAtom(tokens: string[], pos: { i: number }): number {
  if (pos.i >= tokens.length) throw new Error('Unexpected end of expression');
  const tok = tokens[pos.i];
  if (tok === '(') {
    pos.i++;
    const val = parseExpr(tokens, pos);
    if (pos.i < tokens.length && tokens[pos.i] === ')') pos.i++;
    return val;
  }
  if (/^[0-9.]/.test(tok)) { pos.i++; return parseFloat(tok); }
  if (/^[a-zA-Z_]/.test(tok)) {
    const name = tok.toLowerCase();
    pos.i++;
    if (name === 'pi' || name === '\u03c0') return Math.PI;
    if (name === 'e' && (pos.i >= tokens.length || tokens[pos.i] !== '(')) return Math.E;
    if (pos.i < tokens.length && tokens[pos.i] === '(') {
      pos.i++;
      const args: number[] = [parseExpr(tokens, pos)];
      while (pos.i < tokens.length && tokens[pos.i] === ',') { pos.i++; args.push(parseExpr(tokens, pos)); }
      if (pos.i < tokens.length && tokens[pos.i] === ')') pos.i++;
      const v = args[0], v2 = args[1];
      switch (name) {
        case 'sin': return Math.sin(v);
        case 'cos': return Math.cos(v);
        case 'tan': return Math.tan(v);
        case 'asin': return Math.asin(v);
        case 'acos': return Math.acos(v);
        case 'atan': return v2 !== undefined ? Math.atan2(v, v2) : Math.atan(v);
        case 'sinh': return Math.sinh(v);
        case 'cosh': return Math.cosh(v);
        case 'tanh': return Math.tanh(v);
        case 'sqrt': return Math.sqrt(v);
        case 'cbrt': return Math.cbrt(v);
        case 'abs': return Math.abs(v);
        case 'ceil': return Math.ceil(v);
        case 'floor': return Math.floor(v);
        case 'round': return Math.round(v);
        case 'log': case 'log10': return Math.log10(v);
        case 'ln': return Math.log(v);
        case 'log2': return Math.log2(v);
        case 'exp': return Math.exp(v);
        case 'sign': return Math.sign(v);
        case 'pow': return Math.pow(v, v2 ?? 0);
        case 'min': return Math.min(...args);
        case 'max': return Math.max(...args);
        case 'mod': return v % (v2 ?? 1);
        default: throw new Error('Unknown function: ' + name + '()');
      }
    }
    throw new Error('Unknown identifier: ' + name);
  }
  throw new Error('Unexpected token: ' + tok);
}

function evaluateExpression(expr: string, angle: string): number {
  let processed = expr.replace(/\u00d7/g, '*').replace(/\u00f7/g, '/').replace(/\u2212/g, '-').replace(/\u03c0/g, 'pi');
  if (angle === 'deg') {
    processed = processed.replace(/\b(sin|cos|tan)\(([^)]+)\)/g, (_, fn: string, arg: string) => fn + '((((' + arg + ')*pi)/180))');
  }
  const tokens = tokenize(processed);
  if (tokens.length === 0) throw new Error('Empty expression');
  const pos = { i: 0 };
  const result = parseExpr(tokens, pos);
  if (pos.i < tokens.length) throw new Error('Unexpected token: ' + tokens[pos.i]);
  return result;
}

// ── Demo configs ────

const DEMO_CONFIGS: Record<string, object> = {
  'demo_basic': {
    id: 'demo_basic', type: 'basic',
    theme: { mode: 'dark', primaryColor: '#3b82f6', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
  },
  'demo_scientific': {
    id: 'demo_scientific', type: 'scientific',
    theme: { mode: 'dark', primaryColor: '#8b5cf6', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
  },
  'demo_light': {
    id: 'demo_light', type: 'scientific',
    theme: { mode: 'light', primaryColor: '#2563eb', backgroundColor: '#ffffff', textColor: '#18181b' },
  },
  'demo_cyberpunk': {
    id: 'demo_cyberpunk', type: 'scientific',
    theme: { mode: 'dark', primaryColor: '#f0abfc', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
  },
};

// ── Handler ────

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  if (!id || id.length > 64) {
    return jsonResponse(res, { error: { code: 'BAD_REQUEST', message: 'Invalid ID' } }, 400);
  }

  // ── /api/embed/evaluate?expr=... ──
  if (id === 'evaluate') {
    if (!checkRateLimit(req, res, 60, 60_000)) return;
    try {
      let expr: string | undefined;
      let angle: string = 'rad';
      if (req.method === 'GET') {
        expr = url.searchParams.get('expr') ?? undefined;
        angle = url.searchParams.get('angle') ?? 'rad';
      } else if (req.method === 'POST') {
        const body = await readBody(req);
        expr = body?.expr;
        angle = body?.angle ?? 'rad';
      }
      if (!expr || typeof expr !== 'string') {
        return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Missing "expr" parameter. Try ?expr=sin(45 deg)+cos(30 deg)' } }, 422);
      }
      if (expr.length > 1024) {
        return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Expression too long (max 1024 chars)' } }, 422);
      }
      const result = evaluateExpression(expr, angle);
      return jsonResponse(res, { result: Number.isFinite(result) ? result : String(result), expression: expr, angle });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Evaluation error';
      return jsonResponse(res, { error: { code: 'EVALUATION_ERROR', message: msg } }, 422);
    }
  }

  // ── /api/embed/demo_* or /api/embed/<id> ──
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  const demo = DEMO_CONFIGS[id];
  if (demo) return jsonResponse(res, demo);

  try {
    const rows = await db
      .select({ id: calculators.id, type: calculators.type, theme: calculators.theme, buttons: calculators.buttons, layout: calculators.layout, settings: calculators.settings, display: calculators.display })
      .from(calculators)
      .where(and(eq(calculators.id, id), isNotNull(calculators.publishedAt)))
      .limit(1);
    const calc = rows[0];
    if (!calc) return jsonResponse(res, { error: { code: 'NOT_FOUND', message: 'Calculator not found' } }, 404);
    return jsonResponse(res, calc);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return jsonResponse(res, { error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
  }
}
